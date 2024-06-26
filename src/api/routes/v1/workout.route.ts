import express from 'express';
import { WorkoutController } from '../../controllers/workout.controller';


const WorkoutRouter = express.Router();

WorkoutRouter.get('/get', WorkoutController.getWorkout);
WorkoutRouter.get('/all', WorkoutController.getWorkouts);
WorkoutRouter.get('/getexercise', WorkoutController.getExercise);
WorkoutRouter.post('/start', WorkoutController.startWorkout);
WorkoutRouter.post('/cset', WorkoutController.completeSet);
WorkoutRouter.post('/eset', WorkoutController.editSet);

export { WorkoutRouter };
