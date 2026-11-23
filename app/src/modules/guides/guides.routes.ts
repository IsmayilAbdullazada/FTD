import {
  notify,
  notifyModerators,
  notifyAdmins,
} from '../../services/notifications.js';
import type { PoolClient } from 'pg';
import type { GuideRow } from '../../db/rows.js';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { authenticateToken, requireStaff } from '../../middleware/auth.js';
import { publicAssetUrl } from '../../lib/urlValidation.js';

import { readUploadedPdf } from './pdfUpload.js';

const router = Router();
router.use(authenticateToken);
const pagesSchema = z
  .array(
    z.object({
      pageNumber: z.number().int().positive(),
      text: z.string(),
      wordCount: z.number().optional(),
      chunkCount: z.number().optional(),
    }),
  )
  .default([]);
const guideInput = z.object({
  title: z.string().trim().min(3),
  condition: z.enum(['FTD', 'AD', 'GENERAL']),
  topicTag: z.string().optional(),
  publisher: z.string().optional(),
  year: z.string().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().nonnegative().optional(),
  mimeType: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  pages: pagesSchema.optional(),
  status: z.enum(['DRAFT', 'APPROVED']).default('DRAFT'),
  pdfUrl: publicAssetUrl.optional(),
  isActive: z.boolean().default(true),
});

function chunk(text: string, max = 400, overlap = 60) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += max - overlap) {
    out.push(words.slice(i, i + max).join(' '));
    if (i + max >= words.length) break;
  }
  return out;
}
function map(r: GuideRow & { uploaded_by_name?: string }, technical = false) {
  return {
    id: r.id,
    title: r.title,
    condition: r.condition,
    topicTag: r.topic_tag ?? undefined,
    publisher: r.publisher ?? undefined,
    year: r.publication_year ?? undefined,
    fileName: r.file_name,
    fileSize: Number(r.file_size),
    mimeType: r.mime_type,
    category: r.category ?? undefined,
    description: r.description ?? undefined,
    content: !technical && r.pdf_url ? '' : r.content,
    ...(technical
      ? {
          pages: r.pages ?? [],
          totalChunks: r.total_chunks,
          wordCount: r.content.trim().split(/\s+/).filter(Boolean).length,
        }
      : {}),
    status: r.status,
    approvedAt: r.approved_at ?? undefined,
    approvedBy: r.approved_by ?? undefined,
    pdfUrl: r.pdf_url ?? undefined,
    isActive: r.is_active,
    uploadedBy: r.uploaded_by,
    uploadedByName: r.uploaded_by_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
async function reindex(client: PoolClient, guide: GuideRow) {
  await client.query(`DELETE FROM guide_chunks WHERE guide_id=$1`, [guide.id]);
  if (!guide.is_active || guide.status !== 'APPROVED') {
    await client.query(`UPDATE chatbot_guides SET total_chunks=0 WHERE id=$1`, [
      guide.id,
    ]);
    return 0;
  }
  const pages =
    Array.isArray(guide.pages) && guide.pages.length
      ? guide.pages
      : [{ pageNumber: 1, text: guide.content }];
  let count = 0;
  for (const page of pages)
    for (const [index, content] of chunk(page.text || '').entries()) {
      await client.query(
        `INSERT INTO guide_chunks(id,guide_id,page,content) VALUES($1,$2,$3,$4)`,
        [
          `${guide.id}-p${page.pageNumber}-c${index + 1}`,
          guide.id,
          page.pageNumber,
          content,
        ],
      );
      count++;
    }
  await client.query(`UPDATE chatbot_guides SET total_chunks=$1 WHERE id=$2`, [
    count,
    guide.id,
  ]);
  return count;
}

router.get(
  '/',
  requireStaff,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT g.*,u.first_name||' '||u.last_name uploaded_by_name FROM chatbot_guides g JOIN users u ON u.id=g.uploaded_by ORDER BY g.created_at DESC`,
    );
    const guides = rows.rows.map((row) =>
      map(row as Parameters<typeof map>[0], req.user!.role === 'SYSTEM_ADMIN'),
    );
    res.json({
      guides,
      config: {
        totalActiveGuides: guides.filter(
          (g) => g.isActive && g.status === 'APPROVED',
        ).length,
        ...(req.user!.role === 'SYSTEM_ADMIN'
          ? {
              totalWords: rows.rows.reduce(
                (n, r) =>
                  n + String(r.content).split(/\s+/).filter(Boolean).length,
                0,
              ),
            }
          : {}),
      },
    });
  }),
);
router.post(
  '/',
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = guideInput.parse(req.body);
    if (i.content === undefined) {
      if (!i.pdfUrl)
        throw new HttpError(
          400,
          'Guide content or an uploaded PDF is required',
        );
      Object.assign(i, await readUploadedPdf(i.pdfUrl, req.user!.id));
    }
    const r = await transaction(async (client) => {
      const inserted = (
        await client.query(
          `INSERT INTO chatbot_guides(title,condition,topic_tag,publisher,publication_year,file_name,file_size,mime_type,category,description,content,pages,status,pdf_url,is_active,uploaded_by,approved_at,approved_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,CASE WHEN $13='APPROVED' THEN NOW() END,CASE WHEN $13='APPROVED' THEN $16 END) RETURNING *`,
          [
            i.title,
            i.condition,
            i.topicTag ?? null,
            i.publisher ?? null,
            i.year ?? null,
            path.basename(i.fileName),
            i.fileSize ?? 0,
            i.mimeType ?? 'application/pdf',
            i.category ?? null,
            i.description ?? null,
            i.content,
            JSON.stringify(i.pages ?? []),
            i.status,
            i.pdfUrl ?? null,
            i.isActive,
            req.user!.id,
          ],
        )
      ).rows[0];
      inserted.total_chunks = await reindex(client, inserted);
      if (inserted.status === 'APPROVED')
        await notifyAdmins(client, {
          kind: 'ADMIN_GUIDE_PUBLISHED',
          eventKey: `guide-published:${inserted.id}`,
          context: { guideId: inserted.id, action: 'APPROVED' },
        });
      if (inserted.status === 'DRAFT')
        await notifyModerators(client, {
          kind: 'GUIDE_REVIEW_REQUIRED',
          actorId: req.user!.id,
          eventKey: `guide-review:${inserted.id}`,
          context: { guideId: inserted.id },
        });
      return inserted;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [req.user!.id],
    );
    res
      .status(201)
      .json(
        map(
          { ...r, ...user.rows[0] } as Parameters<typeof map>[0],
          req.user!.role === 'SYSTEM_ADMIN',
        ),
      );
  }),
);
router.put(
  '/:id',
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = guideInput
      .partial()
      .extend({
        isActive: z.boolean().optional(),
        status: z.enum(['DRAFT', 'APPROVED']).optional(),
        pages: z.array(pagesSchema.unwrap().element).optional(),
      })
      .parse(req.body);
    const r = await transaction(async (client) => {
      const before = (
        await client.query(
          'SELECT status,pdf_url FROM chatbot_guides WHERE id=$1 FOR UPDATE',
          [req.params.id],
        )
      ).rows[0];
      if (!before) throw new HttpError(404, 'Guide not found');
      if (i.content === undefined && i.pdfUrl && i.pdfUrl !== before.pdf_url)
        Object.assign(i, await readUploadedPdf(i.pdfUrl, req.user!.id));
      const nextStatus = i.status ?? before.status;
      const updated = (
        await client.query(
          `UPDATE chatbot_guides SET title=COALESCE($1,title),condition=COALESCE($2,condition),topic_tag=COALESCE($3,topic_tag),publisher=COALESCE($4,publisher),publication_year=COALESCE($5,publication_year),
      category=COALESCE($6,category),description=COALESCE($7,description),content=COALESCE($8,content),pages=COALESCE($9,pages),pdf_url=COALESCE($10,pdf_url),is_active=COALESCE($11,is_active),
      status=$12,
      approved_at=CASE WHEN $12='APPROVED' AND status<>'APPROVED' THEN NOW() WHEN $12='DRAFT' THEN NULL ELSE approved_at END,
      approved_by=CASE WHEN $12='APPROVED' AND status<>'APPROVED' THEN $13 WHEN $12='DRAFT' THEN NULL ELSE approved_by END,
      updated_at=NOW() WHERE id=$14 RETURNING *`,
          [
            i.title ?? null,
            i.condition ?? null,
            i.topicTag ?? null,
            i.publisher ?? null,
            i.year ?? null,
            i.category ?? null,
            i.description ?? null,
            i.content ?? null,
            i.pages ? JSON.stringify(i.pages) : null,
            i.pdfUrl ?? null,
            i.isActive ?? null,
            nextStatus,
            req.user!.id,
            req.params.id,
          ],
        )
      ).rows[0];
      if (!updated) throw new HttpError(404, 'Guide not found');
      updated.total_chunks = await reindex(client, updated);
      if (updated.status !== before.status)
        await notifyAdmins(client, {
          kind: 'ADMIN_GUIDE_PUBLISHED',
          eventKey: `guide-publication:${updated.id}:${updated.updated_at.toISOString()}`,
          context: { guideId: updated.id, action: updated.status },
        });
      if (updated.status === 'APPROVED' && before.status !== 'APPROVED') {
        await notify(client, {
          kind: 'GUIDE_APPROVED',
          recipients: [updated.uploaded_by],
          actorId: req.user!.id,
          eventKey: `guide-approved:${updated.id}:${updated.updated_at.toISOString()}`,
          context: { guideId: updated.id },
        });
      } else if (updated.status === 'DRAFT') {
        await notifyModerators(client, {
          kind: 'GUIDE_REVIEW_REQUIRED',
          actorId: req.user!.id,
          eventKey: `guide-review:${updated.id}:${updated.updated_at.toISOString()}`,
          context: { guideId: updated.id },
        });
      }
      return updated;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [r.uploaded_by],
    );
    res.json({
      success: true,
      guide: map(
        { ...r, ...user.rows[0] } as Parameters<typeof map>[0],
        req.user!.role === 'SYSTEM_ADMIN',
      ),
    });
  }),
);
router.patch(
  '/:id/approve',
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await transaction(async (client) => {
      const before = (
        await client.query(
          'SELECT status,pdf_url FROM chatbot_guides WHERE id=$1 FOR UPDATE',
          [req.params.id],
        )
      ).rows[0];
      const g = (
        await client.query(
          `UPDATE chatbot_guides SET status='APPROVED',approved_at=NOW(),approved_by=$1,updated_at=NOW() WHERE id=$2 RETURNING *`,
          [req.user!.id, req.params.id],
        )
      ).rows[0];
      if (!g) throw new HttpError(404, 'Guide not found');
      g.total_chunks = await reindex(client, g);
      await notifyAdmins(client, {
        kind: 'ADMIN_GUIDE_PUBLISHED',
        eventKey: `guide-publication:${g.id}:${g.updated_at.toISOString()}`,
        context: {
          guideId: g.id,
          action:
            g.is_active && g.status === 'APPROVED' ? 'APPROVED' : 'UNPUBLISHED',
        },
      });
      if (before?.status !== 'APPROVED')
        await notify(client, {
          kind: 'GUIDE_APPROVED',
          recipients: [g.uploaded_by],
          actorId: req.user!.id,
          eventKey: `guide-approved:${g.id}`,
          context: { guideId: g.id },
        });
      return g;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [r.uploaded_by],
    );
    res.json({
      success: true,
      guide: map(
        { ...r, ...user.rows[0] } as Parameters<typeof map>[0],
        req.user!.role === 'SYSTEM_ADMIN',
      ),
    });
  }),
);
router.patch(
  '/:id/toggle',
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await transaction(async (client) => {
      const g = (
        await client.query(
          `UPDATE chatbot_guides SET is_active=NOT is_active,updated_at=NOW() WHERE id=$1 RETURNING *`,
          [req.params.id],
        )
      ).rows[0];
      if (!g) throw new HttpError(404, 'Guide not found');
      g.total_chunks = await reindex(client, g);
      await notifyAdmins(client, {
        kind: 'ADMIN_GUIDE_PUBLISHED',
        eventKey: `guide-publication:${g.id}:${g.updated_at.toISOString()}`,
        context: {
          guideId: g.id,
          action:
            g.is_active && g.status === 'APPROVED' ? 'APPROVED' : 'UNPUBLISHED',
        },
      });
      return g;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [r.uploaded_by],
    );
    res.json({
      success: true,
      guide: map(
        { ...r, ...user.rows[0] } as Parameters<typeof map>[0],
        req.user!.role === 'SYSTEM_ADMIN',
      ),
    });
  }),
);
router.delete(
  '/:id',
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await query(
      `DELETE FROM chatbot_guides WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!r.rows[0]) throw new HttpError(404, 'Guide not found');
    const c = await query(`SELECT COUNT(*)::int count FROM chatbot_guides`);
    res.json({ success: true, remainingGuides: c.rows[0].count });
  }),
);

export default router;
