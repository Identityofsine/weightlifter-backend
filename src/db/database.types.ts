namespace DatabaseTypes {
	export type User = {
		user_id: number;
		username: string;
		password: string;
		nfc_key: string;
		permission: number;
	}

	export type Exercise = {
		exercise_id: number;
		name: string;
		description: string;
		sets?: number;
		reps?: number;
		time_based?: boolean;
	}

	export type Workout = {
		workout_id: number;
		exercises: Exercise[];
	}

	export type Measurement = {
		measurement_id: number;
		user_id: number;
		date: string;
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
	}

}
