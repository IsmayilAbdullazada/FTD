import { query } from "../../config/db.js";
import { HttpError } from "../../lib/http.js";
import { author, cohort } from "../../lib/serializers.js";

export const postSelect = `SELECT p.*,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,
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

export function mapPost(row: any, privileged: boolean) {
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

export function mapComment(row: any, privileged: boolean) {
  return {
    id: row.id,
    parentCommentId: row.parent_comment_id ?? undefined,
    postId: row.post_id,
    content: row.sanitized_content,
    author: author(row, privileged),
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
  if (!result.rows[0]) throw new HttpError(404, "Discussion not found");
  return mapPost(result.rows[0], privileged);
}

export async function findComment(id: string, privileged: boolean) {
  const result = await query(`${commentSelect} WHERE c.id=$1`, [id]);
  if (!result.rows[0]) throw new HttpError(404, "Reply not found");
  return mapComment(result.rows[0], privileged);
}
