export interface GuidePage {
  pageNumber: number;
  text: string;
}
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  clinic_patient_id: string;
  condition: string;
  anonymous_handle: string;
  avatar_color: string;
  badge_label: string;
  is_active: boolean;
  session_version: number;
  created_at: string;
  updated_at: string;
}
export interface CohortRow {
  id: string;
  name: string;
  full_name: string;
  proper_name: string;
  slug: string;
  description: string;
  is_general_board: boolean;
  geographic_region: string;
  radius_miles: number;
  tag: string;
  is_active: boolean;
  created_at: string;
}
export interface ResourceRow {
  id: string;
  title: string;
  summary: string;
  content_body: string;
  external_url: string;
  file_attachment_url: string;
  additional_links: unknown[];
  disease_domain: string;
  category: string;
  key_takeaways: unknown[];
  created_by: string;
  created_at: string;
}
export interface PostRow {
  id: string;
  author_id: string;
  title: string;
  raw_content: string;
  sanitized_content: string;
  status: string;
  condition: string;
  is_urgent_clinical: boolean;
  phi_alerts: unknown[];
  allow_unmoderated_replies: boolean;
  is_closed: boolean;
  closed_at: string;
  closed_by: string;
  moderated_by: string;
  moderated_at: string;
  rejection_code: string;
  rejection_message: string;
  created_at: string;
  updated_at: string;
}
export interface CommentRow {
  id: string;
  post_id: string;
  parent_comment_id: string;
  author_id: string;
  raw_content: string;
  sanitized_content: string;
  status: string;
  moderated_by: string;
  moderated_at: string;
  rejection_code: string;
  rejection_message: string;
  phi_alerts: unknown[];
  created_at: string;
  updated_at: string;
}
export interface GuideRow {
  id: string;
  title: string;
  condition: string;
  topic_tag: string;
  publisher: string;
  publication_year: string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  category: string;
  description: string;
  content: string;
  pages: GuidePage[];
  total_chunks: number;
  status: string;
  approved_at: string;
  approved_by: string;
  pdf_url: string;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string;
  created_at: string;
}
export interface NoteRow {
  id: string;
  post_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}
