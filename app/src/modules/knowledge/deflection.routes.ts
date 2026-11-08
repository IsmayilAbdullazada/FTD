import { Router } from "express";
import { z } from "zod";
import { query } from "../../config/db.js";
import { asyncHandler } from "../../lib/http.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();
router.post(
  "/discussions",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { title, content } = z
      .object({ title: z.string().default(""), content: z.string().min(1) })
      .parse(req.body);
    const term = `${title} ${content}`.trim();
    const staff = req.user!.role !== "CARE_PARTNER";
    const r = await query(
      `SELECT p.id post_id,p.title,p.sanitized_content,u.anonymous_handle,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.status='APPROVED')::int reply_count,
    ts_rank(to_tsvector('english',p.title||' '||p.sanitized_content),websearch_to_tsquery('english',$1)) match_score
    FROM posts p JOIN users u ON u.id=p.author_id WHERE p.status='APPROVED'
    AND to_tsvector('english',p.title||' '||p.sanitized_content)@@websearch_to_tsquery('english',$1)
    AND ($2::boolean OR (p.condition IN (COALESCE((SELECT condition FROM users WHERE id=$3),'FTD'),'BOTH')
      AND EXISTS(SELECT 1 FROM post_groups pg WHERE pg.post_id=p.id AND
        (pg.cohort_id='group-general' OR EXISTS(SELECT 1 FROM cohort_members cm
          WHERE cm.cohort_id=pg.cohort_id AND cm.user_id=$3)))))
    ORDER BY match_score DESC LIMIT 5`,
      [term, staff, req.user!.id],
    );
    res.json({
      matches: r.rows.map((x) => ({
        postId: x.post_id,
        title: x.title,
        snippet: x.sanitized_content.slice(0, 180),
        authorHandle: x.anonymous_handle,
        replyCount: x.reply_count,
        matchScore: Number(x.match_score),
      })),
    });
  }),
);
router.get(
  "/discussions-pool",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const staff = req.user!.role !== "CARE_PARTNER";
    const r = await query(
      `SELECT p.*,u.anonymous_handle,u.badge_label,(SELECT g.name FROM post_groups pg JOIN cohorts g ON g.id=pg.cohort_id WHERE pg.post_id=p.id LIMIT 1) cohort_name,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'content',c.sanitized_content,'authorHandle',cu.anonymous_handle,'authorBadge',cu.badge_label,'createdAt',c.created_at) ORDER BY c.created_at)
      FROM comments c JOIN users cu ON cu.id=c.author_id WHERE c.post_id=p.id AND c.status='APPROVED'),'[]') replies
    FROM posts p JOIN users u ON u.id=p.author_id WHERE p.status='APPROVED'
    AND ($1::boolean OR (p.condition IN (COALESCE((SELECT condition FROM users WHERE id=$2),'FTD'),'BOTH')
      AND EXISTS(SELECT 1 FROM post_groups pg WHERE pg.post_id=p.id AND
        (pg.cohort_id='group-general' OR EXISTS(SELECT 1 FROM cohort_members cm
          WHERE cm.cohort_id=pg.cohort_id AND cm.user_id=$2)))))
    ORDER BY p.created_at DESC`,
      [staff, req.user!.id],
    );
    res.json({
      pool: r.rows.map((x) => ({
        id: x.id,
        title: x.title,
        content: x.sanitized_content,
        authorHandle: x.anonymous_handle,
        authorBadge: x.badge_label,
        cohortName: x.cohort_name,
        createdAt: x.created_at,
        replies: x.replies,
      })),
    });
  }),
);
export default router;
