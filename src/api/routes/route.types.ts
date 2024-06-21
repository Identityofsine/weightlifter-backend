export namespace RouteTypes {

	export type BasicResponse = {
		status: number;
		message: string;
		success: boolean;
	}

	export type WorkoutExerciseInput = {
		id: number;
		sets: number;
		reps?: number;
		time_based?: number;
	}

	export type WorkoutExercise = {
		workout_id: number;
		current_user: number;
		current_exercise: {
			id: number;
			sets?: number;
			reps?: number;
			time_based?: number;
		};

	}
}
