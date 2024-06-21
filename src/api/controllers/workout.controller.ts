import { Request, Response } from 'express';
import { RouteError, RouteIOError, returnError } from '../routes/route.error';
import Database from '../../db/database';

const db = Database.getInstance();

//NOTE: This is for workout and exercises, not for any user interactions; do not expect to find logic for user interactions WITH workouts here

export namespace WorkoutController {
	export async function addWorkout(req: Request, res: Response) {
		try {
			const { name, exercises } = req.body;
			if (!name) {
				throw new RouteIOError('Workout name not provided', 'workout.controller.ts::addWorkout');
			}
			// add workout to the database
			const response = await db.addWorkout({ name, exercises });
			if (!response) {
				throw new RouteError(500, 'Error adding workout', 'workout.controller.ts::addWorkout');
			}
			if (response!.workout_id === -1) {
				throw new RouteError(500, 'Something went wrong!', 'workout.controller.ts::addWorkout');
			}
			return res.status(200).json({ status: 200, message: 'Workout added successfully', success: true, workout: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function addExercise(req: Request, res: Response) {
		try {
			const { name, description, category, time_flag } = req.body;
			if (!name) {
				throw new RouteIOError('Workout name not provided', 'workout.controller.ts::addWorkout');
			}
			// add workout to the database
			const response = await db.createExercise({ name, description, time_flag: time_flag });
			if (!response) {
				throw new RouteError(500, 'Error adding exercise', 'workout.controller.ts::addWorkout');
			}
			if (response!.exercise_id === -1) {
				throw new RouteError(400, 'Exercise already exists', 'workout.controller.ts::addWorkout');
			}
			return res.status(200).json({ status: 200, message: 'Exercise added successfully', success: true, exercise: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function addExerciseToWorkout(req: Request, res: Response) {
		try {
			const { workout_id, exercise } = req.body;
			if (!workout_id || !exercise) {
				throw new RouteIOError('Workout or Exercise not provided', 'workout.controller.ts::addExerciseToWorkout');
			}
			//check if exercise is an array
			if (!Array.isArray(exercise)) {
				throw new RouteIOError('Exercise must be an array', 'workout.controller.ts::addExerciseToWorkout');
			}
			// add workout to the database
			const response = await db.addExerciseToWorkout(workout_id, exercise);
			if (!response) {
				throw new RouteError(500, 'Error adding exercise to workout', 'workout.controller.ts::addExerciseToWorkout');
			}
			//workout_id === -1
			if (response!.workout_id === -1) {
				throw new RouteError(400, 'Exercise already exists in workout', 'workout.controller.ts::addExerciseToWorkout');
			}
			return res.status(200).json({ status: 200, message: 'Exercise added to workout successfully', success: true, workout: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getWorkout(req: Request, res: Response) {
		try {
			const workout_id_old = req.query['workout_id'] as string;

			if (!workout_id_old) {
				throw new RouteIOError('Workout ID not provided', 'workout.controller.ts::getWorkout');
			}
			if (isNaN(parseInt(workout_id_old))) {
				throw new RouteIOError('Workout ID must be a number', 'workout.controller.ts::getWorkout');
			}

			const workout_id = parseInt(workout_id_old);
			const response = await db.getWorkout(workout_id);

			if (!response) {
				throw new RouteError(500, 'Error getting workouts', 'workout.controller.ts::getWorkouts');
			}

			return res.status(200).json({ status: 200, message: 'Workouts retrieved successfully', success: true, workout: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}
}

