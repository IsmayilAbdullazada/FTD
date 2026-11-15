import { publishPendingPost } from './posts.service.js';
import type { Request, Response } from 'express';
import { canViewPost } from './postAccess.js';
import type { NoteRow } from '../../db/rows.js';

import { z } from 'zod';
import { query, transaction } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';
import { paginationMeta, parsePagination } from '../../lib/pagination.js';
import { isStaffRole } from '../../lib/roles.js';
import {
  isUrgentClinicalContent,
  sanitizeUserContent,
  scanForPhi,
} from '../../lib/contentSafety.js';

import {
  commentSelect,
  findComment,
  findPost,
  mapComment,
  mapPost,
  queryPostPage,
} from './postQueries.js';

export const listPosts = async (req: Request, res: Response) => {
  const staff = isStaffRole(req.user!.role);
  const status =
    typeof req.query.status === 'string' ? req.query.status : undefined;
  const groupId =
    typeof req.query.groupId === 'string' && req.query.groupId !== 'all'
      ? req.query.groupId
      : undefined;
  const condition =
    typeof req.query.condition === 'string' ? req.query.condition : undefined;
  const { page, pageSize, limit, offset } = parsePagination(req.query);
  const values = [
    req.user!.id,
    staff,
    status ?? null,
    groupId ?? null,
    condition ?? null,
    String(req.query.search ?? '').slice(0, 500),
    String(req.query.section ?? ''),
    String(req.query.closed ?? ''),
    String(req.query.policy ?? ''),
  ];
  const { rows, total } = await queryPostPage(values, limit, offset);
  const posts = rows.map((r) =>
    mapPost(r as Parameters<typeof mapPost>[0], staff),
  );
  res.json({
    total,
    posts,
    pagination: paginationMeta(page, pageSize, total),
  });
};
export const getDiscussion = async (req: Request, res: Response) => {
  const staff = isStaffRole(req.user!.role);
  if (!(await canViewPost(String(req.params.id), req.user!.id, req.user!.role)))
    throw new HttpError(404, 'Discussion not found');
  const post = await findPost(String(req.params.id), req.user!.id, staff);
  const comments = await query(
    `${commentSelect} WHERE c.post_id=$1 AND ($2::boolean OR c.status='APPROVED' OR c.author_id=$3) ORDER BY c.created_at`,
    [req.params.id, staff, req.user!.id],
  );
  res.json({
    post,
    comments: comments.rows.map((row) =>
      mapComment(row as Parameters<typeof mapComment>[0], staff),
    ),
  });
};
export const createDiscussion = async (req: Request, res: Response) => {
  const input = z
    .object({
      title: z.string().trim().min(3).max(255),
      content: z.string().trim().min(5).max(20000),
      targetCohortId: z.string().default('group-general'),
      condition: z.enum(['FTD', 'AD', 'BOTH']).optional(),
    })
    .parse(req.body);
  const allowed = await query(
    `SELECT c.id FROM cohorts c WHERE c.id=$1 AND c.is_active AND
    ($2::boolean OR c.is_general_board OR EXISTS(SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=c.id AND cm.user_id=$3))`,
    [input.targetCohortId, isStaffRole(req.user!.role), req.user!.id],
  );
  if (!allowed.rows[0])
    throw new HttpError(403, 'You cannot post to this cohort');
  const cleanTitle = sanitizeUserContent(input.title);
  const cleanContent = sanitizeUserContent(input.content);
  if (!cleanTitle || !cleanContent)
    throw new HttpError(400, 'Title and content are required');
  const phiAlerts = scanForPhi(`${cleanTitle} ${cleanContent}`);
  const urgent = isUrgentClinicalContent(`${cleanTitle} ${cleanContent}`);
  const requestedCondition = isStaffRole(req.user!.role)
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
        isStaffRole(req.user!.role) ? 'APPROVED' : 'PENDING_MODERATION',
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
      created.status === 'APPROVED'
        ? 'Discussion posted.'
        : 'Your question was submitted for clinician review.',
    hasPhiAlerts: phiAlerts.length > 0,
    phiAlertsCount: phiAlerts.length,
  });
};
export const addReply = async (req: Request, res: Response) => {
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
  if (!post) throw new HttpError(404, 'Discussion not found');
  if (!(await canViewPost(String(req.params.id), req.user!.id, req.user!.role)))
    throw new HttpError(404, 'Discussion not found');
  if (post.is_closed)
    throw new HttpError(409, 'This discussion is closed to new replies');
  if (input.parentCommentId) {
    const parent = await query(
      `SELECT id FROM comments WHERE id=$1 AND post_id=$2 AND status='APPROVED'`,
      [input.parentCommentId, req.params.id],
    );
    if (!parent.rows[0])
      throw new HttpError(400, 'Reply parent is unavailable');
  }
  const status =
    isStaffRole(req.user!.role) || post.allow_unmoderated_replies
      ? 'APPROVED'
      : 'PENDING_MODERATION';
  const cleanContent = sanitizeUserContent(input.content);
  if (!cleanContent) throw new HttpError(400, 'Reply text is required');
  const phiAlerts = scanForPhi(cleanContent);
  const result = await query(
    `INSERT INTO comments(post_id,parent_comment_id,author_id,raw_content,sanitized_content,status,phi_alerts)
    VALUES($1,$2,$3,$4,$4,$5,$6) RETURNING id`,
    [
      req.params.id,
      input.parentCommentId ?? null,
      req.user!.id,
      cleanContent,
      status,
      JSON.stringify(phiAlerts),
    ],
  );
  res.status(201).json({
    comment: await findComment(result.rows[0].id, isStaffRole(req.user!.role)),
    message:
      status === 'APPROVED'
        ? 'Reply posted.'
        : 'Reply submitted for moderation review.',
  });
};
export const toggleUpvote = async (req: Request, res: Response) => {
  if (!(await canViewPost(String(req.params.id), req.user!.id, req.user!.role)))
    throw new HttpError(404, 'Discussion not found');
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
};
export const setClosed = async (req: Request, res: Response) => {
  const { isClosed } = z.object({ isClosed: z.boolean() }).parse(req.body);
  const result = await query(
    `UPDATE posts SET is_closed=$1,closed_at=CASE WHEN $1 THEN NOW() ELSE NULL END,
    closed_by=CASE WHEN $1 THEN $2 ELSE NULL END,updated_at=NOW() WHERE id=$3 RETURNING id`,
    [isClosed, req.user!.id, req.params.id],
  );
  if (!result.rows[0]) throw new HttpError(404, 'Discussion not found');
  res.json({
    post: await findPost(String(req.params.id), req.user!.id, true),
    isClosed,
    message: isClosed ? 'Discussion closed.' : 'Discussion reopened.',
  });
};
export const setReplyPolicy = async (req: Request, res: Response) => {
  const { allowUnmoderatedReplies } = z
    .object({ allowUnmoderatedReplies: z.boolean() })
    .parse(req.body);
  await transaction(async (client) => {
    const updated = await client.query(
      `UPDATE posts SET allow_unmoderated_replies=$1,updated_at=NOW() WHERE id=$2 RETURNING id`,
      [allowUnmoderatedReplies, req.params.id],
    );
    if (!updated.rows[0]) throw new HttpError(404, 'Discussion not found');
    if (allowUnmoderatedReplies)
      await client.query(
        `UPDATE comments SET status='APPROVED',moderated_by=$1,moderated_at=NOW()
      WHERE post_id=$2 AND status='PENDING_MODERATION'`,
        [req.user!.id, req.params.id],
      );
  });
  res.json({
    post: await findPost(String(req.params.id), req.user!.id, true),
    message: 'Reply moderation setting updated.',
  });
};
export const editDiscussion = async (req: Request, res: Response) => {
  const input = z
    .object({
      title: z.string().trim().min(3).max(255).optional(),
      content: z.string().trim().min(5).max(20000).optional(),
      targetCohortId: z.string().optional(),
    })
    .refine(
      (value) => Object.values(value).some((item) => item !== undefined),
      {
        message: 'At least one change is required',
      },
    )
    .parse(req.body);
  const owner = await query(
    `SELECT author_id,title,raw_content FROM posts WHERE id=$1`,
    [req.params.id],
  );
  if (!owner.rows[0]) throw new HttpError(404, 'Discussion not found');
  if (owner.rows[0].author_id !== req.user!.id && !isStaffRole(req.user!.role))
    throw new HttpError(403, 'Not allowed to edit this discussion');
  if (input.targetCohortId) {
    const allowed = await query(
      `SELECT c.id FROM cohorts c WHERE c.id=$1 AND c.is_active AND
         ($2::boolean OR c.is_general_board OR EXISTS(
           SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=c.id AND cm.user_id=$3))`,
      [input.targetCohortId, isStaffRole(req.user!.role), req.user!.id],
    );
    if (!allowed.rows[0])
      throw new HttpError(
        403,
        'You cannot move this discussion to that cohort',
      );
  }
  const cleanTitle = sanitizeUserContent(input.title ?? owner.rows[0].title);
  const cleanContent = sanitizeUserContent(
    input.content ?? owner.rows[0].raw_content,
  );
  if (!cleanTitle || !cleanContent)
    throw new HttpError(400, 'Title and content are required');
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
        isStaffRole(req.user!.role),
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
    post: await findPost(
      String(req.params.id),
      req.user!.id,
      isStaffRole(req.user!.role),
    ),
    message: 'Question updated.',
  });
};
export const withdrawDiscussion = async (req: Request, res: Response) => {
  const result = await query(
    `DELETE FROM posts WHERE id=$1 AND (author_id=$2 OR $3::boolean) RETURNING id`,
    [req.params.id, req.user!.id, isStaffRole(req.user!.role)],
  );
  if (!result.rows[0])
    throw new HttpError(404, 'Discussion not found or not editable');
  res.json({ success: true, message: 'Question withdrawn successfully.' });
};
export const editReply = async (req: Request, res: Response) => {
  const { content } = z
    .object({ content: z.string().trim().min(1).max(10000) })
    .parse(req.body);
  const cleanContent = sanitizeUserContent(content);
  if (!cleanContent) throw new HttpError(400, 'Reply text is required');
  const phiAlerts = scanForPhi(cleanContent);
  const result = await query(
    `UPDATE comments SET raw_content=$1,sanitized_content=$1,phi_alerts=$6,
      status=CASE WHEN $5::boolean THEN status ELSE 'PENDING_MODERATION' END,
      moderated_by=CASE WHEN $5::boolean THEN moderated_by ELSE NULL END,
      moderated_at=CASE WHEN $5::boolean THEN moderated_at ELSE NULL END,updated_at=NOW()
    WHERE id=$2 AND post_id=$3 AND (author_id=$4 OR $5::boolean) RETURNING id`,
    [
      cleanContent,
      req.params.commentId,
      req.params.postId,
      req.user!.id,
      isStaffRole(req.user!.role),
      JSON.stringify(phiAlerts),
    ],
  );
  if (!result.rows[0])
    throw new HttpError(404, 'Reply not found or not editable');
  res.json({
    comment: await findComment(result.rows[0].id, isStaffRole(req.user!.role)),
    message: 'Reply updated.',
  });
};
export const withdrawReply = async (req: Request, res: Response) => {
  const result = await query(
    `DELETE FROM comments WHERE id=$1 AND post_id=$2 AND (author_id=$3 OR $4::boolean) RETURNING id`,
    [
      req.params.commentId,
      req.params.postId,
      req.user!.id,
      isStaffRole(req.user!.role),
    ],
  );
  if (!result.rows[0])
    throw new HttpError(404, 'Reply not found or not editable');
  res.json({ success: true, message: 'Reply removed successfully.' });
};
export const sendPrivateReply = async (req: Request, res: Response) => {
  const { message, action } = z
    .object({
      message: z.string().trim().min(1).max(5000),
      action: z.enum(['KEEP_PENDING', 'PUBLISH']).default('KEEP_PENDING'),
    })
    .parse(req.body);
  const outcome = await transaction(async (client) => {
    const post = await client.query(
      `SELECT id,status,author_id FROM posts WHERE id=$1 FOR UPDATE`,
      [req.params.id],
    );
    if (!post.rows[0]) throw new HttpError(404, 'Discussion not found');
    if (
      !isStaffRole(req.user!.role) &&
      (post.rows[0].author_id !== req.user!.id || action !== 'KEEP_PENDING')
    )
      throw new HttpError(403, 'Private discussion access denied');
    const inserted = await client.query(
      `INSERT INTO moderator_private_notes(post_id,sender_id,message) VALUES($1,$2,$3) RETURNING *`,
      [req.params.id, req.user!.id, message],
    );
    const recipients = isStaffRole(req.user!.role)
      ? [post.rows[0].author_id]
      : (
          await client.query(
            "SELECT DISTINCT n.sender_id FROM moderator_private_notes n JOIN users u ON u.id=n.sender_id WHERE n.post_id=$1 AND u.role IN ('CLINICIAN_MODERATOR','SYSTEM_ADMIN')",
            [req.params.id],
          )
        ).rows.map((row) => row.sender_id);
    for (const recipient of recipients)
      await client.query(
        "INSERT INTO notifications(recipient_user_id,title,message,type) VALUES($1,'New private discussion reply','A private reply is available in your discussion.','DIRECT_CHAT')",
        [recipient],
      );
    let postStatus = post.rows[0].status;
    if (action === 'PUBLISH')
      postStatus = await publishPendingPost(
        client,
        String(req.params.id),
        req.user!.id,
      );
    const notes = await client.query(
      `SELECT n.*,u.first_name,u.last_name,u.role FROM moderator_private_notes n
         JOIN users u ON u.id=n.sender_id WHERE n.post_id=$1 ORDER BY n.created_at`,
      [req.params.id],
    );
    return { inserted: inserted.rows[0], notes: notes.rows, postStatus };
  });
  const toNote = (
    n: NoteRow & { first_name: string; last_name: string; role: string },
  ) => ({
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
      action === 'PUBLISH'
        ? 'Private message sent and post published!'
        : 'Private message sent to care partner.',
  });
};
