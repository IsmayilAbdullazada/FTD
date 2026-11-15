-- Index every foreign-key column sequence lacking a usable leading index.
DO $$
DECLARE fk record; columns_sql text;
BEGIN
 FOR fk IN SELECT c.oid,c.conrelid,c.conname,c.conkey,n.nspname,t.relname
   FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
   WHERE c.contype='f' AND n.nspname='public'
 LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=fk.conrelid AND i.indisvalid AND i.indpred IS NULL
    AND ARRAY(SELECT v FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(v,ord) WHERE ord<=cardinality(fk.conkey) ORDER BY ord) = fk.conkey) THEN
   SELECT string_agg(quote_ident(a.attname),',' ORDER BY k.position) INTO columns_sql
   FROM unnest(fk.conkey) WITH ORDINALITY k(attnum,position) JOIN pg_attribute a ON a.attrelid=fk.conrelid AND a.attnum=k.attnum;
   EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)', 'fk_'||fk.oid||'_idx',fk.nspname,fk.relname,columns_sql);
  END IF;
 END LOOP;
END $$;

CREATE TABLE guide_uploads (
 storage_name TEXT PRIMARY KEY,
 uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX guide_uploads_uploader_idx ON guide_uploads(uploaded_by);
