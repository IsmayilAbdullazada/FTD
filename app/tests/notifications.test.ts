import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { app } from '../src/app.js';
import { pool, transaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { notify } from '../src/services/notifications.js';
import { processNotificationEmails } from '../src/services/notificationEmails.js';

const fixture = randomUUID();
const ids = {
  owner: `owner-${fixture}`,
  reply: `reply-${fixture}`,
  nested: `nested-${fixture}`,
  other: `other-${fixture}`,
  staff: `staff-${fixture}`,
  admin: `admin-${fixture}`,
  inactive: `inactive-${fixture}`,
};
const posts: string[] = [];
const guides: string[] = [];
let server: Server;
let base: string;
let postId: string;
let firstReply: string;
let failDelivery = false;
const sent: Array<{
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}> = [];
const originalHost = env.SMTP_HOST;
let transport: ReturnType<typeof mock.method>;
const auth = (userId: string) => ({
  authorization:
    'Bearer ' +
    jwt.sign(
      { id: userId, email: `${userId}@example.test`, sessionVersion: 0 },
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        issuer: 'ftdcare-api',
        audience: 'ftdcare-web',
        expiresIn: '1h',
      },
    ),
});
async function request(
  userId: string,
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
) {
  const response = await fetch(base + '/api/v1' + path, {
    method,
    headers: { ...auth(userId), 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
async function notifications(post: string, kind?: string) {
  return (
    await pool.query(
      "SELECT * FROM notifications WHERE context->>'postId'=$1 AND ($2::text IS NULL OR kind=$2)",
      [post, kind ?? null],
    )
  ).rows;
}
async function createPost() {
  const created = await request(ids.owner, '/posts', {
    title: 'Sensitive fixture title',
    content: 'Sensitive private health text must stay out of email.',
    targetCohortId: 'group-general',
  });
  assert.equal(created.status, 201);
  posts.push(created.body.postId);
  return created.body.postId as string;
}
async function approve(entityId: string, entityType = 'POST') {
  const response = await request(ids.staff, '/moderation/action', {
    entityId,
    entityType,
    action: 'APPROVE',
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
}

before(async () => {
  for (const [name, id] of Object.entries(ids)) {
    const role =
      name === 'staff' || name === 'inactive'
        ? 'CLINICIAN_MODERATOR'
        : name === 'admin'
          ? 'SYSTEM_ADMIN'
          : 'CARE_PARTNER';
    await pool.query(
      `INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label,condition,is_active) VALUES($1,$1||'@example.test','disabled',$2,'Sensitive Name','Fixture','Fixture',$3,$4)`,
      [
        id,
        role,
        role === 'CARE_PARTNER' ? (name === 'other' ? 'AD' : 'FTD') : null,
        name !== 'inactive',
      ],
    );
    if (role === 'CARE_PARTNER')
      await pool.query(
        "INSERT INTO cohort_members(cohort_id,user_id) VALUES('group-general',$1)",
        [id],
      );
  }
  env.SMTP_HOST = 'smtp.example.test';
  transport = mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (message: (typeof sent)[number]) => {
      if (failDelivery) throw new Error('Relay unavailable');
      sent.push(message);
    },
  }));
  await pool.query(
    "INSERT INTO policy_acknowledgments(user_id,policy_type,policy_version) SELECT id,'community_guidelines','1.0' FROM users WHERE id=ANY($1::text[]) ON CONFLICT DO NOTHING",
    [Object.values(ids)],
  );
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  transport.mock.restore();
  env.SMTP_HOST = originalHost;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.query(
    "DELETE FROM notifications WHERE context->>'postId'=ANY($1::text[]) OR context->>'guideId'=ANY($2::text[]) OR recipient_user_id=ANY($3::text[])",
    [posts, guides, Object.values(ids)],
  );
  await pool.query(
    'DELETE FROM private_messages WHERE sender_id=ANY($1::text[]) OR recipient_id=ANY($1::text[])',
    [Object.values(ids)],
  );
  await pool.query('DELETE FROM chatbot_guides WHERE id=ANY($1::text[])', [
    guides,
  ]);
  await pool.query('DELETE FROM posts WHERE id=ANY($1::text[])', [posts]);
  await pool.query('DELETE FROM email_outbox WHERE recipient=ANY($1::text[])', [
    Object.values(ids).map((id) => id + '@example.test'),
  ]);
  await pool.query(
    'DELETE FROM moderation_audit WHERE moderator_id=ANY($1::text[])',
    [Object.values(ids)],
  );
  await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [
    Object.values(ids),
  ]);
  await pool.end();
});

test('pending submissions notify their author and active moderators without publishing replies to other care partners', async () => {
  postId = await createPost();
  const receipt = await notifications(postId, 'POST_SUBMITTED');
  assert.deepEqual(
    receipt.map((n) => n.recipient_user_id),
    [ids.owner],
  );
  const reviewers = await notifications(postId, 'POST_REVIEW_REQUIRED');
  assert.ok(reviewers.some((n) => n.recipient_user_id === ids.staff));
  assert.ok(!reviewers.some((n) => n.recipient_user_id === ids.admin));
  assert.ok(
    !reviewers.some(
      (n) =>
        n.recipient_user_id === ids.inactive ||
        n.recipient_user_id === ids.reply,
    ),
  );
  await approve(postId);
  assert.ok(
    (await notifications(postId, 'POST_APPROVED')).some(
      (n) => n.recipient_user_id === ids.owner,
    ),
  );
  const reply = await request(ids.reply, `/posts/${postId}/comments`, {
    content: 'Sensitive reply details',
  });
  assert.equal(reply.status, 201);
  firstReply = reply.body.comment.id;
  assert.equal((await notifications(postId, 'POST_REPLY')).length, 0);
  assert.equal((await notifications(postId, 'REPLY_RESPONSE')).length, 0);
  assert.ok(
    (await notifications(postId, 'REPLY_REVIEW_REQUIRED')).some(
      (n) => n.recipient_user_id === ids.staff,
    ),
  );
  await approve(firstReply, 'COMMENT');
  assert.ok(
    (await notifications(postId, 'POST_REPLY')).some(
      (n) => n.recipient_user_id === ids.owner,
    ),
  );
  assert.ok(
    (await notifications(postId, 'REPLY_APPROVED')).some(
      (n) => n.recipient_user_id === ids.reply,
    ),
  );
  const count = (await notifications(postId)).length;
  assert.equal(
    (
      await request(ids.staff, '/moderation/action', {
        entityId: firstReply,
        entityType: 'COMMENT',
        action: 'APPROVE',
      })
    ).status,
    409,
  );
  assert.equal((await notifications(postId)).length, count);
  assert.equal(
    (
      await request(ids.other, `/posts/${postId}/comments`, {
        content: 'Unauthorised reply',
      })
    ).status,
    404,
  );
  assert.equal((await notifications(postId)).length, count);
});

test('approved nested replies notify the discussion owner and parent author, with overlap and self-alerts suppressed', async () => {
  const nested = await request(ids.nested, `/posts/${postId}/comments`, {
    content: 'A nested response',
    parentCommentId: firstReply,
  });
  assert.equal(nested.status, 201);
  assert.equal((await notifications(postId, 'REPLY_RESPONSE')).length, 0);
  await approve(nested.body.comment.id, 'COMMENT');
  const recipients = (await notifications(postId)).filter(
    (n) =>
      n.context.commentId === nested.body.comment.id &&
      ['POST_REPLY', 'REPLY_RESPONSE'].includes(n.kind),
  );
  assert.deepEqual(
    new Set(recipients.map((n) => n.recipient_user_id)),
    new Set([ids.owner, ids.reply]),
  );
  const self = await request(ids.owner, `/posts/${postId}/comments`, {
    content: 'The owner adds a reply',
  });
  await approve(self.body.comment.id, 'COMMENT');
  const response = await request(ids.reply, `/posts/${postId}/comments`, {
    content: 'Reply to the owner comment',
    parentCommentId: self.body.comment.id,
  });
  await approve(response.body.comment.id, 'COMMENT');
  const overlap = (await notifications(postId)).filter(
    (n) =>
      n.context.commentId === response.body.comment.id &&
      ['POST_REPLY', 'REPLY_RESPONSE'].includes(n.kind),
  );
  assert.equal(overlap.length, 1);
  assert.equal(overlap[0].recipient_user_id, ids.owner);
  assert.equal(overlap[0].kind, 'REPLY_RESPONSE');
});

test('resubmissions, moderator edits, closing, reopening, bulk approval, private replies and removals create appropriate activity', async () => {
  assert.equal(
    (
      await request(
        ids.reply,
        `/posts/${postId}/comments/${firstReply}`,
        { content: 'Edited reply for review' },
        'PUT',
      )
    ).status,
    200,
  );
  assert.ok(
    (await notifications(postId, 'REPLY_REVIEW_REQUIRED')).filter(
      (n) => n.context.commentId === firstReply,
    ).length >= 2,
  );
  assert.equal(
    (
      await request(
        ids.staff,
        `/posts/${postId}`,
        { title: 'Updated sensitive fixture title' },
        'PUT',
      )
    ).status,
    200,
  );
  assert.equal((await notifications(postId, 'POST_UPDATED')).length, 1);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request(
          ids.staff,
          `/posts/${postId}/close`,
          { isClosed: true },
          'PUT',
        )
      ).status,
      200,
    );
  assert.equal((await notifications(postId, 'POST_CLOSED')).length, 1);
  await request(
    ids.staff,
    `/posts/${postId}/close`,
    { isClosed: false },
    'PUT',
  );
  assert.equal((await notifications(postId, 'POST_REOPENED')).length, 1);
  assert.equal(
    (
      await request(
        ids.staff,
        `/posts/${postId}/unmoderated-replies`,
        { allowUnmoderatedReplies: true },
        'PUT',
      )
    ).status,
    200,
  );
  assert.equal(
    (await pool.query('SELECT status FROM comments WHERE id=$1', [firstReply]))
      .rows[0].status,
    'APPROVED',
  );
  const direct = await request(ids.nested, `/posts/${postId}/comments`, {
    content: 'A reply that publishes immediately',
  });
  assert.equal(direct.status, 201);
  assert.ok(
    (await notifications(postId, 'POST_REPLY')).some(
      (n) => n.context.commentId === direct.body.comment.id,
    ),
  );
  const privateReply = await request(
    ids.staff,
    `/posts/${postId}/private-note`,
    { message: 'Sensitive private message', action: 'KEEP_PENDING' },
  );
  assert.equal(privateReply.status, 201);
  assert.equal(
    (await notifications(postId, 'PRIVATE_REPLY')).filter(
      (n) => n.recipient_user_id === ids.owner,
    ).length,
    1,
  );
  await request(ids.owner, `/posts/${postId}/private-note`, {
    message: 'Private response',
    action: 'KEEP_PENDING',
  });
  assert.equal(
    (await notifications(postId, 'PRIVATE_REPLY')).filter(
      (n) => n.recipient_user_id === ids.staff,
    ).length,
    1,
  );
  await request(
    ids.staff,
    `/posts/${postId}/comments/${direct.body.comment.id}`,
    undefined,
    'DELETE',
  );
  assert.equal(
    (await notifications(postId, 'REPLY_REMOVED')).filter(
      (n) => n.recipient_user_id === ids.nested,
    ).length,
    1,
  );
  const pending = await createPost();
  await request(
    ids.owner,
    `/posts/${pending}`,
    { content: 'Care partner edited their submission' },
    'PUT',
  );
  assert.equal((await notifications(pending, 'POST_SUBMITTED')).length, 2);
  const rejected = await request(ids.staff, '/moderation/action', {
    entityId: pending,
    entityType: 'POST',
    action: 'REJECT',
    rejectionMessage: 'Sensitive moderation feedback',
  });
  assert.equal(rejected.status, 200);
  const notice = (await notifications(pending, 'POST_NOT_PUBLISHED'))[0];
  assert.equal(notice.message, 'Sensitive moderation feedback');
  const count = (await notifications(pending)).length;
  assert.equal(
    (
      await request(ids.staff, `/posts/${pending}/private-note`, {
        message: 'This must roll back',
        action: 'PUBLISH',
      })
    ).status,
    409,
  );
  assert.equal((await notifications(pending)).length, count);
});

test('cohort reassignment, guide review and approval, and private messages notify the people involved', async () => {
  const cohort = await pool.query(
    "SELECT id FROM cohorts WHERE id<>'group-general' AND is_active LIMIT 1",
  );
  const reassignment = await request(ids.staff, '/cohorts/members/reassign', {
    userId: ids.owner,
    newGroupId: cohort.rows[0].id,
  });
  assert.equal(reassignment.status, 200);
  let notices = await pool.query(
    "SELECT id FROM notifications WHERE recipient_user_id=$1 AND kind='COHORT_CHANGED'",
    [ids.owner],
  );
  assert.equal(notices.rowCount, 1);
  await request(ids.staff, '/cohorts/members/reassign', {
    userId: ids.owner,
    newGroupId: cohort.rows[0].id,
  });
  notices = await pool.query(
    "SELECT id FROM notifications WHERE recipient_user_id=$1 AND kind='COHORT_CHANGED'",
    [ids.owner],
  );
  assert.equal(notices.rowCount, 1);
  const guide = await request(ids.staff, '/chatbot/guides', {
    title: 'Private draft fixture',
    condition: 'FTD',
    fileName: 'fixture.pdf',
    content: 'Sensitive educational draft',
    status: 'DRAFT',
  });
  assert.equal(guide.status, 201);
  guides.push(guide.body.id);
  const review = await pool.query(
    "SELECT recipient_user_id FROM notifications WHERE kind='GUIDE_REVIEW_REQUIRED' AND context->>'guideId'=$1",
    [guide.body.id],
  );
  assert.ok(!review.rows.some((n) => n.recipient_user_id === ids.admin));
  const reviewRoles = await pool.query(
    "SELECT DISTINCT u.role FROM notifications n JOIN users u ON u.id=n.recipient_user_id WHERE n.kind='GUIDE_REVIEW_REQUIRED' AND n.context->>'guideId'=$1",
    [guide.body.id],
  );
  assert.ok(
    reviewRoles.rows.every((row) => row.role === 'CLINICIAN_MODERATOR'),
  );
  assert.ok(!review.rows.some((n) => n.recipient_user_id === ids.staff));
  assert.equal(
    (
      await request(
        ids.admin,
        `/chatbot/guides/${guide.body.id}/approve`,
        {},
        'PATCH',
      )
    ).status,
    200,
  );
  const approved = await pool.query(
    "SELECT id FROM notifications WHERE kind='GUIDE_APPROVED' AND recipient_user_id=$1 AND context->>'guideId'=$2",
    [ids.staff, guide.body.id],
  );
  assert.equal(approved.rowCount, 1);
  const message = await request(ids.owner, '/chat/private', {
    caregiverId: ids.owner,
    recipientId: ids.staff,
    content: 'Sensitive direct message',
  });
  assert.equal(message.status, 201);
  assert.ok(
    (
      await pool.query(
        "SELECT id FROM notifications WHERE recipient_user_id=$1 AND kind='PRIVATE_MESSAGE'",
        [ids.staff],
      )
    ).rowCount,
  );
});

test('emails contain no clinical text, are claimed once across workers, and retry failures without rolling back activity', async () => {
  const eventKey = `fixture:${fixture}:delivery`;
  await transaction(async (client) => {
    await notify(client, {
      kind: 'COHORT_CHANGED',
      recipients: [ids.owner, ids.owner],
      eventKey,
    });
    await notify(client, {
      kind: 'COHORT_CHANGED',
      recipients: [ids.owner],
      eventKey,
    });
  });
  const notice = (
    await pool.query('SELECT id FROM notifications WHERE event_key=$1', [
      eventKey,
    ])
  ).rows;
  assert.equal(notice.length, 1);
  const before = sent.length;
  const outcomes = await Promise.all([
    processNotificationEmails({ notificationIds: [notice[0].id] }),
    processNotificationEmails({ notificationIds: [notice[0].id] }),
  ]);
  assert.equal(
    outcomes.reduce((n, r) => n + r.sent, 0),
    1,
  );
  assert.equal(sent.length, before + 1);
  assert.match(sent.at(-1)!.messageId, /^<activity-/);
  const moderationNotice = (
    await pool.query(
      "SELECT id FROM notifications WHERE kind='POST_NOT_PUBLISHED' AND recipient_user_id=$1 LIMIT 1",
      [ids.owner],
    )
  ).rows[0];
  await processNotificationEmails({ notificationIds: [moderationNotice.id] });
  assert.ok(sent.at(-1)!.text.includes('notifications=open'));
  assert.ok(
    sent.every(
      (mail) =>
        !mail.text.includes('Sensitive') && !mail.html.includes('Sensitive'),
    ),
  );
  const retryKey = `fixture:${fixture}:retry`;
  await transaction((client) =>
    notify(client, {
      kind: 'COHORT_CHANGED',
      recipients: [ids.owner],
      eventKey: retryKey,
    }),
  );
  const retry = (
    await pool.query('SELECT id FROM notifications WHERE event_key=$1', [
      retryKey,
    ])
  ).rows[0];
  failDelivery = true;
  assert.equal(
    (await processNotificationEmails({ notificationIds: [retry.id] })).failed,
    1,
  );
  let job = (
    await pool.query(
      'SELECT * FROM notification_email_jobs WHERE notification_id=$1',
      [retry.id],
    )
  ).rows[0];
  assert.equal(job.completed_at, null);
  assert.equal(job.attempts, 1);
  assert.equal(job.last_error, 'Email delivery failed');
  failDelivery = false;
  await pool.query(
    'UPDATE notification_email_jobs SET next_attempt_at=NOW() WHERE notification_id=$1',
    [retry.id],
  );
  assert.equal(
    (await processNotificationEmails({ notificationIds: [retry.id] })).sent,
    1,
  );
  job = (
    await pool.query(
      'SELECT * FROM notification_email_jobs WHERE notification_id=$1',
      [retry.id],
    )
  ).rows[0];
  assert.ok(job.completed_at);
  assert.equal(job.attempts, 2);
  const rollbackKey = `fixture:${fixture}:rollback`;
  await assert.rejects(
    transaction(async (client) => {
      await notify(client, {
        kind: 'COHORT_CHANGED',
        recipients: [ids.owner],
        eventKey: rollbackKey,
      });
      throw new Error('Expected rollback');
    }),
  );
  assert.equal(
    (
      await pool.query('SELECT id FROM notifications WHERE event_key=$1', [
        rollbackKey,
      ])
    ).rowCount,
    0,
  );
});

test('delivery skips inactive users and unpublished, withdrawn or newly inaccessible replies', async () => {
  const replies = (await notifications(postId, 'POST_REPLY')).filter(
    (n) => n.context.commentId === firstReply,
  );
  assert.ok(replies.length);
  await pool.query(
    "UPDATE comments SET status='PENDING_MODERATION' WHERE id=$1",
    [firstReply],
  );
  const result = await processNotificationEmails({
    notificationIds: [replies.at(-1)!.id],
  });
  assert.equal(result.skipped, 1);
  await pool.query("UPDATE comments SET status='APPROVED' WHERE id=$1", [
    firstReply,
  ]);
  const another = await request(ids.nested, `/posts/${postId}/comments`, {
    content: 'Another eligible reply',
  });
  assert.equal(another.status, 201);
  const emailNotice = (await notifications(postId, 'POST_REPLY')).find(
    (n) => n.context.commentId === another.body.comment.id,
  )!;
  await pool.query("UPDATE users SET condition='AD' WHERE id=$1", [ids.owner]);
  assert.equal(
    (await processNotificationEmails({ notificationIds: [emailNotice.id] }))
      .skipped,
    1,
  );
  await pool.query("UPDATE users SET condition='FTD' WHERE id=$1", [ids.owner]);
  const privateNotice = (await notifications(postId, 'PRIVATE_REPLY')).find(
    (n) => n.recipient_user_id === ids.staff,
  )!;
  await pool.query("UPDATE users SET role='CARE_PARTNER' WHERE id=$1", [
    ids.staff,
  ]);
  assert.equal(
    (await processNotificationEmails({ notificationIds: [privateNotice.id] }))
      .skipped,
    1,
  );
  await pool.query("UPDATE users SET role='CLINICIAN_MODERATOR' WHERE id=$1", [
    ids.staff,
  ]);
  await transaction((client) =>
    notify(client, {
      kind: 'COHORT_CHANGED',
      recipients: [ids.reply],
      eventKey: `fixture:${fixture}:inactive`,
    }),
  );
  const inactive = (
    await pool.query('SELECT id FROM notifications WHERE event_key=$1', [
      `fixture:${fixture}:inactive`,
    ])
  ).rows[0];
  await pool.query('UPDATE users SET is_active=false WHERE id=$1', [ids.reply]);
  assert.equal(
    (await processNotificationEmails({ notificationIds: [inactive.id] }))
      .skipped,
    1,
  );
  await pool.query('UPDATE users SET is_active=true WHERE id=$1', [ids.reply]);
  assert.equal(
    (await request(ids.staff, `/posts/${postId}`, undefined, 'DELETE')).status,
    200,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT id FROM notifications WHERE recipient_user_id=$1 AND kind='POST_REMOVED'",
        [ids.owner],
      )
    ).rowCount,
    1,
  );
  const stale = (await notifications(postId, 'REPLY_RESPONSE'))[0];
  assert.equal(
    (await processNotificationEmails({ notificationIds: [stale.id] })).skipped,
    1,
  );
});

test('approved nested responses wait for their parent and private publication sends an approval update', async () => {
  const post = await createPost();
  await approve(post);
  const parent = await request(ids.reply, `/posts/${post}/comments`, {
    content: 'Parent reply',
  });
  await approve(parent.body.comment.id, 'COMMENT');
  const child = await request(ids.nested, `/posts/${post}/comments`, {
    content: 'Child reply',
    parentCommentId: parent.body.comment.id,
  });
  await request(
    ids.reply,
    `/posts/${post}/comments/${parent.body.comment.id}`,
    { content: 'Parent edited for another review' },
    'PUT',
  );
  await approve(child.body.comment.id, 'COMMENT');
  let notices = (await notifications(post)).filter(
    (n) =>
      n.context.commentId === child.body.comment.id &&
      ['POST_REPLY', 'REPLY_RESPONSE'].includes(n.kind),
  );
  assert.equal(notices.length, 0);
  await approve(parent.body.comment.id, 'COMMENT');
  notices = (await notifications(post)).filter(
    (n) =>
      n.context.commentId === child.body.comment.id &&
      ['POST_REPLY', 'REPLY_RESPONSE'].includes(n.kind),
  );
  assert.deepEqual(
    new Set(notices.map((n) => n.recipient_user_id)),
    new Set([ids.owner, ids.reply]),
  );
  const pending = await createPost();
  assert.equal(
    (
      await request(ids.owner, `/posts/${pending}/private-note`, {
        message: 'Private follow-up before a clinician has replied',
        action: 'KEEP_PENDING',
      })
    ).status,
    201,
  );
  assert.ok(
    (await notifications(pending, 'PRIVATE_REPLY')).some(
      (n) => n.recipient_user_id === ids.staff,
    ),
  );
  assert.ok(
    !(await notifications(pending, 'PRIVATE_REPLY')).some(
      (n) => n.recipient_user_id === ids.admin,
    ),
  );
  assert.equal(
    (
      await request(ids.staff, `/posts/${pending}/private-note`, {
        message: 'Private reviewed response',
        action: 'PUBLISH',
      })
    ).status,
    201,
  );
  assert.equal((await notifications(pending, 'POST_APPROVED')).length, 1);
  assert.equal(
    (await notifications(pending, 'PRIVATE_REPLY')).filter(
      (n) => n.recipient_user_id === ids.owner,
    ).length,
    1,
  );
});

test('new account registration notifies the member and inviter without sensitive information in the email template', async () => {
  const token =
    randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  const { createHash } = await import('node:crypto');
  const invited = `invited-${fixture}`;
  const email = invited + '@example.test';
  const cohort = (
    await pool.query("SELECT slug FROM cohorts WHERE id='group-general'")
  ).rows[0];
  const invite = (
    await pool.query(
      `INSERT INTO invitations(token_hash,email,first_name,last_name,primary_cohort_slug,condition,issued_by,expires_at) VALUES($1,$2,'Sensitive First Name','Fixture',$3,'FTD',$4,NOW()+INTERVAL '1 day') RETURNING id`,
      [
        createHash('sha256').update(token).digest('hex'),
        email,
        cohort.slug,
        ids.staff,
      ],
    )
  ).rows[0];
  let userId: string | undefined;
  try {
    const response = await fetch(base + '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        password: 'Invited-fixture-password!',
        anonymousHandle: invited.slice(0, 40),
      }),
    });
    assert.equal(response.status, 201);
    userId = (await response.json()).user.id;
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM notifications WHERE recipient_user_id=$1 AND kind='WELCOME'",
          [userId],
        )
      ).rowCount,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM notifications WHERE recipient_user_id=$1 AND kind='INVITATION_ACCEPTED' AND event_key=$2",
          [ids.staff, `invitation-accepted:${invite.id}`],
        )
      ).rowCount,
      1,
    );
  } finally {
    await pool.query('DELETE FROM invitations WHERE id=$1', [invite.id]);
    if (userId) await pool.query('DELETE FROM users WHERE id=$1', [userId]);
  }
});
