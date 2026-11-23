import { env } from '../config/env.js';
import type { UserRow, CohortRow, ResourceRow } from '../db/rows.js';
export const currentUser = (row: UserRow) => ({
  adminConsoleEnabled:
    row.role === 'SYSTEM_ADMIN' && env.ENABLE_ADMIN_CONSOLE === 'true',
  id: row.id,
  email: row.email,
  role: row.role,
  firstName: row.first_name,
  lastName: row.last_name,
  clinicPatientId: row.clinic_patient_id ?? undefined,
  anonymousHandle: row.anonymous_handle,
  badgeLabel: row.badge_label,
  avatarColor: row.avatar_color,
  condition: row.condition ?? undefined,
});

export const persona = (row: UserRow) => ({
  id: row.id,
  name: `${row.first_name} ${row.last_name}`,
  role: row.role,
  handle: row.anonymous_handle,
  clinicId: row.clinic_patient_id ?? undefined,
  condition: row.condition ?? undefined,
});

export const cohort = (row: CohortRow & { member_count?: number }) => ({
  id: row.id,
  name: row.name,
  fullName: row.full_name ?? undefined,
  properName: row.proper_name ?? undefined,
  slug: row.slug,
  description: row.description,
  isGeneralBoard: row.is_general_board,
  geographicRegion: row.geographic_region,
  radiusMiles: row.radius_miles ?? undefined,
  tag: row.tag,
  isActive: row.is_active,
  memberCount: Number(row.member_count ?? 0),
});

export const author = (
  row: UserRow & { author_id: string },
  privileged = false,
) => ({
  userId: row.author_id,
  ...(privileged
    ? {
        realName: `${row.first_name} ${row.last_name}`,
        email: row.email,
        phoneNumber: row.phone_number,
        clinicPatientId: row.clinic_patient_id,
      }
    : {}),
  anonymousHandle: row.anonymous_handle,
  badgeLabel: row.badge_label,
  avatarColor: row.avatar_color,
});

export const resource = (row: ResourceRow) => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  contentBody: row.content_body,
  externalUrl: row.external_url ?? undefined,
  fileAttachmentUrl: row.file_attachment_url ?? undefined,
  additionalLinks: row.additional_links ?? [],
  diseaseDomain: row.disease_domain,
  category: row.category,
  keyTakeaways: row.key_takeaways ?? [],
  createdAt: row.created_at,
});
