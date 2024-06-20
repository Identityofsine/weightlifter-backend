import express from 'express';
import { WorkoutController } from '../../controllers/workout.controller';
import { isAdmin } from '../../middleware/isadmin';

const WorkoutRouter = express.Router();


WorkoutRouter.use(isAdmin);
WorkoutRouter.post('/addWorkout', WorkoutController.addWorkout);
WorkoutRouter.post('/addExercise', WorkoutController.addExercise);


