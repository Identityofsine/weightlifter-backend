import express from 'express';
import { FileController } from '../../controllers/file.controller';


const FileRouter = express.Router();

FileRouter.get('/:filename', FileController.loadFileByUser);

export { FileRouter };
