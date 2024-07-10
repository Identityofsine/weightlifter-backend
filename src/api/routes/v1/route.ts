import express from 'express';
import { UserController } from '../../controllers/user.controller';
import { RootRouter } from './root.route';
import { AdminRouter } from './admin.route';
import { WorkoutRouter } from './workout.route';
import { UserRouter } from './user.route';
import { FileRouter } from './file.route';

const V1Router = express.Router();

V1Router.use('/root', RootRouter);
V1Router.use('/admin', AdminRouter);
V1Router.use('/workout', WorkoutRouter);
V1Router.use('/user', UserRouter);
V1Router.use('/file', FileRouter);

export { V1Router };
