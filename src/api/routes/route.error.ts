import { Response } from 'express'

export class RouteError extends Error {
	constructor(public readonly status: number = 500, message: string, source: string) {
		super(`[${source}]: ${message}`);
		this.name = 'RouteError::' + source;
	}
}

export class RouteIOError extends RouteError {
	constructor(message: string, source: string) {
		super(400, message, source);
	}
}

export function returnError(res: Response, e: RouteError) {
	return res.status(e.status).json({ status: e.status, message: e.message });
}
