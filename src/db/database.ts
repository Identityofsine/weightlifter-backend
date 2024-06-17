import mysql from 'mysql2';
import { DatabaseError } from './database.error.ts';

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
		this.connection.on('connection', (err,) => {
			console.log('Connected to database!');
		});
		this.connection.on('error', (err) => {
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

}
