export namespace DatabaseTypes {
	export type User = {
		user_id: number;
		username: string;
		password: string;
		name: string;
		nfc_key: string;
		permission: number;
		pfp_id: number;
		pfp: string
	}

	export type UserToken = {
		user_id: number;
		accesstoken: string;
		refreshtoken: string;
	}

	export type Image = {
		image_id: number;
		user_id: number;
		filename: string;
		created_at: string;
	}

	export type Exercise = {
		exercise_id: number;
		name: string;
		description: string;
		sets?: number;
		reps?: number;
		time_flag?: boolean;
		date?: string;
	}

	export type Workout = {
		workout_id: number;
		name: string;
		exercises: Exercise[];
	}

	export type ActiveWorkout = {
		aw_id: number;
		workout_id: number;
		current_user: number,
		current_exercise?: Exercise,
		next_exercise: Exercise[],
	}

	export type Measurement = {
		measurement_id: number;
		user_id: number;
		date: string;
	} & Measuresables

	export type Measuresables = Partial<{
		weight: number;
		bodyfat: number;
		neck: number;
		back: number;
		shoulders: number;
		chest: number;
		waist: number;
		left_arm: number;
		right_arm: number;
		left_forearm: number;
		right_forearm: number;
		left_quad: number;
		right_quad: number;
	}>

	export type ExerciseLog = {
		pe_id: number;
		set_id: number;
		exercise_id: number;
		reps: number;
		weight: number;
		name: string;
		sets: number;
		date: string;
	};

}
