import express from 'express';
import { handleIdentify } from '../controllers/identifyController';

const router = express.Router();

router.post('/', handleIdentify); 

export default router;
