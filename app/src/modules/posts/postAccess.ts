import { query } from '../../config/db.js';
import { isStaffRole } from '../../lib/roles.js';
// Callers supply fixed SQL parameter references, never request data.
export function postAudience(viewer: `$${number}`): string {
  return `p.condition IN (COALESCE((SELECT condition FROM users WHERE id=${viewer}),'FTD'),'BOTH')
 AND EXISTS(SELECT 1 FROM post_groups pg WHERE pg.post_id=p.id AND
 (pg.cohort_id='group-general' OR EXISTS(SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=pg.cohort_id AND cm.user_id=${viewer})))`;
}
export async function canViewPost(
  postId: string,
  userId: string,
  role: string,
): Promise<boolean> {
  if (isStaffRole(role)) return true;
  const result = await query(
    `SELECT 1 FROM posts p WHERE p.id=$1 AND ((p.author_id=$2 AND p.status='PENDING_MODERATION') OR (p.status='APPROVED' AND ${postAudience('$2')}))`,
    [postId, userId],
  );
  return Boolean(result.rows[0]);
}
