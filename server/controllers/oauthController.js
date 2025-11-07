import fetch from 'node-fetch';
import User from '../models/User.js';
import { generateToken } from './authController.js';

// Build Google OAuth 2.0 authorization URL from server env (keeps client secret only on server)
export const getGoogleAuthUrl = (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI; // should match the authorized redirect URI in Google console

    if (!clientId || !redirectUri) {
        return res.status(500).json({ message: 'Google OAuth not configured on server' });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'profile email',
        access_type: 'offline',
        prompt: 'consent'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.json({ url });
};

// Handle Google OAuth callback (exchange code for tokens, fetch user info, create/find user, return JWT)
export const handleGoogleCallback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('No code provided');
    }

    const start = Date.now();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).send('Google OAuth not configured on server');
    }

    try {
        // Exchange code for tokens
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResp.ok) {
            const errBody = await tokenResp.text();
            console.error('Token exchange failed:', errBody);
            return res.status(500).send('Failed to exchange code for tokens');
        }

        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        // const idToken = tokenData.id_token;

        // Fetch user info
        const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!userInfoResp.ok) {
            const errBody = await userInfoResp.text();
            console.error('Failed to fetch user info:', errBody);
            return res.status(500).send('Failed to fetch user info from Google');
        }

        const profile = await userInfoResp.json();
        const email = profile.email;
        const name = profile.name || profile.given_name || 'Google User';

        if (!email) {
            return res.status(400).send('Google account did not provide email');
        }

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                name,
                email,
                // No password since this is OAuth-provisioned user
            });
        }

        // Sign JWT and redirect to frontend with token
        const jwtToken = generateToken(user._id);

        // Destination frontend URL - prefer env var FRONTEND_URL, fallback to common host
        const frontendUrl = process.env.FRONTEND_URL || 'https://quizit-1.onrender.com';

        // Send user to frontend with token in query string (frontend should capture it and store)
        const redirectTo = `${frontendUrl}/?token=${jwtToken}`;
        console.log(`[OAUTH] handleGoogleCallback completed in ${Date.now() - start}ms for email=${email}`);
        return res.redirect(302, redirectTo);

    } catch (err) {
        console.error('OAuth callback error:', err);
        console.log(`[OAUTH] handleGoogleCallback error after ${Date.now() - start}ms`);
        return res.status(500).send('Internal server error during OAuth callback');
    }
};
