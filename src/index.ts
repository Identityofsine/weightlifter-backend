import express from 'express';
import { WeightLifterSettings } from './settings';
import bodyParser from 'body-parser';
import database from './db/database';
import { IndexRouter } from './api/routes/index.route';
import cors from 'cors';
import corsOptions from './config/cors';
import dotenv from 'dotenv';
import { FileManager } from './os/file';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json());
const db = database.getInstance();
FileManager.getInstance();

app.use(cors(corsOptions));

app.get('/', (_req, res) => {
	res.send('Weightlifter app');
});


app.use('/', IndexRouter);

app.listen(WeightLifterSettings.server.port, () => {
	console.log('Server started on port ' + WeightLifterSettings.server.port);
});
