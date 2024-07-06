import { Request, Response } from 'express';
import { RouteError, RouteIOError, returnError } from '../routes/route.error';
import Database from '../../db/database';

const db = Database.getInstance();

export namespace UserController {

	export async function login(req: Request, res: Response) {
		try {
			const { username, password, nfc_key } = req.body;
			if ((!username || !password) && !nfc_key) {
				throw new RouteIOError('Username or Password not provided', 'user.controller.ts::login');
			} else if (username && password && nfc_key) {
				throw new RouteIOError('Username and Password and NFC Key provided', 'user.controller.ts::login');
			}
			const user = await db.authenticateUser(username, password, nfc_key);
			if (!user) {
				return res.status(400).json({ status: 400, message: 'User not found', success: false });
			}
			return res.status(200).json({ status: 200, message: 'User found', success: true, user });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function addUser(req: Request, res: Response) {
		try {
			const { username, password, name, permission } = req.body;
			if (!username || !password || !name) {
				throw new RouteIOError('Username or password not provided', 'user.controller.ts::addUser');
			}
			// add user to the database
			const response = await db.addUser(username, password, name, permission ? permission : 0);
			if (!response) {
				throw new RouteError(500, 'Error adding user', 'user.controller.ts::addUser');
			}
			return res.status(200).json({ status: 200, message: 'User added successfully', success: true, response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function logMeasurement(req: Request, res: Response) {
		try {
			const { measurement } = req.body;
			if (!measurement) {
				throw new RouteIOError('User ID, Measurement, or Timestamp not provided', 'user.controller.ts::logMeasurement');
			}
			const response = await db.submitMeasurement(measurement);
			return res.status(200).json({ status: 200, message: 'Measurement logged successfully', success: true, response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}


	export async function getLatestMeasurements(req: Request, res: Response) {
		try {
			const user_id = req.query['user_id'] as any as number;
			if (!user_id || isNaN(user_id)) {
				throw new RouteIOError('User ID', 'user.controller.ts::logMeasurement');
			}
			const response = await db.getLatestMeasurement(user_id);
			return res.status(200).json({ status: 200, message: 'Measurement logged successfully', success: true, measurement: response });
		}
		catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getMeasurements(req: Request, res: Response) {
		try {
			const user_id = req.query['user_id'] as any as number;
			const limit = req.query['limit'] as any as number;
			if (!user_id || isNaN(user_id)) {
				throw new RouteIOError('User ID', 'user.controller.ts::getMeasurements');
			}
			if (limit && isNaN(limit)) {
				throw new RouteIOError('Limit isn\'t a number', 'user.controller.ts::getMeasurements');
			}
			const response = await db.getMeasurements(user_id, limit ?? 0);
			return res.status(200).json({ status: 200, message: 'Measurement logged successfully', success: true, measurements: response });
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getPastExercises(req: Request, res: Response) {
		try {
			const user_id = req.query['user_id'] as any as number;
			const limit = req.query['limit'] as any as number;
			if (!user_id || isNaN(user_id)) {
				throw new RouteIOError('User ID', 'user.controller.ts::getPastExercises');
			}
			if (limit && isNaN(limit)) {
				throw new RouteIOError('Limit isn\'t a number', 'user.controller.ts::getPastExercises');
			}
			const response = await db.getExercisesByUser(user_id);
			return res.status(200).json({ status: 200, message: 'Returned Exercises', success: true, exercises: response });
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getPossibleAnalytics(req: Request, res: Response) {
		try {
			const user_id = req.query['user_id'] as any as number;
			if (!user_id || isNaN(user_id)) {
				throw new RouteIOError('User ID', 'user.controller.ts::getPossibleAnalytics');
			}
			const response = await db.getAvailableTrackables(user_id);
			return res.status(200).json({ status: 200, message: 'Returned Analytics', success: true, analytics: response });
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getDataAnalytics(req: Request, res: Response) {
		try {
			const user_id = req.query['user_id'] as any as number;
			const id = req.query['id'] as any as string;
			const type = req.query['type'] as any as number; // 0 --> 1 measurement --> exercise
			if (!user_id || isNaN(user_id) || !type || !id || isNaN(type)) {
				throw new RouteIOError('User ID or ID or Type missing', 'user.controller.ts::getDataAnalytics');
			}
			const response = await db.getDataSet(user_id, id, parseInt(type as any as string) === 0 ? 'measurement' : 'exercise');
			return res.status(200).json({ status: 200, message: 'Returned Analytics', success: true, analytics: response });
		} catch (err: any) {
			returnError(res, err);
		}
	}

}
