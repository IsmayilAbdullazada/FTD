import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archiveLegacyFoundation = `
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='full_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='first_name') THEN
    ALTER TABLE users RENAME TO legacy_users;
    IF to_regclass('public.cohort_members') IS NOT NULL THEN ALTER TABLE cohort_members RENAME TO legacy_cohort_members; END IF;
    IF to_regclass('public.cohorts') IS NOT NULL THEN ALTER TABLE cohorts RENAME TO legacy_cohorts; END IF;
    IF to_regclass('public.post_replies') IS NOT NULL THEN ALTER TABLE post_replies RENAME TO legacy_post_replies; END IF;
    IF to_regclass('public.posts') IS NOT NULL THEN ALTER TABLE posts RENAME TO legacy_posts; END IF;
    IF to_regclass('public.private_messages') IS NOT NULL THEN ALTER TABLE private_messages RENAME TO legacy_private_messages; END IF;
    IF to_regclass('public.private_conversations') IS NOT NULL THEN ALTER TABLE private_conversations RENAME TO legacy_private_conversations; END IF;
    IF to_regclass('public.resources') IS NOT NULL THEN ALTER TABLE resources RENAME TO legacy_resources; END IF;
  END IF;
END $$;
`;

const importLegacyFoundation = `
DO $$ BEGIN
  IF to_regclass('public.legacy_users') IS NULL OR EXISTS(SELECT 1 FROM schema_migrations WHERE version='001_import_legacy_foundation') THEN RETURN; END IF;

  INSERT INTO users(id,email,password_hash,role,first_name,last_name,anonymous_handle,avatar_color,badge_label,is_active,created_at,updated_at)
  SELECT id::text,email,password_hash,
    CASE role WHEN 'clinician' THEN 'CLINICIAN_MODERATOR' WHEN 'admin' THEN 'SYSTEM_ADMIN' ELSE 'CARE_PARTNER' END,
    split_part(full_name,' ',1),COALESCE(NULLIF(substring(full_name from position(' ' in full_name)+1),''),'User'),
    full_name,COALESCE(NULLIF(avatar_url,''),'#475569'),
    CASE role WHEN 'clinician' THEN 'Clinician Moderator' WHEN 'admin' THEN 'System Administrator' ELSE 'Care Partner' END,
    true,created_at,updated_at FROM legacy_users ON CONFLICT(id) DO NOTHING;

  IF to_regclass('public.legacy_cohorts') IS NOT NULL THEN
    INSERT INTO cohorts(id,name,slug,description,is_general_board,geographic_region,tag,created_at)
    SELECT id::text,name,'legacy-'||id::text,COALESCE(description,''),false,COALESCE(region,'Unspecified'),'LEGACY',created_at
    FROM legacy_cohorts ON CONFLICT(id) DO NOTHING;
  END IF;
  IF to_regclass('public.legacy_cohort_members') IS NOT NULL THEN
    INSERT INTO cohort_members(cohort_id,user_id,is_primary,joined_at)
    SELECT cohort_id::text,user_id::text,row_number() OVER(PARTITION BY user_id ORDER BY joined_at)=1,joined_at
    FROM legacy_cohort_members ON CONFLICT(cohort_id,user_id) DO NOTHING;
  END IF;
  IF to_regclass('public.legacy_posts') IS NOT NULL THEN
    INSERT INTO posts(id,author_id,title,raw_content,sanitized_content,status,condition,created_at,updated_at)
    SELECT id::text,author_id::text,title,content,content,'APPROVED','FTD',created_at,updated_at FROM legacy_posts ON CONFLICT(id) DO NOTHING;
    INSERT INTO post_groups(post_id,cohort_id)
    SELECT id::text,cohort_id::text FROM legacy_posts WHERE cohort_id IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;
  IF to_regclass('public.legacy_post_replies') IS NOT NULL THEN
    INSERT INTO comments(id,post_id,author_id,raw_content,sanitized_content,status,created_at,updated_at)
    SELECT id::text,post_id::text,author_id::text,content,content,'APPROVED',created_at,created_at FROM legacy_post_replies ON CONFLICT(id) DO NOTHING;
  END IF;
  IF to_regclass('public.legacy_resources') IS NOT NULL THEN
    INSERT INTO resources(id,title,summary,content_body,external_url,disease_domain,category,created_at)
    SELECT id::text,title,summary,COALESCE(content,summary),file_or_external_url,'FTD',category,created_at FROM legacy_resources ON CONFLICT(id) DO NOTHING;
  END IF;
  IF to_regclass('public.legacy_private_messages') IS NOT NULL AND to_regclass('public.legacy_private_conversations') IS NOT NULL THEN
    INSERT INTO private_messages(id,conversation_id,sender_id,recipient_id,content,read_at,created_at)
    SELECT m.id::text,m.conversation_id::text,m.sender_id::text,
      CASE WHEN m.sender_id=c.care_partner_id THEN c.clinician_id::text ELSE c.care_partner_id::text END,
      m.body,m.read_at,m.created_at FROM legacy_private_messages m JOIN legacy_private_conversations c ON c.id=m.conversation_id
    ON CONFLICT(id) DO NOTHING;
  END IF;
  INSERT INTO schema_migrations(version) VALUES('001_import_legacy_foundation');
END $$;
`;

async function runMigration() {
  const sqlPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log(
    "[Migration] Running database schema migration for PostgreSQL 16...",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(archiveLegacyFoundation);
    await client.query(sql);
    await client.query(importLegacyFoundation);
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES('002_postgres_api') ON CONFLICT DO NOTHING",
    );
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES('003_content_safety') ON CONFLICT DO NOTHING",
    );
    await client.query("COMMIT");
    console.log("[Migration] Schema applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Migration Error]", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
