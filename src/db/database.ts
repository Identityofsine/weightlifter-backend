import mysql from 'mysql2';
import { AlreadyExistsError, AuthenticationError, DatabaseError, DatabaseIOError, NotFoundError } from './database.error';
import { DatabaseTypes } from './database.types';
import nfc_hash from '../nfc';
import { RouteTypes } from '../api/routes/route.types';
import { formatToMySQLDateTime, formatToMySQLTime, mysqlDatetimeToDate, randomizeNumber, randomizeString } from '../algorithim';
import Exercise from '../model/exercise';
import { Workout, WorkoutInstances } from '../model/workout';
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

			//theoretical maxes
			let orp_max: max[] = []; //1rm
			let frp_max: max[] = []; //5rm
			let twp_max: max[] = []; //12rm
			for (let i = 0; i < exercises.length; i++) {
				const exercise = exercises[i];
				const reps = exercise.reps;
				const weight = exercise.weight;
				const orp = calc_max(reps, weight);
				const frp = Math.floor(orp * 0.88);
				const twp = Math.floor(orp * 0.70);

				const orp_max_idx = orp_max.findIndex((max) => max.exercise_id === exercise.exercise_id);
				const frp_max_idx = frp_max.findIndex((max) => max.exercise_id === exercise.exercise_id);
				const twp_max_idx = twp_max.findIndex((max) => max.exercise_id === exercise.exercise_id);
				if (orp_max_idx === -1) orp_max.push({ exercise_id: exercise.exercise_id, value: orp });
				else if (orp > orp_max[orp_max_idx].value) orp_max[orp_max_idx].value = orp;
				if (frp_max_idx === -1) frp_max.push({ exercise_id: exercise.exercise_id, value: frp });
				else if (frp > frp_max[frp_max_idx].value) frp_max[frp_max_idx].value = frp;
				if (twp_max_idx === -1) twp_max.push({ exercise_id: exercise.exercise_id, value: twp });
				else if (twp > twp_max[twp_max_idx].value) twp_max[twp_max_idx].value = twp;


				exercises[i] = {
					...exercises[i],
					max: {
						one_rep: orp,
						five_rep: frp,
						twelve_rep: twp,
						therotical_one_rep: 0,
						therotical_five_rep: 0,
						thertical_twelve_rep: 0,
					}
				}
			}

			//update the maxes
			for (let i = 0; i < exercises.length; i++) {
				const exercise = exercises[i];
				const orp_max_idx = orp_max.findIndex((max) => max.exercise_id === exercise.exercise_id);
				const frp_max_idx = frp_max.findIndex((max) => max.exercise_id === exercise.exercise_id);
				const twp_max_idx = twp_max.findIndex((max) => max.exercise_id === exercise.exercise_id);
				if (orp_max_idx !== -1 && frp_max_idx !== -1 && twp_max_idx !== -1)
					exercise.max = {
						...exercise.max,
						therotical_one_rep: orp_max[orp_max_idx].value,
						therotical_five_rep: frp_max[frp_max_idx].value,
						thertical_twelve_rep: twp_max[twp_max_idx].value,
					};
				else {
					throw new DatabaseIOError('Error calculating maxes', 'database.ts::getExercisesByUser');
				}
			}


			return exercises;
		} catch (err: any) {
			console.log(err);
			throw new DatabaseError(500, 'Error getting exercises by user', 'database.ts::getExercisesByUser');
		}
	}

	//analytics

	public async getAvailableTrackables(user_id: number): Promise<RouteTypes.TrackableMetric[]> {
		try {
			let return_value: RouteTypes.TrackableMetric[] = [];
			const query = `SELECT DISTINCT exercise.exercise_id, exercise.name FROM ( SELECT DISTINCT past_set.pe_id, past_set.set_id, past_exercise.exercise_id, past_set.reps, past_set.weight FROM past_exercise INNER JOIN past_set ON past_set.pe_id = past_exercise.pe_id WHERE user_id = ${user_id}) AS pes INNER JOIN exercise ON exercise.exercise_id = pes.exercise_id ;`
			//exericse block
			let exercises = await this.query<({ exercise_id: number, name: string })[]>(query);
			return_value = [...exercises.map((exercise) => { return { key: exercise.exercise_id, value: exercise.name } })]

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
				return_value.push({ key: key, value: key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') });
			}

			return return_value;
		}
		catch (err: any) {
			throw new DatabaseError(500, `Error getting trackables (${err})`, 'database.ts::getAvailableTrackables');
		}
	}

	public async getDataSet(user_id: number, id: string, type: 'exercise' | 'measurement') {

		type T = { [key: string]: any, date: string }
		function shouldNarrow(a: T, b: T) {
			if (!a.date || !b.date) return 0;
			const date_a = mysqlDatetimeToDate(a.date);
			const date_b = mysqlDatetimeToDate(b.date);
			if (!date_a || !date_b) return 0;
			//throw out if the dates are the same by the same day 
			if (date_a.getDate() === date_b.getDate() && date_a.getMonth() === date_b.getMonth() && date_a.getFullYear() === date_b.getFullYear()) return 0;
			return 1;
		}

		try {
			if (type === 'exercise') {
				let exercises = await this.getExercisesByUser(user_id);
				exercises = exercises.filter((exercise) => exercise.exercise_id === parseInt(id));
				for (let i = 0; i < exercises.length - 1; i++) {
					const exercise_a = exercises[i];
					const exercise_b = exercises[i + 1];
					if (shouldNarrow(exercise_a, exercise_b) === 0) {
						if (exercise_a.weight < exercise_b.weight) {
							exercises.splice(i, 1);
						} else {
							exercises.splice(i + 1, 1);
						}
						i--;
					}
				}
				return exercises;
			} else if (type === 'measurement') {
				let measurements = await this.getMeasurements(user_id);
				let measurement_list: RouteTypes.Dataset = [];
				measurement_list = measurements.map((obj) => {
					const measurement_keys = Object.keys(obj);
					for (let i = 0; i < measurement_keys.length; i++) {
						const key = measurement_keys[i];
						//@ts-ignore
						const value = obj[key];
						if (key === id && value !== null) {
							return { date: obj.date, value: value as number, metric: 'in' };
						}
					}
					return { date: '', value: 0, metric: 'in' };
				})
				measurement_list.filter((measurement) => measurement.date !== '');
				for (let i = 0; i < measurement_list.length - 1; i++) {
					const measurement_a = measurement_list[i];
					const measurement_b = measurement_list[i + 1];
					if (shouldNarrow(measurement_a, measurement_b) === 0) {
						if (measurement_a.value < measurement_b.value) {
							measurement_list.splice(i, 1);
						} else {
							measurement_list.splice(i + 1, 1);
						}
						i--;
					}
				}

				return measurement_list;
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
