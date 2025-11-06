import express from 'express';
import { getHistory, saveHistory } from '../controllers/historyController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getHistory).post(protect, saveHistory);

export default router;
