ALTER TABLE notifications
  ADD COLUMN event_key TEXT,
  ADD COLUMN kind TEXT,
  ADD COLUMN context JSONB NOT NULL DEFAULT '{}';
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('APPROVAL','REJECTION','CLINICAL_ESCALATION','DIRECT_CHAT','MODERATION','ACTIVITY','SECURITY'));
CREATE UNIQUE INDEX notifications_event_recipient_unique
  ON notifications(event_key,recipient_user_id) WHERE event_key IS NOT NULL;

-- Jobs store only notification references, never message bodies or credentials.
CREATE TABLE notification_email_jobs (
  notification_id TEXT PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notification_email_jobs_pending_idx ON notification_email_jobs(next_attempt_at)
  WHERE completed_at IS NULL AND skipped_at IS NULL;
