import express from 'express';
import { WeightLifterSettings } from './settings';
import bodyParser from 'body-parser';
import database from './db/database';
import { IndexRouter } from './api/routes/index.route';


const app = express();
app.use(express.json());
app.use(bodyParser.json());
const db = database.getInstance();


app.get('/', (_req, res) => {
	res.send('Weightlifter app');
});

app.use('/', IndexRouter);

app.listen(WeightLifterSettings.server.port, () => {
	console.log('Server started on port ' + WeightLifterSettings.server.port);
});
