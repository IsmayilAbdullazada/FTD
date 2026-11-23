import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { resource } from '../../lib/serializers.js';
import { listLibrary } from './resourceLibrary.js';
import { authenticateToken, requireStaff } from '../../middleware/auth.js';
import { httpUrl, publicAssetUrl } from '../../lib/urlValidation.js';

const resourceInput = z
  .object({
    title: z.string().trim().min(3),
    summary: z.string().trim().min(3),
    contentBody: z.string().trim().min(3),
    category: z.string().trim().min(2),
    diseaseDomain: z.enum(['FTD', 'AD', 'BOTH']).default('FTD'),
    externalUrl: httpUrl.or(z.literal('')).optional(),
    fileAttachmentUrl: publicAssetUrl.optional(),
    additionalLinks: z
      .array(z.object({ label: z.string(), url: httpUrl }))
      .default([]),
    keyTakeaways: z.array(z.string()).default([]),
  })
  .refine((value) => Boolean(value.externalUrl || value.fileAttachmentUrl), {
    message: 'Provide a webpage URL or an uploaded PDF.',
  });

const router = Router();
router.use(authenticateToken);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await listLibrary(req.user!));
  }),
);
router.post(
  '/',
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = resourceInput.parse(req.body);
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
    res
      .status(201)
      .json(resource(result.rows[0] as Parameters<typeof resource>[0]));
  }),
);
router.put(
  '/:id',
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = resourceInput.parse(req.body);
    const result = await query(
      `UPDATE resources SET title=$1,summary=$2,content_body=$3,category=$4,disease_domain=$5,external_url=$6,file_attachment_url=$7,additional_links=$8,key_takeaways=$9 WHERE id=$10 RETURNING *`,
      [
        i.title,
        i.summary,
        i.contentBody,
        i.category,
        i.diseaseDomain,
        i.externalUrl || null,
        i.fileAttachmentUrl || null,
        JSON.stringify(i.additionalLinks),
        JSON.stringify(i.keyTakeaways),
        req.params.id,
      ],
    );
    if (!result.rowCount) throw new HttpError(404, 'Resource not found');
    res.json(resource(result.rows[0] as Parameters<typeof resource>[0]));
  }),
);
router.delete(
  '/:id',
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM resources WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!result.rows[0]) throw new HttpError(404, 'Resource not found');
    res.json({ success: true });
  }),
);
export default router;
