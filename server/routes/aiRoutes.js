import express from 'express';
import { generateQuiz, generatePersonalInsights, chatAssistant } from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// protect middleware ensures only authenticated users can generate content
router.post('/quiz/generate', protect, generateQuiz);
router.post('/insights/generate', protect, generatePersonalInsights);
router.post('/chat', protect, chatAssistant);


export default router;
