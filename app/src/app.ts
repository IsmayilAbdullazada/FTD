import { uploadsDirectory } from './services/uploads.js';
import { query } from './config/db.js';
import { asyncHandler } from './lib/http.js';
import { isStaffRole } from './lib/roles.js';
import { randomUUID } from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import postRoutes from './modules/posts/posts.routes.js';
import messageRoutes from './modules/messages/messages.routes.js';
import cohortRoutes from './modules/cohorts/cohorts.routes.js';
import resourceRoutes from './modules/resources/resources.routes.js';
import moderationRoutes from './modules/moderation/moderation.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import guideRoutes, { extractPdf } from './modules/guides/guides.routes.js';
import knowledgeRoutes from './modules/knowledge/knowledge.routes.js';
import deflectionRoutes from './modules/knowledge/deflection.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { authenticateToken, requireStaff } from './middleware/auth.js';
import { HttpError } from './lib/http.js';
import { isAllowedOrigin } from './config/origins.js';
import { protectCookieSession } from './middleware/csrf.js';

export const app = express();
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
app.use((_req, res, next) => {
  res.locals.requestId = randomUUID();
  res.setHeader('X-Request-ID', res.locals.requestId);
  next();
});
app.disable('x-powered-by');
app.set(
  'trust proxy',
  env.TRUST_PROXY_HOPS === 0 ? false : env.TRUST_PROXY_HOPS,
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    frameguard:
      env.NODE_ENV === 'production' ? { action: 'sameorigin' } : false,
    contentSecurityPolicy:
      env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              fontSrc: ["'self'"],
              connectSrc: ["'self'"],
              frameSrc: ["'self'", 'blob:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'self'"],
            },
          }
        : false,
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) return callback(null, true);
      callback(new HttpError(403, 'Origin is not allowed'));
    },
    credentials: true,
  }),
);
app.use('/api/v1', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/auth/')) return next();
  authenticateToken(req, res, () => globalLimiter(req, res, next));
});
app.use('/api', protectCookieSession);
app.post(
  '/api/v1/chatbot/extract-pdf',
  authenticateToken,
  requireStaff,
  express.json({ limit: '18mb' }),
  extractPdf,
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(
  '/uploads/guides',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const name = path.basename(req.path);
    if (isStaffRole(req.user!.role)) return next();
    const allowed = await query(
      `SELECT 1 FROM chatbot_guides g JOIN users u ON u.id=$2 WHERE g.pdf_url=$1 AND g.status='APPROVED' AND g.is_active AND g.condition IN(u.condition,'GENERAL') UNION ALL SELECT 1 FROM resources r JOIN users u ON u.id=$2 WHERE r.file_attachment_url=$1 AND r.disease_domain IN(u.condition,'BOTH')`,
      ['/uploads/guides/' + name, req.user!.id],
    );
    if (!allowed.rowCount) throw new HttpError(404, 'PDF not found');
    next();
  }),
  express.static(uploadsDirectory, {
    index: false,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'private, no-store');
    },
  }),
);
app.use(
  '/resources',
  express.static(path.join(repositoryRoot, 'public', 'resources'), {
    index: false,
  }),
);

const health = async (_req: express.Request, res: express.Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'Hopkins Care Partner Connect Backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
};
app.get('/api/v1/health', health);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/chat/private', messageRoutes);
app.use('/api/v1/cohorts', cohortRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1', contentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chatbot/guides', guideRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/deflection', deflectionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api', (_req, res) =>
  res.status(404).json({ error: 'API endpoint not found' }),
);

const frontendDist = path.join(repositoryRoot, 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);
