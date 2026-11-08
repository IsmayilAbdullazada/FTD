import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

const createCohortSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  region: z.string().optional(),
  ftdSubtype: z.enum(['bvFTD', 'PPA-Semantic', 'PPA-Nonfluent', 'FTD-MND', 'General']).default('General'),
});

// GET /api/cohorts - List all support cohorts
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT c.*, 
            (SELECT COUNT(*) FROM cohort_members m WHERE m.cohort_id = c.id)::int as member_count
     FROM cohorts c
     ORDER BY c.name ASC`
  );
  res.json({ cohorts: result.rows });
});

// POST /api/cohorts - Create a new cohort (clinician or admin)
router.post('/', authenticateToken, requireRole(['clinician', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const parsed = createCohortSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
    return;
  }

  const { name, description, region, ftdSubtype } = parsed.data;
  const result = await query(
    `INSERT INTO cohorts (name, description, region, ftd_subtype)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description || null, region || null, ftdSubtype]
  );

  res.status(201).json({ cohort: result.rows[0] });
});

// POST /api/cohorts/:id/join - Join a support cohort
router.post('/:id/join', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  await query(
    `INSERT INTO cohort_members (cohort_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (cohort_id, user_id) DO NOTHING`,
    [id, userId]
  );

  res.json({ success: true, message: 'Joined cohort successfully' });
});

// POST /api/cohorts/:id/leave - Leave a support cohort
router.post('/:id/leave', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  await query(
    `DELETE FROM cohort_members WHERE cohort_id = $1 AND user_id = $2`,
    [id, userId]
  );

  res.json({ success: true, message: 'Left cohort' });
});

export default router;
