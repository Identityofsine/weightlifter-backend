import { configDotenv } from "dotenv";
import { FileIOError, FileNotFoundError } from "./file.error";
import fs from 'fs';

export class FileManager {
	private static instance: FileManager;
	private readonly path: string;
	private readonly userPFPPath: string;
	private readonly userImagePath: string;

	private constructor() {
		configDotenv();
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
			//read file into buffer
			const file = fs.readFileSync(path, 'utf8');
			return file;
		} catch (err) {
			throw new FileNotFoundError(`${path} not found.`, 'FileManager');
		}
	}

	// Save a file to the file system
	public saveFile(path: string, file: string, ext: 'png' | 'jpeg' = 'png', filename?: string) {
		path = this.escape(path);
		console.log('[FileManager]: Saving file at %s ...', path);
		try {
			filename = filename === undefined ? this.generateString(8) : filename
			while (this.fileExists(path + filename)) {
				filename = this.generateString(8);
			}
			fs.writeFileSync(path + filename + '.' + ext, this.decodeBase64Image(file).data);
			return filename + '.' + ext;
		} catch (err) {
			const error = new FileIOError(`Error saving file at ${path}`, 'FileManager');
			console.error(error + ':' + err);
			throw error;
		}
	}

	public saveIntoUser(user_id: string, file: string, ext: 'png' | 'jpeg' = 'png', filename?: string) {
		const path = this.getUserImagePath(user_id);
		//create the path if it does not exist
		try {
			console.log('[FileManager]: Check if %s exists', path)
			this.createFullPath(path);
			return this.saveFile(path, file, ext, filename);
		}
		catch (err) {
			const error = new FileIOError(`Error saving file at ${path}`, 'FileManager');
			console.error(error + ':' + err);
			throw error;
		}
	}

	public loadFromUser(user_id: string, filename: string) {
		const path = this.getUserImagePath(user_id);
		try {
			return this.loadFile(path + filename);
		}
		catch (err) {
			const error = new FileIOError(`Error loading file at ${path}`, 'FileManager');
			console.error(error + ':' + err);
			throw error;
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

	private createFullPath(path: string) {
		const parts = path.split('/');
		let current = '';
		try {
			parts.forEach(part => {
				current += part + '/';
				if (!fs.existsSync(current)) {
					fs.mkdirSync(current);
				}
			});
		}
		catch (err) {
			const error = new FileIOError(`Error creating path at ${path}`, 'FileManager');
			console.error(error + ':' + err);
			throw error;
		}
	}

	private fileExists(path: string) {
		return fs.existsSync(path);
	}

	private generateString(length: number) {
		let result = '';
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charactersLength = characters.length;
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	private createPathIfDoesNotExist(path: string) {
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
	}

	private decodeBase64Image(dataString: string) {
		const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
		if (matches === null || matches.length !== 3) {
			throw new FileIOError('Invalid input string', 'FileManager');
		}
		return {
			type: matches[1],
			data: Buffer.from(matches[2], 'base64')
		};
	}


	// Making sure the path is correct 
	private escape(path: string) {
		return path.replace(/\\/g, '/');
	}

}
