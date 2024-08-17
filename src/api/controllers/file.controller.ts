import Database from "../../db/database";
import { FileManager } from "../../os/file";
import { RouteIOError, returnError } from "../routes/route.error";
import { Request, Response } from 'express';
import { RouteTypes } from "../routes/route.types";
import WeightLifterSettings from "../../../settings";
import { isJPG, isPNG } from "../../os/file.verify";

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
			const file_id = (await db.getPFP(user_id)).filename;
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

	export async function getImages(req: Request, res: Response) {
		try {
			const user_id = req.query.user_id as any;
			if (!user_id) {
				throw new RouteIOError('User ID not provided', 'file.controller.ts::getImages');
			}
			if (isNaN(user_id)) {
				return res.status(400).json({ status: 400, message: 'Invalid User ID', success: false });
			}
			const user_exists = await db.getUserById(user_id);
			if (!user_exists) {
				return res.status(400).json({ status: 400, message: 'User not found', success: false });
			}
			console.log("Images founds...");
			const images = await db.getImages(user_id);
			const paths: RouteTypes.Image[] = images.map(img => {
				return {
					path: WeightLifterSettings.webPath + `/v1/file/${img.filename}?user_id=${user_id}`,
					date: img.created_at
				}
			})
			return res.status(200).json({ status: 200, message: 'Files found', success: true, paths: paths });
		} catch (err: any) {
			returnError(res, err);
		}
	}

	export async function submitPhoto(req: Request, res: Response) {
		try {
			const user_id = req.body.user_id as any;
			const file = req.body.file as string; //base64
			if (!user_id || !file) {
				throw new RouteIOError('User ID or File not provided', 'file.controller.ts::submitPhoto');
			}
			if (isPNG(file) === false && isJPG(file) === false) {
				return res.status(400).json({ status: 400, message: 'Invalid file type', success: false });
			}
			if (isNaN(user_id)) {
				return res.status(400).json({ status: 400, message: 'Invalid User ID', success: false });
			}
			const user_exists = await db.getUserById(user_id);
			if (!user_exists) {
				return res.status(400).json({ status: 400, message: 'User not found', success: false });
			}
			const filename = fm.saveIntoUser(user_id, file);
			const image = await db.addImage(user_id, filename);
			return res.status(200).json({ status: 200, message: 'File saved', success: true, image: image });
		} catch (err: any) {
			returnError(res, err);
		}
	}

}
