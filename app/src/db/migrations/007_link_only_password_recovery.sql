-- Do not convert previously issued link-and-code credentials into link-only access.
-- Users with an outstanding old reset must request a new link after deployment.
DELETE FROM password_resets WHERE consumed_at IS NULL;
ALTER TABLE password_resets DROP COLUMN code_hash;
