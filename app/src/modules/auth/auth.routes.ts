import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['care_partner', 'clinician']).default('care_partner'),
  specialty: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Validation error' });
    return;
  }

  const { email, password, fullName, role, specialty } = parseResult.data;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role, specialty)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, role, specialty, created_at`,
    [email, passwordHash, fullName, role, specialty || null]
  );

  const newUser = result.rows[0];
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  res.status(201).json({ user: newUser, token });
});

router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parseResult.data;
  const userResult = await query(
    `SELECT id, email, password_hash, full_name, role, specialty, is_verified 
     FROM users WHERE email = $1`,
    [email]
  );

  if (userResult.rowCount === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const user = userResult.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  delete user.password_hash;
  res.json({ user, token });
});

router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT id, email, full_name, role, specialty, is_verified, avatar_url, bio, created_at 
     FROM users WHERE id = $1`,
    [req.user!.id]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: result.rows[0] });
});

export default router;
