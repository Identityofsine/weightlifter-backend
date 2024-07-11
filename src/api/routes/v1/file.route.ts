import express from 'express';
import { FileController } from '../../controllers/file.controller';
import { walkUpBindingElementsAndPatterns } from 'typescript';


const FileRouter = express.Router();

FileRouter.get('/pfp', FileController.getPFP);
FileRouter.get('/images', FileController.getImages);
FileRouter.post('/upload', FileController.submitPhoto);

FileRouter.get('/:filename', FileController.loadFileByUser);

export { FileRouter };
