import { DatabaseTypes } from "../db/database.types";
import { Omit } from "../util/omit";
import Exercise from "./exercise";

class User implements Omit<User> {
	public readonly user_id: number;
	public readonly username: string;
	private exercises: Exercise[] = [];
	constructor(user_id: number, username: string) {
		this.user_id = user_id;
		this.username = username;
	}

	addExercise(exercise: Exercise) {
		this.exercises.push(exercise);
	}

	editExercise(exercise_id: number, set_id?: number, set?: number, reps?: number, weight?: number) {
		const exercise = this.exercises.find(exercise => exercise.exercise_id === exercise_id);
		if (exercise) {
			if (set_id) {
				set_id = set_id - 1 < 0 ? 0 : set_id - 1;
				exercise.setRepsOfSet(set_id, reps || exercise.repsOfSet(set_id));
				exercise.setWeightOfSet(set_id, weight || exercise.weightOfSet(set_id))
			} else if (set) {
				exercise.setsDone = set;
				exercise.repsDone = reps ?? 0;
				exercise.weight = weight ?? 0;
			}
		}
	}

	getExercises(): Exercise[] {
		return this.exercises;
	}

	removeExercise(exercise_id: number) {
		this.exercises = this.exercises.filter(exercise => exercise.exercise_id !== exercise_id);
	}

	getExercise(exercise_id: number): Exercise | undefined {
		return this.exercises.find(exercise => exercise.exercise_id === exercise_id);
	}

	public static fromDatabase(data: DatabaseTypes.User): User {
		return new User(data.user_id, data.username);
	}

	public omit() {
		return {
			user_id: this.user_id,
			username: this.username,
			exercises: this.exercises.map(exercise => exercise.omit_alt())
		};
	}

}

export default User;
