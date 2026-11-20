import { query, transaction } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { canViewPost } from '../modules/posts/postAccess.js';
import {
  activities,
  type ActivityContext,
  type ActivityKind,
} from './activityDefinitions.js';
import { composeEmail } from './emailTemplates.js';
import { sendEmail } from './email.js';

export function activityPath(
  kind: ActivityKind,
  context: ActivityContext,
): string {
  const params = new URLSearchParams();
  if (kind === 'PASSWORD_CHANGED') params.set('tab', 'forgot-password');
  else if (
    kind.endsWith('REVIEW_REQUIRED') ||
    kind === 'GUIDE_APPROVED' ||
    kind === 'INVITATION_ACCEPTED'
  )
    params.set('tab', 'moderation');
  else {
    params.set('tab', 'feed');
    if (
      context.postId &&
      [
        'POST_SUBMITTED',
        'REPLY_SUBMITTED',
        'POST_APPROVED',
        'REPLY_APPROVED',
        'POST_REPLY',
        'REPLY_RESPONSE',
        'POST_CLOSED',
        'POST_REOPENED',
        'PRIVATE_REPLY',
        'REPLY_POLICY_CHANGED',
      ].includes(kind)
    )
      params.set('post', context.postId);
    else if (kind !== 'WELCOME') params.set('notifications', 'open');
  }
  return `/?${params}`;
}

interface Delivery {
  notification_id: string;
  kind: ActivityKind;
  context: ActivityContext;
  email: string;
  user_id: string;
  role: string;
  is_active: boolean;
}

async function isDeliverable(job: Delivery): Promise<boolean> {
  if (!job.is_active || !Object.hasOwn(activities, job.kind)) return false;
  if (
    ['GUIDE_APPROVED', 'INVITATION_ACCEPTED'].includes(job.kind) &&
    !['CLINICIAN_MODERATOR', 'SYSTEM_ADMIN'].includes(job.role)
  )
    return false;
  if (job.kind === 'PRIVATE_REPLY') {
    const participant = await query(
      'SELECT 1 FROM posts WHERE id=$1 AND (author_id=$2 OR $3::boolean)',
      [
        job.context.postId,
        job.user_id,
        ['CLINICIAN_MODERATOR', 'SYSTEM_ADMIN'].includes(job.role),
      ],
    );
    return (
      Boolean(participant.rowCount) &&
      (await canViewPost(job.context.postId!, job.user_id, job.role))
    );
  }
  if (job.kind.endsWith('REVIEW_REQUIRED')) {
    if (!['CLINICIAN_MODERATOR', 'SYSTEM_ADMIN'].includes(job.role))
      return false;
    const { postId, commentId, guideId } = job.context;
    const pending = guideId
      ? await query(
          "SELECT 1 FROM chatbot_guides WHERE id=$1 AND status='DRAFT'",
          [guideId],
        )
      : commentId
        ? await query(
            "SELECT 1 FROM comments WHERE id=$1 AND status='PENDING_MODERATION'",
            [commentId],
          )
        : await query(
            "SELECT 1 FROM posts WHERE id=$1 AND status='PENDING_MODERATION'",
            [postId],
          );
    return Boolean(pending.rowCount);
  }
  if (job.kind === 'POST_APPROVED')
    return Boolean(
      (
        await query("SELECT 1 FROM posts WHERE id=$1 AND status='APPROVED'", [
          job.context.postId,
        ])
      ).rowCount,
    );
  if (job.kind === 'REPLY_APPROVED')
    return Boolean(
      (
        await query(
          "SELECT 1 FROM comments WHERE id=$1 AND status='APPROVED'",
          [job.context.commentId],
        )
      ).rowCount,
    );
  if (job.kind === 'POST_REPLY' || job.kind === 'REPLY_RESPONSE') {
    const visible = await query(
      `SELECT 1 FROM comments c JOIN posts p ON p.id=c.post_id LEFT JOIN comments parent ON parent.id=c.parent_comment_id
      WHERE c.id=$1 AND c.post_id=$2 AND c.status='APPROVED' AND p.status='APPROVED' AND (c.parent_comment_id IS NULL OR parent.status='APPROVED')`,
      [job.context.commentId, job.context.postId],
    );
    return (
      Boolean(visible.rowCount) &&
      (await canViewPost(job.context.postId!, job.user_id, job.role))
    );
  }
  return true;
}

// Claims are committed before SMTP. Leases prevent simultaneous workers from sending a job.
// Delivery is at least once: an SMTP acceptance followed by a process crash can cause a retry.
export async function processNotificationEmails(
  options: { limit?: number; notificationIds?: string[] } = {},
) {
  const totals = { sent: 0, skipped: 0, failed: 0 };
  try {
    const claimed = await transaction(async (client) =>
      client.query(
        `WITH due AS (
         SELECT notification_id FROM notification_email_jobs WHERE completed_at IS NULL AND skipped_at IS NULL
          AND attempts<5 AND next_attempt_at<=NOW() AND (locked_until IS NULL OR locked_until<NOW())
          AND ($2::text[] IS NULL OR notification_id=ANY($2))
         ORDER BY created_at,notification_id FOR UPDATE SKIP LOCKED LIMIT $1
       ) UPDATE notification_email_jobs j SET attempts=j.attempts+1,locked_until=NOW()+INTERVAL '2 minutes'
         FROM due WHERE j.notification_id=due.notification_id RETURNING j.notification_id`,
        [
          Math.min(Math.max(options.limit ?? 20, 1), 20),
          options.notificationIds ?? null,
        ],
      ),
    );
    const deliver = async (notificationId: string) => {
      try {
        const job = (
          await query<Delivery & import('pg').QueryResultRow>(
            `SELECT j.notification_id,n.kind,n.context,u.email,u.id user_id,u.role,u.is_active
           FROM notification_email_jobs j JOIN notifications n ON n.id=j.notification_id JOIN users u ON u.id=n.recipient_user_id
           WHERE j.notification_id=$1`,
            [notificationId],
          )
        ).rows[0];
        if (!job || !(await isDeliverable(job))) {
          await query(
            'UPDATE notification_email_jobs SET skipped_at=NOW(),locked_until=NULL WHERE notification_id=$1',
            [notificationId],
          );
          totals.skipped++;
          return;
        }
        const definition = activities[job.kind];
        let path = activityPath(job.kind, job.context);
        if (
          path.includes('post=') &&
          !(await canViewPost(job.context.postId!, job.user_id, job.role))
        )
          path = '/?tab=feed&notifications=open';
        const url = new URL(env.APP_URL);
        url.pathname = path.split('?')[0];
        url.search = path.split('?')[1] ?? '';
        url.hash = '';
        const email = composeEmail({
          subject: definition.title,
          paragraphs: [
            definition.message,
            'For your privacy, discussion and message details are available only after you sign in.',
          ],
          action: { label: definition.action, url: url.href },
        });
        const result = await sendEmail({
          to: job.email,
          ...email,
          messageId: `<activity-${notificationId}@${new URL(env.APP_URL).hostname}>`,
        });
        if (!result.emailSent) throw new Error('SMTP delivery failed');
        await query(
          'UPDATE notification_email_jobs SET completed_at=NOW(),locked_until=NULL,last_error=NULL WHERE notification_id=$1',
          [notificationId],
        );
        totals.sent++;
      } catch (error) {
        totals.failed++;
        await query(
          `UPDATE notification_email_jobs SET locked_until=NULL,next_attempt_at=NOW()+INTERVAL '1 minute'*POWER(2,LEAST(attempts-1,3)),last_error='Email delivery failed' WHERE notification_id=$1`,
          [notificationId],
        );
        logger.error('Activity email delivery failed', error);
      }
    };
    for (let index = 0; index < claimed.rows.length; index += 4)
      await Promise.all(
        claimed.rows
          .slice(index, index + 4)
          .map((job) => deliver(job.notification_id)),
      );
  } catch (error) {
    logger.error('Activity email worker failed', error);
  }
  return totals;
}
