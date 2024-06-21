import express from 'express';
import { WorkoutController } from '../../controllers/workout.controller';


const WorkoutRouter = express.Router();

WorkoutRouter.get('/get', WorkoutController.getWorkout);

export { WorkoutRouter };
