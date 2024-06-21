import Exercise from "./exercise";

class User {
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

	editExercise(exercise_id: number, sets: number, reps: number, weight: number) {
		const exercise = this.exercises.find(exercise => exercise.exercise_id === exercise_id);
		if (exercise) {
			exercise.setsDone = sets;
			exercise.repsDone = reps;
			exercise.weight = weight;
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

}

export default User;
