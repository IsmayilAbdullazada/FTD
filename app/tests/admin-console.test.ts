import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool, transaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { actions } from '../src/modules/admin/maintenanceActions.js';
import { COMMUNITY_GUIDELINES_VERSION } from '../src/modules/policies/policies.service.js';
const suffix = randomUUID();
const ids = {
  admin: 'console-admin-' + suffix,
  peer: 'console-peer-' + suffix,
  mod: 'console-mod-' + suffix,
  care: 'console-care-' + suffix,
  ad: 'console-ad-' + suffix,
};
const password = 'Console-fixture-password-2026!';
let server: Server, base: string;
const initialFlag = env.ENABLE_ADMIN_CONSOLE;
async function headers(user = ids.admin, preview?: string) {
  const row = (
    await pool.query('SELECT session_version FROM users WHERE id=$1', [user])
  ).rows[0];
  return {
    authorization:
      'Bearer ' +
      jwt.sign(
        {
          id: user,
          email: user + '@example.test',
          sessionVersion: row.session_version,
        },
        env.JWT_SECRET,
        {
          algorithm: 'HS256',
          issuer: 'ftdcare-api',
          audience: 'ftdcare-web',
          expiresIn: '15m',
        },
      ),
    'content-type': 'application/json',
    ...(preview ? { 'X-Preview-Token': preview } : {}),
  };
}
async function request(
  path: string,
  body?: unknown,
  user = ids.admin,
  method = body === undefined ? 'GET' : 'POST',
  preview?: string,
) {
  const r = await fetch(base + path, {
    method,
    headers: await headers(user, preview),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: r.status,
    body: await r.json().catch(() => ({})),
    headers: r.headers,
  };
}
const coveredActions = new Set<string>();
const reason = 'Verify console operation in isolated regression database';
async function preview(operation: unknown, user = ids.admin) {
  return request('/admin/mutations/preview', { operation, reason }, user);
}
async function action(id: string, args: Record<string, unknown> = {}) {
  const intent = { operation: { kind: 'action', action: id, args }, reason };
  const plan = await request('/admin/mutations/preview', intent);
  assert.equal(plan.status, 200, id + ': ' + JSON.stringify(plan.body));
  if (plan.body.requiresPassword)
    assert.equal(
      (await request('/admin/reauthenticate', { password })).status,
      200,
    );
  const result = await request('/admin/mutations/commit', {
    intent,
    previewToken: plan.body.previewToken,
    confirmation: plan.body.table,
  });
  assert.equal(result.status, 200, id + ': ' + JSON.stringify(result.body));
  coveredActions.add(id);
  return result.body;
}
before(async () => {
  env.ENABLE_ADMIN_CONSOLE = 'true';
  const hash = await bcrypt.hash(password, 12);
  for (const [name, id] of Object.entries(ids)) {
    const role =
      name === 'admin' || name === 'peer'
        ? 'SYSTEM_ADMIN'
        : name === 'mod'
          ? 'CLINICIAN_MODERATOR'
          : 'CARE_PARTNER';
    await pool.query(
      "INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label,condition) VALUES($1,$2,$3,$4,'Console','Fixture','Fixture',$5)",
      [id, id + '@example.test', hash, role, name === 'ad' ? 'AD' : 'FTD'],
    );
    if (role === 'CARE_PARTNER') {
      await pool.query(
        "INSERT INTO cohort_members(cohort_id,user_id,is_primary) VALUES('group-general',$1,true)",
        [id],
      );
      await pool.query(
        "INSERT INTO policy_acknowledgments(user_id,policy_type,policy_version) VALUES($1,'community_guidelines',$2)",
        [id, COMMUNITY_GUIDELINES_VERSION],
      );
    }
  }
  const { app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});
after(async () => {
  env.ENABLE_ADMIN_CONSOLE = initialFlag;
  server?.closeIdleConnections();
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.query(
    'UPDATE users SET is_active=false WHERE id=ANY($1::text[])',
    [Object.values(ids)],
  );
  await pool.end();
});
test('console is feature- and role-gated and introspection excludes secrets', async () => {
  env.ENABLE_ADMIN_CONSOLE = 'false';
  assert.equal((await request('/admin/registry')).status, 404);
  env.ENABLE_ADMIN_CONSOLE = 'true';
  assert.equal(
    (await request('/admin/registry', undefined, ids.care)).status,
    403,
  );
  assert.equal(
    (await request('/admin/registry', undefined, ids.mod)).status,
    403,
  );
  const registry = await request('/admin/registry');
  assert.equal(registry.status, 200);
  assert.ok(registry.body.tables.length >= 26);
  const serialized = JSON.stringify(registry.body.tables);
  assert.doesNotMatch(
    serialized,
    /password_hash|token_hash|preview_token_hash/,
  );
  for (const table of [
    'policy_acknowledgments',
    'schema_migrations',
    'password_resets',
    'admin_audit_log',
    'guide_chunks',
  ])
    assert.equal(
      registry.body.tables.find((t: { name: string }) => t.name === table)
        .readOnly,
      true,
    );
  const users = await request(
    '/admin/data/users?pageSize=1&search=' + encodeURIComponent(suffix),
  );
  assert.equal(users.status, 200);
  assert.equal(users.body.items.length, 1);
  assert.ok(users.body.total >= 5);
  assert.doesNotMatch(JSON.stringify(users.body), /password_hash|\$2[aby]\$/);
  assert.equal(
    (await request('/admin/data/users?sort=password_hash')).status,
    400,
  );
  assert.equal((await request('/admin/data/not_a_table')).status, 404);
  assert.equal(
    (
      await preview({
        kind: 'data',
        table: 'users',
        mode: 'update',
        keys: [{ id: ids.care }],
        values: { password_hash: 'not-allowed' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await preview({
        kind: 'data',
        table: 'schema_migrations',
        mode: 'delete',
        keys: [{ version: '001_initial_schema' }],
        values: {},
      })
    ).status,
    403,
  );
});
test('mutations require exact previews, confirmation, reauthentication and fresh snapshots', async () => {
  const intent = {
    operation: {
      kind: 'data',
      table: 'users',
      mode: 'update',
      keys: [{ id: ids.care }],
      values: { first_name: 'Changed' },
    },
    reason,
  };
  const plan = await request('/admin/mutations/preview', intent);
  assert.equal(plan.status, 200);
  assert.equal(plan.body.requiresPassword, true);
  assert.equal(
    (
      await request('/admin/mutations/commit', {
        intent,
        previewToken: plan.body.previewToken,
        confirmation: 'wrong',
      })
    ).status,
    400,
  );
  let committed = await request('/admin/mutations/commit', {
    intent,
    previewToken: plan.body.previewToken,
    confirmation: 'users',
  });
  assert.equal(committed.status, 403);
  assert.equal(committed.body.code, 'ADMIN_REAUTH_REQUIRED');
  assert.equal(
    (await request('/admin/reauthenticate', { password: 'wrong' })).status,
    403,
  );
  assert.equal(
    (await request('/admin/reauthenticate', { password })).status,
    200,
  );
  assert.equal(
    (
      await request('/admin/mutations/commit', {
        intent: {
          ...intent,
          operation: {
            ...intent.operation,
            values: { first_name: 'Tampered' },
          },
        },
        previewToken: plan.body.previewToken,
        confirmation: 'users',
      })
    ).status,
    409,
  );
  await pool.query('UPDATE users SET first_name=$1 WHERE id=$2', [
    'Concurrent change',
    ids.care,
  ]);
  assert.equal(
    (
      await request('/admin/mutations/commit', {
        intent,
        previewToken: plan.body.previewToken,
        confirmation: 'users',
      })
    ).status,
    409,
  );
  const fresh = await request('/admin/mutations/preview', intent);
  committed = await request('/admin/mutations/commit', {
    intent,
    previewToken: fresh.body.previewToken,
    confirmation: 'users',
  });
  assert.equal(committed.status, 200);
  const replay = await request('/admin/mutations/commit', {
    intent,
    previewToken: fresh.body.previewToken,
    confirmation: 'users',
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.auditId, committed.body.auditId);
  assert.equal(replay.body.replayed, true);
  const audit = await pool.query('SELECT * FROM admin_audit_log WHERE id=$1', [
    committed.body.auditId,
  ]);
  assert.equal(audit.rows[0].actor_id, ids.admin);
  assert.equal(audit.rows[0].before[0].first_name, 'Concurrent change');
  assert.equal(audit.rows[0].after[0].first_name, 'Changed');
  assert.doesNotMatch(JSON.stringify(audit.rows), /password_hash|token_hash/);
  await assert.rejects(
    pool.query('DELETE FROM admin_audit_log WHERE id=$1', [
      committed.body.auditId,
    ]),
    /append-only/,
  );
  const other = await pool.query(
    'SELECT recipient_user_id FROM notifications WHERE event_key=$1',
    ['admin-action:' + committed.body.auditId],
  );
  assert.ok(other.rows.some((row) => row.recipient_user_id === ids.peer));
  assert.ok(!other.rows.some((row) => row.recipient_user_id === ids.admin));
  const bulk = {
    operation: {
      kind: 'data',
      table: 'users',
      mode: 'update',
      keys: [{ id: ids.care }, { id: ids.ad }],
      values: { email: 'console-duplicate-' + suffix + '@example.test' },
    },
    reason,
  };
  const bulkPlan = await request('/admin/mutations/preview', bulk);
  assert.equal(bulkPlan.status, 200);
  assert.equal(
    (
      await request('/admin/mutations/commit', {
        intent: bulk,
        previewToken: bulkPlan.body.previewToken,
        confirmation: 'users',
      })
    ).status,
    409,
  );
  assert.equal(
    (await pool.query('SELECT email FROM users WHERE id=$1', [ids.care]))
      .rows[0].email,
    ids.care + '@example.test',
  );
  assert.equal(
    (
      await preview({
        kind: 'data',
        table: 'users',
        mode: 'delete',
        keys: Array.from({ length: 201 }, () => ({ id: ids.care })),
        values: {},
      })
    ).status,
    400,
  );
});
test('sensitive row reveals are audited and preview cannot mutate, mark messages read or expose private text', async () => {
  const post = 'console-post-' + randomUUID();
  await pool.query(
    "INSERT INTO posts(id,author_id,title,raw_content,sanitized_content,status,condition) VALUES($1,$2,'Console protected fixture','Private original text','Private original text','APPROVED','FTD')",
    [post, ids.care],
  );
  await pool.query(
    "INSERT INTO post_groups(post_id,cohort_id) VALUES($1,'group-general')",
    [post],
  );
  const note = await pool.query(
    'INSERT INTO moderator_private_notes(post_id,sender_id,message) VALUES($1,$2,$3) RETURNING id',
    [post, ids.mod, 'Hidden clinician message'],
  );
  await pool.query(
    'INSERT INTO private_messages(conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4)',
    ['chat-' + ids.care, ids.mod, ids.care, 'Hidden direct message'],
  );
  const rows = await request('/admin/data/posts?search=' + post);
  assert.equal(rows.body.items[0].raw_content, '[Hidden — reveal to inspect]');
  const revealed = await request('/admin/data/posts/reveal', {
    key: { id: post },
    reason,
  });
  assert.equal(revealed.status, 200);
  assert.equal(revealed.body.raw_content, 'Private original text');
  assert.ok(
    (
      await pool.query(
        "SELECT 1 FROM admin_audit_log WHERE actor_id=$1 AND action='REVEAL'",
        [ids.admin],
      )
    ).rowCount,
  );
  const started = await request('/admin/preview', {
    targetUserId: ids.care,
    reason,
  });
  assert.equal(started.status, 200);
  const token = started.body.token;
  const me = await request('/users/me', undefined, ids.admin, 'GET', token);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.role, 'CARE_PARTNER');
  assert.equal(me.body.user.email, '[Hidden in preview]');
  const discussion = await request(
    '/posts/' + post,
    undefined,
    ids.admin,
    'GET',
    token,
  );
  assert.equal(discussion.status, 200);
  assert.doesNotMatch(
    JSON.stringify(discussion.body),
    /Hidden clinician message/,
  );
  const privateRead = await request(
    '/chat/private?caregiverId=' + ids.care,
    undefined,
    ids.admin,
    'GET',
    token,
  );
  assert.equal(privateRead.status, 200);
  assert.doesNotMatch(
    JSON.stringify(privateRead.body),
    /Hidden direct message/,
  );
  assert.equal(
    (
      await pool.query(
        'SELECT read_at FROM private_messages WHERE conversation_id=$1',
        ['chat-' + ids.care],
      )
    ).rows[0].read_at,
    null,
  );
  for (const path of [
    '/posts',
    '/auth/logout',
    '/auth/login',
    '/policies/acknowledge',
    '/admin/mutations/preview',
  ]) {
    const blocked = await request(path, {}, ids.admin, 'POST', token);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'PREVIEW_READ_ONLY');
  }
  assert.equal(
    (await request('/admin/registry', undefined, ids.admin, 'GET', token))
      .status,
    403,
  );
  // The underlying scope also rejects writes even if a future GET handler accidentally attempts one.
  const { readOnlyRequestScope, query } = await import('../src/config/db.js');
  let release: () => void = () => {};
  await new Promise<void>((resolve, reject) => {
    void readOnlyRequestScope(
      () => {
        void query('UPDATE users SET first_name=first_name WHERE id=$1', [
          ids.care,
        ]).then(
          () => reject(new Error('Read-only transaction accepted an update')),
          (error) => {
            assert.equal(error.code, '25006');
            release();
            resolve();
          },
        );
      },
      (cleanup) => {
        release = cleanup;
      },
    ).catch(reject);
  });
  const stale = await headers(ids.admin);
  await pool.query(
    'UPDATE users SET session_version=session_version+1 WHERE id=$1',
    [ids.admin],
  );
  assert.equal(
    (await request('/users/me', undefined, ids.admin, 'GET', token)).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + '/users/me', {
        headers: { ...stale, 'X-Preview-Token': token },
      })
    ).status,
    401,
  );
  await pool.query('DELETE FROM moderator_private_notes WHERE id=$1', [
    note.rows[0].id,
  ]);
});
test('domain actions preserve invariants and create masked audit records', async () => {
  await action('create-cohort', {
    name: 'Console group ' + suffix,
    slug: 'console-' + suffix,
    description: 'A local care partner group for console testing.',
    geographicRegion: 'Maryland',
  });
  const cohort = (
    await pool.query('SELECT id FROM cohorts WHERE slug=$1', [
      'console-' + suffix,
    ])
  ).rows[0].id;
  await action('reassign-member', { userId: ids.care, newGroupId: cohort });
  assert.equal(
    (
      await pool.query(
        'SELECT COUNT(*)::int count FROM cohort_members WHERE user_id=$1 AND is_primary',
        [ids.care],
      )
    ).rows[0].count,
    1,
  );
  await action('create-post', {
    title: 'Console domain discussion ' + suffix,
    content:
      'This is protected user text used only for the isolated console regression.',
    targetCohortId: cohort,
  });
  const post = (
    await pool.query('SELECT id FROM posts WHERE title=$1', [
      'Console domain discussion ' + suffix,
    ])
  ).rows[0].id;
  await action('edit-post', {
    id: post,
    title: 'Updated domain discussion ' + suffix,
    content:
      'Updated protected text must be redacted in admin audit snapshots.',
  });
  const audit = (
    await pool.query(
      "SELECT before,after FROM admin_audit_log WHERE actor_id=$1 AND action='edit-post' ORDER BY created_at DESC LIMIT 1",
      [ids.admin],
    )
  ).rows[0];
  assert.doesNotMatch(
    JSON.stringify(audit),
    /Updated protected text|protected user text/,
  );
  await action('close-post', { id: post, isClosed: true });
  await action('close-post', { id: post, isClosed: false });
  await action('reply-policy', { id: post, allowUnmoderatedReplies: true });
  await action('reply-policy', { id: post, allowUnmoderatedReplies: false });
  await action('create-comment', {
    postId: post,
    content: 'A console test reply with adequate length.',
  });
  const comment = (
    await pool.query('SELECT id FROM comments WHERE post_id=$1', [post])
  ).rows[0].id;
  await action('edit-comment', {
    id: comment,
    postId: post,
    content: 'An edited console test reply.',
  });
  await action('delete-comment', { id: comment, postId: post });
  await action('upvote-post', { id: post });
  await action('upvote-post', { id: post });
  await action('private-reply', {
    postId: post,
    message: 'A private console fixture note.',
    action: 'KEEP_PENDING',
  });
  await action('private-message', {
    caregiverId: ids.care,
    content: 'A private console fixture message.',
  });
  await action('create-guide', {
    title: 'Console guide ' + suffix,
    condition: 'FTD',
    fileName: 'fixture.txt',
    content:
      'Consistent routines support care partners and help plan a calm day.',
    status: 'DRAFT',
  });
  const guide = (
    await pool.query('SELECT id FROM chatbot_guides WHERE title=$1', [
      'Console guide ' + suffix,
    ])
  ).rows[0].id;
  await action('edit-guide', {
    id: guide,
    title: 'Updated console guide ' + suffix,
  });
  await action('approve-guide', { id: guide });
  await action('rebuild-guide', { id: guide });
  await action('toggle-guide', { id: guide });
  assert.equal(
    (
      await pool.query(
        'SELECT COUNT(*)::int count FROM guide_chunks WHERE guide_id=$1',
        [guide],
      )
    ).rows[0].count,
    0,
  );
  await action('toggle-guide', { id: guide });
  await action('delete-guide', { id: guide });
  await action('set-user-active', { id: ids.ad, isActive: false });
  await action('set-user-active', { id: ids.ad, isActive: true });
  await action('force-sign-out', { id: ids.ad });
  await action('change-role', { id: ids.ad, role: 'CLINICIAN_MODERATOR' });
  await action('change-role', {
    id: ids.ad,
    role: 'CARE_PARTNER',
    condition: 'AD',
  });
  const self = {
    operation: {
      kind: 'action',
      action: 'change-role',
      args: { id: ids.admin, role: 'CLINICIAN_MODERATOR' },
    },
    reason,
  };
  const selfPlan = await request('/admin/mutations/preview', self);
  assert.equal(selfPlan.status, 200);
  assert.equal(
    (
      await request('/admin/mutations/commit', {
        intent: self,
        previewToken: selfPlan.body.previewToken,
        confirmation: 'users',
      })
    ).status,
    409,
  );
  await action('send-password-reset', { id: ids.mod });
  assert.ok(
    (
      await pool.query('SELECT 1 FROM password_recovery_jobs WHERE email=$1', [
        ids.mod + '@example.test',
      ])
    ).rowCount,
  );
  await action('create-resource', {
    title: 'Console resource ' + suffix,
    summary: 'A console resource summary.',
    contentBody: 'A console educational resource body.',
    category: 'GUIDE',
    diseaseDomain: 'FTD',
    externalUrl: 'https://example.test/resource',
  });
  const resource = (
    await pool.query('SELECT id FROM resources WHERE title=$1', [
      'Console resource ' + suffix,
    ])
  ).rows[0].id;
  await action('edit-resource', {
    id: resource,
    title: 'Updated console resource ' + suffix,
    summary: 'An updated summary.',
    contentBody: 'Updated educational resource body.',
    category: 'GUIDE',
    diseaseDomain: 'FTD',
    externalUrl: 'https://example.test/resource',
  });
  await action('delete-resource', { id: resource });
  await action('create-update', {
    title: 'Console update ' + suffix,
    summary: 'A console update summary.',
    body: 'A console update body.',
    category: 'ANNOUNCEMENT',
    condition: 'BOTH',
  });
  const update = (
    await pool.query('SELECT id FROM clinic_updates WHERE title=$1', [
      'Console update ' + suffix,
    ])
  ).rows[0].id;
  await action('delete-update', { id: update });
  await action('create-event', {
    title: 'Console event ' + suffix,
    type: 'SOCIAL',
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    location: 'Test location',
    description: 'An isolated test event.',
    condition: 'BOTH',
  });
  const event = (
    await pool.query('SELECT id FROM calendar_events WHERE title=$1', [
      'Console event ' + suffix,
    ])
  ).rows[0].id;
  await action('delete-event', { id: event });
  await action('create-invitation', {
    email: 'console-invite-' + suffix + '@example.test',
    primaryCohortSlug: 'console-' + suffix,
    condition: 'FTD',
  });
  let invitation = (
    await pool.query(
      'SELECT id FROM invitations WHERE email=$1 ORDER BY created_at DESC LIMIT 1',
      ['console-invite-' + suffix + '@example.test'],
    )
  ).rows[0].id;
  await action('resend-invitation', { id: invitation });
  assert.equal(
    (
      await pool.query('SELECT status FROM invitations WHERE id=$1', [
        invitation,
      ])
    ).rows[0].status,
    'REVOKED',
  );
  invitation = (
    await pool.query(
      'SELECT id FROM invitations WHERE email=$1 ORDER BY created_at DESC LIMIT 1',
      ['console-invite-' + suffix + '@example.test'],
    )
  ).rows[0].id;
  await action('revoke-invitation', { id: invitation });
  const notification = (
    await pool.query(
      'SELECT id FROM notifications WHERE recipient_user_id=$1 LIMIT 1',
      [ids.admin],
    )
  ).rows[0].id;
  await action('mark-notification-read', { id: notification });
  await action('delete-post', { id: post });
});

test('remaining maintenance and moderation actions use the same guarded, audited flow', async () => {
  await action('create-user', {
    email: 'new-console-' + suffix + '@example.test',
    firstName: 'New',
    lastName: 'Partner',
    role: 'CARE_PARTNER',
    condition: 'FTD',
  });
  assert.ok(
    (
      await pool.query('SELECT 1 FROM password_recovery_jobs WHERE email=$1', [
        'new-console-' + suffix + '@example.test',
      ])
    ).rowCount,
  );
  let approvedPost = '';
  for (const decision of ['APPROVE', 'REJECT', 'CLINICAL_REDIRECT']) {
    const created = await request(
      '/posts',
      {
        title: 'Pending console moderation ' + decision + ' ' + suffix,
        content:
          'A care partner test question about consistent daily routines.',
        targetCohortId: 'group-general',
      },
      ids.care,
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.postId;
    await action('moderate-post', {
      entityId: id,
      action: decision,
      ...(decision === 'APPROVE'
        ? {}
        : {
            rejectionCode: 'OTHER',
            rejectionMessage:
              'Review the care team guidance for this test discussion.',
          }),
    });
    if (decision === 'APPROVE') approvedPost = id;
  }
  for (const decision of ['APPROVE', 'REJECT']) {
    const created = await request(
      '/posts/' + approvedPost + '/comments',
      { content: 'A care partner reply to the test discussion.' },
      ids.care,
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    await action('moderate-comment', {
      entityId: created.body.comment.id,
      action: decision,
      ...(decision === 'REJECT'
        ? {
            rejectionCode: 'OTHER',
            rejectionMessage: 'A test moderation decision.',
          }
        : {}),
    });
  }
  const note = (
    await pool.query(
      'SELECT id FROM notifications WHERE recipient_user_id=$1 LIMIT 1',
      [ids.admin],
    )
  ).rows[0].id;
  await pool.query(
    'UPDATE notification_email_jobs SET attempts=5,completed_at=NULL,skipped_at=NULL,locked_until=NULL WHERE notification_id=$1',
    [note],
  );
  await action('resend-email', { notificationId: note });
  assert.equal(
    (
      await pool.query(
        'SELECT attempts FROM notification_email_jobs WHERE notification_id=$1',
        [note],
      )
    ).rows[0].attempts,
    0,
  );
  const invitation = 'expired-console-' + randomUUID(),
    reset = 'expired-reset-' + randomUUID();
  const slug = (
    await pool.query("SELECT slug FROM cohorts WHERE id='group-general'")
  ).rows[0].slug;
  await pool.query(
    "INSERT INTO invitations(id,token_hash,email,primary_cohort_slug,condition,issued_by,expires_at) VALUES($1,$2,$3,$4,'FTD',$5,NOW()-INTERVAL '50 years')",
    [
      invitation,
      randomUUID(),
      'expired-' + suffix + '@example.test',
      slug,
      ids.admin,
    ],
  );
  await pool.query(
    "INSERT INTO password_resets(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()-INTERVAL '50 years')",
    [reset, ids.care, randomUUID()],
  );
  await action('purge-expired-invitations');
  await action('purge-expired-resets');
  assert.equal(
    (await pool.query('SELECT 1 FROM invitations WHERE id=$1', [invitation]))
      .rowCount,
    0,
  );
  assert.equal(
    (await pool.query('SELECT 1 FROM password_resets WHERE id=$1', [reset]))
      .rowCount,
    0,
  );
  const { uploadsDirectory } = await import('../src/services/uploads.js');
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const name = 'guide_' + randomUUID() + '.pdf';
  await fs.mkdir(uploadsDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadsDirectory, name), 'orphan fixture');
  await fs.utimes(path.join(uploadsDirectory, name), new Date(0), new Date(0));
  await pool.query(
    'INSERT INTO guide_uploads(storage_name,uploaded_by) VALUES($1,$2)',
    [name, ids.admin],
  );
  await action('delete-orphan-uploads');
  await assert.rejects(fs.access(path.join(uploadsDirectory, name)));
  assert.deepEqual(
    actions.map((a) => a.id).filter((id) => !coveredActions.has(id)),
    [],
    'Every registered action must be exercised through preview and commit',
  );
});

test('a mutation waiting for its lock cannot use a session revoked while waiting', async () => {
  const intent = {
    operation: {
      kind: 'data',
      table: 'users',
      mode: 'update',
      keys: [{ id: ids.care }],
      values: { first_name: 'Must not be applied' },
    },
    reason,
  };
  const plan = await request('/admin/mutations/preview', intent);
  assert.equal(plan.status, 200);
  const lock = await pool.connect();
  let pending: ReturnType<typeof request> | undefined;
  try {
    await lock.query('BEGIN');
    await lock.query(
      "SELECT pg_advisory_xact_lock(hashtext('ftdcare-admin-mutations'))",
    );
    pending = request('/admin/mutations/commit', {
      intent,
      previewToken: plan.body.previewToken,
      confirmation: 'users',
    });
    let waiting = false;
    for (let i = 0; i < 50; i++) {
      if (
        (
          await pool.query(
            "SELECT 1 FROM pg_stat_activity WHERE wait_event='advisory' AND query LIKE '%ftdcare-admin-mutations%' LIMIT 1",
          )
        ).rowCount
      ) {
        waiting = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.ok(waiting, 'Commit should wait on the admin mutation lock');
    await pool.query(
      'UPDATE users SET session_version=session_version+1 WHERE id=$1',
      [ids.admin],
    );
    await lock.query('COMMIT');
    const rejected = await pending;
    assert.equal(rejected.status, 401);
    assert.notEqual(
      (await pool.query('SELECT first_name FROM users WHERE id=$1', [ids.care]))
        .rows[0].first_name,
      'Must not be applied',
    );
  } finally {
    await lock.query('ROLLBACK');
    lock.release();
    if (pending) await pending;
  }
});
