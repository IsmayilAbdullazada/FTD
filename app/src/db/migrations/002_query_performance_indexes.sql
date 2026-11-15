CREATE INDEX IF NOT EXISTS posts_search_idx
  ON posts USING GIN (to_tsvector('english', title || ' ' || sanitized_content));

CREATE INDEX IF NOT EXISTS resources_search_idx
  ON resources USING GIN (to_tsvector('english', title || ' ' || summary || ' ' || content_body));

CREATE INDEX IF NOT EXISTS cohort_members_user_idx
  ON cohort_members(user_id);

CREATE INDEX IF NOT EXISTS private_messages_participants_idx
  ON private_messages(sender_id, recipient_id);
