export type UserRole = 'CARE_PARTNER' | 'CLINICIAN_MODERATOR' | 'SYSTEM_ADMIN';

const STAFF_ROLES = new Set<UserRole>(['CLINICIAN_MODERATOR', 'SYSTEM_ADMIN']);

export function isStaffRole(
  role: string,
): role is Exclude<UserRole, 'CARE_PARTNER'> {
  return STAFF_ROLES.has(role as UserRole);
}
