import { Router } from "express";
import { query } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM notifications WHERE recipient_user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    const messages = result.rows.map((r) => ({
      id: r.id,
      recipientUserId: r.recipient_user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      createdAt: r.created_at,
      read: Boolean(r.read_at),
    }));
    res.json({ unreadCount: messages.filter((m) => !m.read).length, messages });
  }),
);
router.post(
  "/:id/read",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND recipient_user_id=$2 RETURNING id`,
      [req.params.id, req.user!.id],
    );
    if (!result.rows[0]) throw new HttpError(404, "Notification not found");
    res.json({ success: true });
  }),
);
export default router;
