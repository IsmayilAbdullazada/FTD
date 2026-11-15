-- Correct migration 003 without changing its recorded checksum. pgcrypto on
-- supported PostgreSQL releases expects the $2a$ bcrypt identifier. bcryptjs
-- emits $2b$; normalize the stored hash both as the salt and comparison value.
UPDATE users
SET password_hash = crypt(gen_random_uuid()::text, gen_salt('bf', 12)),
    session_version = session_version + 1,
    updated_at = NOW()
WHERE replace(password_hash, '$2b$', '$2a$') =
      crypt('Hopkins2026!', replace(password_hash, '$2b$', '$2a$'));
