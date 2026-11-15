import { postAudience } from './postAccess.js';
import type { PostRow, CommentRow, UserRow, CohortRow } from '../../db/rows.js';
import { query } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';
import { author, cohort } from '../../lib/serializers.js';

export const postSelect = `SELECT p.*,$1::text viewer_id,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,
 u.anonymous_handle,u.badge_label,u.avatar_color,
 (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.status='APPROVED')::int comment_count,
 (SELECT COUNT(*) FROM post_upvotes v WHERE v.post_id=p.id)::int upvotes,
 EXISTS(SELECT 1 FROM post_upvotes v WHERE v.post_id=p.id AND v.user_id=$1) is_upvoted,
 COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM post_groups pg JOIN cohorts g ON g.id=pg.cohort_id WHERE pg.post_id=p.id),'[]') groups,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'senderId',n.sender_id,'senderName',nu.first_name||' '||nu.last_name,
   'senderRole',nu.role,'message',n.message,'createdAt',n.created_at) ORDER BY n.created_at)
   FROM moderator_private_notes n JOIN users nu ON nu.id=n.sender_id WHERE n.post_id=p.id),'[]') private_notes
 FROM posts p JOIN users u ON u.id=p.author_id`;

export const commentSelect = `SELECT c.*,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,
 u.anonymous_handle,u.badge_label,u.avatar_color,c.author_id
 FROM comments c JOIN users u ON u.id=c.author_id`;

export function mapPost(
  row: PostRow &
    UserRow & {
      viewer_id: string;
      comment_count: number;
      upvotes: number;
      is_upvoted: boolean;
      groups: CohortRow[];
      private_notes: unknown[];
    },
  privileged: boolean,
) {
  return {
    id: row.id,
    title: row.title,
    content: row.sanitized_content,
    rawContent: privileged ? row.raw_content : undefined,
    status: row.status,
    isClosed: row.is_closed,
    closedAt: row.closed_at ?? undefined,
    closedBy: row.closed_by ?? undefined,
    author: author(row as Parameters<typeof author>[0], privileged),
    assignedGroups: (row.groups ?? []).map((row) =>
      cohort(row as Parameters<typeof cohort>[0]),
    ),
    isUrgentClinical: row.is_urgent_clinical,
    allowUnmoderatedReplies: row.allow_unmoderated_replies,
    createdAt: row.created_at,
    commentCount: row.comment_count,
    upvotes: row.upvotes,
    isUpvoted: row.is_upvoted,
    condition: row.condition,
    phiAlerts: privileged ? row.phi_alerts : undefined,
    moderatorPrivateNotes:
      privileged || row.author_id === row.viewer_id
        ? row.private_notes
        : undefined,
  };
}

export function mapComment(row: CommentRow & UserRow, privileged: boolean) {
  return {
    id: row.id,
    parentCommentId: row.parent_comment_id ?? undefined,
    postId: row.post_id,
    content: row.sanitized_content,
    author: author(row as Parameters<typeof author>[0], privileged),
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function findPost(
  id: string,
  viewerId: string,
  privileged: boolean,
) {
  const result = await query(`${postSelect} WHERE p.id=$2`, [viewerId, id]);
  if (!result.rows[0]) throw new HttpError(404, 'Discussion not found');
  return mapPost(result.rows[0] as Parameters<typeof mapPost>[0], privileged);
}

export async function findComment(id: string, privileged: boolean) {
  const result = await query(`${commentSelect} WHERE c.id=$1`, [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Reply not found');
  return mapComment(
    result.rows[0] as Parameters<typeof mapComment>[0],
    privileged,
  );
}

const postListWhere = `WHERE
 (($2::boolean AND p.status=COALESCE($3,p.status) AND ($3::text IS NOT NULL OR p.status='APPROVED')) OR
  (NOT $2::boolean AND ((p.status='APPROVED' AND ${postAudience('$1')})
    OR (p.author_id=$1 AND p.status='PENDING_MODERATION'))))
 AND ($4::text IS NULL OR EXISTS(SELECT 1 FROM post_groups filter_pg WHERE filter_pg.post_id=p.id AND filter_pg.cohort_id=$4))
 AND ($5::text IS NULL OR p.condition IN ($5,'BOTH'))
 AND ($6::text = '' OR p.title ILIKE '%'||$6||'%' OR p.sanitized_content ILIKE '%'||$6||'%' OR EXISTS(SELECT 1 FROM users su WHERE su.id=p.author_id AND su.anonymous_handle ILIKE '%'||$6||'%') OR EXISTS(SELECT 1 FROM post_groups sg JOIN cohorts sc ON sc.id=sg.cohort_id WHERE sg.post_id=p.id AND (sc.name ILIKE '%'||$6||'%' OR sc.geographic_region ILIKE '%'||$6||'%')))
 AND ($7::text <> 'my-posts' OR p.author_id=$1)
 AND ($7::text <> 'all' OR p.status='APPROVED')
 AND ($8::text <> 'closed' OR p.is_closed)
 AND ($8::text <> 'open' OR NOT p.is_closed)
 AND ($9::text <> 'closed' OR p.is_closed)
 AND ($9::text <> 'moderated' OR (NOT p.allow_unmoderated_replies AND NOT p.is_closed))
 AND ($9::text <> 'unmoderated' OR (p.allow_unmoderated_replies AND NOT p.is_closed))`;

export async function queryPostPage(
  values: unknown[],
  limit: number,
  offset: number,
) {
  const [result, countResult] = await Promise.all([
    query(
      `${postSelect} ${postListWhere} ORDER BY CASE WHEN $7='my-posts' AND p.status='PENDING_MODERATION' THEN 0 ELSE 1 END,p.created_at DESC,p.id DESC LIMIT $10 OFFSET $11`,
      [...values, limit, offset],
    ),
    query(`SELECT COUNT(*)::int total FROM posts p ${postListWhere}`, values),
  ]);
  return { rows: result.rows, total: countResult.rows[0].total as number };
}
