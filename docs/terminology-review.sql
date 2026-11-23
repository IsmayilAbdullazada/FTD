-- Read-only report for staff-authored content. Run only with approved database access.
-- Review each result in context; do not bulk-replace clinical or user-authored prose.
SELECT 'resources' AS source,COUNT(*) FROM resources
 WHERE (title||' '||summary||' '||content_body||' '||category) ILIKE '%caregiv%'
UNION ALL SELECT 'clinic_updates',COUNT(*) FROM clinic_updates
 WHERE (title||' '||summary||' '||body) ILIKE '%caregiv%'
UNION ALL SELECT 'calendar_events',COUNT(*) FROM calendar_events
 WHERE (title||' '||COALESCE(description,'')) ILIKE '%caregiv%'
UNION ALL SELECT 'cohorts',COUNT(*) FROM cohorts
 WHERE (name||' '||description) ILIKE '%caregiv%'
UNION ALL SELECT 'app_settings',COUNT(*) FROM app_settings WHERE value::text ILIKE '%caregiv%';

-- Suggested edit procedure, intentionally not executable:
-- 1. Inspect the matching row and establish whether it is system copy or a source quotation.
-- 2. Write a natural care partner replacement, preserving the clinical meaning.
-- 3. Review the exact id and original value with the content owner.
-- 4. Apply one exact-id/exact-original-value change through the audited CS Admin console.
-- Never alter posts, comments, private messages or uploaded PDF text as part of this sweep.
