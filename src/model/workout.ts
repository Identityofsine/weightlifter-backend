import { randomizeNumber } from "../algorithim";
import { RouteError, RoutePermissionError } from "../api/routes/route.error";
import Database from "../db/database";
import { DatabaseTypes } from "../db/database.types";
import Exercise from "./exercise";
import OrderedList from "./orderlist";
import User from "./user";
import { Omit } from '../util/omit';

export class Workout implements Omit {
	readonly cw_id: number;
	readonly workout_id: number;
	readonly name: string;
	readonly exercises: OrderedList<Exercise>;
	users: OrderedList<User>;
	private current_user: User | undefined;
	private current_exercise: number = 0;
	private finished: boolean = false;

	constructor(workout_id: number, name: string, exercises: DatabaseTypes.Exercise[]) {
		this.cw_id = randomizeNumber(6);
		this.workout_id = workout_id;
		this.name = name;
		this.exercises = new OrderedList<Exercise>(exercises.map(e => Exercise.fromDatabase(e)));
		this.users = new OrderedList<User>();
		this.users.on('onPointerReset', (args: User) => {
			this.current_user = args;
			if (!this.exercises.current) {
				return;
			}
			this.exercises.current.setsDone = this.exercises.current.setsDone + 1;
			if (this.exercises.current.setsDone >= this.exercises.current.sets) {
				this.exercises.next();
			}
		});
		this.users.on('onPointerMove', (args: User) => {
			this.current_user = args;
		});
		this.exercises.on('onPointerMove', (args: Exercise, pointer: number) => {
			this.current_exercise = pointer;
		});
		this.exercises.on('onPointerReset', (args: Exercise) => {
			//end_workout
			this.finished = true;
		});
	}

	public addUser(user: User) {
		if (this.users.all.length === 0) {
			this.current_user = user;
		}
		this.users.add(user);
	}

	private next() {
		this.users.next();
	}

	public complete_set(user_id: number, reps: number, weight: number): Workout {
		const user = this.users.current;
		if (user) {
			if (user.user_id !== user_id) {
				throw new RoutePermissionError('User does not have permission to complete set', 'workout.ts::complete_set');
			}
			const exercise = this.exercises.current;
			if (exercise) {
				if (user.getExercise(exercise.exercise_id)) {
					user.editExercise(exercise.exercise_id, undefined, exercise.setsDone + 1, reps, weight);
				} else {
					user.addExercise(Exercise.copy(exercise, reps, 1, weight));
				}
				this.next();
			} else {
				throw new WorkoutError(404, 'Exercise not found', 'workout.ts::complete_set');
			}
			if (this.finished) {
				Database.getInstance().finishWorkout(this);
				WorkoutInstances.remove(this.cw_id);
			}
		} else {
			throw new WorkoutError(500, 'No user found', 'workout.ts::complete_set');
		}
		return this;
	}

	public edit_set(user_id: number, exercise_id: number, set: number, reps?: number, weight?: number): Workout {
		const user = this.users.find((u) => u.user_id === user_id);
		if (user) {
			const exercise = this.exercises.find((e) => e.exercise_id === exercise_id);
			if (exercise) {
				user.editExercise(exercise_id, set, undefined, reps, weight);
			} else {
				throw new WorkoutError(404, 'Exercise not found', 'workout');
			}
		} else {
			throw new WorkoutError(500, 'No user found', 'workout.ts::edit_set');
		}
		return this;
	}

	public get currentuser(): User | undefined {
		return this.current_user;
	}

	public skip() {
		this.users.next();
	}

	public omit() {
		return {
			...this,
			exercises: this.exercises.all.map(e => e.omit()),
			users: this.users.all.map(u => u.omit()),
			current_user: this.current_user?.omit()
		}
	}


}

export class WorkoutError extends RouteError {
	constructor(public readonly status: number = 500, message: string, source: string) {
		super(status, message, source);
		this.name = 'WorkoutError::' + source;
	}
}

export class WorkoutInstances {
	private static workoutInstances: OrderedList<Workout> = new OrderedList<Workout>();

	private constructor() { }

	public static add(workout: Workout) {
		this.workoutInstances.add(workout);
	}

	public static get(cw_id: number): Workout | undefined {
		return this.workoutInstances.find((w) => w.cw_id === cw_id);
	}

	public static find(callback: (workout: Workout) => boolean): Workout | undefined {
		return this.workoutInstances.find(callback);
	}

	public static remove(cw_id: number) {
		this.workoutInstances.removeIf((w) => w.cw_id === cw_id);
	}
}


