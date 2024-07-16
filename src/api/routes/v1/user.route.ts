import express from 'express';
import { UserController } from '../../controllers/user.controller';


const UserRouter = express.Router();

UserRouter.post('/login', UserController.login);
UserRouter.post('/measure', UserController.logMeasurement);
UserRouter.get('/latest', UserController.getLatestMeasurements);
UserRouter.get('/getmeasurements', UserController.getMeasurements);
UserRouter.get('/pastexercise', UserController.getPastExercises);
UserRouter.get('/possibleanalytics', UserController.getPossibleAnalytics);
UserRouter.get('/dataset', UserController.getDataAnalytics);
UserRouter.get('/exerciseanalytics', UserController.getExerciseAnalytics);

//increase the post size limit to 50mb 
UserRouter.post('/setpfp', UserController.setPFP);


export { UserRouter };
