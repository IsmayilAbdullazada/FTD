import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

const createResourceSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(5),
  content: z.string().optional(),
  category: z.string().min(2),
  fileOrExternalUrl: z.string().optional(),
});

// GET /api/resources - List institutional clinical guides
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { category } = req.query;
  let sql = 'SELECT * FROM resources WHERE 1=1';
  const params: any[] = [];

  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  res.json({ resources: result.rows });
});

// POST /api/resources - Publish a new clinical guide
router.post('/', authenticateToken, requireRole(['clinician', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
    return;
  }

  const { title, summary, content, category, fileOrExternalUrl } = parsed.data;
  const result = await query(
    `INSERT INTO resources (title, summary, content, category, file_or_external_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, summary, content || null, category, fileOrExternalUrl || null]
  );

  res.status(201).json({ resource: result.rows[0] });
});

export default router;
