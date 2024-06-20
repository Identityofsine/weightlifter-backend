import { Request, Response } from 'express';
import { RouteError, RouteIOError, returnError } from '../routes/route.error';
import Database from '../../db/database';

const db = Database.getInstance();

export namespace UserController {
	export async function addUser(req: Request, res: Response) {
		try {
			const { username, password } = req.body;
			if (!username || !password) {
				throw new RouteIOError('Username or password not provided', 'user.controller.ts::addUser');
			}
			// add user to the database
			const response = await db.addUser(username, password);
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
