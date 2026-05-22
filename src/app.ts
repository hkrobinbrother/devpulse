import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './modules/auth/auth.routes';
import issuesRoutes from './modules/issues/issues.routes';
import errorHandler from './middleware/error.middleware';

dotenv.config();

const app = express();

// ─── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/issues', issuesRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'DevPulse API is running 🚀' });
});

// ─── Global Error Handler ───────────────────────────────────────
app.use(errorHandler);

export default app;
