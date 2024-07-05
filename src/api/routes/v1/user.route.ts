import express from 'express';
import { UserController } from '../../controllers/user.controller';


const UserRouter = express.Router();

UserRouter.post('/login', UserController.login);
UserRouter.post('/measure', UserController.logMeasurement);

export { UserRouter };
