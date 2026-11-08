import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

const createPostSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10),
  category: z.string(),
  cohortId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/posts - Feed with optional category and cohort filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { category, cohortId } = req.query;
  let sql = `
    SELECT p.*, u.full_name as author_name, u.role as author_role, u.is_verified as author_verified,
           (SELECT COUNT(*) FROM post_replies r WHERE r.post_id = p.id)::int as reply_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category) {
    params.push(category);
    sql += ` AND p.category = $${params.length}`;
  }
  if (cohortId) {
    params.push(cohortId);
    sql += ` AND p.cohort_id = $${params.length}`;
  }

  sql += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 50';

  const result = await query(sql, params);
  res.json({ posts: result.rows });
});

// POST /api/posts - Create a discussion post
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
    return;
  }

  const { title, content, category, cohortId, tags } = parsed.data;
  const result = await query(
    `INSERT INTO posts (author_id, cohort_id, title, content, category, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [req.user!.id, cohortId || null, title, content, category, tags || []]
  );

  res.status(201).json({ post: result.rows[0] });
});

// POST /api/posts/:id/replies - Reply to a discussion post
router.post('/:id/replies', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length < 2) {
    res.status(400).json({ error: 'Reply content is required' });
    return;
  }

  const result = await query(
    `INSERT INTO post_replies (post_id, author_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, req.user!.id, content.trim()]
  );

  res.status(201).json({ reply: result.rows[0] });
});

// PATCH /api/posts/:id/verify - Clinician endorsement
router.patch('/:id/verify', authenticateToken, requireRole(['clinician', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await query(
    `UPDATE posts 
     SET clinician_reviewed = TRUE, reviewed_by = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [req.user!.id, id]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  res.json({ post: result.rows[0], message: 'Clinician guidance applied' });
});

export default router;
