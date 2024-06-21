import express from 'express';
import { UserController } from '../../controllers/user.controller';
import { RootRouter } from './root.route';
import { AdminRouter } from './admin.route';
import { WorkoutRouter } from './workout.route';

const V1Router = express.Router();

V1Router.use('/root', RootRouter);
V1Router.use('/admin', AdminRouter);
V1Router.use('/workout', WorkoutRouter);

export { V1Router };
