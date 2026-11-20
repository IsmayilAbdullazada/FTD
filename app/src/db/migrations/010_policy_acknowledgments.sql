CREATE TABLE IF NOT EXISTS policy_acknowledgments (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    policy_type TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT policy_acknowledgments_unique
        UNIQUE (user_id, policy_type, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_policy_acknowledgments_user
    ON policy_acknowledgments(user_id);