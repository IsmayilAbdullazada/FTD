import { randomUUID } from 'node:crypto';
import { notify } from '../../services/notifications.js';
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { cohort } from '../../lib/serializers.js';
import { isStaffRole } from '../../lib/roles.js';
import { authenticateToken, requireStaff } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const staff = isStaffRole(req.user!.role);
    const result = await query(
      `SELECT c.*,(SELECT COUNT(*) FROM cohort_members cm2 WHERE cm2.cohort_id=c.id)::int member_count
     FROM cohorts c WHERE c.is_active AND ($1::boolean OR c.is_general_board OR EXISTS(
       SELECT 1 FROM cohort_members cm WHERE cm.cohort_id=c.id AND cm.user_id=$2)) ORDER BY c.is_general_board DESC,c.name`,
      [staff, req.user!.id],
    );
    res.json(
      result.rows.map((row) => cohort(row as Parameters<typeof cohort>[0])),
    );
  }),
);

router.post(
  '/',
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(3),
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]+$/),
        description: z.string().trim().min(3),
        geographicRegion: z.string().trim().min(2),
        radiusMiles: z.number().int().positive().max(500).optional(),
        tag: z.string().trim().optional(),
      })
      .parse(req.body);
    const result = await query(
      `INSERT INTO cohorts(id,name,slug,description,geographic_region,radius_miles,tag)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *,0::int member_count`,
      [
        `group-${crypto.randomUUID()}`,
        input.name,
        input.slug,
        input.description,
        input.geographicRegion,
        input.radiusMiles ?? null,
        input.tag ?? 'GEO_CUSTOM',
      ],
    );
    res
      .status(201)
      .json(cohort(result.rows[0] as Parameters<typeof cohort>[0]));
  }),
);

router.get(
  '/members',
  requireStaff,
  asyncHandler(async (req, res) => {
    const groupId =
      typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
    const result = await query(
      `SELECT u.*,cm.cohort_id primary_group_id,c.name primary_group_name,cm.status,cm.joined_at
     FROM users u JOIN cohort_members cm ON cm.user_id=u.id AND cm.is_primary JOIN cohorts c ON c.id=cm.cohort_id
     WHERE ($1::text IS NULL OR cm.cohort_id=$1) ORDER BY u.last_name,u.first_name`,
      [groupId ?? null],
    );
    res.json(
      result.rows.map((r) => ({
        userId: r.id,
        realName: `${r.first_name} ${r.last_name}`,
        email: r.email,
        phone: r.phone_number,
        clinicPatientId: r.clinic_patient_id,
        condition: r.condition,
        anonymousHandle: r.anonymous_handle,
        primaryGroupId: r.primary_group_id,
        primaryGroupName: r.primary_group_name,
        role: r.role,
        status: r.status,
        joinedAt: r.joined_at,
      })),
    );
  }),
);

router.post(
  '/members/reassign',
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ userId: z.string().min(1), newGroupId: z.string().min(1) })
      .parse(req.body);
    const target = await query(
      `SELECT id,name FROM cohorts WHERE id=$1 AND is_active`,
      [input.newGroupId],
    );
    if (!target.rows[0]) throw new HttpError(404, 'Target cohort not found');
    await transaction(async (client) => {
      const user = (
        await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
          input.userId,
        ])
      ).rows[0];
      if (!user) throw new HttpError(404, 'Member not found');
      const previous = (
        await client.query(
          'SELECT cohort_id FROM cohort_members WHERE user_id=$1 AND is_primary',
          [input.userId],
        )
      ).rows[0];
      await client.query(
        `UPDATE cohort_members SET is_primary=false WHERE user_id=$1 AND is_primary`,
        [input.userId],
      );
      await client.query(
        `INSERT INTO cohort_members(cohort_id,user_id,is_primary) VALUES($1,$2,true)
      ON CONFLICT(cohort_id,user_id) DO UPDATE SET is_primary=true`,
        [input.newGroupId, input.userId],
      );
      await client.query(
        `INSERT INTO moderation_audit(moderator_id,entity_type,entity_id,action_taken,notes)
      VALUES($1,'MEMBER_ASSIGNMENT',$2,'REASSIGNED_COHORT',$3)`,
        [req.user!.id, input.userId, `Assigned to ${target.rows[0].name}`],
      );
      if (previous?.cohort_id !== input.newGroupId)
        await notify(client, {
          kind: 'COHORT_CHANGED',
          recipients: [input.userId],
          actorId: req.user!.id,
          eventKey: `cohort-changed:${input.userId}:${randomUUID()}`,
        });
    });
    res.json({
      success: true,
      newGroupId: input.newGroupId,
      groupName: target.rows[0].name,
    });
  }),
);

export default router;
