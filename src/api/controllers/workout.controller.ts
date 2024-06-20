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
			const response = await db.createExercise({ name, description, time_based: time_flag });
			if (!response) {
				throw new RouteError(500, 'Error adding exercise', 'workout.controller.ts::addWorkout');
			}
			return res.status(200).json({ status: 200, message: 'Exercise added successfully', success: true, exercise: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}
}

