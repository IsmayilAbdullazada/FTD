import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { after, before, test } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import {
  registry,
  sensitiveColumn,
} from '../src/modules/admin/adminRegistry.js';

const suffix = randomUUID();
const details = {
  patientAge: 72,
  carePartnerAge: 44,
  relationshipToPatient: ' Daughter ',
  county: ' Baltimore ',
  state: ' Maryland ',
};
const password = 'Intake-fixture-password-2026!';
const emails: string[] = [];
let server: Server;
let base: string;
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
async function post(path: string, body: unknown) {
  const response = await fetch(base + '/api/v1/auth/' + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}
async function invitation() {
  const token = randomBytes(32).toString('base64url');
  const email = `intake-${emails.length}-${suffix}@example.test`;
  emails.push(email);
  const slug = (
    await pool.query("SELECT slug FROM cohorts WHERE id='group-general'")
  ).rows[0].slug;
  await pool.query(
    "INSERT INTO invitations(token_hash,email,primary_cohort_slug,condition,issued_by,expires_at) VALUES($1,$2,$3,'FTD','user-clinician-1',NOW()+INTERVAL '1 day')",
    [hash(token), email, slug],
  );
  return { token, email };
}
async function reset(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    "INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '20 minutes')",
    [userId, hash(token)],
  );
  return token;
}
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [emails]);
  await pool.query('DELETE FROM invitations WHERE email=ANY($1::text[])', [
    emails,
  ]);
  await pool.end();
});
test('registration requires all five validated details and explicit agreement without consuming the invite', async () => {
  const invite = await invitation();
  const valid = {
    token: invite.token,
    password,
    carePartnerDetails: details,
    guidelinesAccepted: true,
  };
  for (const change of [
    { guidelinesAccepted: undefined },
    { guidelinesAccepted: false },
    { guidelinesAccepted: 'true' },
    { carePartnerDetails: undefined },
    ...Object.keys(details).map((key) => ({
      carePartnerDetails: { ...details, [key]: undefined },
    })),
    ...[-1, 131, 20.5, '72'].map((patientAge) => ({
      carePartnerDetails: { ...details, patientAge },
    })),
    { carePartnerDetails: { ...details, county: '   ' } },
    { carePartnerDetails: { ...details, state: 'Mary\nland' } },
  ]) {
    const response = await post('register', { ...valid, ...change });
    assert.equal(response.status, 400, JSON.stringify(change));
  }
  assert.equal(
    (await pool.query('SELECT id FROM users WHERE email=$1', [invite.email]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await pool.query('SELECT status FROM invitations WHERE token_hash=$1', [
        hash(invite.token),
      ])
    ).rows[0].status,
    'DISPATCHED',
  );
  const response = await post('register', valid);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const id = response.body.user.id;
  const profile = (
    await pool.query('SELECT * FROM care_partner_profiles WHERE user_id=$1', [
      id,
    ])
  ).rows[0];
  assert.equal(profile.patient_age, 72);
  assert.equal(profile.care_partner_age, 44);
  assert.equal(profile.relationship_to_patient, 'Daughter');
  assert.equal(profile.county, 'Baltimore');
  assert.equal(profile.state, 'Maryland');
  assert.equal(
    (
      await pool.query(
        'SELECT 1 FROM policy_acknowledgments WHERE user_id=$1 AND policy_version=$2',
        [id, '1.0'],
      )
    ).rowCount,
    1,
  );
  for (const body of [
    response.body,
    await (
      await fetch(base + '/api/v1/users/me', {
        headers: { cookie: response.headers.get('set-cookie')!.split(';')[0] },
      })
    ).json(),
  ]) {
    assert.doesNotMatch(
      JSON.stringify(body),
      /patientAge|patient_age|carePartnerAge|relationshipToPatient|relationship_to_patient|Baltimore|Maryland|Daughter/,
    );
  }
  const token = await reset(id);
  assert.deepEqual((await post('password-reset-context', { token })).body, {
    requiresProfile: false,
  });
  assert.equal(
    (
      await post('reset-password', {
        token,
        newPassword: password,
        guidelinesAccepted: true,
        carePartnerDetails: { ...details, patientAge: 12 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await pool.query(
        'SELECT patient_age FROM care_partner_profiles WHERE user_id=$1',
        [id],
      )
    ).rows[0].patient_age,
    72,
    'recovery must not overwrite saved intake',
  );
});
test('password setup for an existing care partner requires missing intake and agreement, while staff need only agreement', async () => {
  for (const role of ['CARE_PARTNER', 'CLINICIAN_MODERATOR']) {
    const email = `intake-${emails.length}-${suffix}@example.test`;
    emails.push(email);
    const id = randomUUID();
    await pool.query(
      "INSERT INTO users(id,email,role,first_name,last_name,badge_label,password_hash) VALUES($1,$2,$3,'Intake','Fixture','Fixture',$4)",
      [id, email, role, await bcrypt.hash(password, 12)],
    );
    const token = await reset(id);
    const context = await post('password-reset-context', { token });
    assert.equal(context.status, 200);
    assert.equal(context.headers.get('cache-control'), 'no-store');
    assert.deepEqual(context.body, {
      requiresProfile: role === 'CARE_PARTNER',
    });
    assert.equal(
      (
        await post('reset-password', {
          token,
          newPassword: password,
          carePartnerDetails: details,
        })
      ).status,
      400,
    );
    if (role === 'CARE_PARTNER')
      assert.equal(
        (
          await post('reset-password', {
            token,
            newPassword: password,
            guidelinesAccepted: true,
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await pool.query(
          'SELECT consumed_at FROM password_resets WHERE token_hash=$1',
          [hash(token)],
        )
      ).rows[0].consumed_at,
      null,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT 1 FROM policy_acknowledgments WHERE user_id=$1',
          [id],
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await post('reset-password', {
          token,
          newPassword: password,
          guidelinesAccepted: true,
          ...(role === 'CARE_PARTNER' ? { carePartnerDetails: details } : {}),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT 1 FROM care_partner_profiles WHERE user_id=$1',
          [id],
        )
      ).rowCount,
      role === 'CARE_PARTNER' ? 1 : 0,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT 1 FROM policy_acknowledgments WHERE user_id=$1',
          [id],
        )
      ).rowCount,
      1,
    );
    assert.equal((await post('password-reset-context', { token })).status, 400);
  }
  assert.equal(
    (
      await post('password-reset-context', {
        token: randomBytes(32).toString('base64url'),
      })
    ).status,
    400,
  );
});
test('private intake fields are protected and masked in the admin registry', async () => {
  const table = (await registry()).find(
    (table) => table.name === 'care_partner_profiles',
  );
  assert.ok(table);
  assert.equal(table.readOnly, true);
  for (const name of [
    'patient_age',
    'care_partner_age',
    'relationship_to_patient',
    'county',
    'state',
  ]) {
    assert.equal(sensitiveColumn('care_partner_profiles', name), true);
    assert.equal(
      table.columns.find((column) => column.name === name)?.sensitive,
      true,
    );
  }
});
