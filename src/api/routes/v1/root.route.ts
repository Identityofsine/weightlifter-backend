import express from 'express';
import { UserController } from '../../controllers/user.controller';
import { isRoot } from '../../middleware/isroot';

const RootRouter = express.Router();

RootRouter.use(isRoot);

RootRouter.post('/addUser', UserController.addUser);

export { RootRouter };
