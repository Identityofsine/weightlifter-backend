export namespace DatabaseTypes {
	export type User = {
		user_id: number;
		username: string;
		password: string;
		nfc_key: string;
		permission: number;
	}

	export type UserToken = {
		user_id: number;
		accesstoken: string;
		refreshtoken: string;
	}

	export type Exercise = {
		exercise_id: number;
		name: string;
		description: string;
		sets?: number;
		reps?: number;
		time_flag?: boolean;
	}

	export type Workout = {
		workout_id: number;
		name: string;
		exercises: Exercise[];
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

}
