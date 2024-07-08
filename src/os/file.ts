import { FileIOError, FileNotFoundError } from "./file.error";
import fs from 'fs';

export class FileManager {
	private static instance: FileManager;
	private readonly path: string;
	private readonly userPFPPath: string;
	private readonly userImagePath: string;

	private constructor() {
		if (!process.env.FILE_PATH) {
			throw new FileIOError('FILE_PATH not set', 'FileManager');
		}
		this.path = process.env.FILE_PATH ?? '';
		this.userPFPPath = this.path + '/user/%s/pfp/';
		this.userImagePath = this.path + '/user/%s/image/';
		this.first_init();
		console.log('[FileManager]: File path set to ' + this.path);
	}

	public static getInstance() {
		if (!FileManager.instance) {
			FileManager.instance = new FileManager();
		}
		return FileManager.instance;
	}

	private first_init() {
		this.createPathIfDoesNotExist(this.path);
		this.createPathIfDoesNotExist(this.path + '/user');
	}

	// Load a file from the file system -- should return data from the file
	public loadFile(path: string): string {
		path = this.escape(path);
		console.log('[FileManager]: Loading file at %s ...', path);
		try {
			const file = fs.readFileSync(path, 'utf8')
			return file;
		} catch (err) {
			throw new FileNotFoundError(`${path} not found.`, 'FileManager');
		}
	}

	// Save a file to the file system
	public saveFile(path: string, file: string) {
		path = this.escape(path);
		console.log('[FileManager]: Saving file at %s ...', path);
		try {
			fs.writeFileSync(path, file);
		} catch (err) {
			throw new FileIOError(`Error saving file at ${path}`, 'FileManager');
		}
	}

	public getUserPath(user_id: string) {
		return this.path + '/user/' + user_id;
	}

	public getUserPFPPath(user_id: string) {
		return this.userPFPPath.replace('%s', user_id);
	}

	public getUserImagePath(user_id: string) {
		return this.userImagePath.replace('%s', user_id);
	}

	private createPathIfDoesNotExist(path: string) {
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
	}


	// Making sure the path is correct 
	private escape(path: string) {
		return path.replace(/\\/g, '/');
	}

}
