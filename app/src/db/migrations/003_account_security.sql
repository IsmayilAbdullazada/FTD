-- Disable credentials created by the former public demo seed and revoke sessions.
UPDATE users SET password_hash=crypt(gen_random_uuid()::text,gen_salt('bf',12)),
  session_version=session_version+1
WHERE password_hash=crypt('Hopkins2026!',password_hash);

-- Preserve the first handle; disambiguate historical duplicates before enforcing uniqueness.
WITH duplicates AS (
 SELECT id,row_number() OVER(PARTITION BY anonymous_handle ORDER BY created_at,id) position FROM users
)
UPDATE users SET anonymous_handle=anonymous_handle||'-'||users.id
FROM duplicates WHERE users.id=duplicates.id AND duplicates.position>1;
CREATE UNIQUE INDEX users_anonymous_handle_unique ON users(anonymous_handle);
UPDATE email_outbox SET text_body='[Content removed]',html_body='[Content removed]',delivery_error=NULL;
