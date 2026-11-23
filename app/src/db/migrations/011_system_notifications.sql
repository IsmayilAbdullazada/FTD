ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('APPROVAL','REJECTION','CLINICAL_ESCALATION','DIRECT_CHAT','MODERATION','ACTIVITY','SECURITY','SYSTEM'));
UPDATE notifications n SET read_at=NOW() FROM users u
WHERE n.recipient_user_id=u.id AND u.role='SYSTEM_ADMIN' AND n.type='MODERATION' AND n.read_at IS NULL;
