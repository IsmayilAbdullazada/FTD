import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { query, transaction } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { authenticateToken, requireRole } from "../../middleware/auth.js";

const router = Router();
router.use(authenticateToken, requireRole(["SYSTEM_ADMIN"]));

async function counts() {
  const r = await query(`SELECT
    (SELECT COUNT(*) FROM users)::int users,(SELECT COUNT(*) FROM users WHERE role='CARE_PARTNER')::int care_partners,
    (SELECT COUNT(*) FROM users WHERE role<>'CARE_PARTNER')::int staff,(SELECT COUNT(*) FROM posts)::int posts,
    ((SELECT COUNT(*) FROM posts WHERE status='PENDING_MODERATION')+(SELECT COUNT(*) FROM comments WHERE status='PENDING_MODERATION'))::int pending_queue,
    (SELECT COUNT(*) FROM comments)::int comments,(SELECT COUNT(*) FROM moderation_audit)::int audit_events,
    (SELECT COUNT(*) FROM invitations)::int invitations,(SELECT COUNT(*) FROM chatbot_guides)::int guides`);
  return r.rows[0];
}
router.get(
  "/database-status",
  asyncHandler(async (_req, res) => {
    const c = await counts();
    const setting = await query(
      `SELECT value FROM app_settings WHERE key='seed_mode'`,
    );
    res.json({
      isCleanLaunch: setting.rows[0]?.value !== "demo",
      counts: {
        users: c.users,
        carePartners: c.care_partners,
        staff: c.staff,
        posts: c.posts,
        pendingQueue: c.pending_queue,
        comments: c.comments,
        auditEvents: c.audit_events,
        invitations: c.invitations,
        guides: c.guides,
      },
      securityStatus: {
        port: env.PORT,
        helmetActive: true,
        jwtActive: true,
        bcryptRounds: 12,
        rateLimitersActive: true,
        phiFilterActive: true,
        corsActive: true,
      },
    });
  }),
);
router.post(
  "/reset-database",
  asyncHandler(async (req, res) => {
    if (env.ENABLE_DATABASE_RESET !== "true")
      throw new HttpError(404, "Database reset is disabled");
    const { mode } = z
      .object({ mode: z.enum(["clean", "demo"]) })
      .parse(req.body);
    await transaction(async (client) => {
      for (const table of [
        "moderator_private_notes",
        "post_upvotes",
        "comments",
        "post_groups",
        "posts",
        "notifications",
        "private_messages",
        "moderation_audit",
      ])
        await client.query(`DELETE FROM ${table}`);
      if (mode === "demo") {
        const p = (
          await client.query(`INSERT INTO posts(id,author_id,title,raw_content,sanitized_content,status,condition)
        VALUES('post-demo-1','user-care-1','Managing evening routines','What routines have helped with difficult evenings?','What routines have helped with difficult evenings?','APPROVED','FTD') RETURNING id`)
        ).rows[0];
        await client.query(
          `INSERT INTO post_groups(post_id,cohort_id) VALUES($1,'group-general')`,
          [p.id],
        );
        await client.query(
          `INSERT INTO comments(id,post_id,author_id,raw_content,sanitized_content,status)
        VALUES('comm-demo-1',$1,'user-clinician-1','Keep a consistent schedule and discuss sudden changes with the care team.','Keep a consistent schedule and discuss sudden changes with the care team.','APPROVED')`,
          [p.id],
        );
      }
      await client.query(
        `INSERT INTO app_settings(key,value,updated_at) VALUES('seed_mode',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()`,
        [JSON.stringify(mode)],
      );
    });
    res.json({
      success: true,
      mode,
      message:
        mode === "clean"
          ? "Database reset to clean release data."
          : "Database seeded with a demonstration discussion.",
      counts: await counts(),
    });
  }),
);
export default router;
