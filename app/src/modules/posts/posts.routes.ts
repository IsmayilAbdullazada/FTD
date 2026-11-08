import { Router } from "express";
import { z } from "zod";
import { query, transaction } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { author, cohort } from "../../lib/serializers.js";
import {
  isUrgentClinicalContent,
  sanitizeUserContent,
  scanForPhi,
} from "../../lib/contentSafety.js";
import { authenticateToken, requireStaff } from "../../middleware/auth.js";

const router = Router();
const isStaff = (role: string) =>
  role === "CLINICIAN_MODERATOR" || role === "SYSTEM_ADMIN";

const postSelect = `SELECT p.*,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,
 u.anonymous_handle,u.badge_label,u.avatar_color,
 (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.status='APPROVED')::int comment_count,
 (SELECT COUNT(*) FROM post_upvotes v WHERE v.post_id=p.id)::int upvotes,
 EXISTS(SELECT 1 FROM post_upvotes v WHERE v.post_id=p.id AND v.user_id=$1) is_upvoted,
 COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM post_groups pg JOIN cohorts g ON g.id=pg.cohort_id WHERE pg.post_id=p.id),'[]') groups,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'senderId',n.sender_id,'senderName',nu.first_name||' '||nu.last_name,
   'senderRole',nu.role,'message',n.message,'createdAt',n.created_at) ORDER BY n.created_at)
   FROM moderator_private_notes n JOIN users nu ON nu.id=n.sender_id WHERE n.post_id=p.id),'[]') private_notes
 FROM posts p JOIN users u ON u.id=p.author_id`;

function mapPost(row: any, privileged: boolean) {
  return {
    id: row.id,
    title: row.title,
    content: row.sanitized_content,
    rawContent: privileged ? row.raw_content : undefined,
    status: row.status,
    isClosed: row.is_closed,
    closedAt: row.closed_at ?? undefined,
    closedBy: row.closed_by ?? undefined,
    author: author(row, privileged),
    assignedGroups: (row.groups ?? []).map(cohort),
    isUrgentClinical: row.is_urgent_clinical,
    allowUnmoderatedReplies: row.allow_unmoderated_replies,
    createdAt: row.created_at,
    commentCount: row.comment_count,
    upvotes: row.upvotes,
    isUpvoted: row.is_upvoted,
    condition: row.condition,
    phiAlerts: privileged ? row.phi_alerts : undefined,
    moderatorPrivateNotes: privileged ? row.private_notes : undefined,
  };
}

async function onePost(id: string, viewerId: string, privileged: boolean) {
  const result = await query(`${postSelect} WHERE p.id=$2`, [viewerId, id]);
  if (!result.rows[0]) throw new HttpError(404, "Discussion not found");
  return mapPost(result.rows[0], privileged);
}

async function canViewPost(postId: string, userId: string, role: string) {
  if (isStaff(role)) return true;
  const result = await query(
    `SELECT 1 FROM posts p JOIN users viewer ON viewer.id=$2
     WHERE p.id=$1 AND (
       (p.author_id=$2 AND p.status='PENDING_MODERATION') OR
       (p.status='APPROVED' AND p.condition IN (viewer.condition,'BOTH') AND
        EXISTS(SELECT 1 FROM post_groups pg WHERE pg.post_id=p.id AND
          (pg.cohort_id='group-general' OR EXISTS(
            SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=pg.cohort_id AND cm.user_id=$2))))
     )`,
    [postId, userId],
  );
  return Boolean(result.rows[0]);
}

router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const staff = isStaff(req.user!.role);
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const groupId =
      typeof req.query.groupId === "string" && req.query.groupId !== "all"
        ? req.query.groupId
        : undefined;
    const condition =
      typeof req.query.condition === "string" ? req.query.condition : undefined;
    const result = await query(
      `${postSelect} WHERE
    (($2::boolean AND p.status=COALESCE($3,p.status) AND ($3::text IS NOT NULL OR p.status='APPROVED')) OR
     (NOT $2::boolean AND ((p.status='APPROVED' AND EXISTS(SELECT 1 FROM post_groups visible_pg
       WHERE visible_pg.post_id=p.id AND (visible_pg.cohort_id='group-general' OR EXISTS(SELECT 1 FROM cohort_members visible_cm
       WHERE visible_cm.cohort_id=visible_pg.cohort_id AND visible_cm.user_id=$1)))
       AND p.condition IN (COALESCE((SELECT condition FROM users WHERE id=$1),'FTD'),'BOTH'))
       OR (p.author_id=$1 AND p.status='PENDING_MODERATION'))))
    AND ($4::text IS NULL OR EXISTS(SELECT 1 FROM post_groups filter_pg WHERE filter_pg.post_id=p.id AND filter_pg.cohort_id=$4))
    AND ($5::text IS NULL OR p.condition IN ($5,'BOTH')) ORDER BY p.created_at DESC`,
      [req.user!.id, staff, status ?? null, groupId ?? null, condition ?? null],
    );
    const posts = result.rows.map((r) => mapPost(r, staff));
    res.json({ total: posts.length, posts });
  }),
);

router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const staff = isStaff(req.user!.role);
    if (
      !(await canViewPost(String(req.params.id), req.user!.id, req.user!.role))
    )
      throw new HttpError(404, "Discussion not found");
    const post = await onePost(String(req.params.id), req.user!.id, staff);
    const comments = await query(
      `SELECT c.*,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,
    u.anonymous_handle,u.badge_label,u.avatar_color,c.author_id FROM comments c JOIN users u ON u.id=c.author_id
    WHERE c.post_id=$1 AND ($2::boolean OR c.status='APPROVED' OR c.author_id=$3) ORDER BY c.created_at`,
      [req.params.id, staff, req.user!.id],
    );
    res.json({
      post,
      comments: comments.rows.map((r) => ({
        id: r.id,
        parentCommentId: r.parent_comment_id ?? undefined,
        postId: r.post_id,
        content: r.sanitized_content,
        author: author(r, staff),
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  }),
);

router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(3).max(255),
        content: z.string().trim().min(5).max(20000),
        targetCohortId: z.string().default("group-general"),
        condition: z.enum(["FTD", "AD", "BOTH"]).optional(),
      })
      .parse(req.body);
    const allowed = await query(
      `SELECT c.id FROM cohorts c WHERE c.id=$1 AND c.is_active AND
    ($2::boolean OR c.is_general_board OR EXISTS(SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=c.id AND cm.user_id=$3))`,
      [input.targetCohortId, isStaff(req.user!.role), req.user!.id],
    );
    if (!allowed.rows[0])
      throw new HttpError(403, "You cannot post to this cohort");
    const cleanTitle = sanitizeUserContent(input.title);
    const cleanContent = sanitizeUserContent(input.content);
    if (!cleanTitle || !cleanContent)
      throw new HttpError(400, "Title and content are required");
    const phiAlerts = scanForPhi(`${cleanTitle} ${cleanContent}`);
    const urgent = isUrgentClinicalContent(`${cleanTitle} ${cleanContent}`);
    const requestedCondition = isStaff(req.user!.role)
      ? (input.condition ?? null)
      : null;
    const created = await transaction(async (client) => {
      const r = await client.query(
        `INSERT INTO posts(author_id,title,raw_content,sanitized_content,status,condition,is_urgent_clinical,phi_alerts)
      VALUES($1,$2,$3,$3,$4,COALESCE($5,(SELECT condition FROM users WHERE id=$1),'FTD'),$6,$7) RETURNING id,status`,
        [
          req.user!.id,
          cleanTitle,
          cleanContent,
          isStaff(req.user!.role) ? "APPROVED" : "PENDING_MODERATION",
          requestedCondition,
          urgent,
          JSON.stringify(phiAlerts),
        ],
      );
      await client.query(
        `INSERT INTO post_groups(post_id,cohort_id) VALUES($1,$2)`,
        [r.rows[0].id, input.targetCohortId],
      );
      return r.rows[0];
    });
    res.status(201).json({
      postId: created.id,
      status: created.status,
      message:
        created.status === "APPROVED"
          ? "Discussion posted."
          : "Your question was submitted for clinician review.",
      hasPhiAlerts: phiAlerts.length > 0,
      phiAlertsCount: phiAlerts.length,
    });
  }),
);

router.post(
  "/:id/comments",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        content: z.string().trim().min(1).max(10000),
        parentCommentId: z.string().optional(),
      })
      .parse(req.body);
    const postResult = await query(
      `SELECT is_closed,allow_unmoderated_replies FROM posts WHERE id=$1`,
      [req.params.id],
    );
    const post = postResult.rows[0];
    if (!post) throw new HttpError(404, "Discussion not found");
    if (
      !(await canViewPost(String(req.params.id), req.user!.id, req.user!.role))
    )
      throw new HttpError(404, "Discussion not found");
    if (post.is_closed)
      throw new HttpError(409, "This discussion is closed to new replies");
    if (input.parentCommentId) {
      const parent = await query(
        `SELECT id FROM comments WHERE id=$1 AND post_id=$2 AND status='APPROVED'`,
        [input.parentCommentId, req.params.id],
      );
      if (!parent.rows[0])
        throw new HttpError(400, "Reply parent is unavailable");
    }
    const status =
      isStaff(req.user!.role) || post.allow_unmoderated_replies
        ? "APPROVED"
        : "PENDING_MODERATION";
    const cleanContent = sanitizeUserContent(input.content);
    if (!cleanContent) throw new HttpError(400, "Reply text is required");
    const phiAlerts = scanForPhi(cleanContent);
    const result = await query(
      `INSERT INTO comments(post_id,parent_comment_id,author_id,raw_content,sanitized_content,status,phi_alerts)
    VALUES($1,$2,$3,$4,$4,$5,$6) RETURNING *`,
      [
        req.params.id,
        input.parentCommentId ?? null,
        req.user!.id,
        cleanContent,
        status,
        JSON.stringify(phiAlerts),
      ],
    );
    const user = await query(`SELECT *,id author_id FROM users WHERE id=$1`, [
      req.user!.id,
    ]);
    const row: any = {
      ...user.rows[0],
      ...result.rows[0],
      author_id: req.user!.id,
    };
    res.status(201).json({
      comment: {
        id: row.id,
        parentCommentId: row.parent_comment_id ?? undefined,
        postId: row.post_id,
        content: row.sanitized_content,
        author: author(row, isStaff(req.user!.role)),
        status: row.status,
        createdAt: row.created_at,
      },
      message:
        status === "APPROVED"
          ? "Reply posted."
          : "Reply submitted for moderation review.",
    });
  }),
);

router.post(
  "/:id/upvote",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (
      !(await canViewPost(String(req.params.id), req.user!.id, req.user!.role))
    )
      throw new HttpError(404, "Discussion not found");
    const outcome = await transaction(async (client) => {
      const deleted = await client.query(
        `DELETE FROM post_upvotes WHERE post_id=$1 AND user_id=$2 RETURNING post_id`,
        [req.params.id, req.user!.id],
      );
      let upvoted = false;
      if (!deleted.rowCount) {
        await client.query(
          `INSERT INTO post_upvotes(post_id,user_id) VALUES($1,$2)`,
          [req.params.id, req.user!.id],
        );
        upvoted = true;
      }
      const count = await client.query(
        `SELECT COUNT(*)::int count FROM post_upvotes WHERE post_id=$1`,
        [req.params.id],
      );
      return { upvoted, count: count.rows[0].count };
    });
    res.json({
      success: true,
      upvotes: outcome.count,
      isUpvoted: outcome.upvoted,
    });
  }),
);

router.put(
  "/:id/close",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { isClosed } = z.object({ isClosed: z.boolean() }).parse(req.body);
    const result = await query(
      `UPDATE posts SET is_closed=$1,closed_at=CASE WHEN $1 THEN NOW() ELSE NULL END,
    closed_by=CASE WHEN $1 THEN $2 ELSE NULL END,updated_at=NOW() WHERE id=$3 RETURNING id`,
      [isClosed, req.user!.id, req.params.id],
    );
    if (!result.rows[0]) throw new HttpError(404, "Discussion not found");
    res.json({
      post: await onePost(String(req.params.id), req.user!.id, true),
      isClosed,
      message: isClosed ? "Discussion closed." : "Discussion reopened.",
    });
  }),
);

router.put(
  "/:id/unmoderated-replies",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { allowUnmoderatedReplies } = z
      .object({ allowUnmoderatedReplies: z.boolean() })
      .parse(req.body);
    await transaction(async (client) => {
      const updated = await client.query(
        `UPDATE posts SET allow_unmoderated_replies=$1,updated_at=NOW() WHERE id=$2 RETURNING id`,
        [allowUnmoderatedReplies, req.params.id],
      );
      if (!updated.rows[0]) throw new HttpError(404, "Discussion not found");
      if (allowUnmoderatedReplies)
        await client.query(
          `UPDATE comments SET status='APPROVED',moderated_by=$1,moderated_at=NOW()
      WHERE post_id=$2 AND status='PENDING_MODERATION'`,
          [req.user!.id, req.params.id],
        );
    });
    res.json({
      post: await onePost(String(req.params.id), req.user!.id, true),
      message: "Reply moderation setting updated.",
    });
  }),
);

router.put(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(3).max(255).optional(),
        content: z.string().trim().min(5).max(20000).optional(),
        targetCohortId: z.string().optional(),
      })
      .refine(
        (value) => Object.values(value).some((item) => item !== undefined),
        {
          message: "At least one change is required",
        },
      )
      .parse(req.body);
    const owner = await query(
      `SELECT author_id,title,raw_content FROM posts WHERE id=$1`,
      [req.params.id],
    );
    if (!owner.rows[0]) throw new HttpError(404, "Discussion not found");
    if (owner.rows[0].author_id !== req.user!.id && !isStaff(req.user!.role))
      throw new HttpError(403, "Not allowed to edit this discussion");
    if (input.targetCohortId) {
      const allowed = await query(
        `SELECT c.id FROM cohorts c WHERE c.id=$1 AND c.is_active AND
         ($2::boolean OR c.is_general_board OR EXISTS(
           SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=c.id AND cm.user_id=$3))`,
        [input.targetCohortId, isStaff(req.user!.role), req.user!.id],
      );
      if (!allowed.rows[0])
        throw new HttpError(
          403,
          "You cannot move this discussion to that cohort",
        );
    }
    const cleanTitle = sanitizeUserContent(input.title ?? owner.rows[0].title);
    const cleanContent = sanitizeUserContent(
      input.content ?? owner.rows[0].raw_content,
    );
    if (!cleanTitle || !cleanContent)
      throw new HttpError(400, "Title and content are required");
    const phiAlerts = scanForPhi(`${cleanTitle} ${cleanContent}`);
    const urgent = isUrgentClinicalContent(`${cleanTitle} ${cleanContent}`);
    await transaction(async (client) => {
      await client.query(
        `UPDATE posts SET title=$1,raw_content=$2,sanitized_content=$2,
      status=CASE WHEN $4::boolean THEN status ELSE 'PENDING_MODERATION' END,
      moderated_by=CASE WHEN $4::boolean THEN moderated_by ELSE NULL END,
      moderated_at=CASE WHEN $4::boolean THEN moderated_at ELSE NULL END,
      is_urgent_clinical=$5,phi_alerts=$6,updated_at=NOW() WHERE id=$3`,
        [
          cleanTitle,
          cleanContent,
          req.params.id,
          isStaff(req.user!.role),
          urgent,
          JSON.stringify(phiAlerts),
        ],
      );
      if (input.targetCohortId) {
        await client.query(`DELETE FROM post_groups WHERE post_id=$1`, [
          req.params.id,
        ]);
        await client.query(`INSERT INTO post_groups VALUES($1,$2)`, [
          req.params.id,
          input.targetCohortId,
        ]);
      }
    });
    res.json({
      post: await onePost(
        String(req.params.id),
        req.user!.id,
        isStaff(req.user!.role),
      ),
      message: "Question updated.",
    });
  }),
);

router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM posts WHERE id=$1 AND (author_id=$2 OR $3::boolean) RETURNING id`,
      [req.params.id, req.user!.id, isStaff(req.user!.role)],
    );
    if (!result.rows[0])
      throw new HttpError(404, "Discussion not found or not editable");
    res.json({ success: true, message: "Question withdrawn successfully." });
  }),
);

router.put(
  "/:postId/comments/:commentId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { content } = z
      .object({ content: z.string().trim().min(1).max(10000) })
      .parse(req.body);
    const cleanContent = sanitizeUserContent(content);
    if (!cleanContent) throw new HttpError(400, "Reply text is required");
    const phiAlerts = scanForPhi(cleanContent);
    const result = await query(
      `UPDATE comments SET raw_content=$1,sanitized_content=$1,phi_alerts=$6,
      status=CASE WHEN $5::boolean THEN status ELSE 'PENDING_MODERATION' END,
      moderated_by=CASE WHEN $5::boolean THEN moderated_by ELSE NULL END,
      moderated_at=CASE WHEN $5::boolean THEN moderated_at ELSE NULL END,updated_at=NOW()
    WHERE id=$2 AND post_id=$3 AND (author_id=$4 OR $5::boolean) RETURNING *`,
      [
        cleanContent,
        req.params.commentId,
        req.params.postId,
        req.user!.id,
        isStaff(req.user!.role),
        JSON.stringify(phiAlerts),
      ],
    );
    if (!result.rows[0])
      throw new HttpError(404, "Reply not found or not editable");
    const user = await query(`SELECT *,id author_id FROM users WHERE id=$1`, [
      result.rows[0].author_id,
    ]);
    const row: any = {
      ...user.rows[0],
      ...result.rows[0],
      author_id: result.rows[0].author_id,
    };
    res.json({
      comment: {
        id: row.id,
        parentCommentId: row.parent_comment_id ?? undefined,
        postId: row.post_id,
        content: row.sanitized_content,
        author: author(row, isStaff(req.user!.role)),
        status: row.status,
        createdAt: row.created_at,
      },
      message: "Reply updated.",
    });
  }),
);

router.delete(
  "/:postId/comments/:commentId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM comments WHERE id=$1 AND post_id=$2 AND (author_id=$3 OR $4::boolean) RETURNING id`,
      [
        req.params.commentId,
        req.params.postId,
        req.user!.id,
        isStaff(req.user!.role),
      ],
    );
    if (!result.rows[0])
      throw new HttpError(404, "Reply not found or not editable");
    res.json({ success: true, message: "Reply removed successfully." });
  }),
);

router.post(
  "/:id/private-note",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { message, action } = z
      .object({
        message: z.string().trim().min(1).max(5000),
        action: z.enum(["KEEP_PENDING", "PUBLISH"]).default("KEEP_PENDING"),
      })
      .parse(req.body);
    const outcome = await transaction(async (client) => {
      const post = await client.query(
        `SELECT id,status FROM posts WHERE id=$1 FOR UPDATE`,
        [req.params.id],
      );
      if (!post.rows[0]) throw new HttpError(404, "Discussion not found");
      const inserted = await client.query(
        `INSERT INTO moderator_private_notes(post_id,sender_id,message) VALUES($1,$2,$3) RETURNING *`,
        [req.params.id, req.user!.id, message],
      );
      let postStatus = post.rows[0].status;
      if (action === "PUBLISH") {
        const published = await client.query(
          `UPDATE posts SET status='APPROVED',moderated_by=$1,moderated_at=NOW(),updated_at=NOW()
           WHERE id=$2 RETURNING status`,
          [req.user!.id, req.params.id],
        );
        postStatus = published.rows[0].status;
      }
      const notes = await client.query(
        `SELECT n.*,u.first_name,u.last_name,u.role FROM moderator_private_notes n
         JOIN users u ON u.id=n.sender_id WHERE n.post_id=$1 ORDER BY n.created_at`,
        [req.params.id],
      );
      return { inserted: inserted.rows[0], notes: notes.rows, postStatus };
    });
    const toNote = (n: any) => ({
      id: n.id,
      senderId: n.sender_id,
      senderName: `${n.first_name} ${n.last_name}`,
      senderRole: n.role,
      message: n.message,
      createdAt: n.created_at,
    });
    const notes = outcome.notes.map(toNote);
    res.status(201).json({
      success: true,
      note: notes.find((note) => note.id === outcome.inserted.id),
      postStatus: outcome.postStatus,
      notes,
      message:
        action === "PUBLISH"
          ? "Private message sent and post published!"
          : "Private message sent to care partner.",
    });
  }),
);

export default router;
