import Database from "../../db/database";
import { DatabaseError } from "../../db/database.error";
import { RouteError, RouteIOError, RoutePermissionError, returnError } from "../routes/route.error";

const db = Database.getInstance();

export const isRoot = async (req: any, res: any, next: any) => {
	try {
		// check through the headers of user_id and token
		const user_id = req.headers['user-id'];
		const token = req.headers['token'];
		if (!user_id || !token) {
			throw new RouteIOError('User ID or token not provided', 'isroot.ts::isRoot');
		}

		//FIX: please use token to verify that the user is who they say they are
		const user = await db.getUserById(user_id);
		if (user.permission & 0b0100) {
			return next();
		}
		else {
			throw new RoutePermissionError('User does not have permission', 'isroot.ts::isRoot');
		}

	} catch (e: any) {
		if (e instanceof DatabaseError || e instanceof RouteError) {
			returnError(res, e);
		}
	}
}
