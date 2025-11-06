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

// Load environment variables from .env file
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Whitelist of allowed origins for CORS
const allowedOrigins = [
  'https://quizyfy-1.onrender.com', // legacy/previous Production Frontend (kept for compatibility)
  'https://quizit-1.onrender.com',  // frontend-only deployment (new)
  'https://quizit-6jve.onrender.com',// backend-only deployment (allow backend-origin requests if needed)
  'https://wecord.app',             // AI Studio Environment
  'http://localhost:5173',          // Vite Dev Server
  'http://localhost:3000'           // Other common dev port
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
};

const io = new SocketIOServer(server, {
    cors: corsOptions
});

// Middleware
app.use(cors(corsOptions)); // Use CORS for Express API routes
app.use(express.json({ limit: '1mb' })); // Support JSON bodies, limit size for file uploads

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', aiRoutes); // For /quiz/generate and /insights/generate

initSocket(io); // Initialize socket handlers

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));