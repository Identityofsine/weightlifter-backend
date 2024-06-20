import express from 'express';
import { UserController } from '../../controllers/user.controller';
import { RootRouter } from './root.route';

const V1Router = express.Router();

V1Router.use('/root', RootRouter);

export { V1Router };
