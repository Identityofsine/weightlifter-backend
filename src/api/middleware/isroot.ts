import Database from "../../db/database";

const db = Database.getInstance();

export const isRoot = async (req: any, res: any, next: any) => {
	try {
		// check through the headers of user_id and token
		const user_id = req.headers['user-id'];
		//const token = req.headers['token']; 

		const user = await db.getUserById(user_id);
		if (user.permission & 0b0100) {
			return next();
		}
		else {
			return res.status(403).json({ status: 403, message: 'Permission denied' });
		}

	} catch (e: any) {
		return res.status(500).json({ status: 500, message: `An error occurred: ${e.message}` });
	}
}
