import { Router } from "express";
import { z } from "zod";
import { query } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();
const map = (r: any) => ({
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
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const requested =
      typeof req.query.caregiverId === "string"
        ? req.query.caregiverId
        : req.user!.id;
    if (req.user!.role === "CARE_PARTNER" && requested !== req.user!.id)
      throw new HttpError(403, "Conversation access denied");
    const result = await query(
      `SELECT m.*,su.first_name||' '||su.last_name sender_name,su.role sender_role,
    ru.first_name||' '||ru.last_name recipient_name FROM private_messages m JOIN users su ON su.id=m.sender_id JOIN users ru ON ru.id=m.recipient_id
    WHERE m.sender_id=$1 OR m.recipient_id=$1 ORDER BY m.created_at`,
      [requested],
    );
    res.json(result.rows.map(map));
  }),
);
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        caregiverId: z.string().min(1),
        content: z.string().trim().min(1).max(10000),
      })
      .parse(req.body);
    if (req.user!.role === "CARE_PARTNER" && input.caregiverId !== req.user!.id)
      throw new HttpError(403, "Conversation access denied");
    const recipientId =
      req.user!.role === "CARE_PARTNER"
        ? (
            await query(
              `SELECT id FROM users WHERE role='CLINICIAN_MODERATOR' AND is_active ORDER BY created_at LIMIT 1`,
            )
          ).rows[0]?.id
        : input.caregiverId;
    if (!recipientId) throw new HttpError(404, "Message recipient not found");
    const caregiverId =
      req.user!.role === "CARE_PARTNER" ? req.user!.id : input.caregiverId;
    const r = (
      await query(
        `INSERT INTO private_messages(conversation_id,sender_id,recipient_id,content)
    VALUES($1,$2,$3,$4) RETURNING *`,
        [`chat-${caregiverId}`, req.user!.id, recipientId, input.content],
      )
    ).rows[0];
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
      }),
    );
  }),
);
export default router;
