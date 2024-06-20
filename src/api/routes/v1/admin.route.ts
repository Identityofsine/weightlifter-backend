import express from 'express';
import { WorkoutController } from '../../controllers/workout.controller';
import { isAdmin } from '../../middleware/isadmin';

const AdminRouter = express.Router();


AdminRouter.use(isAdmin);
AdminRouter.post('/addWorkout', WorkoutController.addWorkout);
AdminRouter.post('/addExercise', WorkoutController.addExercise);

export { AdminRouter };

