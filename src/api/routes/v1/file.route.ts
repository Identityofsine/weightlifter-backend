import express from 'express';
import { FileController } from '../../controllers/file.controller';


const FileRouter = express.Router();

FileRouter.get('/pfp', FileController.getPFP);
FileRouter.get('/:filename', FileController.loadFileByUser);

export { FileRouter };
