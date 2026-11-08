import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pool } from './config/db.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import postRoutes from './modules/posts/posts.routes.js';
import messageRoutes from './modules/messages/messages.routes.js';
import cohortRoutes from './modules/cohorts/cohorts.routes.js';
import resourceRoutes from './modules/resources/resources.routes.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
      },
    },
    frameguard: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting (100 req / 15 min per IP)
app.use('/api', globalLimiter);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'Hopkins Care Partner Connect Backend',
      nodeVersion: process.version,
      database: 'connected (PostgreSQL 16)',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// API Modules
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/resources', resourceRoutes);

// Centralized error handling
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[FTD Care Backend] Running on http://127.0.0.1:${PORT} (Node ${process.version})`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('\n[FTD Care Backend] Shutting down gracefully...');
  server.close(async () => {
    try {
      await pool.end();
      console.log('[FTD Care Backend] Database pool closed.');
    } catch (e) {
      // ignore
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
