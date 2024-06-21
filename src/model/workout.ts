import { randomizeNumber } from "../algorithim";
import { DatabaseTypes } from "../db/database.types";
import Exercise from "./exercise";
import OrderedList from "./orderlist";
import User from "./user";

export class Workout {
	readonly cw_id: number;
	readonly workout_id: number;
	readonly name: string;
	readonly exercises: OrderedList<Exercise>;
	users: OrderedList<User>;

	constructor(workout_id: number, name: string, exercises: DatabaseTypes.Exercise[]) {
		this.cw_id = randomizeNumber(6);
		this.workout_id = workout_id;
		this.name = name;
		this.exercises = new OrderedList<Exercise>(exercises.map(e => Exercise.fromDatabase(e)));
		this.users = new OrderedList<User>();
		this.users.on('onPointerReset', (args: User) => {
			if (!this.exercises.current) {
				return;
			}
			this.exercises.current.setsDone = this.exercises.current.setsDone + 1;
			if (this.exercises.current.setsDone >= this.exercises.current.sets) {
				this.exercises.next();
			}
		});
		this.exercises.on('onPointerReset', (args: Exercise) => {
			console.log('Exercise done');
			//end_workout
		});
	}

	public addUser(user: User) {
		this.users.add(user);
	}

	private next() {
		this.users.next();
	}

	public complete_set(reps: number, weight: number) {
		const user = this.users.current;
		if (user) {
			const exercise = this.exercises.current;
			if (exercise) {
				if (user.getExercise(exercise.exercise_id)) {
					user.editExercise(exercise.exercise_id, exercise.setsDone + 1, reps, weight);
				} else {
					user.addExercise(Exercise.copy(exercise, 1, reps, weight));
				}
				this.next();
			}
		}
	}

	public skip() {
		this.users.next();
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

	public static remove(workout_id: number) {
		this.workoutInstances.remove(workout_id);
	}
}


