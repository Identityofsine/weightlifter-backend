import { Request, Response } from 'express';
import { omit } from '../../util/omit'
import { RouteError, RouteIOError, returnError } from '../routes/route.error';
import Database from '../../db/database';
import { Workout, WorkoutInstances } from '../../model/workout';
import User from '../../model/user';

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
			//workout_id
			const workout_id_old = req.query['workout_id'] as string;

			//workout_id_old
			if (!workout_id_old) {
				throw new RouteIOError('Workout ID not provided', 'workout.controller.ts::getWorkout');
			}
			if (isNaN(parseInt(workout_id_old))) {
				throw new RouteIOError('Workout ID must be a number', 'workout.controller.ts::getWorkout');
			}

			//workout_id
			const workout_id = parseInt(workout_id_old);
			const response = await db.getWorkout(workout_id);

			//response
			if (!response) {
				throw new RouteError(500, 'Error getting workouts', 'workout.controller.ts::getWorkouts');
			}

			return res.status(200).json({ status: 200, message: 'Workouts retrieved successfully', success: true, workout: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getWorkouts(req: Request, res: Response) {
		try {
			const response = await db.getWorkouts();
			if (!response) {
				throw new RouteError(500, 'Error getting workouts', 'workout.controller.ts::getWorkouts');
			}
			return res.status(200).json({ status: 200, message: 'Workouts retrieved successfully', success: true, workouts: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getExercise(req: Request, res: Response) {
		try {
			const exercise_id_old = req.query['exercise_id'] as string;
			if (!exercise_id_old) {
				throw new RouteIOError('Exercise ID not provided', 'workout.controller.ts::getExercise');
			}
			if (isNaN(parseInt(exercise_id_old))) {
				throw new RouteIOError('Exercise ID must be a number', 'workout.controller.ts::getExercise');
			}
			const exercise_id = parseInt(exercise_id_old);
			const response = await db.getExercise(exercise_id);
			if (!response) {
				throw new RouteError(500, 'Error getting exercise', 'workout.controller.ts::getExercise');
			}
			return res.status(200).json({ status: 200, message: 'Exercise retrieved successfully', success: true, exercise: response });
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function startWorkout(req: Request, res: Response) {
		try {
			const workout_id = req.body['workout_id'] as number;
			const users = req.body['users'] as number[];

			const workout = await db.getWorkout(workout_id);
			const user = await db.getUsersByIDs(users);

			if (!workout || !user) {
				throw new RouteIOError('Workout or user not found', 'workout.controller.ts::startWorkout');
			}
			const newWorkout = new Workout(workout_id, workout.name, workout.exercises);
			WorkoutInstances.add(newWorkout);
			user.forEach(u => newWorkout.addUser(User.fromDatabase(u)));

			const response = WorkoutInstances.get(newWorkout.cw_id);

			if (!response) {
				throw new RouteError(500, 'Error starting workout', 'workout.controller.ts::startWorkout');
			}
			return res.status(200).json({ status: 200, message: 'Workout started successfully', success: true, workout: response.omit() });
		} catch (err: any) {
			returnError(res, err);
		}
	}
	export async function completeSet(req: Request, res: Response) {
		try {
			const cw_id = req.body['cw_id'] as number;
			const reps = req.body['reps'] as number;
			const weight = req.body['weight'] as number;
			const user_id = parseInt(req.headers['user-id'] as string);

			if (reps === undefined || weight === undefined) {
				throw new RouteIOError('Missing required fields', 'workout.controller.ts::completeSet');
			}

			if (!cw_id || reps < 0 || weight < 0 || !user_id) {
				throw new RouteIOError('Missing required fields', 'workout.controller.ts::completeSet');
			}

			const workout = WorkoutInstances.get(cw_id);

			if (!workout) {
				throw new RouteIOError('Workout not found', 'workout.controller.ts::completeSet');
			}

			const workout_new = workout.complete_set(user_id, reps, weight).omit();

			return res.status(200).json({ status: 200, message: 'Set completed successfully', success: true, workout: workout_new });
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function editSet(req: Request, res: Response) {
		try {
			//variable declaration 
			const cw_id = req.body['cw_id'] as number;
			const exercise_id = req.body['exercise_id'] as number;
			const set = req.body['set'] as number;
			const user_id = parseInt(req.headers['user-id'] as string);
			const reps = req.body['reps'] as number | undefined;
			const weight = req.body['weight'] as number | undefined;

			const workout = WorkoutInstances.get(cw_id);
			if (!workout) {
				throw new RouteIOError('Either the workout never existed or it has been finished, please use a different route for modifying old workout data', 'workout.controller.ts::editSet');
			}

			const new_workout = workout.edit_set(user_id, exercise_id, set, reps, weight).omit();

			return res.status(200).json({ status: 200, message: 'Set edited successfully', success: true, workout: new_workout });

		} catch (err: any) {
			returnError(res, err);
		}
	}
}

