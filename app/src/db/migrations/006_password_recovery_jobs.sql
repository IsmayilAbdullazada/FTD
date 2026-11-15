CREATE TABLE password_recovery_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
CREATE INDEX password_recovery_jobs_pending_idx ON password_recovery_jobs(next_attempt_at) WHERE completed_at IS NULL;
