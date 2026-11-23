import type { RequestHandler } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { query } from '../../config/db.js';

export const COMMUNITY_GUIDELINES_VERSION = '1.0';

export async function getGuidelinesStatus(
  userId: string,
  version = COMMUNITY_GUIDELINES_VERSION,
) {
  const result = await query(
    `SELECT acknowledged_at
     FROM policy_acknowledgments
     WHERE user_id = $1
       AND policy_type = 'community_guidelines'
       AND policy_version = $2`,
    [userId, version],
  );

  return {
    policyType: 'community_guidelines',
    currentVersion: version,
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

export const requireGuidelines: RequestHandler = asyncHandler(
  async (req, res, next) => {
    if (
      req.user!.role !== 'CARE_PARTNER' ||
      (await getGuidelinesStatus(req.user!.id)).acknowledged
    )
      return next();
    res.status(428).json({
      error:
        'Please review and acknowledge the Community Guidelines before posting.',
      code: 'GUIDELINES_ACK_REQUIRED',
    });
  },
);
