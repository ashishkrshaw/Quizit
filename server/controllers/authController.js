import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import fetch from 'node-fetch';

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signupUser = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });
        
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
        };

        res.status(201).json({
            token: generateToken(user._id),
            user: userResponse,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during signup' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            const userResponse = {
                id: user._id,
                name: user.name,
                email: user.email,
                profession: user.profession,
                goals: user.goals,
                classField: user.classField,
                lastInsightDate: user.lastInsightDate
            };
            
            res.json({
                token: generateToken(user._id),
                user: userResponse,
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Google sign-in (accepts Google ID token from client)
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ message: 'ID token is required' });
    }

    try {
        // Validate the ID token with Google's tokeninfo endpoint
        const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!resp.ok) {
            const text = await resp.text();
            console.error('Google tokeninfo failed:', text);
            return res.status(401).json({ message: 'Invalid Google ID token' });
        }

        const payload = await resp.json();
        // payload includes email, name, sub (google id), etc.
        const email = payload.email;
        const name = payload.name || payload.email.split('@')[0];

        if (!email) {
            return res.status(400).json({ message: 'Google token did not contain email' });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            // Create user with a random password (hashed) since schema requires password
            const randomPass = Math.random().toString(36).slice(2);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPass, salt);

            user = await User.create({ name, email, password: hashedPassword });
        }

        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            profession: user.profession,
            goals: user.goals,
            classField: user.classField,
            lastInsightDate: user.lastInsightDate
        };

        res.json({ token: generateToken(user._id), user: userResponse });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ message: 'Server error during Google authentication' });
    }
};

// @desc    Server-side Google OAuth redirect
// @route   GET /api/auth/google/redirect
// @access  Public
export const googleRedirect = async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/auth/google/callback` : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/api/auth/google/callback` : null);

    if (!clientId || !redirectUri) {
        return res.status(400).send('Google OAuth not configured on server.');
    }

    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`;

    res.redirect(authUrl);
};

// @desc    Server-side Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleCallback = async (req, res) => {
    const code = req.query.code;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const frontendUrl = process.env.FRONTEND_URL || (process.env.PUBLIC_URL || '/');
    const redirectUri = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/auth/google/callback` : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/api/auth/google/callback` : null);

    if (!code || !clientId || !clientSecret || !redirectUri) {
        console.error('Missing OAuth configuration or code');
        return res.status(400).send('OAuth configuration incomplete.');
    }

    try {
        // Exchange authorization code for tokens
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(code),
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResp.ok) {
            const text = await tokenResp.text();
            console.error('Token exchange failed:', text);
            return res.status(500).send('Failed to exchange code for token');
        }

        const tokenData = await tokenResp.json();
        const idToken = tokenData.id_token;

        // Validate id_token
        const infoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!infoResp.ok) {
            const text = await infoResp.text();
            console.error('tokeninfo failed:', text);
            return res.status(500).send('Failed to validate id_token');
        }
        const payload = await infoResp.json();

        const email = payload.email;
        const name = payload.name || (payload.email ? payload.email.split('@')[0] : '');

        if (!email) return res.status(400).send('No email in id token');

        let user = await User.findOne({ email });
        if (!user) {
            const randomPass = Math.random().toString(36).slice(2);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPass, salt);
            user = await User.create({ name, email, password: hashedPassword });
        }

        const jwtToken = generateToken(user._id);

        // Redirect to frontend with token in hash fragment to avoid server logs capturing it
        const target = `${frontendUrl.replace(/\/$/, '')}#token=${jwtToken}`;
        res.redirect(target);
    } catch (err) {
        console.error('OAuth callback error:', err);
        res.status(500).send('OAuth callback failed');
    }
};
