import express from 'express';
import { WorkoutController } from '../../controllers/workout.controller';


const WorkoutRouter = express.Router();

WorkoutRouter.get('/get', WorkoutController.getWorkout);
WorkoutRouter.get('/getexercise', WorkoutController.getExercise);
WorkoutRouter.get('/getactiveworkout', WorkoutController.getActiveWorkout);

export { WorkoutRouter };
