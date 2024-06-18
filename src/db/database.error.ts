export class DatabaseError extends Error {
	constructor(public readonly status: number = 500, message: string, source: string) {
		super(`[${source}]: ${message}`);
		this.name = 'DatabaseError::' + source;
	}
}

export class AuthenticationError extends DatabaseError {
	constructor(message: string, source: string) {
		super(401, message, source);
	}
}

export class PermissionError extends DatabaseError {
	constructor(message: string, source: string) {
		super(403, message, source);
	}
}