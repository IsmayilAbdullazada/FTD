import { query } from '../../config/db.js';
import { resource } from '../../lib/serializers.js';
import type { GuideRow } from '../../db/rows.js';
import type { AuthenticatedUser } from '../../middleware/auth.js';
import { isStaffRole } from '../../lib/roles.js';

function summary(text: string) {
  if (text.length <= 240) return text;
  const excerpt = text.slice(0, 241);
  return excerpt.slice(
    0,
    excerpt.lastIndexOf(' ') > 0 ? excerpt.lastIndexOf(' ') : 240,
  );
}
export async function listLibrary(user: AuthenticatedUser) {
  const staff = isStaffRole(user.role);
  const condition = staff
    ? null
    : (await query('SELECT condition FROM users WHERE id=$1', [user.id]))
        .rows[0]?.condition;
  const [resources, guides] = await Promise.all([
    query(
      `SELECT r.* FROM resources r WHERE ($1::boolean OR r.disease_domain IN ($2,'BOTH'))
      AND NOT EXISTS(SELECT 1 FROM chatbot_guides g WHERE g.pdf_url=r.file_attachment_url AND g.status='APPROVED')`,
      [staff, condition],
    ),
    query(
      `SELECT * FROM chatbot_guides WHERE $1::boolean OR (status='APPROVED' AND is_active AND condition IN ($2,'GENERAL'))`,
      [staff, condition],
    ),
  ]);
  return [
    ...resources.rows.map((row) => ({
      ...resource(row as Parameters<typeof resource>[0]),
      source: 'resource' as const,
      ...(staff ? { status: 'APPROVED', isActive: true } : {}),
    })),
    ...(guides.rows as GuideRow[]).map((g) => ({
      id: g.id,
      title: g.title,
      summary: g.description || summary(g.content),
      contentBody: g.pdf_url ? g.description || '' : g.content,
      fileAttachmentUrl: g.pdf_url,
      externalUrl: null,
      additionalLinks: [],
      keyTakeaways: [],
      diseaseDomain: g.condition === 'GENERAL' ? 'BOTH' : g.condition,
      category: g.category || g.topic_tag || 'GUIDE',
      createdBy: g.uploaded_by,
      createdAt: g.approved_at || g.created_at,
      source: 'guide' as const,
      ...(staff ? { status: g.status, isActive: g.is_active } : {}),
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
