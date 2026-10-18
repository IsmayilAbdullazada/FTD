export type UserRole = 'CARE_PARTNER' | 'CLINICIAN_MODERATOR' | 'SYSTEM_ADMIN';

export type PostStatus = 'DRAFT' | 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED' | 'CLINICAL_REDIRECT';

export type UpdateCategory = 'CLINICAL_TRIAL' | 'MEDICATION' | 'RESEARCH' | 'ANNOUNCEMENT';

export type TrialStatus = 'RECRUITING' | 'CLOSED';

export type EventType = 'CARE_PARTNER_CONFERENCE' | 'SUPPORT_GROUP' | 'SOCIAL';

export type Condition = 'FTD' | 'AD';

export type Audience = Condition | 'BOTH';

export type RejectionReason =
  | 'CLINICAL_MEDICATION_QUERY'
  | 'UNVERIFIED_TREATMENT'
  | 'FAMILY_DYNAMICS_OUT_OF_SCOPE'
  | 'INAPPROPRIATE_LANGUAGE'
  | 'POTENTIAL_PHI_EXPOSURE'
  | 'OTHER';

export interface AuthorProjection {
  userId: string;
  realName?: string;
  email?: string;
  phoneNumber?: string;
  clinicPatientId?: string;
  anonymousHandle: string;
  badgeLabel?: string;
  avatarColor: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  fullName?: string;
  properName?: string;
  slug: string;
  description: string;
  isGeneralBoard: boolean;
  geographicRegion: string;
  radiusMiles?: number;
  tag: string;
  isActive: boolean;
  memberCount: number;
}

export const REGION_PROPER_NAMES: Record<string, string> = {
  'group-central-maryland': 'Central Maryland',
  'group-eastern-maryland': 'Eastern Maryland',
  'group-western-maryland': 'Western Maryland',
  'group-southern-maryland': 'Southern Maryland / DC / Northern Virginia',
  'group-northern-maryland': 'Northern Maryland / Pennsylvania / Delaware',
  'group-general': 'General Forum',
};

export const REGION_FULL_NAMES: Record<string, string> = {
  'group-central-maryland': 'Central Maryland (Baltimore Metro)',
  'group-eastern-maryland': 'Eastern Maryland (Eastern Shore)',
  'group-western-maryland': 'Western Maryland (Frederick and surrounding areas)',
  'group-southern-maryland': 'Southern Maryland / DC / Northern Virginia',
  'group-northern-maryland': 'Northern Maryland / Pennsylvania / Delaware',
  'group-general': 'General Forum (All Regions)',
};

export function getProperGroupName(cohort?: CommunityGroup | null): string {
  if (!cohort) return 'Cohort';
  if (cohort.properName) return cohort.properName;
  if (REGION_PROPER_NAMES[cohort.id]) return REGION_PROPER_NAMES[cohort.id];
  return cohort.name.replace(/\s+Cohort$/i, '').trim();
}

export function getFullGroupName(cohort?: CommunityGroup | null): string {
  if (!cohort) return 'Group';
  if (cohort.fullName) return cohort.fullName;
  if (REGION_FULL_NAMES[cohort.id]) return REGION_FULL_NAMES[cohort.id];
  return cohort.geographicRegion || cohort.name;
}

export interface PhiAlert {
  type: 'PERSON' | 'LOCATION' | 'PHONE' | 'EMAIL' | 'MRN' | 'FINANCIAL';
  text: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  rawContent?: string;
  status: PostStatus;
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
  author: AuthorProjection;
  assignedGroups: CommunityGroup[];
  isUrgentClinical?: boolean;
  allowUnmoderatedReplies?: boolean;
  createdAt: string;
  commentCount: number;
  upvotes: number;
  phiAlerts?: PhiAlert[];
  condition?: Audience;
}

export interface Comment {
  id: string;
  postId?: string;
  content: string;
  author: AuthorProjection;
  status?: PostStatus;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  type: 'POST' | 'COMMENT';
  author: {
    userId: string;
    realName: string;
    email: string;
    phone: string;
    clinicPatientId: string;
    condition?: Condition;
    anonymousHandle: string;
    avatarColor: string;
  };
  title: string;
  rawContent: string;
  sanitizedContent: string;
  suggestedCohort: CommunityGroup;
  assignedGroupIds: string[];
  condition?: Audience;
  isUrgentClinical?: boolean;
  allowUnmoderatedReplies?: boolean;
  phiAlerts: PhiAlert[];
  createdAt: string;
}

export interface ClinicalResource {
  id: string;
  title: string;
  summary: string;
  contentBody: string;
  externalUrl?: string;
  fileAttachmentUrl?: string;
  additionalLinks?: { label: string; url: string }[];
  diseaseDomain: Audience;
  category:
    | 'INCONTINENCE'
    | 'LEGAL_MEDICAID'
    | 'BEHAVIORAL_AGITATION'
    | 'SAFETY_WANDERING'
    | 'COMMUNICATION_PPA'
    | 'NUTRITION_DIET';
  keyTakeaways: string[];
  createdAt: string;
}

export interface DeflectionMatch {
  sourceType: 'RESOURCE' | 'PAST_DISCUSSION';
  id?: string;
  title: string;
  category?: string;
  snippet: string;
  url?: string;
  postId?: string;
  confidenceScore: number;
}

export interface ModerationAuditEvent {
  id: string;
  moderatorId: string;
  moderatorName: string;
  entityType: 'POST' | 'COMMENT' | 'USER' | 'COHORT';
  entityId: string;
  actionTaken: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: 'APPROVAL' | 'REJECTION' | 'CLINICAL_ESCALATION' | 'DIRECT_CHAT';
  createdAt: string;
  read: boolean;
}

export interface PrivateConversationMessage {
  id: string;
  conversationId: string; // e.g. "chat-user-care-1"
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface GroupMember {
  userId: string;
  realName: string;
  email: string;
  phone?: string;
  clinicPatientId?: string;
  condition?: Condition;
  anonymousHandle: string;
  primaryGroupId: string;
  primaryGroupName: string;
  role: UserRole;
  status: 'ACTIVE' | 'PENDING' | 'MUTED';
  joinedAt: string;
  condition?: Condition;
}


export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  clinicPatientId?: string;
  anonymousHandle: string;
  badgeLabel: string;
  avatarColor: string;
  condition?: Condition;
}

export interface PersonaOption {
  id: string;
  name: string;
  role: UserRole;
  handle: string;
  clinicId?: string;
  condition?: Condition;
}

export interface ClinicUpdate {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: UpdateCategory;
  condition: Audience;
  trialStatus?: TrialStatus;
  externalUrl?: string;
  authorId: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: string; // 'YYYY-MM-DDTHH:mm'
  location: string;
  description?: string;
  authorId: string;
  condition?: Audience;
}

export interface ChatbotGuideFile {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  content: string;
  sectionCount?: number;
  wordCount?: number;
  isActive: boolean;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatbotKnowledgeSourceMode = 'UPLOADED_GUIDES_ONLY' | 'HYBRID' | 'MOCK_FAQS_ONLY';

export interface ChatbotKnowledgeConfig {
  sourceMode: ChatbotKnowledgeSourceMode;
  totalActiveGuides: number;
  totalWords: number;
}

export interface ChatbotGuideTestResult {
  query: string;
  answer: string;
  sourceMode: ChatbotKnowledgeSourceMode;
  matchedGuide?: {
    id: string;
    title: string;
    fileName: string;
    sectionTitle: string;
    matchScore: number;
    snippet: string;
  };
  allMatchedSections: {
    guideTitle: string;
    sectionTitle: string;
    matchScore: number;
    snippet: string;
  }[];
  usedMockFaq: boolean;
}

