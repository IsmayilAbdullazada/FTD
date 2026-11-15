import type { MessageRow } from '../../db/rows.js';
import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { paginationMeta, parsePagination } from '../../lib/pagination.js';
import { isStaffRole } from '../../lib/roles.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);
const map = (
  r: MessageRow & {
    sender_name: string;
    sender_role: string;
    recipient_name: string;
  },
) => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id,
  senderName: r.sender_name,
  senderRole: r.sender_role,
  recipientId: r.recipient_id,
  recipientName: r.recipient_name,
  content: r.content,
  createdAt: r.created_at,
  read: Boolean(r.read_at),
});
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const requested =
      typeof req.query.caregiverId === 'string'
        ? req.query.caregiverId
        : req.user!.id;
    if (!isStaffRole(req.user!.role) && requested !== req.user!.id)
      throw new HttpError(403, 'Conversation access denied');
    const { page, pageSize, limit, offset } = parsePagination(req.query, 50);
    const [result, countResult] = await Promise.all([
      query(
        `SELECT * FROM (
          SELECT m.*,su.first_name||' '||su.last_name sender_name,su.role sender_role,
          ru.first_name||' '||ru.last_name recipient_name
          FROM private_messages m
          JOIN users su ON su.id=m.sender_id
          JOIN users ru ON ru.id=m.recipient_id
          WHERE (m.sender_id=$1 OR m.recipient_id=$1) AND (m.sender_id=$4 OR m.recipient_id=$4)
          ORDER BY m.created_at DESC,m.id DESC LIMIT $2 OFFSET $3
        ) messages_page ORDER BY created_at`,
        [requested, limit, offset, req.user!.id],
      ),
      query(
        `SELECT COUNT(*)::int total FROM private_messages
         WHERE (sender_id=$1 OR recipient_id=$1) AND (sender_id=$2 OR recipient_id=$2)`,
        [requested, req.user!.id],
      ),
    ]);
    const readIds = result.rows
      .filter((row) => row.recipient_id === req.user!.id)
      .map((row) => row.id);
    if (readIds.length) {
      await query(
        'UPDATE private_messages SET read_at=COALESCE(read_at,NOW()) WHERE id=ANY($1::text[]) AND recipient_id=$2',
        [readIds, req.user!.id],
      );
      for (const row of result.rows)
        if (row.recipient_id === req.user!.id)
          row.read_at ||= new Date().toISOString();
    }
    const total = countResult.rows[0].total as number;
    res.json({
      messages: result.rows.map((row) => map(row as Parameters<typeof map>[0])),
      pagination: paginationMeta(page, pageSize, total),
    });
  }),
);
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        caregiverId: z.string().min(1),
        recipientId: z.string().optional(),
        content: z.string().trim().min(1).max(10000),
      })
      .parse(req.body);
    if (!isStaffRole(req.user!.role) && input.caregiverId !== req.user!.id)
      throw new HttpError(403, 'Conversation access denied');
    const previous = await query(
      `SELECT u.id FROM private_messages m JOIN users u ON u.id=CASE WHEN m.sender_id=$1 THEN m.recipient_id ELSE m.sender_id END WHERE (m.sender_id=$1 OR m.recipient_id=$1) AND u.is_active AND u.role='CLINICIAN_MODERATOR' ORDER BY m.created_at DESC LIMIT 1`,
      [req.user!.id],
    );
    const recipientId = !isStaffRole(req.user!.role)
      ? (input.recipientId ?? previous.rows[0]?.id)
      : input.caregiverId;
    if (!isStaffRole(req.user!.role) && recipientId) {
      const recipient = await query(
        "SELECT 1 FROM users WHERE id=$1 AND is_active AND role IN ('CLINICIAN_MODERATOR','SYSTEM_ADMIN')",
        [recipientId],
      );
      if (!recipient.rowCount)
        throw new HttpError(400, 'Choose an active clinician');
    }
    if (!recipientId) throw new HttpError(404, 'Message recipient not found');
    const caregiverId = !isStaffRole(req.user!.role)
      ? req.user!.id
      : input.caregiverId;
    const r = await transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO private_messages(conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4) RETURNING *`,
        [`chat-${caregiverId}`, req.user!.id, recipientId, input.content],
      );
      await client.query(
        "INSERT INTO notifications(recipient_user_id,title,message,type) VALUES($1,'New private message','You have a new private message.','DIRECT_CHAT')",
        [recipientId],
      );
      return inserted.rows[0];
    });
    const names = await query(
      `SELECT id,first_name||' '||last_name name,role FROM users WHERE id=ANY($1::text[])`,
      [[req.user!.id, recipientId]],
    );
    const byId = new Map(names.rows.map((n) => [n.id, n]));
    res.status(201).json(
      map({
        ...r,
        sender_name: byId.get(req.user!.id)?.name,
        sender_role: req.user!.role,
        recipient_name: byId.get(recipientId)?.name,
      } as Parameters<typeof map>[0]),
    );
  }),
);
export default router;
