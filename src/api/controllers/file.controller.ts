import Database from "../../db/database";
import { FileManager } from "../../os/file";
import { RouteIOError, returnError } from "../routes/route.error";
import { Request, Response } from 'express';

export namespace FileController {
	const fm = FileManager.getInstance();
	const db = Database.getInstance();
	export async function loadFileByUser(req: Request, res: Response) {
		try {
			const user_id = req.query.user_id as string;
			const filename = req.params.filename;
			if (!user_id || !filename) {
				throw new RouteIOError('User ID or Type or Filename not provided', 'file.controller.ts::loadFileByUser');
			}
			const user_exists = await db.getUser(user_id);
			if (!user_exists) {
				return res.status(400).json({ status: 400, message: 'User not found', success: false });
			}
			const path = fm.getUserImagePath(user_id);
			const file = fm.loadFile(path + filename);
			if (!file) {
				return res.status(400).json({ status: 400, message: 'File not found', success: false });
			}
			return res.status(200).json({ status: 200, message: 'File loaded successfully', success: true, file });
		} catch (err: any) {
			returnError(res, err);
		}
	}
}
