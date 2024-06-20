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
}
