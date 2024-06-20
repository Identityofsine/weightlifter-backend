import mysql from 'mysql2';
import { AlreadyExistsError, AuthenticationError, DatabaseError, NotFoundError } from './database.error';
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
			console.log('Error in database connection');
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

	private async query<T extends any>(query: string): Promise<T> {
		const response = await new Promise((resolve, reject) => {
			this.connection.getConnection((err, con) => {
				if (err || !con) {
					console.log('Error in connection');
					reject(new DatabaseError(500, 'Error in connection [' + err?.errno + ']', 'database.ts::query'));
					return;
				} else {
					//reduce chance of sql injection
					query = con.escape(query);
					con.query(query, (err, results, fields) => {
						if (err) {
							console.log('Error in query');
							con.release();
							reject(err);
						}
						console.log('[database.ts::query] Query successful');
						con.release();
						resolve(results as T);
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
			const user_exists = await this.atleastOne(`SELECT * FROM users WHERE username = '${username}'`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::setUserNFC');
			}
			await this.query(`UPDATE users SET nfc = '${nfc}' WHERE username = '${username}'`);
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
			const user_exists = await this.atleastOne(`SELECT * FROM users WHERE username = '${username}'`);
			if (user_exists) {
				throw new AlreadyExistsError('User already exists', 'database.ts::addUser');
			}
			await this.query(`INSERT INTO users (username, password) VALUES ('${username}', '${password}')`);
			await this.setUserNFC(username, nfc_hash());
			return true;
		}
		catch (err: any) {
			if (err instanceof AlreadyExistsError) {
				throw err;
			}
			return false;
		}
	}

	public async getUser(username: string): Promise<DatabaseTypes.User> {
		try {
			const user_exists = await this.atleastOne(`SELECT * FROM users WHERE username = '${username}'`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::getUser');
			}
			const user = await this.query<DatabaseTypes.User[]>(`SELECT * FROM users WHERE username = '${username}'`);
			return user[0];
		}
		catch (err: any) {
			if (err instanceof NotFoundError) {
				throw err;
			}
			return { user_id: -1, username: '', password: '', nfc_key: '', permission: 0 };
		}
	}

	public async authenticateUser(username: string, password?: string, nfc?: string): Promise<DatabaseTypes.UserToken> {
		try {
			const user_exists = await this.atleastOne(`SELECT * FROM users WHERE username = '${username}'`);
			if (!user_exists) {
				throw new NotFoundError('User not found', 'database.ts::authenticateUser');
			}
			const user = await this.getUser(username);

			if (password && nfc) {
				throw new DatabaseError(400, 'Cannot authenticate with both password and nfc', 'database.ts::authenticateUser');
			}
			if (password) {
				if (user.password !== password) {
					throw new AuthenticationError('Incorrect password', 'database.ts::authenticateUser');
				}
			} else if (nfc) {
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
