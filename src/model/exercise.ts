import { DatabaseTypes } from "../db/database.types";

class Exercise {
	readonly exercise_id: number;
	readonly name: string;
	readonly description: string;
	readonly sets: number;
	readonly reps?: number;
	readonly time_flag?: boolean;
	private sets_done: number = 0;
	private reps_done: number = 0;
	private weight_done: number = 0;


	constructor(exercise_id: number, name: string, description: string, sets: number, reps?: number, time_flag?: boolean) {
		this.exercise_id = exercise_id;
		this.name = name;
		this.description = description;
		this.sets = sets;
		this.reps = reps;
		this.time_flag = time_flag;
	}

	public set weight(weight: number) {
		this.weight_done = weight;
	}

	public set setsDone(sets_done: number) {
		this.sets_done = sets_done;
	}

	public set repsDone(reps_done: number) {
		this.reps_done = reps_done;
	}

	public get setsDone(): number {
		return this.sets_done;
	}

	public get repsDone(): number {
		return this.reps_done;
	}

	public get weight(): number {
		return this.weight_done;
	}

	public static copy(exercise: Exercise, reps: number, sets: number, weight: number): Exercise {
		const newExercise = new Exercise(exercise.exercise_id, exercise.name, exercise.description, exercise.sets, exercise.reps, exercise.time_flag);
		newExercise.setsDone = sets;
		newExercise.repsDone = reps;
		newExercise.weight = weight;
		return newExercise;
	}

	public static fromDatabase(exercise: DatabaseTypes.Exercise): Exercise {
		return new Exercise(exercise.exercise_id, exercise.name, exercise.description, exercise.sets ?? 4, exercise.reps, exercise.time_flag);
	}

}

export default Exercise;
