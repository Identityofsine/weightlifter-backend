import mysql from 'mysql2';
import { AlreadyExistsError, AuthenticationError, DatabaseError, DatabaseIOError, NotFoundError } from './database.error';
import { DatabaseTypes } from './database.types';
import nfc_hash from '../nfc';

export default class Database {
	private static instance: Database;
	private _connection: mysql.Pool;
	private constructor() {
		this._connection = mysql.createPool({
			host: 'db',
			port: 3306,
			user: 'weightlifter',
			password: 'weightlifter',
			database: 'weightlifter',
		});
		this.connection.on('connection', (_err) => {
			console.log('Connected to database!');
		});
		this.connection.on('error', (_err) => {
			console.log('Error in database connection: ' + _err);
		});
	}

	public static getInstance() {
		if (!Database.instance) {
			Database.instance = new Database();
		}
		return Database.instance;
	}

	private get connection(): mysql.Pool {
		if (!this._connection)
			throw new Error('No connection to database');
		return this._connection;
	}

	private async escape(str: String): Promise<String> {
		return new Promise((resolve, reject) => {
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::escape'));
					return;
				} else {
					resolve(con.escape(str));
				}
			});
		});
	}

	private async query<T extends any>(query: string): Promise<T> {
		const response = await new Promise((resolve, reject) => {
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::query'));
					return;
				} else {
					//reduce chance of sql injection
					con.query(query, (err, results, fields) => {
						if (err) {
							console.log('Error in query::' + err);
							con.release();
							reject(err);
						} else {
							console.log('[database.ts::query] Query successful');
							con.release();
							resolve(results as T);
						}
					})
				}
			});
		});
		return response as T;
	}

	private async atleastOne(query: string): Promise<boolean> {
		const response = await this.query<any[]>(query);
		return response.length > 0 && response[0] !== undefined;
	}

	public async setUserNFC(username: string, nfc: string): Promise<boolean> {
		try {
			username = await this.escape(username) as string;
			nfc = await this.escape(nfc) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = '${username}'`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::setUserNFC');
			}
			await this.query(`UPDATE user SET nfc = '${nfc}' WHERE username = '${username}'`);
			return true;
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return false;
		}
	}

	public async addUser(username: string, password: string): Promise<boolean> {
		try {
			username = await this.escape(username) as string;
			password = await this.escape(password) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (user_exists) {
				throw new AlreadyExistsError('User already exists', 'database.ts::addUser');
			}
			await this.query(`INSERT INTO user (username, password) VALUES (${username}, ${password})`);
			await this.setUserNFC(username, nfc_hash());
			return true;
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return false;
		}
	}

	public async getUser(username: string): Promise<DatabaseTypes.User> {
		try {
			username = await this.escape(username) as string;
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getUser');
			}
			const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM user WHERE username = ${username}`);
			return user[0];
		}
		catch (err: any) {
			if (err instanceof NotFoundError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', nfc_key: '', permission: 0 };
		}
	}

	public async getUserById(user_id: number): Promise<DatabaseTypes.User> {
		if (!user_id || user_id < 0) {
			throw new DatabaseIOError('Invalid user_id', 'database.ts::getUserById');
		}
		try {
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE user_id = '${user_id}'`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getUserById');
			}
			const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM user WHERE user_id = '${user_id}'`);
			if (!user || user.length === 0) {
				throw new NotFoundError('User not found', 'database.ts::getUserById');
			}
			return user?.[0];
		}
		catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', nfc_key: '', permission: 0 };
		}
	}

	public async authenticateUser(username: string, token?: string, nfc?: string): Promise<boolean> {
		try {
			username = await this.escape(username) as string;
			if (!token && !nfc) {
				throw new DatabaseIOError('No authentication method provided', 'database.ts::authenticateUser');
			}
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::authenticateUser');
			}
			const user = await this.getUser(username);
			if (token && nfc) {
				throw new DatabaseError(400, 'Cannot authenticate with both token and nfc', 'database.ts::authenticateUser');
			}
			if (token) {
				if (user.nfc_key !== token) {
					throw new AuthenticationError('Incorrect token', 'database.ts::authenticateUser');
				}
			} else if (nfc) {
				if (user.nfc_key !== nfc) {
					throw new AuthenticationError('Incorrect nfc', 'database.ts::authenticateUser');
				}
			}
			return true;
		} catch (err: any) {
			return false;
		}
	}

	public async logUserIn(username: string, password?: string, nfc?: string): Promise<DatabaseTypes.UserToken> {
		try {
			username = await this.escape(username) as string;
			if (!password && !nfc) {
				throw new DatabaseIOError('No authentication method provided', 'database.ts::authenticateUser');
			}
			const user_exists = await this.atleastOne(`SELECT * FROM user WHERE username = ${username}`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::authenticateUser');
			}
			const user = await this.getUser(username);

			if (password && nfc) {
				throw new DatabaseError(400, 'Cannot authenticate with both password and nfc', 'database.ts::authenticateUser');
			}
			if (password) {
				//FIX: change to bcrypt later
				if (user.password !== password) {
					throw new AuthenticationError('Incorrect password', 'database.ts::authenticateUser');
				}
			} else if (nfc) {
				//FIX: I guess this too because why not? -- change to bcrypt later
				if (user.nfc_key !== nfc) {
					throw new AuthenticationError('Incorrect nfc', 'database.ts::authenticateUser');
				}
			}
			return { user_id: user.user_id, accesstoken: '', refreshtoken: '' };
		} catch (err: any) {
			if (err instanceof DatabaseError) {
				throw err;
			}
			return { user_id: -1, accesstoken: '', refreshtoken: '' };
		}
	}
}
