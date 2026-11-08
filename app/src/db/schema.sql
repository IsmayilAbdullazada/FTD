CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CARE_PARTNER', 'CLINICIAN_MODERATOR', 'SYSTEM_ADMIN')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  clinic_patient_id TEXT,
  condition TEXT CHECK (condition IN ('FTD', 'AD')),
  anonymous_handle TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#475569',
  badge_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_clinic_patient_id_unique ON users (clinic_patient_id) WHERE clinic_patient_id IS NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT,
  proper_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_general_board BOOLEAN NOT NULL DEFAULT FALSE,
  geographic_region TEXT NOT NULL,
  radius_miles INTEGER,
  tag TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'MUTED')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cohort_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_cohort_per_user ON cohort_members(user_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT ('post-' || gen_random_uuid()::text),
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  sanitized_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_MODERATION' CHECK (status IN ('DRAFT','PENDING_MODERATION','APPROVED','REJECTED','CLINICAL_REDIRECT')),
  condition TEXT NOT NULL DEFAULT 'FTD' CHECK (condition IN ('FTD','AD','BOTH')),
  is_urgent_clinical BOOLEAN NOT NULL DEFAULT FALSE,
  phi_alerts JSONB NOT NULL DEFAULT '[]',
  allow_unmoderated_replies BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  closed_by TEXT REFERENCES users(id),
  moderated_by TEXT REFERENCES users(id),
  moderated_at TIMESTAMPTZ,
  rejection_code TEXT,
  rejection_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_status_created_idx ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id);

CREATE TABLE IF NOT EXISTS post_groups (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, cohort_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT ('comm-' || gen_random_uuid()::text),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id TEXT REFERENCES comments(id) ON DELETE SET NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  raw_content TEXT NOT NULL,
  sanitized_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_MODERATION' CHECK (status IN ('PENDING_MODERATION','APPROVED','REJECTED','CLINICAL_REDIRECT')),
  moderated_by TEXT REFERENCES users(id),
  moderated_at TIMESTAMPTZ,
  rejection_code TEXT,
  rejection_message TEXT,
  phi_alerts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_post_created_idx ON comments(post_id, created_at);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS phi_alerts JSONB NOT NULL DEFAULT '[]';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS phi_alerts JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS post_upvotes (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS moderator_private_notes (
  id TEXT PRIMARY KEY DEFAULT ('note-' || gen_random_uuid()::text),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT ('res-' || gen_random_uuid()::text),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content_body TEXT NOT NULL,
  external_url TEXT,
  file_attachment_url TEXT,
  additional_links JSONB NOT NULL DEFAULT '[]',
  disease_domain TEXT NOT NULL DEFAULT 'FTD' CHECK (disease_domain IN ('FTD','AD','BOTH')),
  category TEXT NOT NULL,
  key_takeaways JSONB NOT NULL DEFAULT '[]',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_updates (
  id TEXT PRIMARY KEY DEFAULT ('upd-' || gen_random_uuid()::text),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('CLINICAL_TRIAL','MEDICATION','RESEARCH','ANNOUNCEMENT')),
  condition TEXT NOT NULL CHECK (condition IN ('FTD','AD','BOTH')),
  trial_status TEXT CHECK (trial_status IN ('RECRUITING','CLOSED')),
  external_url TEXT,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY DEFAULT ('evt-' || gen_random_uuid()::text),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CARE_PARTNER_CONFERENCE','SUPPORT_GROUP','SOCIAL')),
  starts_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  condition TEXT CHECK (condition IN ('FTD','AD','BOTH')),
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT ('notification-' || gen_random_uuid()::text),
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('APPROVAL','REJECTION','CLINICAL_ESCALATION','DIRECT_CHAT')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS private_messages (
  id TEXT PRIMARY KEY DEFAULT ('chat-msg-' || gen_random_uuid()::text),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS private_messages_conversation_idx ON private_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY DEFAULT ('inv-' || gen_random_uuid()::text),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  clinic_patient_id TEXT,
  primary_cohort_slug TEXT NOT NULL REFERENCES cohorts(slug),
  condition TEXT NOT NULL CHECK (condition IN ('FTD','AD')),
  status TEXT NOT NULL DEFAULT 'DISPATCHED' CHECK (status IN ('DISPATCHED','ACCEPTED','EXPIRED','REVOKED')),
  issued_by TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY DEFAULT ('email-' || gen_random_uuid()::text),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  preview_token_hash TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('QUEUED','SENT','FAILED')),
  delivery_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_audit (
  id TEXT PRIMARY KEY DEFAULT ('audit-' || gen_random_uuid()::text),
  moderator_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot_guides (
  id TEXT PRIMARY KEY DEFAULT ('guide-' || gen_random_uuid()::text),
  title TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('FTD','AD','GENERAL')),
  topic_tag TEXT,
  publisher TEXT,
  publication_year TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  category TEXT,
  description TEXT,
  content TEXT NOT NULL,
  pages JSONB NOT NULL DEFAULT '[]',
  total_chunks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED')),
  approved_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id),
  pdf_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_chunks (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL REFERENCES chatbot_guides(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  content TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);
CREATE INDEX IF NOT EXISTS guide_chunks_search_idx ON guide_chunks USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO app_settings(key, value) VALUES ('seed_mode', '"clean"') ON CONFLICT (key) DO NOTHING;
