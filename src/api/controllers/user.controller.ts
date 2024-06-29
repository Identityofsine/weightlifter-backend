import { Request, Response } from 'express';
import { RouteError, RouteIOError, returnError } from '../routes/route.error';
import Database from '../../db/database';

const db = Database.getInstance();

export namespace UserController {

	export async function login(req: Request, res: Response) {
		try {
			const { nfc_key } = req.body;
			if (!nfc_key) {
				return res.status(400).json({ status: 400, message: 'NFC key not provided', success: false });
			}
			const user = await db.authenticateUser(null, null, nfc_key);
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
}
