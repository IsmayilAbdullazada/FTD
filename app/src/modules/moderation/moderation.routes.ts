import { Router } from "express";
import { z } from "zod";
import { query, transaction } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { sanitizeUserContent } from "../../lib/contentSafety.js";
import { cohort } from "../../lib/serializers.js";
import { authenticateToken, requireStaff } from "../../middleware/auth.js";

const router = Router();

router.get(
  "/queue",
  authenticateToken,
  requireStaff,
  asyncHandler(async (_req, res) => {
    const result = await query(`
    SELECT p.id,'POST' type,p.id post_id,p.title,p.raw_content,p.sanitized_content,p.condition,p.is_urgent_clinical,p.phi_alerts,
      p.allow_unmoderated_replies,p.created_at,u.id user_id,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,
      u.condition user_condition,u.anonymous_handle,u.avatar_color,NULL::text post_content,NULL::text parent_comment_id,NULL::text parent_content,
      COALESCE((SELECT jsonb_agg(pg.cohort_id) FROM post_groups pg WHERE pg.post_id=p.id),'[]') assigned_group_ids
    FROM posts p JOIN users u ON u.id=p.author_id WHERE p.status='PENDING_MODERATION'
    UNION ALL
    SELECT c.id,'COMMENT',c.post_id,p.title,c.raw_content,c.sanitized_content,p.condition,false,c.phi_alerts,p.allow_unmoderated_replies,
      c.created_at,u.id,u.first_name,u.last_name,u.email,u.phone_number,u.clinic_patient_id,u.condition,u.anonymous_handle,u.avatar_color,
      p.sanitized_content,c.parent_comment_id,parent.sanitized_content,
      COALESCE((SELECT jsonb_agg(pg.cohort_id) FROM post_groups pg WHERE pg.post_id=p.id),'[]')
    FROM comments c JOIN posts p ON p.id=c.post_id JOIN users u ON u.id=c.author_id LEFT JOIN comments parent ON parent.id=c.parent_comment_id
    WHERE c.status='PENDING_MODERATION' ORDER BY created_at`);
    const groupRows = await query(
      `SELECT c.*,(SELECT COUNT(*) FROM cohort_members cm WHERE cm.cohort_id=c.id)::int member_count FROM cohorts c`,
    );
    const groups = new Map(groupRows.rows.map((r) => [r.id, cohort(r)]));
    const items = result.rows.map((r) => ({
      id: r.id,
      type: r.type,
      postId: r.type === "COMMENT" ? r.post_id : undefined,
      postContent: r.post_content ?? undefined,
      parentCommentId: r.parent_comment_id ?? undefined,
      parentContent: r.parent_content ?? undefined,
      author: {
        userId: r.user_id,
        realName: `${r.first_name} ${r.last_name}`,
        email: r.email,
        phone: r.phone_number ?? "",
        clinicPatientId: r.clinic_patient_id ?? "",
        condition: r.user_condition,
        anonymousHandle: r.anonymous_handle,
        avatarColor: r.avatar_color,
      },
      title: r.title,
      rawContent: r.raw_content,
      sanitizedContent: r.sanitized_content,
      suggestedCohort:
        groups.get(r.assigned_group_ids[0]) ?? groups.values().next().value,
      assignedGroupIds: r.assigned_group_ids,
      condition: r.condition,
      isUrgentClinical: r.is_urgent_clinical,
      allowUnmoderatedReplies: r.allow_unmoderated_replies,
      phiAlerts: r.phi_alerts ?? [],
      createdAt: r.created_at,
    }));
    res.json({ totalPending: items.length, items });
  }),
);

router.post(
  "/action",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        entityId: z.string().min(1),
        entityType: z.enum(["POST", "COMMENT"]),
        action: z.enum(["APPROVE", "REJECT", "CLINICAL_REDIRECT"]),
        assignedGroupIds: z.array(z.string()).optional(),
        sanitizedContent: z.string().optional(),
        allowUnmoderatedReplies: z.boolean().optional(),
        rejectionCode: z.string().optional(),
        rejectionMessage: z.string().optional(),
        moderatorNotes: z.string().optional(),
        condition: z.enum(["FTD", "AD", "BOTH"]).optional(),
      })
      .parse(req.body);
    const sanitizedContent =
      input.sanitizedContent === undefined
        ? undefined
        : sanitizeUserContent(input.sanitizedContent);
    if (sanitizedContent !== undefined && !sanitizedContent)
      throw new HttpError(400, "Sanitized content cannot be empty");
    if (input.entityType === "COMMENT" && input.action === "CLINICAL_REDIRECT")
      throw new HttpError(400, "Replies can only be approved or rejected");
    const nextStatus =
      input.action === "APPROVE"
        ? "APPROVED"
        : input.action === "REJECT"
          ? "REJECTED"
          : "CLINICAL_REDIRECT";
    const result = await transaction(async (client) => {
      const table = input.entityType === "POST" ? "posts" : "comments";
      const current = await client.query(
        `SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,
        [input.entityId],
      );
      const entity = current.rows[0];
      if (!entity) throw new HttpError(404, `${input.entityType} not found`);
      if (entity.status !== "PENDING_MODERATION")
        throw new HttpError(409, "This item has already been moderated");
      await client.query(
        `UPDATE ${table} SET status=$1,sanitized_content=COALESCE($2,sanitized_content),moderated_by=$3,
      moderated_at=NOW(),rejection_code=$4,rejection_message=$5,updated_at=NOW() WHERE id=$6`,
        [
          nextStatus,
          sanitizedContent ?? null,
          req.user!.id,
          input.rejectionCode ?? null,
          input.rejectionMessage ?? null,
          input.entityId,
        ],
      );
      const postId =
        input.entityType === "POST" ? input.entityId : entity.post_id;
      if (input.entityType === "POST") {
        if (input.assignedGroupIds?.length) {
          const groups = await client.query(
            `SELECT id FROM cohorts WHERE id=ANY($1::text[]) AND is_active`,
            [input.assignedGroupIds],
          );
          if (groups.rowCount !== new Set(input.assignedGroupIds).size)
            throw new HttpError(
              400,
              "One or more assigned cohorts are invalid",
            );
          await client.query(`DELETE FROM post_groups WHERE post_id=$1`, [
            postId,
          ]);
          for (const groupId of input.assignedGroupIds)
            await client.query(
              `INSERT INTO post_groups(post_id,cohort_id) VALUES($1,$2)`,
              [postId, groupId],
            );
        }
        if (input.allowUnmoderatedReplies !== undefined)
          await client.query(
            `UPDATE posts SET allow_unmoderated_replies=$1 WHERE id=$2`,
            [input.allowUnmoderatedReplies, postId],
          );
        if (input.condition)
          await client.query(`UPDATE posts SET condition=$1 WHERE id=$2`, [
            input.condition,
            postId,
          ]);
      }
      const authorId = entity.author_id;
      await client.query(
        `INSERT INTO notifications(recipient_user_id,title,message,type) VALUES($1,$2,$3,$4)`,
        [
          authorId,
          `${input.entityType === "POST" ? "Discussion" : "Reply"} ${input.action.toLowerCase()}`,
          input.rejectionMessage ||
            `Your ${input.entityType.toLowerCase()} was ${input.action.toLowerCase()} by the clinical moderation team.`,
          input.action === "APPROVE"
            ? "APPROVAL"
            : input.action === "REJECT"
              ? "REJECTION"
              : "CLINICAL_ESCALATION",
        ],
      );
      await client.query(
        `INSERT INTO moderation_audit(moderator_id,entity_type,entity_id,action_taken,reason,notes)
      VALUES($1,$2,$3,$4,$5,$6)`,
        [
          req.user!.id,
          input.entityType,
          input.entityId,
          input.action,
          input.rejectionCode ?? null,
          input.moderatorNotes ?? null,
        ],
      );
      return { postId };
    });
    res.json({
      success: true,
      status: "SUCCESS",
      entityId: input.entityId,
      newEntityStatus: nextStatus,
      postId: result.postId,
      indexedToRag: input.action === "APPROVE",
      message:
        input.action === "APPROVE"
          ? `${input.entityType === "POST" ? "Post" : "Reply"} approved and published.`
          : input.action === "REJECT"
            ? `${input.entityType === "POST" ? "Post" : "Reply"} rejected and feedback sent.`
            : "Discussion diverted to the clinical support workflow.",
    });
  }),
);

router.get(
  "/audit",
  authenticateToken,
  requireStaff,
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT a.*,u.first_name,u.last_name FROM moderation_audit a JOIN users u ON u.id=a.moderator_id ORDER BY a.created_at DESC LIMIT 500`,
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        moderatorId: r.moderator_id,
        moderatorName: `${r.first_name} ${r.last_name}`,
        entityType: r.entity_type,
        entityId: r.entity_id,
        actionTaken: r.action_taken,
        reason: r.reason ?? undefined,
        notes: r.notes ?? undefined,
        createdAt: r.created_at,
      })),
    );
  }),
);

export default router;
