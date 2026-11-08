import { Router } from "express";
import { z } from "zod";
import { query } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { authenticateToken, requireStaff } from "../../middleware/auth.js";
import { httpUrl } from "../../lib/urlValidation.js";

const router = Router();
router.get(
  "/updates",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await query(`SELECT condition FROM users WHERE id=$1`, [
      req.user!.id,
    ]);
    const condition =
      req.user!.role === "CARE_PARTNER" ? user.rows[0]?.condition : null;
    const result = await query(
      `SELECT * FROM clinic_updates WHERE $1::text IS NULL OR condition IN($1,'BOTH') ORDER BY created_at DESC`,
      [condition],
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        body: r.body,
        category: r.category,
        condition: r.condition,
        trialStatus: r.trial_status ?? undefined,
        externalUrl: r.external_url ?? undefined,
        authorId: r.author_id,
        createdAt: r.created_at,
      })),
    );
  }),
);
router.post(
  "/updates",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = z
      .object({
        title: z.string().min(3),
        summary: z.string().min(3),
        body: z.string().min(3),
        category: z.enum([
          "CLINICAL_TRIAL",
          "MEDICATION",
          "RESEARCH",
          "ANNOUNCEMENT",
        ]),
        condition: z.enum(["FTD", "AD", "BOTH"]),
        trialStatus: z.enum(["RECRUITING", "CLOSED"]).optional(),
        externalUrl: httpUrl.or(z.literal("")).optional(),
      })
      .parse(req.body);
    const r = (
      await query(
        `INSERT INTO clinic_updates(title,summary,body,category,condition,trial_status,external_url,author_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          i.title,
          i.summary,
          i.body,
          i.category,
          i.condition,
          i.trialStatus ?? null,
          i.externalUrl || null,
          req.user!.id,
        ],
      )
    ).rows[0];
    res.status(201).json({
      id: r.id,
      title: r.title,
      summary: r.summary,
      body: r.body,
      category: r.category,
      condition: r.condition,
      trialStatus: r.trial_status ?? undefined,
      externalUrl: r.external_url ?? undefined,
      authorId: r.author_id,
      createdAt: r.created_at,
    });
  }),
);
router.delete(
  "/updates/:id",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await query(
      `DELETE FROM clinic_updates WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!r.rows[0]) throw new HttpError(404, "Update not found");
    res.json({ success: true });
  }),
);

router.get(
  "/events",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await query(`SELECT condition FROM users WHERE id=$1`, [
      req.user!.id,
    ]);
    const condition =
      req.user!.role === "CARE_PARTNER" ? user.rows[0]?.condition : null;
    const result = await query(
      `SELECT * FROM calendar_events WHERE $1::text IS NULL OR condition IS NULL OR condition IN($1,'BOTH') ORDER BY starts_at`,
      [condition],
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        startsAt: r.starts_at,
        location: r.location,
        description: r.description ?? undefined,
        authorId: r.author_id,
        condition: r.condition ?? undefined,
      })),
    );
  }),
);
router.post(
  "/events",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = z
      .object({
        title: z.string().min(3),
        type: z.enum(["CARE_PARTNER_CONFERENCE", "SUPPORT_GROUP", "SOCIAL"]),
        startsAt: z.coerce.date(),
        location: z.string().min(2),
        description: z.string().optional(),
        condition: z.enum(["FTD", "AD", "BOTH"]).optional(),
      })
      .parse(req.body);
    const r = (
      await query(
        `INSERT INTO calendar_events(title,type,starts_at,location,description,condition,author_id)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          i.title,
          i.type,
          i.startsAt,
          i.location,
          i.description ?? null,
          i.condition ?? null,
          req.user!.id,
        ],
      )
    ).rows[0];
    res.status(201).json({
      id: r.id,
      title: r.title,
      type: r.type,
      startsAt: r.starts_at,
      location: r.location,
      description: r.description ?? undefined,
      authorId: r.author_id,
      condition: r.condition ?? undefined,
    });
  }),
);
router.delete(
  "/events/:id",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await query(
      `DELETE FROM calendar_events WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!r.rows[0]) throw new HttpError(404, "Event not found");
    res.json({ success: true });
  }),
);
export default router;
