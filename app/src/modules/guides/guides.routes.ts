import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { query, transaction } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { authenticateToken, requireStaff } from "../../middleware/auth.js";
import { publicAssetUrl } from "../../lib/urlValidation.js";

const router = Router();
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
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
  condition: z.enum(["FTD", "AD", "GENERAL"]),
  topicTag: z.string().optional(),
  publisher: z.string().optional(),
  year: z.string().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().nonnegative().optional(),
  mimeType: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  content: z.string(),
  pages: pagesSchema.optional(),
  status: z.enum(["DRAFT", "APPROVED"]).default("DRAFT"),
  pdfUrl: publicAssetUrl.optional(),
  isActive: z.boolean().default(true),
});

function chunk(text: string, max = 400, overlap = 60) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += max - overlap) {
    out.push(words.slice(i, i + max).join(" "));
    if (i + max >= words.length) break;
  }
  return out;
}
function map(r: any) {
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
    content: r.content,
    pages: r.pages ?? [],
    totalChunks: r.total_chunks,
    status: r.status,
    approvedAt: r.approved_at ?? undefined,
    approvedBy: r.approved_by ?? undefined,
    pdfUrl: r.pdf_url ?? undefined,
    isActive: r.is_active,
    uploadedBy: r.uploaded_by,
    uploadedByName: r.uploaded_by_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    wordCount: r.content.trim().split(/\s+/).filter(Boolean).length,
  };
}
async function reindex(client: any, guide: any) {
  await client.query(`DELETE FROM guide_chunks WHERE guide_id=$1`, [guide.id]);
  if (!guide.is_active || guide.status !== "APPROVED") {
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
    for (const [index, content] of chunk(page.text || "").entries()) {
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
  "/",
  authenticateToken,
  requireStaff,
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT g.*,u.first_name||' '||u.last_name uploaded_by_name FROM chatbot_guides g JOIN users u ON u.id=g.uploaded_by ORDER BY g.created_at DESC`,
    );
    const guides = rows.rows.map(map);
    res.json({
      guides,
      config: {
        totalActiveGuides: guides.filter(
          (g) => g.isActive && g.status === "APPROVED",
        ).length,
        totalWords: guides.reduce((n, g) => n + g.wordCount, 0),
      },
    });
  }),
);
router.post(
  "/",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = guideInput.parse(req.body);
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
            i.mimeType ?? "application/pdf",
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
      return inserted;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [req.user!.id],
    );
    res.status(201).json(map({ ...r, ...user.rows[0] }));
  }),
);
router.put(
  "/:id",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const i = guideInput.partial().parse(req.body);
    const r = await transaction(async (client) => {
      const updated = (
        await client.query(
          `UPDATE chatbot_guides SET title=COALESCE($1,title),condition=COALESCE($2,condition),topic_tag=COALESCE($3,topic_tag),publisher=COALESCE($4,publisher),publication_year=COALESCE($5,publication_year),
      category=COALESCE($6,category),description=COALESCE($7,description),content=COALESCE($8,content),pages=COALESCE($9,pages),pdf_url=COALESCE($10,pdf_url),is_active=COALESCE($11,is_active),updated_at=NOW() WHERE id=$12 RETURNING *`,
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
            req.params.id,
          ],
        )
      ).rows[0];
      if (!updated) throw new HttpError(404, "Guide not found");
      updated.total_chunks = await reindex(client, updated);
      return updated;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [r.uploaded_by],
    );
    res.json({ success: true, guide: map({ ...r, ...user.rows[0] }) });
  }),
);
router.patch(
  "/:id/approve",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await transaction(async (client) => {
      const g = (
        await client.query(
          `UPDATE chatbot_guides SET status='APPROVED',approved_at=NOW(),approved_by=$1,updated_at=NOW() WHERE id=$2 RETURNING *`,
          [req.user!.id, req.params.id],
        )
      ).rows[0];
      if (!g) throw new HttpError(404, "Guide not found");
      g.total_chunks = await reindex(client, g);
      return g;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [r.uploaded_by],
    );
    res.json({ success: true, guide: map({ ...r, ...user.rows[0] }) });
  }),
);
router.patch(
  "/:id/toggle",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await transaction(async (client) => {
      const g = (
        await client.query(
          `UPDATE chatbot_guides SET is_active=NOT is_active,updated_at=NOW() WHERE id=$1 RETURNING *`,
          [req.params.id],
        )
      ).rows[0];
      if (!g) throw new HttpError(404, "Guide not found");
      g.total_chunks = await reindex(client, g);
      return g;
    });
    const user = await query(
      `SELECT first_name||' '||last_name uploaded_by_name FROM users WHERE id=$1`,
      [r.uploaded_by],
    );
    res.json({ success: true, guide: map({ ...r, ...user.rows[0] }) });
  }),
);
router.delete(
  "/:id",
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const r = await query(
      `DELETE FROM chatbot_guides WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!r.rows[0]) throw new HttpError(404, "Guide not found");
    const c = await query(`SELECT COUNT(*)::int count FROM chatbot_guides`);
    res.json({ success: true, remainingGuides: c.rows[0].count });
  }),
);

export const extractPdf = asyncHandler(async (req, res) => {
  const { fileName, fileBase64 } = z
    .object({
      fileName: z
        .string()
        .min(1)
        .refine(
          (value) => path.extname(value).toLowerCase() === ".pdf",
          "Only PDF files are accepted",
        ),
      fileBase64: z.string().min(16).max(20_000_000),
    })
    .parse(req.body);
  const safe = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const buffer = Buffer.from(
    fileBase64.replace(/^data:[^;]+;base64,/, ""),
    "base64",
  );
  if (buffer.length > 12 * 1024 * 1024)
    throw new HttpError(413, "PDF exceeds 12 MB limit");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-")
    throw new HttpError(400, "Uploaded file is not a valid PDF");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const parsed = await parser.getText();
  await parser.destroy();
  const pages = (parsed.pages ?? []).map((p: any, index: number) => {
    const text = (p.text ?? "").replace(/\s+/g, " ").trim();
    const words = text ? text.split(/\s+/).length : 0;
    return {
      pageNumber: index + 1,
      text,
      wordCount: words,
      chunkCount: words ? Math.ceil(words / 340) : 0,
    };
  });
  const dir = path.join(repoRoot, "public", "uploads", "guides");
  await fs.mkdir(dir, { recursive: true });
  const stored = `guide_${Date.now()}_${safe}`;
  await fs.writeFile(path.join(dir, stored), buffer);
  const text = pages.map((p) => p.text).join("\n\n");
  res.json({
    text,
    pages,
    totalChunks: pages.reduce((n, p) => n + p.chunkCount, 0),
    wordCount: pages.reduce((n, p) => n + p.wordCount, 0),
    pageCount: pages.length,
    fileName: safe,
    pdfUrl: `/uploads/guides/${stored}`,
    title: "",
  });
});
export default router;
