import mysql from 'mysql2';
import { AlreadyExistsError, AuthenticationError, DatabaseError, DatabaseIOError, NotFoundError } from './database.error';
import { DatabaseTypes } from './database.types';
import nfc_hash from '../nfc';
import { RouteTypes } from '../api/routes/route.types';
import { formatToMySQLDateTime, formatToMySQLTime, mysqlDatetimeToDate, randomizeNumber, randomizeString } from '../algorithim';
import Exercise from '../model/exercise';
import { Workout, WorkoutInstances } from '../model/workout';
import User from '../model/user';
import WeightLifterSettings from '../../settings';
import { flatten, sectionArray } from '../util/section';
import { Logger } from '../util/logger';

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

	private async escape(str: string): Promise<string> {
		const TIMEOUT = 2500;
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new DatabaseError(500, 'Error in connection [timeout]', 'database.ts::escape'));
			}, TIMEOUT);
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::escape'));
					return;
				} else {
					con.release();
					clearTimeout(timeout);
					resolve(con.escape(str));
				}
			});
		});
	}

	private async query<T extends any>(query: string): Promise<T> {
		const TIMEOUT = 2500;
		const response = await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new DatabaseError(500, 'Error in connection [timeout]', 'database.ts::query'));
			}, TIMEOUT);
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::query'));
					return;
				} else {
					clearTimeout(timeout);
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
			return { user_id: -1, username: '', password: '', name: '', nfc_key: '', permission: 0, pfp_id: -1, pfp: '' };
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
			return { user_id: -1, username: '', password: '', name: '', nfc_key: '', permission: 0, pfp_id: -1, pfp: '' };
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
			user[0].pfp = `${WeightLifterSettings.webPath}/v1/file/pfp?user_id=${user_id}`;
			return user?.[0];
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', name: "", nfc_key: '', permission: 0, pfp_id: -1, pfp: '' };
		}
	}

	//setPFP
	public async setPFP(user_id: string, pfp: string): Promise<boolean> {
		try {
			user_id = await this.escape(user_id) as string;
			pfp = await this.escape(pfp) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE user_id = ${user_id}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::setPFP');
			}
			const pfp_id = randomizeNumber(6);
			await this.query(`INSERT INTO image (image_id, user_id, filename) VALUES (${pfp_id}, ${user_id}, ${pfp})`);
			await this.query(`UPDATE user SET pfp_id = ${pfp_id} WHERE user_id = ${user_id}`);
			return true;
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return false;
		}
	}

	public async getPFP(user_id: string): Promise<DatabaseTypes.Image> {
		try {
			const o_uid = user_id;
			user_id = await this.escape(user_id) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE user_id = ${user_id}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getPFP');
			}
			const user = await this.getUserById(parseInt(o_uid));
			const pfp = await this.query<DatabaseTypes.Image[]>(`SELECT * FROM image WHERE image_id = ${user.pfp_id}`);
			if (!pfp || pfp.length === 0) {
				throw new NotFoundError('PFP not found', 'database.ts::getPFP');
			}
			return pfp[0];
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { image_id: -1, user_id: -1, filename: '', created_at: '' };
		}
	}

	public async getImages(user_id: number): Promise<DatabaseTypes.Image[]> {
		try {
			if (!user_id) {
				throw new DatabaseIOError('No user_id provided', 'database.ts::getImages');
			}
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE user_id = ${user_id}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getImages');
			}
			const images = await this.query<DatabaseTypes.Image[]>(`SELECT * FROM image WHERE user_id = ${user_id} AND image_id != (SELECT pfp_id FROM user WHERE user_id = ${user_id})`);
			return images;
		} catch (err: any) {
			return [];
		}
	}

	public async addImage(user_id: string, filename: string): Promise<DatabaseTypes.Image> {
		try {
			user_id = await this.escape(user_id) as string;
			filename = await this.escape(filename) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE user_id = ${user_id}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::addImage');
			}
			await this.query(`INSERT INTO image (user_id, filename) VALUES (${user_id}, ${filename})`);
			const image = await this.query<DatabaseTypes.Image[]>(`SELECT * FROM image WHERE user_id = ${user_id} AND filename = ${filename}`);
			return image[0];
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			throw new DatabaseError(500, 'Error adding image', 'database.ts::addImage');
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
				const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${await this.escape(username)}`);
				if (!user_exists) {
					throw new NotFoundError('User not found', 'database.ts::authenticateUser');
				}
				const user = await this.getUser(username);
				if (user.password !== password) {
					throw new AuthenticationError('Incorrect password', 'database.ts::authenticateUser');
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
				user[0].pfp = `${WeightLifterSettings.webPath}/v1/file/pfp?user_id=${user[0].user_id}`;
				return user[0];
			} else {
				throw new DatabaseError(400, 'No authentication method provided', 'database.ts::authenticateUser');
			}
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return false;
		}
	}

	public async getUsersByIDs(user_ids: number[]): Promise<DatabaseTypes.User[]> {
		if (!user_ids || user_ids.length === 0) {
			throw new DatabaseIOError('No user_ids provided', 'database.ts::getUsersByIDs');
		}
		try {
			const user_statement = `SELECT * FROM user WHERE ${user_ids.map((id) => `user_id = ${id}`).join(' OR ')}`;
			let user_query = await this.query<DatabaseTypes.User[]>(user_statement);
			if (!user_query || user_query.length === 0 || user_query.length !== user_ids.length) {
				throw new NotFoundError('Mismatch between Found Users and Users Provided', 'database.ts::getUsersByIDs');
			}
			user_query = user_query.map((user) => {
				return {
					...user,
					pfp: `${WeightLifterSettings.webPath}/v1/file/pfp?user_id=${user.user_id}`
				}
			});
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
						const set_date = formatToMySQLDateTime(exercise.time[z]);
						await this.query(`INSERT INTO past_set (pe_id, weight, reps, date) VALUES (${pe_id}, ${weight}, ${reps}, '${set_date}')`);
					}
				}
			}

			return { past_workout_id: cw_id };
		}
		catch (err: any) {
			return { past_workout_id: -1 };
		}
	}
	//measurement logic
	public async submitMeasurement(data: DatabaseTypes.Measurement) {
		try {
			const user_id = data.user_id;
			if (!user_id || user_id < 0) {
				throw new DatabaseIOError('Invalid user_id', 'database.ts::submitMeasurement');
			}
			const date = formatToMySQLDateTime(new Date());
			data.date = date;
			const id = randomizeNumber(6);
			const query = `INSERT INTO measurements (measurement_id, user_id, weight, bodyfat, neck, back, chest, shoulders, waist, left_arm, right_arm, left_forearm, right_forearm, left_quad, right_quad, date) VALUES (${id}, ${user_id}, ${this.returnSQLValue(data.weight)}, ${this.returnSQLValue(data.bodyfat)}, ${this.returnSQLValue(data.neck)}, ${this.returnSQLValue(data.back)}, ${this.returnSQLValue(data.chest)}, ${this.returnSQLValue(data.shoulders)}, ${this.returnSQLValue(data.waist)}, ${this.returnSQLValue(data.left_arm)}, ${this.returnSQLValue(data.right_arm)}, ${this.returnSQLValue(data.left_forearm)}, ${this.returnSQLValue(data.right_forearm)}, ${this.returnSQLValue(data.left_quad)}, ${this.returnSQLValue(data.right_quad)}, '${date}')`
			await this.query(query);
			const check = await this.atleastOne('SELECT * from measurements WHERE measurement_id = ' + id);
			if (!check) throw new DatabaseError(500, 'Error logging measurement', 'database.ts::submitMeasurement');

		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err
			}
		}
	}

	public async getLatestMeasurement(user_id: number): Promise<DatabaseTypes.Measurement> {
		try {
			if (!user_id || user_id < 0) {
				throw new DatabaseIOError('Invalid user_id', 'database.ts::getLatestMeasurement');
			}
			const measurement = await this.query<DatabaseTypes.Measurement[]>(`SELECT * FROM measurements WHERE user_id = ${user_id} ORDER BY date DESC`);
			if (measurement.length === 0) {
				return { measurement_id: -1, user_id: -1, weight: 0, bodyfat: 0, neck: 0, back: 0, chest: 0, shoulders: 0, waist: 0, left_arm: 0, right_arm: 0, left_forearm: 0, right_forearm: 0, left_quad: 0, right_quad: 0, date: '' };
			}

			function searchForNonNullKey(key: keyof DatabaseTypes.Measurement, idx: number = 0) {
				for (let i = idx; i < measurement.length; i++) {
					if (measurement[i][key] !== null && measurement[i][key] !== undefined) return i;
				}
			}

			let measurement_obj: DatabaseTypes.Measurement = { ...measurement[0] };
			for (let _key in measurement_obj) {
				const key = _key as keyof DatabaseTypes.Measurement;
				if (measurement_obj[key] === null) {
					const idx = searchForNonNullKey(key as keyof DatabaseTypes.Measurement);
					if (idx !== undefined) {
						//@ts-ignore
						measurement_obj[key] = measurement[idx][key];
					}
				}
			}

			return measurement_obj;

		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { measurement_id: -1, user_id: -1, weight: 0, bodyfat: 0, neck: 0, back: 0, chest: 0, shoulders: 0, waist: 0, left_arm: 0, right_arm: 0, left_forearm: 0, right_forearm: 0, left_quad: 0, right_quad: 0, date: '' };
		}
	}

	public async getMeasurements(user_id: number, limit: number = 0): Promise<DatabaseTypes.Measurement[]> {
		try {
			const measurements = await this.query<DatabaseTypes.Measurement[]>(`SELECT * FROM measurements WHERE user_id = ${user_id} ORDER BY date DESC ${limit > 0 ? 'LIMIT ' + limit : ''}`);

			return measurements;
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return [];
		}
	}

	private returnSQLValue(value: any): string {
		if (value === undefined || value === null) return 'NULL';
		return value;
	}

	//past exericse block
	//



	public async getExercisesByUser(user_id: number): Promise<(DatabaseTypes.ExerciseLog & ExerciseMaxes)[]> {
		try {
			if (!user_id || user_id < 0) {
				throw new DatabaseIOError('Invalid user_id', 'database.ts::getExercisesByUser');
			}

			const query = `SELECT fus.* FROM ( SELECT pes.*, exercise.name, exercise.sets FROM ( SELECT past_set.pe_id, past_set.set_id, past_exercise.exercise_id, past_exercise.workout_id, past_set.reps, past_set.date, past_set.weight FROM past_exercise INNER JOIN past_set ON past_set.pe_id = past_exercise.pe_id WHERE user_id = ${user_id}) AS pes INNER JOIN exercise ON exercise.exercise_id = pes.exercise_id) fus; `
			let exercises = await this.query<(DatabaseTypes.ExerciseLog & ExerciseMaxes)[]>(query);

			const calc_max = (reps: number, weight: number) => {
				return Math.abs(Math.floor(weight / (1.0278 - 0.0278 * reps)));
			}

			type max = {
				exercise_id: number;
				value: number;
			}

			//calculate maxes of given exercise	
			for (let i = 0; i < exercises.length; i++) {
				let exercise = exercises[i]; //needs to be mutable
				let one_rep = 0, five_rep = 0, twelve_rep = 0, therotical_one_rep = 0, therotical_five_rep = 0, thertical_twelve_rep = 0;
				one_rep = exercise.reps == 1 ? exercise.weight : 0;
				five_rep = exercise.reps == 5 ? exercise.weight : 0;
				twelve_rep = exercise.reps == 12 ? exercise.weight : 0;
				therotical_one_rep = calc_max(exercise.reps, exercise.weight);
				therotical_five_rep = Math.round(therotical_one_rep * 0.85);
				thertical_twelve_rep = Math.round(therotical_one_rep * 0.7);
				exercise.max = {
					one_rep,
					five_rep,
					twelve_rep,
					therotical_one_rep,
					therotical_five_rep,
					thertical_twelve_rep
				}
			}

			const sections = sectionArray<DatabaseTypes.ExerciseLog & ExerciseMaxes>(exercises, (e) => e.exercise_id);
			sections.forEach(async (section) => {
				const max = await this.reduceMaxes(section);
				section.forEach((exercise) => {
					exercise.max = max.max;
				})
			})

			return flatten(sections) as (DatabaseTypes.ExerciseLog & ExerciseMaxes)[];
		} catch (err: any) {
			console.log(err);
			throw new DatabaseError(500, 'Error getting exercises by user', 'database.ts::getExercisesByUser');
		}
	}

	private async reduceMaxes(exercises: (ExerciseMaxes)[]): Promise<ExerciseMaxes> {
		try {
			if (!exercises) {
				throw new DatabaseIOError('Invalid exercises', 'database.ts::reduceMaxes');
			}

			const max = exercises.reduce((acc, e) => {
				if (e.max.one_rep > acc.max.one_rep) return e;
				return acc;
			});
			const max_t = exercises.reduce((acc, e) => {
				if (e.max.therotical_one_rep > acc.max.therotical_one_rep) return e;
				return acc;
			});
			const five_rep = exercises.reduce((acc, e) => {
				if (e.max.five_rep > acc.max.five_rep) return e;
				return acc;
			});
			const five_rep_t = exercises.reduce((acc, e) => {
				if (e.max.therotical_five_rep > acc.max.therotical_five_rep) return e;
				return acc;
			});
			const twelve_rep = exercises.reduce((acc, e) => {
				if (e.max.twelve_rep > acc.max.twelve_rep) return e;
				return acc;
			});
			const twelve_rep_t = exercises.reduce((acc, e) => {
				if (e.max.thertical_twelve_rep > acc.max.thertical_twelve_rep) return e;
				return acc;
			});

			return {
				max: {
					one_rep: max.max.one_rep,
					five_rep: five_rep.max.five_rep,
					twelve_rep: twelve_rep.max.twelve_rep,
					therotical_one_rep: max_t.max.therotical_one_rep,
					therotical_five_rep: five_rep_t.max.therotical_five_rep,
					thertical_twelve_rep: twelve_rep_t.max.thertical_twelve_rep,
				},
			}

		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			throw new DatabaseError(500, 'Error reducing maxes', 'database.ts::reduceMaxes');
		}
	}

	//analytics
	//
	public async getExerciseAnalytics(user_id: number, exercise_id: number): Promise<ExerciseMaxes> {
		try {
			if (!user_id || user_id < 0 || !exercise_id || exercise_id < 0) {
				throw new DatabaseIOError('Invalid user_id or exercise_id', 'database.ts::getExerciseAnalytics');
			}
			const exercises = (await this.getExercisesByUser(user_id)).filter((exercise) => exercise.exercise_id == exercise_id);
			if (exercises.length === 0) {
				throw new NotFoundError('Exercise not found', 'database.ts::getExerciseAnalytics');
			}

			return await this.reduceMaxes(exercises);

		} catch (e: any) {
			if (e instanceof DatabaseError) {
				throw e;
			} else {
				throw new DatabaseError(500, 'Error getting exercise analytics', 'database.ts::getExerciseAnalytics');
			}
		}
	}

	public async getAvailableTrackables(user_id: number): Promise<RouteTypes.TrackableMetric[]> {
		try {
			let return_value: RouteTypes.TrackableMetric[] = [];
			const query = `SELECT DISTINCT exercise.exercise_id, exercise.name FROM ( SELECT DISTINCT past_set.pe_id, past_set.set_id, past_exercise.exercise_id, past_set.reps, past_set.weight FROM past_exercise INNER JOIN past_set ON past_set.pe_id = past_exercise.pe_id WHERE user_id = ${user_id}) AS pes INNER JOIN exercise ON exercise.exercise_id = pes.exercise_id ;`
			//exericse block
			let exercises = await this.query<any[]>(query);
			//@ts-ignore
			return_value = [...exercises.map((exercise) => { return { key: exercise.exercise_id, value: exercise.name, type: 'measurement' } })]

			let measurements = await this.getLatestMeasurement(user_id);
			if (measurements.measurement_id === -1) return return_value;
			let measurement_keys = Object.keys(measurements);
			if (measurements === undefined) return return_value;
			for (let i = 0; i < measurement_keys.length; i++) {
				const key = measurement_keys[i];
				//@ts-ignore
				const value = measurements[key];
				if (measurement_keys[i] === 'measurement_id' || measurement_keys[i] === 'user_id' || measurement_keys[i] === 'date') continue;
				if (value === null) continue;
				return_value.push({ key: key, value: key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), type: 'exercise' });
			}

			return return_value;
		}
		catch (err: any) {
			throw new DatabaseError(500, `Error getting trackables (${err})`, 'database.ts::getAvailableTrackables');
		}
	}

	public async getDataSet(user_id: number, id: string, type: 'exercise' | 'measurement') {

		//this just sucks 
		type I = { date: string }
		function dayExists<Z extends I>(a: Z, b: RouteTypes.Dataset, callback: (a: Z, b: RouteTypes.Data, idx: number) => void) {
			if (!a.date || !b) {
				Logger.log('Invalid date', 'database.ts::getDataSet');
				return false;
			}
			const date_a = new Date(a.date);
			if (!date_a) {
				Logger.log('Invalid date', 'database.ts::getDataSet');
				return false;
			}
			let result = false;
			b.forEach((obj, idx) => {
				//check if the same
				const date_b = new Date(obj.date);
				if (date_a.getDay() == date_b.getDay() && date_a.getMonth() == date_b.getMonth() && date_a.getDate() == date_b.getDate() && date_a.getFullYear() == date_b.getFullYear()) {
					callback(a, obj, idx);
					result = true;
				}
			})
			return result;
		}

		try {
			if (type === 'exercise') {
				let exercises = await this.getExercisesByUser(user_id);
				exercises = exercises.filter((exercise) => exercise.exercise_id === parseInt(id) && exercise.date !== '');
				let exercise_list: RouteTypes.Dataset = [];
				for (let i = 0; i < exercises.length; i++) {
					const exercise_a = exercises[i];
					if (exercise_a.reps === 0 || exercise_a.weight === 0) {
						Logger.log(`Invalid exercise for ${exercise_a.name} (User: ${user_id})`, 'database.ts::getDataSet');
						continue;
					}
					const exists = dayExists<DatabaseTypes.ExerciseLog>(exercise_a, exercise_list, (a, b, idx) => {
						if (a.weight > b.value) {
							exercise_list[idx] = {
								date: a.date,
								value: a.weight,
								metric: 'lbs'
							};
						} else {
							exercise_list[idx] = b;
						}
					});
					if (!exists) {
						exercise_list.push({ date: exercise_a.date, value: exercise_a.weight, metric: 'lbs' });
					}
				}
				return exercise_list.sort((a, b) => { return new Date(a.date).getTime() - new Date(b.date).getTime() });
			} else if (type === 'measurement') {
				let measurements = await this.getMeasurements(user_id);
				let measurement_list: RouteTypes.Dataset = [];
				const key = id as string as keyof DatabaseTypes.Measurement;
				for (let i = 0; i < measurements.length; i++) {
					const measurement_a = measurements[i];
					if (!measurement_a[key] || isNaN(measurement_a[key] as any)) {
						Logger.log(`Invalid measurement for ${key} (User: ${user_id})`, 'database.ts::getDataSet');
						continue;
					} else if (measurement_a[key] === 0) {
						Logger.log(`Invalid measurement for ${key} (User: ${user_id}): Given Value 0`, 'database.ts::getDataSet');
						continue;
					}
					const exists = dayExists<DatabaseTypes.Measurement>(measurement_a, measurement_list, (a, b, idx) => {
						if (a[key] as number > b.value) {
							measurement_list[idx] = b;
						} else {
							measurement_list[idx] = {
								date: a.date,
								value: a[key] as number,
								metric: 'lbs' //TODO: change this to the correct metric depending on the key
							};
						}
					});
					if (!exists) {
						measurement_list.push({ date: measurement_a.date, value: measurement_a[key] as number, metric: 'lbs' });
					}
				}
				return measurement_list.reverse();
			}
			throw new DatabaseError(400, 'Invalid type', 'database.ts::getDataSet');
		}
		catch (err: any) {
			if (err instanceof DatabaseError) throw err;
			return [];
		}
	}
}


type ExerciseMaxes = {
	max: {
		one_rep: number;
		five_rep: number;
		twelve_rep: number;
		therotical_one_rep: number;
		therotical_five_rep: number;
		thertical_twelve_rep: number;
	}
}
