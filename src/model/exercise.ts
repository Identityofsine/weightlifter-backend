import { DatabaseTypes } from "../db/database.types";
import { Omit } from "../util/omit";

class Exercise implements Omit {
	readonly exercise_id: number;
	readonly name: string;
	readonly description: string;
	readonly sets: number;
	readonly reps?: number;
	readonly time_flag?: boolean;
	private sets_done: number = 0;
	private reps_done: number[] = [];
	private weight_done: number[] = [];


	constructor(exercise_id: number, name: string, description: string, sets: number, reps?: number, time_flag?: boolean) {
		this.exercise_id = exercise_id;
		this.name = name;
		this.description = description;
		this.sets = sets;
		this.reps = reps;
		this.time_flag = time_flag;
		this.reps_done = new Array(sets).fill(0);
		this.weight_done = new Array(sets).fill(0);
	}

	public set weight(weight: number) {
		const idx = (this.sets_done - 1 >= 0) ? this.sets_done - 1 : 0;
		this.weight_done[idx] = weight;
	}

	public set setsDone(sets_done: number) {
		this.sets_done = sets_done;
	}

	public set repsDone(reps_done: number) {
		const idx = (this.sets_done - 1 >= 0) ? this.sets_done - 1 : 0;
		this.reps_done[idx] = reps_done;
	}

	public get setsDone(): number {
		return this.sets_done;
	}

	public get repsDone(): number[] {
		return this.reps_done;
	}

	public get weight(): number[] {
		return this.weight_done;
	}

	public repsOfSet(set: number): number {
		return this.reps_done[set];
	}

	public weightOfSet(set: number): number {
		return this.weight[set];
	}

	public setWeightOfSet(set: number, weight: number) {
		this.weight_done[set] = weight;
	}

	public setRepsOfSet(set: number, reps: number) {
		this.reps_done[set] = reps;
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

	public omit() {
		return {
			exercise_id: this.exercise_id,
			name: this.name,
			description: this.description,
			sets: this.sets,
			reps: this.reps,
			time_flag: this.time_flag,
			sets_done: this.sets_done,
		};
	}

	public omit_alt() {
		return {
			exercise_id: this.exercise_id,
			name: this.name,
			description: this.description,
			sets_done: this.sets_done,
			reps_done: this.reps_done,
			weight_done: this.weight_done
		};
	}
}


export default Exercise;
