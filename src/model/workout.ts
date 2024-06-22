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
		this.exercises.on('onPointerMove', (args: Exercise) => {
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
					user.editExercise(exercise.exercise_id, exercise.setsDone + 1, reps, weight);
				} else {
					user.addExercise(Exercise.copy(exercise, reps, 1, weight));
				}
				this.next();
			}
			if (this.finished) {
				Database.getInstance().finishWorkout(this);
				WorkoutInstances.remove(this.cw_id);
			}
		} else {
			throw new RouteError(500, 'Error completing set', 'workout.ts::complete_set');
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


