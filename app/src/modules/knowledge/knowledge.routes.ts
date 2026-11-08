import { Router } from "express";
import { z } from "zod";
import { query } from "../../config/db.js";
import { asyncHandler } from "../../lib/http.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();
const textQuery = z.object({
  query: z.string().trim().min(2).max(2000).optional(),
  message: z.string().trim().min(2).max(2000).optional(),
  draftText: z.string().trim().min(2).max(2000).optional(),
});
const isStaff = (role: string) =>
  role === "CLINICIAN_MODERATOR" || role === "SYSTEM_ADMIN";

async function discussionMatches(term: string, userId: string, role: string) {
  const result = await query(
    `SELECT p.id,p.title,p.sanitized_content,
    ts_rank(to_tsvector('english',p.title||' '||p.sanitized_content),websearch_to_tsquery('english',$1)) score,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.status='APPROVED')::int reply_count
    FROM posts p WHERE p.status='APPROVED' AND to_tsvector('english',p.title||' '||p.sanitized_content) @@ websearch_to_tsquery('english',$1)
    AND ($3::boolean OR (p.condition IN (COALESCE((SELECT condition FROM users WHERE id=$2),'FTD'),'BOTH')
      AND EXISTS(SELECT 1 FROM post_groups pg WHERE pg.post_id=p.id AND
        (pg.cohort_id='group-general' OR EXISTS(SELECT 1 FROM cohort_members cm
          WHERE cm.cohort_id=pg.cohort_id AND cm.user_id=$2)))))
    ORDER BY score DESC LIMIT 5`,
    [term, userId, isStaff(role)],
  );
  return result.rows;
}
router.post(
  "/deflect",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const parsed = textQuery.parse(req.body);
    const term = parsed.draftText || parsed.query || parsed.message!;
    const resources = await query(
      `SELECT id,title,summary,category,ts_rank(to_tsvector('english',title||' '||summary||' '||content_body),websearch_to_tsquery('english',$1)) score
    FROM resources WHERE to_tsvector('english',title||' '||summary||' '||content_body)@@websearch_to_tsquery('english',$1)
    AND ($2::boolean OR disease_domain IN (COALESCE((SELECT condition FROM users WHERE id=$3),'FTD'),'BOTH'))
    ORDER BY score DESC LIMIT 3`,
      [term, isStaff(req.user!.role), req.user!.id],
    );
    const discussions = await discussionMatches(
      term,
      req.user!.id,
      req.user!.role,
    );
    res.json({
      deflectionMatches: [
        ...resources.rows.map((r) => ({
          sourceType: "RESOURCE",
          id: r.id,
          title: r.title,
          category: r.category,
          snippet: r.summary,
          url: `/?tab=knowledge&resource=${r.id}`,
          confidenceScore: Number(r.score),
        })),
        ...discussions.map((r) => ({
          sourceType: "PAST_DISCUSSION",
          id: r.id,
          postId: r.id,
          title: r.title,
          snippet: r.sanitized_content.slice(0, 180),
          url: `/?tab=feed&post=${r.id}`,
          confidenceScore: Number(r.score),
        })),
      ],
    });
  }),
);
router.post(
  "/chat",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const parsed = textQuery.parse(req.body);
    const term = parsed.query || parsed.message!;
    const user = await query(`SELECT condition FROM users WHERE id=$1`, [
      req.user!.id,
    ]);
    const condition = user.rows[0]?.condition || "FTD";
    const chunks = await query(
      `SELECT gc.*,g.title,g.file_name,g.pdf_url,ts_rank(gc.search_vector,websearch_to_tsquery('english',$1)) score
    FROM guide_chunks gc JOIN chatbot_guides g ON g.id=gc.guide_id WHERE g.status='APPROVED' AND g.is_active
    AND ($2::boolean OR g.condition IN($3,'GENERAL'))
    AND gc.search_vector@@websearch_to_tsquery('english',$1) ORDER BY score DESC LIMIT 5`,
      [term, isStaff(req.user!.role), condition],
    );
    const discussions = await discussionMatches(
      term,
      req.user!.id,
      req.user!.role,
    );
    const cited = chunks.rows.map((r) => ({
      id: r.guide_id,
      title: r.title,
      fileName: r.file_name,
      page: r.page,
      url: `${r.pdf_url || `/resources/${r.file_name}`}#page=${r.page}`,
    }));
    res.json({
      answer: "",
      retrievedChunks: chunks.rows.map((r) => ({
        guideTitle: r.title,
        fileName: r.file_name,
        page: r.page,
        content: r.content,
        score: Number(r.score),
      })),
      citedResources: cited,
      suggestedQuestions: [],
      isUploadedGuideSourced: cited.length > 0,
      isOffline: true,
      discussionDraft: { title: "", content: term },
      discussions: discussions.map((r) => ({
        id: r.id,
        title: r.title,
        url: `/?tab=feed&post=${r.id}`,
        replyCount: r.reply_count,
      })),
    });
  }),
);
export default router;
