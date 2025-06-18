import express from 'express';
import { handleIdentify } from '../controllers/identifyController';

const router = express.Router();

router.post('/', (req, res, next) => {
  handleIdentify(req, res, next);
});

export default router;