export class FileError extends Error {
	constructor(public readonly status: number = 404, message: string, source: string) {
		super(`[${source}]: ${message}`);
		this.name = 'FileError::' + source;
	}
}

export class FileNotFoundError extends FileError {
	constructor(message: string, source: string) {
		super(404, message, source);
	}
}

export class FileIOError extends FileError {
	constructor(message: string, source: string) {
		super(400, message, source);
	}
}
