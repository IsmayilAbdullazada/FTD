CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  summary TEXT NOT NULL,
  before JSONB,
  after JSONB,
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10),
  request_id TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_actor_idx ON admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
CREATE OR REPLACE FUNCTION preserve_admin_audit_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Admin audit entries are append-only'; END $$;
DROP TRIGGER IF EXISTS admin_audit_immutable ON admin_audit_log;
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE ON admin_audit_log
FOR EACH ROW EXECUTE FUNCTION preserve_admin_audit_log();
