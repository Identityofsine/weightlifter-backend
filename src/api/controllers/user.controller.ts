import { Request, Response } from 'express';
import { RouteError, RouteIOError, returnError } from '../routes/route.error';
import Database from '../../db/database';

const db = Database.getInstance();

export namespace UserController {

	export async function login(req: Request, res: Response) {
		try {
			const { username, password, nfc_key } = req.body;
			console.log(req.body)
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

}
