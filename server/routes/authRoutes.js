import express from 'express';
import { signupUser, loginUser, googleAuth, googleRedirect, googleCallback } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);

// Optional server-side OAuth endpoints (redirect and callback). These will only work
// if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in the server environment.
router.get('/google/redirect', googleRedirect);
router.get('/google/callback', googleCallback);

export default router;
