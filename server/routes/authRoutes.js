import express from 'express';
import { signupUser, loginUser } from '../controllers/authController.js';
import { getGoogleAuthUrl } from '../controllers/oauthController.js';

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/google/url', getGoogleAuthUrl);

export default router;
