import type { PoolClient } from 'pg';
import { HttpError } from '../../lib/http.js';
export async function publishPendingPost(
  client: PoolClient,
  postId: string,
  moderatorId: string,
): Promise<string> {
  const post = (
    await client.query('SELECT status FROM posts WHERE id=$1 FOR UPDATE', [
      postId,
    ])
  ).rows[0];
  if (!post) throw new HttpError(404, 'Discussion not found');
  if (post.status !== 'PENDING_MODERATION')
    throw new HttpError(409, 'This discussion has already been moderated');
  await client.query(
    "INSERT INTO moderation_audit(moderator_id,entity_type,entity_id,action_taken) VALUES($1,'POST',$2,'APPROVE')",
    [moderatorId, postId],
  );
  const updated = await client.query(
    "UPDATE posts SET status='APPROVED',moderated_by=$1,moderated_at=NOW(),updated_at=NOW() WHERE id=$2 RETURNING status",
    [moderatorId, postId],
  );
  return updated.rows[0].status as string;
}
