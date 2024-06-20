import express from 'express';
import { V1Router } from './v1/route';

const IndexRouter = express.Router();
IndexRouter.use('/v1', V1Router);

export { IndexRouter }
