-- Public tags are stored separately from internal user IDs and never encode condition.
CREATE FUNCTION public.allocate_anonymous_handle() RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE selected_handle TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ftdcare_anonymous_handle_allocation'));
  SELECT 'User-' || candidate::text INTO selected_handle
  FROM generate_series(100,999) candidate
  WHERE NOT EXISTS(SELECT 1 FROM public.users WHERE anonymous_handle='User-' || candidate::text)
  ORDER BY random() LIMIT 1;
  IF selected_handle IS NULL THEN
    RAISE EXCEPTION 'The short public user-tag namespace is full' USING ERRCODE='P1001';
  END IF;
  RETURN selected_handle;
END $$;

-- Keep existing valid tags, including their associations with historical posts.
DO $$
DECLARE account RECORD;
BEGIN
  FOR account IN SELECT id FROM users
    WHERE (role='CARE_PARTNER' OR anonymous_handle LIKE 'User-%'
      OR anonymous_handle ~* '(^|[^[:alnum:]])(FTD|AD|ALZHEIMERS?|DEMENTIA)([^[:alnum:]]|$)')
      AND anonymous_handle !~ '^User-[0-9]{3}$'
    ORDER BY created_at,id
  LOOP
    UPDATE users SET anonymous_handle=public.allocate_anonymous_handle() WHERE id=account.id;
  END LOOP;
END $$;

ALTER TABLE users ALTER COLUMN anonymous_handle SET DEFAULT public.allocate_anonymous_handle();
ALTER TABLE users ADD CONSTRAINT users_care_partner_tag_format
  CHECK (role<>'CARE_PARTNER' OR anonymous_handle ~ '^User-[0-9]{3}$');
-- users_anonymous_handle_unique (migration 003) enforces global tag uniqueness.
