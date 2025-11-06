import express from 'express';
import { generateQuiz, generatePersonalInsights } from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// protect middleware ensures only authenticated users can generate content
router.post('/quiz/generate', protect, generateQuiz);
router.post('/insights/generate', protect, generatePersonalInsights);


export default router;
