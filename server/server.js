import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { initSocket } from './socketHandler.js';
import { handleGoogleCallback } from './controllers/oauthController.js';

// Load environment variables from .env file
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Whitelist of allowed origins for CORS
// During deployment the frontend will be hosted at https://quizit-1.onrender.com
// and the backend will be hosted at https://wecord.duckdns.org. Keep localhost
// entries so local development still works.
const allowedOrigins = [
  'https://quizit-1.onrender.com',   // Deployed Frontend
  'https://wecord.duckdns.org',      // Deployed Backend (if needed for same-origin checks)
  'http://localhost:5173',           // Vite Dev Server
  'http://localhost:3000'            // Other common dev port
];

// CORS configuration to handle preflight requests and specific headers
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, REST tools)
    // or requests from whitelisted origins.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  // Ensure preflight requests get a proper 200 response and don't get blocked
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

const io = new SocketIOServer(server, {
    cors: corsOptions
});

// Middleware
app.use(cors(corsOptions)); // Use CORS for Express API routes
// Explicitly handle OPTIONS preflight for all routes using the same cors options
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Support JSON bodies, limit size for file uploads

// Additional middleware: explicitly reflect allowed origin headers for requests
// This helps ensure the Access-Control-Allow-Origin header is present even when
// the request goes through proxies or other intermediaries.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Allow the methods we support
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  }
  // Respond immediately to OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', aiRoutes); // For /quiz/generate and /insights/generate

initSocket(io); // Initialize socket handlers

// OAuth redirect handler (this path should match the authorized redirect URI in Google Console)
app.get('/login/oauth2/code/google', handleGoogleCallback);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));