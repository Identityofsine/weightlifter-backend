import Database from "../../db/database";
import { FileManager } from "../../os/file";
import { RouteIOError, returnError } from "../routes/route.error";
import { Request, Response } from 'express';

export namespace FileController {
	const fm = FileManager.getInstance();
	const db = Database.getInstance();
	export async function loadFileByUser(req: Request, res: Response) {
		try {
			const user_id = req.query.user_id as any;
			const filename = req.params.filename;
			if (!user_id || !filename) {
				throw new RouteIOError('User ID or Type or Filename not provided', 'file.controller.ts::loadFileByUser');
			}
			if (isNaN(user_id)) {
				return res.status(400).json({ status: 400, message: 'Invalid User ID', success: false });
			}
			const user_exists = await db.getUserById(user_id);
			if (!user_exists) {
				return res.status(400).json({ status: 400, message: 'User not found', success: false });
			}
			const path = fm.getUserImagePath(user_id);
			const file = fm.loadFile(path + filename);
			if (!file) {
				return res.status(400).json({ status: 400, message: 'File not found', success: false });
			}
			//send raw file data
			return res.status(200).sendFile(path + filename);
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function getPFP(req: Request, res: Response) {
		try {
			const user_id = req.query.user_id as any;
			if (!user_id) {
				throw new RouteIOError('User ID not provided', 'file.controller.ts::getPFP');
			}
			if (isNaN(user_id)) {
				return res.status(400).json({ status: 400, message: 'Invalid User ID', success: false });
			}
			const user_exists = await db.getUserById(user_id);
			if (!user_exists) {
				return res.status(400).json({ status: 400, message: 'User not found', success: false });
			}
			const file_id = user_exists.pfp_id;
			const path = fm.getUserImagePath(user_id);
			const file = fm.loadFile(path + file_id);
			if (!file) {
				return res.status(400).json({ status: 400, message: 'File not found', success: false });
			}
			//send raw file data
			return res.status(200).sendFile(path + file_id);
		} catch (err: any) {
			returnError(res, err);
		}
	}
}
