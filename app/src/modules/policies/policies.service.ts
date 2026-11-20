import { query } from '../../config/db.js';

export const COMMUNITY_GUIDELINES_VERSION = '1.0';

export async function getGuidelinesStatus(userId: string) {
  const result = await query(
    `SELECT acknowledged_at
     FROM policy_acknowledgments
     WHERE user_id = $1
       AND policy_type = 'community_guidelines'
       AND policy_version = $2`,
    [userId, COMMUNITY_GUIDELINES_VERSION],
  );

  return {
    policyType: 'community_guidelines',
    currentVersion: COMMUNITY_GUIDELINES_VERSION,
    acknowledged: result.rows.length > 0,
    acknowledgedAt: result.rows[0]?.acknowledged_at ?? null,
  };
}

export async function acknowledgeGuidelines(userId: string) {
  await query(
    `INSERT INTO policy_acknowledgments
       (user_id, policy_type, policy_version)
     VALUES ($1, 'community_guidelines', $2)
     ON CONFLICT (user_id, policy_type, policy_version)
     DO NOTHING`,
    [userId, COMMUNITY_GUIDELINES_VERSION],
  );

  return getGuidelinesStatus(userId);
}
