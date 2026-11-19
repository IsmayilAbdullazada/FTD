import type { PoolClient } from 'pg';
import {
  activities,
  type ActivityKind,
  type ActivityContext,
} from './activityDefinitions.js';
import { postAudience } from '../modules/posts/postAccess.js';

export async function notify(
  client: PoolClient,
  input: {
    kind: ActivityKind;
    recipients: string[];
    eventKey: string;
    actorId?: string;
    context?: ActivityContext;
    message?: string;
  },
) {
  const definition = activities[input.kind];
  const inserted = await client.query(
    `INSERT INTO notifications(recipient_user_id,title,message,type,event_key,kind,context)
     SELECT id,$3,$4,$5,$6,$7,$8 FROM users
     WHERE id=ANY($1::text[]) AND is_active AND ($2::text IS NULL OR id<>$2)
     ON CONFLICT(event_key,recipient_user_id) WHERE event_key IS NOT NULL DO NOTHING RETURNING id`,
    [
      input.recipients,
      input.actorId ?? null,
      definition.title,
      input.message ?? definition.message,
      definition.type,
      input.eventKey,
      input.kind,
      JSON.stringify(input.context ?? {}),
    ],
  );
  if (inserted.rowCount)
    await client.query(
      'INSERT INTO notification_email_jobs(notification_id) SELECT unnest($1::text[])',
      [inserted.rows.map((row) => row.id)],
    );
}

export async function notifyStaff(
  client: PoolClient,
  input: {
    kind: ActivityKind;
    eventKey: string;
    actorId?: string;
    context?: ActivityContext;
  },
) {
  const staff = await client.query(
    "SELECT id FROM users WHERE is_active AND role IN ('CLINICIAN_MODERATOR','SYSTEM_ADMIN')",
  );
  await notify(client, {
    ...input,
    recipients: staff.rows.map((row) => row.id),
  });
}

export async function notifySubmission(
  client: PoolClient,
  input: {
    postId: string;
    commentId?: string;
    authorId: string;
    revision: string;
  },
) {
  const context = {
    postId: input.postId,
    ...(input.commentId ? { commentId: input.commentId } : {}),
  };
  const entity = input.commentId ?? input.postId;
  await notify(client, {
    kind: input.commentId ? 'REPLY_SUBMITTED' : 'POST_SUBMITTED',
    recipients: [input.authorId],
    eventKey: `submission:${entity}:${input.revision}`,
    context,
  });
  await notifyStaff(client, {
    kind: input.commentId ? 'REPLY_REVIEW_REQUIRED' : 'POST_REVIEW_REQUIRED',
    actorId: input.authorId,
    eventKey: `review:${entity}:${input.revision}`,
    context,
  });
}

export async function notifyReplyPublished(
  client: PoolClient,
  commentId: string,
  actorId?: string,
  visited = new Set<string>(),
) {
  if (visited.has(commentId)) return;
  visited.add(commentId);
  const result = await client.query(
    `SELECT c.author_id,c.post_id,c.parent_comment_id,c.updated_at::text revision,p.author_id post_author,parent.author_id parent_author
     FROM comments c JOIN posts p ON p.id=c.post_id LEFT JOIN comments parent ON parent.id=c.parent_comment_id
     WHERE c.id=$1 AND c.status='APPROVED' AND p.status='APPROVED' AND (c.parent_comment_id IS NULL OR parent.status='APPROVED')`,
    [commentId],
  );
  const reply = result.rows[0];
  if (!reply) return;
  const candidates = [reply.parent_author, reply.post_author].filter(
    (id): id is string =>
      Boolean(id) && id !== reply.author_id && id !== actorId,
  );
  const allowed = await client.query(
    `SELECT u.id FROM users u JOIN posts p ON p.id=$1 WHERE u.id=ANY($2::text[]) AND u.is_active
     AND (u.role IN ('CLINICIAN_MODERATOR','SYSTEM_ADMIN') OR (${postAudience('u.id')}))`,
    [reply.post_id, candidates],
  );
  const eligible = new Set(allowed.rows.map((row) => row.id));
  const eventKey = `reply-published:${commentId}:${reply.revision}`;
  // Parent-reply owners take precedence if they also own the discussion.
  for (const recipient of [...new Set(candidates)])
    if (eligible.has(recipient))
      await notify(client, {
        kind:
          recipient === reply.parent_author ? 'REPLY_RESPONSE' : 'POST_REPLY',
        recipients: [recipient],
        eventKey,
        context: { postId: reply.post_id, commentId },
      });
  const children = await client.query(
    "SELECT id FROM comments WHERE parent_comment_id=$1 AND status='APPROVED' ORDER BY created_at",
    [commentId],
  );
  for (const child of children.rows)
    await notifyReplyPublished(client, child.id, actorId, visited);
}

export async function notifyPublishedPost(
  client: PoolClient,
  postId: string,
  actorId: string,
) {
  const post = (
    await client.query(
      'SELECT author_id,updated_at::text revision FROM posts WHERE id=$1',
      [postId],
    )
  ).rows[0];
  await notify(client, {
    kind: 'POST_APPROVED',
    recipients: [post.author_id],
    actorId,
    eventKey: `post-approved:${postId}:${post.revision}`,
    context: { postId },
  });
  const replies = await client.query(
    "SELECT id FROM comments WHERE post_id=$1 AND status='APPROVED' ORDER BY created_at",
    [postId],
  );
  const visited = new Set<string>();
  for (const reply of replies.rows)
    await notifyReplyPublished(client, reply.id, actorId, visited);
}
