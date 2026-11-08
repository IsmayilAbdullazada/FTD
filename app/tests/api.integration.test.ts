import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../src/app.js";
import { pool } from "../src/config/db.js";

let server: Server;
let baseUrl = "";
let careToken = "";
let clinicianToken = "";
let adminToken = "";
let postId = "";
const cleanup: Array<() => Promise<unknown>> = [];

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(baseUrl + path, init);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}
const json = (
  token: string | undefined,
  body: unknown,
  method = "POST",
): RequestInit => ({
  method,
  headers: {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (postId) await pool.query("DELETE FROM posts WHERE id=$1", [postId]);
  for (const task of cleanup.reverse()) await task();
  await pool.query(
    `DELETE FROM private_messages WHERE content='Secure sender identity check.'`,
  );
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});

test("health reports the PostgreSQL connection and protected APIs reject anonymous requests", async () => {
  assert.equal((await request("/api/v1/health")).status, 200);
  assert.equal((await request("/api/v1/users/me")).status, 401);
  assert.equal(
    (
      await request("/api/v1/health", {
        headers: { origin: "https://attacker.invalid" },
      })
    ).status,
    403,
  );
});

test("care partner and clinician authenticate with the frontend contract", async () => {
  const care = await request(
    "/api/v1/auth/login",
    json(undefined, {
      identifier: "sarah.smith@example.com",
      password: "Hopkins2026!",
    }),
  );
  const clinician = await request(
    "/api/v1/auth/login",
    json(undefined, {
      identifier: "sgulyan1@jhmi.edu",
      password: "Hopkins2026!",
    }),
  );
  assert.equal(care.status, 200);
  assert.equal(clinician.status, 200);
  careToken = care.body.token;
  clinicianToken = clinician.body.token;
  assert.equal(care.body.user.role, "CARE_PARTNER");
  assert.equal(clinician.body.user.role, "CLINICIAN_MODERATOR");
  const admin = await request(
    "/api/v1/auth/login",
    json(undefined, {
      identifier: "cs-admin@cs.jhu.edu",
      password: "Hopkins2026!",
    }),
  );
  assert.equal(admin.status, 200);
  adminToken = admin.body.token;
});

test("condition and cohort boundaries apply to direct access, interactions, and search", async () => {
  const hiddenCohortId = "security-hidden-cohort-post";
  const hiddenConditionId = "security-hidden-condition-post";
  await pool.query(
    `INSERT INTO posts(id,author_id,title,raw_content,sanitized_content,status,condition)
     VALUES
       ($1,'user-clinician-1','Quasar cohort boundary','Quasar eastern-only security content.','Quasar eastern-only security content.','APPROVED','FTD'),
       ($2,'user-clinician-1','Nebula condition boundary','Nebula AD-only security content.','Nebula AD-only security content.','APPROVED','AD')
     ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,status='APPROVED'`,
    [hiddenCohortId, hiddenConditionId],
  );
  await pool.query(
    `INSERT INTO post_groups(post_id,cohort_id) VALUES($1,'group-eastern-maryland'),($2,'group-general')
     ON CONFLICT DO NOTHING`,
    [hiddenCohortId, hiddenConditionId],
  );
  try {
    const careHeaders = { authorization: `Bearer ${careToken}` };
    assert.equal(
      (
        await request(`/api/v1/posts/${hiddenCohortId}`, {
          headers: careHeaders,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          `/api/v1/posts/${hiddenCohortId}/comments`,
          json(careToken, { content: "This must not be accepted." }),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          `/api/v1/posts/${hiddenCohortId}/upvote`,
          json(careToken, {}),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(`/api/v1/posts/${hiddenConditionId}`, {
          headers: careHeaders,
        })
      ).status,
      404,
    );

    const feed = await request("/api/v1/posts", { headers: careHeaders });
    assert.ok(
      !feed.body.posts.some((post: any) =>
        [hiddenCohortId, hiddenConditionId].includes(post.id),
      ),
    );
    const matches = await request(
      "/api/v1/deflection/discussions",
      json(careToken, { title: "Quasar", content: "security" }),
    );
    assert.deepEqual(matches.body.matches, []);
    const poolResult = await request("/api/v1/deflection/discussions-pool", {
      headers: careHeaders,
    });
    assert.ok(
      !poolResult.body.pool.some((post: any) =>
        [hiddenCohortId, hiddenConditionId].includes(post.id),
      ),
    );
    assert.equal(
      (
        await request(`/api/v1/posts/${hiddenCohortId}`, {
          headers: { authorization: `Bearer ${clinicianToken}` },
        })
      ).status,
      200,
    );
  } finally {
    await pool.query(`DELETE FROM posts WHERE id=ANY($1::text[])`, [
      [hiddenCohortId, hiddenConditionId],
    ]);
  }
});

test("JWT identity overrides forged user IDs through posting, moderation, and messaging", async () => {
  const created = await request(
    "/api/v1/posts",
    json(careToken, {
      title: "Integration migration check",
      content:
        "Does this PostgreSQL moderation workflow persist correctly? Contact test.person@example.com about a 25 mg dose. <script>alert('unsafe')</script>",
      targetCohortId: "group-general",
      condition: "AD",
      authorId: "user-clinician-1",
    }),
  );
  assert.equal(created.status, 201);
  postId = created.body.postId;
  assert.equal(created.body.status, "PENDING_MODERATION");
  assert.equal(created.body.hasPhiAlerts, true);
  assert.ok(created.body.phiAlertsCount > 0);
  assert.equal(
    (
      await request("/api/v1/moderation/queue", {
        headers: { authorization: `Bearer ${careToken}` },
      })
    ).status,
    403,
  );

  const queue = await request("/api/v1/moderation/queue", {
    headers: { authorization: `Bearer ${clinicianToken}` },
  });
  const post = queue.body.items.find((item: any) => item.id === postId);
  assert.equal(post.author.userId, "user-care-1");
  assert.equal(post.condition, "FTD");
  assert.equal(post.isUrgentClinical, true);
  assert.ok(post.phiAlerts.some((alert: any) => alert.type === "EMAIL"));
  assert.ok(!post.rawContent.includes("<script>"));
  const approval = await request(
    "/api/v1/moderation/action",
    json(clinicianToken, {
      entityId: post.id,
      entityType: "POST",
      action: "APPROVE",
      assignedGroupIds: ["group-general"],
      sanitizedContent:
        "Does this PostgreSQL moderation workflow persist correctly?",
    }),
  );
  assert.equal(approval.body.newEntityStatus, "APPROVED");

  const comment = await request(
    `/api/v1/posts/${postId}/comments`,
    json(careToken, {
      content: "Nested workflow test reply.",
      authorId: "user-clinician-1",
    }),
  );
  assert.equal(comment.body.comment.author.userId, "user-care-1");
  assert.equal(comment.body.comment.status, "PENDING_MODERATION");
  const secondQueue = await request("/api/v1/moderation/queue", {
    headers: { authorization: `Bearer ${clinicianToken}` },
  });
  const reply = secondQueue.body.items.find(
    (item: any) => item.id === comment.body.comment.id,
  );
  const replyApproval = await request(
    "/api/v1/moderation/action",
    json(clinicianToken, {
      entityId: reply.id,
      entityType: "COMMENT",
      action: "APPROVE",
      sanitizedContent: reply.rawContent,
    }),
  );
  assert.equal(replyApproval.body.newEntityStatus, "APPROVED");

  const details = await request(
    `/api/v1/posts/${postId}?role=SYSTEM_ADMIN&userId=user-clinician-1`,
    { headers: { authorization: `Bearer ${careToken}` } },
  );
  assert.equal(details.body.comments.length, 1);
  assert.equal(details.body.post.rawContent, undefined);

  const message = await request(
    "/api/v1/chat/private",
    json(careToken, {
      caregiverId: "user-care-1",
      senderId: "user-clinician-1",
      content: "Secure sender identity check.",
    }),
  );
  assert.equal(message.body.senderId, "user-care-1");
});

test("private staff notes can publish and care-partner edits return content to moderation", async () => {
  const created = await request(
    "/api/v1/posts",
    json(careToken, {
      title: "Moderation transition check",
      content: "This discussion verifies secure editing transitions.",
      targetCohortId: "group-general",
    }),
  );
  const transitionPostId = created.body.postId;
  try {
    const note = await request(
      `/api/v1/posts/${transitionPostId}/private-note`,
      json(clinicianToken, {
        message: "Reviewed through the integration workflow.",
        action: "PUBLISH",
      }),
    );
    assert.equal(note.status, 201);
    assert.equal(note.body.success, true);
    assert.equal(note.body.postStatus, "APPROVED");
    assert.equal(note.body.notes.length, 1);

    const edited = await request(
      `/api/v1/posts/${transitionPostId}`,
      json(
        careToken,
        { content: "This edited discussion requires moderation again." },
        "PUT",
      ),
    );
    assert.equal(edited.status, 200);
    assert.equal(edited.body.post.status, "PENDING_MODERATION");

    const forbiddenMove = await request(
      `/api/v1/posts/${transitionPostId}`,
      json(careToken, { targetCohortId: "group-eastern-maryland" }, "PUT"),
    );
    assert.equal(forbiddenMove.status, 403);
  } finally {
    await pool.query("DELETE FROM posts WHERE id=$1", [transitionPostId]);
  }
});

test("frontend collection endpoints return their expected top-level shapes", async () => {
  const headers = { authorization: `Bearer ${careToken}` };
  const [me, cohorts, feed, resources, notifications] = await Promise.all([
    request("/api/v1/users/me", { headers }),
    request("/api/v1/cohorts?role=SYSTEM_ADMIN&userId=user-clinician-1", {
      headers,
    }),
    request("/api/v1/posts?role=SYSTEM_ADMIN&userId=user-clinician-1", {
      headers,
    }),
    request("/api/v1/resources?userId=user-care-2", { headers }),
    request("/api/v1/notifications?userId=user-care-2", { headers }),
  ]);
  assert.equal(me.body.user.id, "user-care-1");
  assert.ok(Array.isArray(cohorts.body));
  assert.ok(feed.body.posts.some((post: any) => post.id === postId));
  assert.ok(Array.isArray(resources.body));
  assert.ok(Array.isArray(notifications.body.messages));
});

test("staff content, invitation, guide retrieval, and admin contracts use PostgreSQL", async () => {
  const resource = await request(
    "/api/v1/resources",
    json(clinicianToken, {
      title: "Integration resource",
      summary: "Database-backed resource contract.",
      contentBody:
        "A unique integration phrase about structured evening routines.",
      category: "DAILY_CARE",
      diseaseDomain: "FTD",
    }),
  );
  assert.equal(resource.status, 201);
  cleanup.push(() =>
    pool.query("DELETE FROM resources WHERE id=$1", [resource.body.id]),
  );

  const update = await request(
    "/api/v1/updates",
    json(clinicianToken, {
      title: "Integration update",
      summary: "Update summary",
      body: "Update body",
      category: "ANNOUNCEMENT",
      condition: "BOTH",
    }),
  );
  assert.equal(update.status, 201);
  cleanup.push(() =>
    pool.query("DELETE FROM clinic_updates WHERE id=$1", [update.body.id]),
  );

  const event = await request(
    "/api/v1/events",
    json(clinicianToken, {
      title: "Integration event",
      type: "SUPPORT_GROUP",
      startsAt: "2027-01-15T18:00:00Z",
      location: "Test room",
      condition: "FTD",
    }),
  );
  assert.equal(event.status, 201);
  cleanup.push(() =>
    pool.query("DELETE FROM calendar_events WHERE id=$1", [event.body.id]),
  );

  const invitation = await request(
    "/api/v1/auth/invitations",
    json(clinicianToken, {
      email: "integration.invite@example.com",
      firstName: "Integration",
      lastName: "Invite",
      primaryCohortSlug: "central-maryland",
      condition: "FTD",
    }),
  );
  assert.equal(invitation.status, 201);
  assert.equal(
    (
      await request(
        `/api/v1/auth/invitations/${encodeURIComponent(invitation.body.inviteToken)}`,
      )
    ).status,
    200,
  );
  assert.equal((await request(invitation.body.previewUrl)).status, 200);
  cleanup.push(() =>
    pool.query("DELETE FROM invitations WHERE email=$1", [
      "integration.invite@example.com",
    ]),
  );
  cleanup.push(() =>
    pool.query("DELETE FROM email_outbox WHERE recipient=$1", [
      "integration.invite@example.com",
    ]),
  );

  const guide = await request(
    "/api/v1/chatbot/guides",
    json(clinicianToken, {
      title: "Integration guide",
      condition: "FTD",
      fileName: "integration.pdf",
      content:
        "Structured evening routines can reduce avoidable transitions and distress.",
      pages: [
        {
          pageNumber: 1,
          text: "Structured evening routines can reduce avoidable transitions and distress.",
        },
      ],
      status: "DRAFT",
      uploadedBy: "forged-user",
      uploadedByName: "Forged User",
    }),
  );
  assert.equal(guide.status, 201);
  cleanup.push(() =>
    pool.query("DELETE FROM chatbot_guides WHERE id=$1", [guide.body.id]),
  );
  const approved = await request(
    `/api/v1/chatbot/guides/${guide.body.id}/approve`,
    json(clinicianToken, {}, "PATCH"),
  );
  assert.equal(approved.body.guide.status, "APPROVED");
  const knowledge = await request(
    "/api/v1/knowledge/chat",
    json(careToken, { query: "structured evening routines" }),
  );
  assert.ok(
    knowledge.body.citedResources.some(
      (item: any) => item.id === guide.body.id,
    ),
  );

  const status = await request("/api/v1/admin/database-status", {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(status.status, 200);
  assert.equal(typeof status.body.counts.users, "number");
});

test("password reset creates a private development preview without account enumeration", async () => {
  const known = await request(
    "/api/v1/auth/forgot-password",
    json(undefined, { email: "sarah.smith@example.com" }),
  );
  const unknown = await request(
    "/api/v1/auth/forgot-password",
    json(undefined, { email: "absent@example.com" }),
  );
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(known.body.message, unknown.body.message);
  assert.equal((await request(known.body.previewUrl)).status, 200);
  cleanup.push(() =>
    pool.query("DELETE FROM password_resets WHERE user_id=$1", ["user-care-1"]),
  );
  cleanup.push(() =>
    pool.query("DELETE FROM email_outbox WHERE recipient=$1", [
      "sarah.smith@example.com",
    ]),
  );
});
