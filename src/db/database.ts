import mysql from 'mysql2';
import { AlreadyExistsError, AuthenticationError, DatabaseError, DatabaseIOError, NotFoundError } from './database.error';
import { DatabaseTypes } from './database.types';
import nfc_hash from '../nfc';
import { RouteTypes } from '../api/routes/route.types';
import { formatToMySQLDateTime, formatToMySQLTime, randomizeNumber, randomizeString } from '../algorithim';
import Exercise from '../model/exercise';
import { Workout } from '../model/workout';
import User from '../model/user';

export default class Database {
	private static instance: Database;
	private _connection: mysql.Pool;
	private constructor() {
		this._connection = mysql.createPool({
			host: 'db',
			port: 3306,
			user: 'weightlifter',
			password: 'weightlifter',
			database: 'weightlifter',
		});
		this.connection.on('connection', (_err) => {
			console.log('Connected to database!');
		});
		this.connection.on('error', (_err) => {
			console.log('Error in database connection: ' + _err);
		});
	}

	public static getInstance() {
		if (!Database.instance) {
			Database.instance = new Database();
		}
		return Database.instance;
	}

	private get connection(): mysql.Pool {
		if (!this._connection)
			throw new Error('No connection to database');
		return this._connection;
	}

	private async escape(str: String): Promise<String> {
		return new Promise((resolve, reject) => {
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::escape'));
					return;
				} else {
					resolve(con.escape(str));
				}
			});
		});
	}

	private async query<T extends any>(query: string): Promise<T> {
		const response = await new Promise((resolve, reject) => {
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::query'));
					return;
				} else {
					//reduce chance of sql injection
					con.query(query, (err, results, fields) => {
						if (err) {
							console.log('Error in query::' + err);
							con.release();
							reject(new DatabaseError(500, 'Error in query [' + err.errno + ']', 'database.ts::query'));
						} else {
							console.log('[database.ts::query] Query successful');
							con.release();
							resolve(results as T);
						}
					})
				}
			});
		});
		return response as T;
	}

	private async atleastOne(query: string): Promise<boolean> {
		const response = await this.query<any[]>(query);
		return response.length > 0 && response[0] !== undefined;
	}

	public async setUserNFC(username: string, nfc: string): Promise<boolean> {
		try {
			username = await this.escape(username) as string;
			nfc = await this.escape(nfc) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::setUserNFC');
			}
			await this.query(`UPDATE user SET nfc = '${nfc}' WHERE username = ${username}`);
			return true;
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return false;
		}
	}

	public async addUser(username: string, password: string, name: string, permission: number = 0): Promise<DatabaseTypes.User> {
		try {
			username = await this.escape(username) as string;
			password = await this.escape(password) as string;
			name = await this.escape(name) as string;
			const nfc_key = await this.escape(nfc_hash()) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (user_exists) {
				throw new AlreadyExistsError('User already exists', 'database.ts::addUser');
			}
			await this.query<DatabaseTypes.User[]>(`INSERT INTO user (username, password, name, nfc_key, permission) VALUES (${username}, ${password}, ${name}, ${nfc_key}, ${permission})`);
			const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM user WHERE username = ${username}`);
			if (user.length === 0) {
				throw new DatabaseError(500, 'Error adding user', 'database.ts::addUser');
			}
			return user[0];
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', name: '', nfc_key: '', permission: 0 };
		}
	}

	public async getUser(username: string): Promise<DatabaseTypes.User> {
		try {
			username = await this.escape(username) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getUser');
			}
			const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM user WHERE username = ${username}`);
			return user[0];
		}
		catch (err: any) {
			if (err instanceof NotFoundError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', name: '', nfc_key: '', permission: 0 };
		}
	}

	public async getUserById(user_id: number): Promise<DatabaseTypes.User> {
		if (!user_id || user_id < 0) {
			throw new DatabaseIOError('Invalid user_id', 'database.ts::getUserById');
		}
		try {
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE user_id = '${user_id}'`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getUserById');
			}
			const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM user WHERE user_id = '${user_id}'`);
			if (!user || user.length === 0) {
				throw new NotFoundError('User not found', 'database.ts::getUserById');
			}
			return user?.[0];
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', name: "", nfc_key: '', permission: 0 };
		}
	}

	//FIX: change to bcrypt later
	public async authenticateUser(username?: string, password?: string, nfc?: string): Promise<DatabaseTypes.User | false> {
		try {
			if (!password && !nfc && !username) {
				throw new DatabaseIOError('No authentication method provided', 'database.ts::authenticateUser');
			}
			if (password && nfc && username) {
				throw new DatabaseError(400, 'Cannot authenticate with both token and nfc', 'database.ts::authenticateUser');
			}
			if (password && username) {
				const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
				if (!user_exists) {
					throw new NotFoundError('User not found', 'database.ts::authenticateUser');
				}
				const user = await this.getUser(username);
				if (user.password !== password) {
					throw new AuthenticationError('Incorrect token', 'database.ts::authenticateUser');
				}
				return user;
			} else if (nfc) {
				const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM user WHERE nfc_key = '${nfc}'`);
				if (!user || user.length === 0) {
					throw new NotFoundError('User not found', 'database.ts::authenticateUser');
				}
				if (user[0].nfc_key !== nfc) {
					throw new AuthenticationError('Incorrect nfc', 'database.ts::authenticateUser');
				}
				return user[0];
			} else {
				throw new DatabaseError(400, 'No authentication method provided', 'database.ts::authenticateUser');
			}
		} catch (err: any) {
			return false;
		}
	}

	public async getUsersByIDs(user_ids: number[]): Promise<DatabaseTypes.User[]> {
		if (!user_ids || user_ids.length === 0) {
			throw new DatabaseIOError('No user_ids provided', 'database.ts::getUsersByIDs');
		}
		try {
			const user_statement = `SELECT * FROM user WHERE ${user_ids.map((id) => `user_id = ${id}`).join(' OR ')}`;
			const user_query = await this.query<DatabaseTypes.User[]>(user_statement);
			if (!user_query || user_query.length === 0 || user_query.length !== user_ids.length) {
				throw new NotFoundError('Mismatch between Found Users and Users Provided', 'database.ts::getUsersByIDs');
			}
			return user_query;
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return [];
		}
	}

	//FIX: change to bcrypt later
	public async logUserIn(username: string, password?: string, nfc?: string): Promise<DatabaseTypes.UserToken> {
		try {
			username = await this.escape(username) as string;
			if (!password && !nfc) {
				throw new DatabaseIOError('No authentication method provided', 'database.ts::authenticateUser');
			}
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::authenticateUser');
			}
			const user = await this.getUser(username);

			if (password && nfc) {
				throw new DatabaseError(400, 'Cannot authenticate with both password and nfc', 'database.ts::authenticateUser');
			}
			if (password) {
				//FIX: change to bcrypt later
				if (user.password !== password) {
					throw new AuthenticationError('Incorrect password', 'database.ts::authenticateUser');
				}
			} else if (nfc) {
				//FIX: I guess this too because why not? -- change to bcrypt later
				if (user.nfc_key !== nfc) {
					throw new AuthenticationError('Incorrect nfc', 'database.ts::authenticateUser');
				}
			}
			return { user_id: user.user_id, accesstoken: '', refreshtoken: '' };
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { user_id: -1, accesstoken: '', refreshtoken: '' };
		}
	}

	/* BLOCK: WORKOUT & EXERCISE LOGIC */

	//get a workout from the database
	public async getWorkout(workout_id: number): Promise<DatabaseTypes.Workout> {
		try {
			if (!workout_id || workout_id < 0) {
				throw new DatabaseIOError('Invalid workout_id', 'database.ts::getWorkout');
			}
			const workout_exists = await this.atleastOne(`SELECT * FROM workout WHERE workout_id = '${workout_id}'`);
			if (!workout_exists) {
				throw new NotFoundError('Workout not found', 'database.ts::getWorkout');
			}
			const workout = await this.query<DatabaseTypes.Workout[]>(`SELECT * FROM workout WHERE workout_id = '${workout_id}'`);
			if (workout.length === 0) {
				throw new NotFoundError('Workout not found', 'database.ts::getWorkout');
			}
			const exercies = await this.getExercisesByWorkout(workout_id) ?? [];
			return { ...workout[0], exercises: exercies };
		} catch (e: any) {
			if (e instanceof DatabaseError) {
				throw e;
			}
			return { workout_id: -1, name: '', exercises: [] };
		}
	}

	public async getWorkouts() {
		try {
			let workouts = await this.query<DatabaseTypes.Workout[]>(`SELECT * FROM workout`);
			const workout_full = workouts.map(async (workout) => {
				const exercises = await this.getExercisesByWorkout(workout.workout_id);
				return { ...workout, exercises };
			});
			return await Promise.all(workout_full);
		} catch (err: any) {
			return [];
		}
	}

	//add a workout into the database, using existing exercises.
	public async addWorkout(workout: Omit<Omit<DatabaseTypes.Workout, 'workout_id'>, 'exercises'> & { exercises: RouteTypes.WorkoutExerciseInput[] }): Promise<DatabaseTypes.Workout> {
		try {
			const name = await this.escape(workout.name) as string;
			const exercises = workout.exercises ?? [];

			//check if workout exists
			const workout_exists = await this.atleastOne(`SELECT * FROM workout WHERE name = ${name}`);
			if (workout_exists) {
				throw new AlreadyExistsError('Workout already exists', 'database.ts::addWorkout');
			}

			//add workout
			await this.query<DatabaseTypes.Workout[]>(`INSERT INTO workout (name) VALUES (${name})`);

			//check if added
			const new_workout = await this.query<DatabaseTypes.Workout[]>(`SELECT * FROM workout WHERE name = ${name}`);
			if (new_workout.length === 0) {
				throw new DatabaseError(500, 'Error adding workout', 'database.ts::addWorkout');
			}

			await this.addExerciseToWorkout(new_workout[0].workout_id, exercises);
			return this.getWorkout(new_workout[0].workout_id);
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { workout_id: -1, name: '', exercises: [] };
		}
	}

	//exercise and workout stuff
	public async addExerciseToWorkout(workout_id: number, exercises: RouteTypes.WorkoutExerciseInput[]): Promise<DatabaseTypes.Workout> {
		try {
			if (!workout_id || workout_id < 0 || !exercises) {
				throw new DatabaseIOError('Invalid workout_id or exercise list', 'database.ts::addExerciseToWorkout');
			}
			//check if workout exists
			const workout_exists = await this.atleastOne(`SELECT * FROM workout WHERE workout_id = '${workout_id}'`);
			if (!workout_exists) {
				throw new NotFoundError('Workout not found', 'database.ts::addExerciseToWorkout');
			}

			//get previous order
			const order = ((await this.query<{ "MAX(sequence)": number }[]>(`SELECT MAX(sequence) FROM workout_bridge WHERE workout_id = ${workout_id}`))?.[0]["MAX(sequence)"]) ?? 0 + 1 as number;

			for (let i = 0; i < exercises.length; i++) {
				try {
					const exercise = await this.getExercise(exercises[i].id);
					const sets = exercises[i].sets ?? 3;
					const reps = exercises[i].reps ?? 12;
					if (exercise.exercise_id < 0) {
						throw new NotFoundError('Exercise not found', 'database.ts::addExerciseToWorkout');
					}
					await this.query<DatabaseTypes.Exercise[]>(`INSERT INTO workout_bridge (workout_id, exercise_id, sets, reps, sequence) VALUES (${workout_id}, ${exercise.exercise_id}, ${sets}, ${reps}, ${order + i})`);
				} catch (e: any) {
					if (e instanceof NotFoundError) {
						throw e;
					}
					continue;
				}
			}
			return await this.getWorkout(workout_id);
		} catch (e: any) {
			if (e instanceof DatabaseError) {
				throw e;
			}
			return { workout_id: -1, name: '', exercises: [] };
		}
	}

	//get all exercises in a workout
	public async getExercisesByWorkout(workout_id: number): Promise<DatabaseTypes.Exercise[]> {
		const exercises = await this.query<DatabaseTypes.Exercise[]>(`SELECT exercise.exercise_id, exercise.name, exercise.description, exercise.time_flag, workout_bridge.sets, workout_bridge.reps FROM workout_bridge INNER JOIN exercise ON workout_bridge.exercise_id = exercise.exercise_id WHERE workout_id = ${workout_id} ORDER BY sequence ASC`);
		return exercises;
	}

	//exercise stuff
	public async getExercise(exercise_id: number): Promise<DatabaseTypes.Exercise> {
		try {
			if (!exercise_id || exercise_id < 0) {
				throw new DatabaseIOError('Invalid exercise_id', 'database.ts::getExercise');
			}
			const exercise_exists = await this.atleastOne(`SELECT * FROM exercise WHERE exercise_id = '${exercise_id}'`);
			if (!exercise_exists) {
				throw new NotFoundError('Exercise not found', 'database.ts::getExercise');
			}
			const exercise = await this.query<DatabaseTypes.Exercise[]>(`SELECT * FROM exercise WHERE exercise_id = '${exercise_id}'`);
			if (exercise.length === 0) {
				throw new NotFoundError('Exercise not found', 'database.ts::getExercise');
			}
			return exercise?.[0];
		} catch (e: any) {
			if (e instanceof DatabaseError) {
				throw e;
			}
			return { exercise_id: -1, name: '', description: '', sets: 0, reps: 0, time_flag: false };
		}
	}

	//create a new exercise
	public async createExercise(exercise: Omit<DatabaseTypes.Exercise, 'exercise_id'>): Promise<DatabaseTypes.Exercise> {
		try {
			const name = await this.escape(exercise.name) as string;
			const description = await this.escape(exercise.description) as string;
			const { sets, reps, time_flag } = exercise;
			const exercise_exists = await this.atleastOne(`SELECT * FROM exercise WHERE name = ${name}`);
			if (exercise_exists) {
				throw new AlreadyExistsError('Exercise already exists - Pick a different name.', 'database.ts::createExercise');
			}
			await this.query<DatabaseTypes.Exercise[]>(`INSERT INTO exercise (name, description, time_flag) VALUES (${name}, ${description}, ${time_flag ? 1 : 0})`);
			const new_exercise = await this.query<DatabaseTypes.Exercise[]>(`SELECT * FROM exercise WHERE name = ${name}`);
			if (new_exercise.length === 0) {
				throw new DatabaseError(500, 'Error adding exercise', 'database.ts::createExercise');
			}
			return new_exercise[0];
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { exercise_id: -1, name: '', description: '', sets: 0, reps: 0, time_flag: false };
		}
	}

	private async alreadyInWorkout(user_id: number): Promise<boolean> {
		const response = await this.query<any[]>(`SELECT * FROM users_in_workout WHERE user_id = ${user_id}`);
		return response.length > 0;
	}

	public async finishWorkout(data: Workout): Promise<{ past_workout_id: number }> {
		try {
			const users = data.users.all;
			const cw_id = data.cw_id;
			const workout_id = data.workout_id;
			const date = formatToMySQLDateTime(new Date());
			const time = formatToMySQLTime(new Date());
			//finished is datetime and duration is time (duration unavailable)
			await this.query(`INSERT INTO past_workouts (pw_id, workout_id, finished, duration) VALUES (${cw_id}, ${workout_id}, '${date}', '${time}')`);

			//lol n^3...
			for (let i = 0; i < users.length; i++) {
				const user = users[i];
				for (let j = 0; j < user.getExercises().length; j++) {
					const exercise = user.getExercises()[j];
					const pe_id = randomizeNumber(6);
					await this.query(`INSERT INTO past_exercise (pe_id, user_id, workout_id, exercise_id, sets) VALUES (${pe_id}, ${user.user_id}, ${cw_id}, ${exercise.exercise_id}, ${exercise.setsDone})`);
					for (let z = 0; z < exercise.setsDone; z++) {
						const reps = exercise.repsDone[z];
						const weight = exercise.weight[z];
						await this.query(`INSERT INTO past_set (pe_id, weight, reps) VALUES (${pe_id}, ${weight}, ${reps})`);
					}
				}
			}

			return { past_workout_id: cw_id };
		}
		catch (err: any) {
			return { past_workout_id: -1 };
		}
	}
}
