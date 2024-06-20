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

export class RouteAuthenticationError extends RouteError {
	constructor(message: string, source: string) {
		super(401, message, source);
	}
}

export class RoutePermissionError extends RouteError {
	constructor(message: string, source: string) {
		super(403, message, source);
	}
}

export function returnError(res: Response, e: RouteError) {
	return res.status(e.status).json({ status: e.status, message: e.message });
}
