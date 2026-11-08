import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, pool } from '../../config/db.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

// GET /api/messages/conversations - List conversations for user
router.get('/conversations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const result = await query(
    `SELECT c.*, 
            cp.full_name as care_partner_name,
            cl.full_name as clinician_name,
            (SELECT body FROM private_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM private_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
     FROM private_conversations c
     JOIN users cp ON c.care_partner_id = cp.id
     JOIN users cl ON c.clinician_id = cl.id
     WHERE c.care_partner_id = $1 OR c.clinician_id = $1
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  res.json({ conversations: result.rows });
});

// GET /api/messages/conversations/:id - Get conversation details and message history
router.get('/conversations/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const convResult = await query(
    `SELECT * FROM private_conversations WHERE id = $1 AND (care_partner_id = $2 OR clinician_id = $2)`,
    [id, userId]
  );

  if (convResult.rowCount === 0) {
    res.status(404).json({ error: 'Conversation not found or access denied' });
    return;
  }

  const messagesResult = await query(
    `SELECT m.*, u.full_name as sender_name, u.role as sender_role
     FROM private_messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC`,
    [id]
  );

  res.json({ conversation: convResult.rows[0], messages: messagesResult.rows });
});

// POST /api/messages/conversations - Start consultation with clinician (e.g., Dr. Seema Gulyani)
router.post('/conversations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    clinicianId: z.string().uuid(),
    subject: z.string().min(3),
    initialMessage: z.string().min(5),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
    return;
  }

  const { clinicianId, subject, initialMessage } = parsed.data;

  // Insert conversation & initial message in transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const convResult = await client.query(
      `INSERT INTO private_conversations (care_partner_id, clinician_id, subject)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.user!.id, clinicianId, subject]
    );

    const convId = convResult.rows[0].id;
    await client.query(
      `INSERT INTO private_messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)`,
      [convId, req.user!.id, initialMessage]
    );

    await client.query('COMMIT');
    res.status(201).json({ conversationId: convId });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// POST /api/messages/conversations/:id/reply - Send reply inside an existing conversation
router.post('/conversations/:id/reply', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { body } = req.body;
  const userId = req.user!.id;

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'Message body cannot be empty' });
    return;
  }

  const convResult = await query(
    `SELECT * FROM private_conversations WHERE id = $1 AND (care_partner_id = $2 OR clinician_id = $2)`,
    [id, userId]
  );

  if (convResult.rowCount === 0) {
    res.status(403).json({ error: 'Not authorized for this conversation' });
    return;
  }

  const result = await query(
    `INSERT INTO private_messages (conversation_id, sender_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, userId, body.trim()]
  );

  await query(`UPDATE private_conversations SET updated_at = NOW() WHERE id = $1`, [id]);

  res.status(201).json({ message: result.rows[0] });
});

export default router;
