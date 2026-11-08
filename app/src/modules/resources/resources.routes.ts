import { Router } from "express";
import { z } from "zod";
import { query } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { resource } from "../../lib/serializers.js";
import { authenticateToken, requireStaff } from "../../middleware/auth.js";
import { httpUrl, publicAssetUrl } from "../../lib/urlValidation.js";

const router = Router();
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await query(`SELECT condition FROM users WHERE id=$1`, [
      req.user!.id,
    ]);
    const condition =
      req.user!.role === "CARE_PARTNER" ? user.rows[0]?.condition : null;
    const result = await query(
      `SELECT * FROM resources WHERE $1::text IS NULL OR disease_domain IN ($1,'BOTH') ORDER BY created_at DESC`,
      [condition],
    );
    res.json(result.rows.map(resource));
  }),
);
router.post(
  "/",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(3),
        summary: z.string().trim().min(3),
        contentBody: z.string().trim().min(3),
        category: z.string().trim().min(2),
        diseaseDomain: z.enum(["FTD", "AD", "BOTH"]).default("FTD"),
        externalUrl: httpUrl.or(z.literal("")).optional(),
        fileAttachmentUrl: publicAssetUrl.optional(),
        additionalLinks: z
          .array(z.object({ label: z.string(), url: httpUrl }))
          .default([]),
        keyTakeaways: z.array(z.string()).default([]),
      })
      .parse(req.body);
    const result = await query(
      `INSERT INTO resources(title,summary,content_body,category,disease_domain,external_url,file_attachment_url,additional_links,key_takeaways,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        input.title,
        input.summary,
        input.contentBody,
        input.category,
        input.diseaseDomain,
        input.externalUrl || null,
        input.fileAttachmentUrl || null,
        JSON.stringify(input.additionalLinks),
        JSON.stringify(input.keyTakeaways),
        req.user!.id,
      ],
    );
    res.status(201).json(resource(result.rows[0]));
  }),
);
router.delete(
  "/:id",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM resources WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!result.rows[0]) throw new HttpError(404, "Resource not found");
    res.json({ success: true });
  }),
);
export default router;
