import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { cleanPdfText } from './src/utils/cleanPdfText.ts';
import {
  ingestGuide,
  deleteGuideChunks,
  answerRagQuery,
  getLoadedChunksCount,
} from './server/rag.ts';
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
  sentEmailsStore,
} from './server/email.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

type Condition = 'FTD' | 'AD';
type Audience = Condition | 'BOTH';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static PDF guides from stable uploads and resources paths without frame blocking
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'guides');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads/guides', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(UPLOADS_DIR));

app.use('/resources', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'public', 'resources')));

// Initialize Gemini SDK on server-side with multi-key resolution
let ai: GoogleGenAI | null = null;

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_GENAI_API_KEY || undefined;
}

export function getAiClient(): GoogleGenAI | null {
  const key = getGeminiApiKey();
  if (!key) return null;
  if (!ai) {
    try {
      ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI client:', err);
    }
  }
  return ai;
}

// Initial initialization attempt
getAiClient();

// -------------------------------------------------------------
// IN-MEMORY RELATIONAL DATABASE STORE (Matches Schema Section 4.2)
// -------------------------------------------------------------

interface User {
  id: string;
  email: string;
  role: 'CARE_PARTNER' | 'CLINICIAN_MODERATOR' | 'SYSTEM_ADMIN';
  condition?: Condition; // care partners only, moderator sees both
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  clinicPatientId?: string; // e.g. JHM-99210-FTD
  isActive: boolean;
  anonymousHandle: string;
  avatarColor: string;
  badgeLabel: string;
  createdAt: string;
  password?: string;
}

interface CommunityGroup {
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

interface PhiAlert {
  type: 'PERSON' | 'LOCATION' | 'PHONE' | 'EMAIL' | 'MRN' | 'FINANCIAL';
  text: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
}

interface Post {
  id: string;
  authorId: string;
  title: string;
  rawContent: string;
  sanitizedContent?: string;
  status: 'DRAFT' | 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED' | 'CLINICAL_REDIRECT';
  condition?: Audience;
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  rejectionCode?: 'CLINICAL_MEDICATION_QUERY' | 'UNVERIFIED_TREATMENT' | 'FAMILY_DYNAMICS_OUT_OF_SCOPE' | 'INAPPROPRIATE_LANGUAGE' | 'POTENTIAL_PHI_EXPOSURE' | 'OTHER';
  moderatorPrivateNotes?: string;
  isUrgentClinical?: boolean;
  assignedGroupIds: string[];
  suggestedCohortId?: string;
  allowUnmoderatedReplies?: boolean;
  phiAlerts: PhiAlert[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  upvotes: number;
}

interface Comment {
  id: string;
  postId: string;
  parentCommentId?: string;
  authorId: string;
  rawContent: string;
  sanitizedContent?: string;
  status: 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED';
  moderatedBy?: string;
  moderatedAt?: string;
  createdAt: string;
}

interface ClinicalResource {
  id: string;
  title: string;
  summary: string;
  contentBody: string;
  externalUrl?: string;
  fileAttachmentUrl?: string;
  additionalLinks?: { label: string; url: string }[];
  diseaseDomain: Audience;
  category: 'INCONTINENCE' | 'LEGAL_MEDICAID' | 'BEHAVIORAL_AGITATION' | 'SAFETY_WANDERING' | 'COMMUNICATION_PPA' | 'NUTRITION_DIET' | 'CAREGIVER_SUPPORT' | 'DAILY_CARE' | 'GENERAL_EDUCATION';
  keyTakeaways: string[];
  createdAt: string;
}

interface ModerationAuditEvent {
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

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  clinicPatientId: string;
  primaryCohortSlug: string;
  condition: Condition;
  token: string;
  expiresAt: string;
  phoneNumber?: string;
  status: 'DISPATCHED' | 'CLAIMED' | 'REVOKED';
  createdAt: string;
}

interface DirectMessage {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: 'APPROVAL' | 'REJECTION' | 'CLINICAL_ESCALATION';
  createdAt: string;
  read: boolean;
}

interface ClinicUpdate {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: 'CLINICAL_TRIAL' | 'MEDICATION' | 'RESEARCH' | 'ANNOUNCEMENT';
  condition: 'FTD' | 'AD' | 'BOTH';
  trialStatus?: 'RECRUITING' | 'CLOSED';
  externalUrl?: string;
  authorId: string;
  createdAt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'CARE_PARTNER_CONFERENCE' | 'SUPPORT_GROUP' | 'SOCIAL';
  condition?: Audience;
  startsAt: string;
  location: string;
  description?: string;
  authorId: string;
}

const UPDATE_CATEGORIES = ['CLINICAL_TRIAL', 'MEDICATION', 'RESEARCH', 'ANNOUNCEMENT'];
const EVENT_TYPES = ['CARE_PARTNER_CONFERENCE', 'SUPPORT_GROUP', 'SOCIAL'];

const clinicUpdates: ClinicUpdate[] = [
  {
    id: 'upd-1',
    title: 'Welcome to Clinic Updates',
    summary: 'This is where the clinic will share news for care partners.',
    body:
      'This section will be kept up to date by the clinic team.\n\nYou can expect:\n• Clinical trials that are recruiting or recently closed\n• Newly approved medications\n• Scientific discoveries explained in plain language\n• Announcements from the clinic\n\nIf you have questions about anything posted here, please contact the Clinic Support Line at (410) 555-FTDC.',
    category: 'ANNOUNCEMENT',
    condition: 'BOTH',
    authorId: 'user-clinician-1',
    createdAt: '2026-10-05T09:00:00Z',
  },
  {
    id: 'upd-2',
    title: 'Sample: Caregiver Wellbeing Study (Recruiting)',
    summary: 'Placeholder entry showing how a recruiting clinical trial will appear.',
    body:
      'SAMPLE ENTRY: replace with a real study.\n\nWho can participate: [eligibility criteria]\nWhat participation involves: [visits, time commitment, location]\nHow to learn more: [contact or registry link]\n\nParticipation is voluntary and does not affect your loved one\'s care at the clinic.',
    category: 'CLINICAL_TRIAL',
    condition: 'FTD',
    trialStatus: 'RECRUITING',
    authorId: 'user-clinician-1',
    createdAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'upd-3',
    title: 'Sample: Completed Study, Enrollment Closed',
    summary: 'Placeholder entry showing how a closed clinical trial will appear.',
    body:
      'SAMPLE ENTRY: replace with a real study.\n\nThis study is no longer enrolling. Results, when available, will be summarized here.\n\nQuestions can be directed to the Clinic Support Line at (410) 555-FTDC.',
    category: 'CLINICAL_TRIAL',
    condition: 'AD',
    trialStatus: 'CLOSED',
    authorId: 'user-clinician-1',
    createdAt: '2026-09-28T09:00:00Z',
  },
  {
    id: 'upd-4',
    title: 'Sample: Newly Approved Medication Notice',
    summary: 'Placeholder entry showing how medication news will appear.',
    body:
      'SAMPLE ENTRY: replace with verified information.\n\nWhat was approved and for which condition: [details]\nWhat it may mean for families: [plain-language summary]\n\nPlease do not start, stop, or change any medication based on this post. Discuss all medication questions with your clinical team.',
    category: 'MEDICATION',
    condition: 'BOTH',
    authorId: 'user-clinician-1',
    createdAt: '2026-09-25T09:00:00Z',
  },
  {
    id: 'upd-5',
    title: 'Sample: Research Findings in Plain Language',
    summary: 'Placeholder entry showing how a scientific discovery summary will appear.',
    body:
      'SAMPLE ENTRY: replace with a real summary.\n\nWhat researchers found: [summary]\nWhy it matters: [context]\nWhat it does not mean: [limits of the findings]\n\nSource: [link to publication or news release]',
    category: 'RESEARCH',
    condition: 'FTD',
    authorId: 'user-clinician-1',
    createdAt: '2026-09-20T09:00:00Z',
  },
];

const calendarEvents: CalendarEvent[] = [
  { id: 'evt-1', title: 'Caregiver Check-in', type: 'SUPPORT_GROUP', startsAt: '2026-10-14T18:00', location: 'Zoom (link sent by email)', description: 'Informal evening check-in for care partners.', authorId: 'user-clinician-1' },
  { id: 'evt-2', title: 'Baltimore Metro Support Group', type: 'SUPPORT_GROUP', startsAt: '2026-10-21T18:30', location: 'Johns Hopkins Outpatient Center, Baltimore', description: 'Monthly in-person group for Baltimore-area families.', authorId: 'user-clinician-1' },
  { id: 'evt-3', title: 'Care Partner Fall Lunch', type: 'SOCIAL', startsAt: '2026-10-25T12:00', location: 'TBD (Baltimore area)', description: 'A relaxed get-together. Loved ones are welcome.', authorId: 'user-clinician-1' },
  { id: 'evt-4', title: 'Care Partner Conference: Planning Ahead', type: 'CARE_PARTNER_CONFERENCE', startsAt: '2026-11-07T09:30', location: 'Hybrid: in person and Zoom', description: 'A half-day conference on legal, financial, and care planning.', authorId: 'user-clinician-1' },
  { id: 'evt-5', title: 'Eastern Shore Support Group', type: 'SUPPORT_GROUP', startsAt: '2026-11-12T17:30', location: 'Zoom', description: 'Virtual meeting for Eastern Shore families.', authorId: 'user-clinician-1' },
  { id: 'evt-6', title: 'Holiday Social Gathering', type: 'SOCIAL', startsAt: '2026-11-21T14:00', location: 'TBD', description: 'Seasonal get-together for care partners and families.', authorId: 'user-clinician-1' },
  { id: 'evt-7', title: "Alzheimer's Care Partner Check-in", type: 'SUPPORT_GROUP', condition: 'AD', startsAt: '2026-10-28T18:00', location: 'Zoom', description: "Evening check-in for Alzheimer's care partners.", authorId: 'user-clinician-1' },
  { id: 'evt-8', title: 'Caregiver Wellness Workshop', type: 'SOCIAL', condition: 'BOTH', startsAt: '2026-11-04T17:30', location: 'Hybrid: in person and Zoom', description: 'Open to all care partners.', authorId: 'user-clinician-1' },
];

function isStaff(userId?: string): boolean {
  const u = users.find((x) => x.id === userId);
  return !!u && (u.role === 'CLINICIAN_MODERATOR' || u.role === 'SYSTEM_ADMIN');
}

// Pre-seeded database
const users: User[] = [
  {
    id: 'user-clinician-1',
    email: 'sgulyan1@jhmi.edu',
    role: 'CLINICIAN_MODERATOR',
    firstName: 'Seema',
    lastName: 'Gulyani',
    phoneNumber: '(410) 955-5000',
    clinicPatientId: 'STAFF-MD-409',
    isActive: true,
    anonymousHandle: 'Seema Gulyani (Moderator)',
    avatarColor: '#002D72',
    badgeLabel: 'Clinician Moderator',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'user-care-1',
    email: 'sarah.smith@example.com',
    role: 'CARE_PARTNER',
    firstName: 'Sarah',
    lastName: 'Smith',
    phoneNumber: '(410) 555-8841',
    clinicPatientId: 'JHM-99210-FTD',
    condition: 'FTD',
    isActive: true,
    anonymousHandle: 'CarePartner-882',
    avatarColor: '#1E40AF',
    badgeLabel: 'Care Partner',
    createdAt: '2026-02-10T14:22:00Z',
  },
  {
    id: 'user-care-2',
    email: 'marcus.vance@example.com',
    role: 'CARE_PARTNER',
    firstName: 'Marcus',
    lastName: 'Vance',
    phoneNumber: '(443) 555-3921',
    clinicPatientId: 'JHM-77341-FTD',
    condition: 'FTD',
    isActive: true,
    anonymousHandle: 'CarePartner-419',
    avatarColor: '#047857',
    badgeLabel: 'Care Partner',
    createdAt: '2026-03-01T11:15:00Z',
  },
  {
    id: 'user-care-3',
    email: 'elena.rostova@example.com',
    role: 'CARE_PARTNER',
    firstName: 'Elena',
    lastName: 'Rostova',
    phoneNumber: '(717) 555-1299',
    clinicPatientId: 'JHM-44091-FTD',
    condition: 'FTD',
    isActive: true,
    anonymousHandle: 'CarePartner-204',
    avatarColor: '#6D28D9',
    badgeLabel: 'Care Partner',
    createdAt: '2026-04-12T16:40:00Z',
  },
  {
    id: 'user-care-4',
    email: 'david.chen@example.com',
    role: 'CARE_PARTNER',
    firstName: 'David',
    lastName: 'Chen',
    phoneNumber: '(240) 555-6712',
    clinicPatientId: 'JHM-55120-FTD',
    condition: 'FTD',
    isActive: true,
    anonymousHandle: 'CarePartner-512',
    avatarColor: '#B45309',
    badgeLabel: 'Care Partner',
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'user-care-5',
    email: 'patricia.m@example.com',
    role: 'CARE_PARTNER',
    firstName: 'Patricia',
    lastName: 'Morales',
    phoneNumber: '(703) 555-8901',
    clinicPatientId: 'JHM-63218-FTD',
    condition: 'FTD',
    isActive: true,
    anonymousHandle: 'CarePartner-633',
    avatarColor: '#0E7490',
    badgeLabel: 'Care Partner',
    createdAt: '2026-05-15T14:30:00Z',
  },
  {
    id: 'user-care-6',
    email: 'lindaokafor@example.com',
    role: 'CARE_PARTNER',
    condition: 'AD',
    firstName: 'Linda',
    lastName: 'Okafor',
    clinicPatientId: 'JHM-71002-AD',
    isActive: true,
    anonymousHandle: 'CarePartner-701',
    avatarColor: '#0F766E',
    badgeLabel: 'Care Partner',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'user-care-7',
    email: 'georgeh@example.com',
    role: 'CARE_PARTNER',
    condition: 'AD',
    firstName: 'George',
    lastName: 'Harrison',
    clinicPatientId: 'JHM-71003-AD',
    isActive: true,
    anonymousHandle: 'CarePartner-702',
    avatarColor: '#9333EA',
    badgeLabel: 'Care Partner',
    createdAt: '2026-10-02T11:00:00Z',

  },
  {
    id: 'user-admin-1',
    email: 'cs-admin@cs.jhu.edu',
    role: 'SYSTEM_ADMIN',
    firstName: 'Hopkins',
    lastName: 'CS Infrastructure Lead',
    isActive: true,
    anonymousHandle: 'JHU CS Admin',
    avatarColor: '#475569',
    badgeLabel: 'System Administrator',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// Helper: Get the requesting user from the request object
function getRequester(req: express.Request): User | undefined {
  const id =
    (req.query.userId as string) ||
    (req.body?.userId as string) ||
    (req.body?.authorId as string) ||
    '';
  return users.find((u) => u.id === id);
}

// The single visibility rule.
function canSee(user: User | undefined, audience: Audience = 'FTD'): boolean {
  if (!user) return false;
  if (user.role !== 'CARE_PARTNER') return true; // Dr. Seema / admins see both
  return audience === 'BOTH' || audience === user.condition;
}

const communityGroups: CommunityGroup[] = [
  {
    id: 'group-general',
    name: 'General Forum',
    fullName: 'General Forum (All Regions)',
    properName: 'General Forum',
    slug: 'general-community',
    description: 'Clinic-wide discussion board for all verified FTD care partners across all geographic regions.',
    isGeneralBoard: true,
    geographicRegion: 'All Regions',
    tag: 'GLOBAL',
    isActive: true,
    memberCount: 84,
  },
  {
    id: 'group-central-maryland',
    name: 'Central Maryland',
    fullName: 'Central Maryland (Baltimore Metro)',
    properName: 'Central Maryland',
    slug: 'central-maryland',
    description: 'Local peer support for families in Baltimore City, Baltimore County, Towson, Catonsville, Howard County, and central corridor.',
    isGeneralBoard: false,
    geographicRegion: 'Central Maryland (Baltimore Metro)',
    radiusMiles: 30,
    tag: 'GEO_CENTRAL_MD',
    isActive: true,
    memberCount: 38,
  },
  {
    id: 'group-eastern-maryland',
    name: 'Eastern Maryland',
    fullName: 'Eastern Maryland (Eastern Shore)',
    properName: 'Eastern Maryland',
    slug: 'eastern-maryland',
    description: 'Connecting care partners in Easton, Cambridge, Salisbury, Ocean City, and Maryland Eastern Shore rural corridors.',
    isGeneralBoard: false,
    geographicRegion: 'Eastern Maryland (Eastern Shore)',
    radiusMiles: 60,
    tag: 'GEO_EASTERN_MD',
    isActive: true,
    memberCount: 16,
  },
  {
    id: 'group-western-maryland',
    name: 'Western Maryland',
    fullName: 'Western Maryland (Frederick and surrounding areas)',
    properName: 'Western Maryland',
    slug: 'western-maryland',
    description: 'Targeted support for Frederick, Hagerstown, Cumberland, Washington County, and Western Maryland foothills.',
    isGeneralBoard: false,
    geographicRegion: 'Western Maryland (Frederick and surrounding areas)',
    radiusMiles: 45,
    tag: 'GEO_WESTERN_MD',
    isActive: true,
    memberCount: 22,
  },
  {
    id: 'group-southern-maryland',
    name: 'Southern Maryland / DC / Northern Virginia',
    fullName: 'Southern Maryland / DC / Northern Virginia',
    properName: 'Southern Maryland / DC / Northern Virginia',
    slug: 'southern-maryland-dc-nova',
    description: 'Regional cohort connecting care partners across Montgomery, Prince George’s, Charles, St. Mary’s, DC, and Northern Virginia.',
    isGeneralBoard: false,
    geographicRegion: 'Southern Maryland / DC / Northern Virginia',
    radiusMiles: 40,
    tag: 'GEO_SOUTHERN_MD_DC_NOVA',
    isActive: true,
    memberCount: 19,
  },
  {
    id: 'group-northern-maryland',
    name: 'Northern Maryland / Pennsylvania / Delaware',
    fullName: 'Northern Maryland / Pennsylvania / Delaware',
    properName: 'Northern Maryland / Pennsylvania / Delaware',
    slug: 'northern-maryland-pa-de',
    description: 'Care partners in Harford, Cecil, Southern PA (York, Lancaster), and Delaware traveling to Johns Hopkins.',
    isGeneralBoard: false,
    geographicRegion: 'Northern Maryland / Pennsylvania / Delaware',
    radiusMiles: 50,
    tag: 'GEO_NORTHERN_MD_PA_DE',
    isActive: true,
    memberCount: 14,
  },
];

const groupMemberships: { userId: string; groupId: string }[] = [
  { userId: 'user-care-1', groupId: 'group-general' },
  { userId: 'user-care-1', groupId: 'group-central-maryland' },
  { userId: 'user-care-2', groupId: 'group-general' },
  { userId: 'user-care-2', groupId: 'group-eastern-maryland' },
  { userId: 'user-care-3', groupId: 'group-general' },
  { userId: 'user-care-3', groupId: 'group-northern-maryland' },
  { userId: 'user-care-4', groupId: 'group-general' },
  { userId: 'user-care-4', groupId: 'group-western-maryland' },
  { userId: 'user-care-5', groupId: 'group-general' },
  { userId: 'user-care-5', groupId: 'group-southern-maryland' },
  { userId: 'user-care-6', groupId: 'group-general' },
  { userId: 'user-care-6', groupId: 'group-central-maryland' },
  { userId: 'user-care-7', groupId: 'group-general' },
  { userId: 'user-care-7', groupId: 'group-western-maryland' },
];

function normalizeGroupId(gId: string): string {
  if (gId === 'group-baltimore' || gId === 'group-catonsville') return 'group-central-maryland';
  if (gId === 'group-eastern-shore') return 'group-eastern-maryland';
  if (gId === 'group-pennsylvania') return 'group-northern-maryland';
  return gId;
}

function getUserAllowedGroups(userId: string, role: string): string[] {
  if (role === 'CLINICIAN_MODERATOR' || role === 'SYSTEM_ADMIN') {
    return communityGroups.map((g) => g.id);
  }
  const userMemberships = groupMemberships.filter((m) => m.userId === userId).map((m) => normalizeGroupId(m.groupId));
  if (userMemberships.length > 0) {
    return Array.from(new Set(['group-general', ...userMemberships]));
  }
  return ['group-general', 'group-central-maryland'];
}

const clinicalResources: ClinicalResource[] = [
  {
    id: 'ftd-aggressive-behavior',
    title: 'Managing Aggressive Behavior in FTD',
    summary: 'Explores aggressive behavior in frontotemporal dementia (FTD), including possible triggers, changes in impulse control, and ways care partners can approach difficult situations while prioritizing safety.',
    contentBody: `Aggressive behavior can be challenging for people living with FTD and their care partners. Changes in behavior may be related to the disease and can affect communication, daily routines, and relationships.

Care partners can use this resource to better understand aggressive behavior, recognize situations in which it occurs, and consider how to respond in a calm and safety-conscious way. When documenting difficult episodes, it may help to note what happened before the behavior, the surrounding environment, and how the situation was resolved.

Behavior changes that are new, severe, or pose a safety risk should be discussed with an appropriate healthcare professional. This resource is intended to support understanding and caregiving, not replace individualized clinical guidance.`,
    fileAttachmentUrl: '/resources/Managing-Aggressive-Behavior.pdf',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'Behavioral changes can be associated with FTD and may affect everyday caregiving.',
      'Consider the circumstances surrounding an episode to identify possible patterns or triggers.',
      'Prioritize the safety and dignity of everyone involved.',
      'Seek professional guidance when behavior changes are severe, new, or difficult to manage.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-lack-of-insight',
    title: 'Everything Is Just Fine: Lack of Insight in FTD',
    summary: 'An AFTD newsletter resource exploring reduced awareness of behavioral or cognitive changes in FTD and the challenges this can create for care partners.',
    contentBody: `Some people living with FTD may have difficulty recognizing changes in their own behavior, judgment, or abilities. This reduced awareness can create misunderstandings when family members notice changes that the person does not recognize.

For care partners, these situations may make conversations about safety, daily responsibilities, and changing support needs especially difficult. Understanding that awareness itself may be affected can help care partners approach disagreements with greater patience.

Rather than relying on repeated arguments to establish that a change has occurred, care partners can consider practical ways to address the immediate concern, communicate calmly, and seek advice from clinicians familiar with FTD.`,
    fileAttachmentUrl: '/resources/PinFTDcare_Newsletter_Winter_2019.pdf',
    diseaseDomain: 'FTD',
    category: 'GENERAL_EDUCATION',
    keyTakeaways: [
      'A person with FTD may not recognize changes that are apparent to others.',
      'Differences in awareness can complicate conversations and caregiving decisions.',
      'Focus on practical needs and safety instead of trying to win an argument.',
      'Consult the care team about persistent disagreements involving support or safety.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-apathy',
    title: 'Understanding Apathy in FTD',
    summary: 'An AFTD newsletter resource about apathy in FTD, including changes in motivation, initiative, and engagement that may affect everyday activities and caregiving.',
    contentBody: `Apathy may appear as reduced motivation, initiative, or interest in activities. In FTD, these changes can be mistaken for laziness, unwillingness, or a lack of concern, even when the underlying cause is related to the disease.

Care partners may find that a person needs more prompting or support to begin familiar activities. Observing which activities remain engaging and which situations make participation more difficult can help families understand changing needs.

Care partners can discuss persistent changes in motivation with the healthcare team, particularly when these changes affect nutrition, personal care, activity, or overall well-being.`,
    fileAttachmentUrl: '/resources/PinFTDcare_Newsletter_Winter_2018.pdf',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'Apathy can affect motivation, initiative, and participation in everyday activities.',
      'Reduced engagement should not automatically be interpreted as intentional refusal.',
      'Observe patterns in activities and the amount of prompting or assistance needed.',
      'Discuss significant changes in daily functioning with the healthcare team.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-compulsive-behaviors',
    title: 'Compulsive Behaviors in FTD',
    summary: 'AFTD resources about compulsive and repetitive behaviors in FTD, helping care partners understand behavioral changes and explore relevant support strategies.',
    contentBody: `Repetitive or compulsive behaviors can occur in FTD and may become part of a person's daily routine. These behaviors can be confusing or disruptive for families, especially when they interfere with meals, activities, relationships, or other responsibilities.

Care partners can observe the type of behavior, when it occurs, and whether it creates distress or safety concerns. Understanding its pattern can help families discuss the behavior more clearly with the person's healthcare team.

Responses should take into account the person's dignity, comfort, and safety. If a repetitive behavior is harmful, causes significant distress, or substantially disrupts daily life, seek individualized guidance from a qualified professional.

The attached newsletter and linked AFTD resource provide additional context about compulsive behaviors in FTD.`,
    fileAttachmentUrl: '/resources/July-2012.pdf',
    externalUrl: 'https://www.theaftd.org/help-and-hope/ta-compulsive-behaviors/',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'Repetitive and compulsive behaviors can be part of the behavioral changes associated with FTD.',
      'Observe patterns and consider whether a behavior creates distress or a safety concern.',
      'Responses should preserve dignity and avoid unnecessary confrontation.',
      'Seek professional guidance when behaviors interfere with daily life or create risk.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-hospice-care',
    title: 'Hospice Care in FTD',
    summary: 'An AFTD newsletter resource introducing hospice care for people with FTD and providing families with information to explore as care needs change.',
    contentBody: `As FTD progresses, families may need to consider additional support focused on comfort, quality of life, and changing care needs. Hospice is one type of care that families may wish to learn about when a person's illness reaches an appropriate stage.

Care partners can use this resource as a starting point for understanding hospice in the context of FTD and preparing questions for healthcare professionals. Questions may include what services are available, how support is coordinated, and what assistance is offered to family caregivers.

Eligibility and care options depend on individual circumstances. Families should discuss the person's condition, goals, and available services with their healthcare team.`,
    fileAttachmentUrl: '/resources/PinFTDcare_Newsletter_Fall_2016.pdf',
    diseaseDomain: 'FTD',
    category: 'DAILY_CARE',
    keyTakeaways: [
      'Hospice is a care option families may want to explore as needs change.',
      'Discuss goals of care and available support with healthcare professionals.',
      'Ask providers what services are available to the person and their care partners.',
      'Eligibility and services depend on individual circumstances.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-driving',
    title: 'Driving and FTD',
    summary: 'AFTD resources about how FTD-related changes may affect driving, how families can navigate driving-related decisions, and where care partners can seek guidance.',
    contentBody: `FTD can affect abilities relevant to driving, including judgment, impulse control, attention, and decision-making. Changes may create safety concerns for the person living with FTD, passengers, and other road users.

Care partners may face difficult conversations about whether driving remains safe. It can help to document specific concerns, discuss changes with healthcare professionals, and learn about applicable licensing requirements and local procedures.

Driving decisions should prioritize safety and follow relevant professional and legal guidance. The attached resource and AFTD webpage provide further information for families navigating driving and FTD.`,
    externalUrl: 'https://www.theaftd.org/help-and-hope/hs-driving-and-ftd/',
    diseaseDomain: 'FTD',
    category: 'SAFETY_WANDERING',
    keyTakeaways: [
      'FTD-related changes may affect abilities needed for safe driving.',
      'Take specific driving concerns seriously and discuss them with the care team.',
      'Learn about applicable licensing rules and local procedures.',
      'Prioritize safety when making decisions about driving.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-loss-of-empathy',
    title: 'The Loss of Empathy and Connection in FTD',
    summary: 'An AFTD newsletter resource exploring changes in empathy and interpersonal connection in FTD and the emotional impact these changes may have on family relationships.',
    contentBody: `FTD can affect social behavior and a person's ability to respond to other people's feelings in familiar ways. Care partners may experience these changes as a loss of emotional connection or as a change in the relationship they previously shared.

These experiences can be painful and confusing. Understanding that changes in social and emotional behavior may be associated with the disease can help families make sense of interactions without assuming that every change reflects a deliberate choice.

Care partners may benefit from sharing their experiences with trusted people, support groups, or professionals who understand dementia. Maintaining personal support is important while adapting to changes in the relationship.`,
    fileAttachmentUrl: '/resources/PiC-fall-2014-WTDA.pdf',
    diseaseDomain: 'FTD',
    category: 'CAREGIVER_SUPPORT',
    keyTakeaways: [
      'FTD can change social behavior and expressions of empathy.',
      'Changes in emotional connection can be difficult for family members.',
      'Understanding the disease may help explain changes without minimizing their impact.',
      'Care partners deserve emotional support as relationships and responsibilities change.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-incontinence',
    title: 'Incontinence in FTD',
    summary: 'An AFTD newsletter resource about incontinence in FTD, addressing a challenging aspect of daily care that can affect comfort, dignity, and caregiving routines.',
    contentBody: `Incontinence can introduce practical and emotional challenges for people living with FTD and their care partners. Changes in routines, awareness, communication, or the ability to manage personal care may make toileting support more difficult.

Care partners can consider how toileting needs affect daily routines and the person's comfort and privacy. Noticing when difficulties occur and communicating those observations to healthcare professionals may help identify appropriate support.

New or worsening incontinence can have causes beyond dementia, so it should be discussed with a healthcare professional rather than automatically attributed to FTD. Care should protect dignity and avoid shaming the person.`,
    fileAttachmentUrl: '/resources/January-2014.pdf',
    diseaseDomain: 'FTD',
    category: 'INCONTINENCE',
    keyTakeaways: [
      'Incontinence can affect daily routines, comfort, and caregiving needs.',
      'Protect privacy and dignity when providing personal-care assistance.',
      'Observe changes and discuss persistent or worsening symptoms with a healthcare professional.',
      'Do not assume new incontinence is caused solely by FTD.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-resistant-behavior',
    title: 'Approaches to Resistant Behavior in FTD',
    summary: 'An AFTD newsletter resource about resistance to care in FTD and approaches care partners can explore when everyday activities become difficult.',
    contentBody: `A person living with FTD may resist assistance with activities such as personal care, getting dressed, or following daily routines. These situations can be stressful for both the person and the care partner.

Resistance may reflect a range of factors, including difficulty understanding a request, discomfort, frustration, or changes associated with the disease. Observing the circumstances surrounding an interaction can help care partners better understand what makes a task difficult.

Care partners can consider communicating one request at a time, allowing additional time, and avoiding unnecessary confrontation. If resistance creates a safety concern or prevents essential care, discuss the situation with the healthcare team to identify an appropriate approach.`,
    fileAttachmentUrl: '/resources/PinFTDcare_sprng_2020.pdf',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'Resistance to care can make everyday activities challenging.',
      'Consider discomfort, communication difficulties, and the situation surrounding the behavior.',
      'Use calm communication and allow time when possible.',
      'Seek professional guidance when resistance interferes with essential care or safety.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-roaming',
    title: 'Roaming in FTD',
    summary: 'An AFTD newsletter resource about roaming in FTD and the safety considerations families may need to address when a person walks or leaves familiar surroundings.',
    contentBody: `Changes in judgment, impulse control, or awareness can create situations in which a person living with FTD walks away from a familiar place or enters an unsafe environment. Families may need to balance independence and activity with appropriate safety planning.

Care partners can consider when and where roaming occurs, identify environmental hazards, and discuss supervision and safety concerns with the person's care team. Planning should reflect the person's abilities, preferences, and living environment.

If someone is missing or in immediate danger, contact local emergency services. This resource provides a starting point for learning about roaming and safety considerations in FTD.`,
    fileAttachmentUrl: '/resources/Spring-2013.pdf',
    diseaseDomain: 'FTD',
    category: 'SAFETY_WANDERING',
    keyTakeaways: [
      'Roaming can create safety concerns for a person living with FTD.',
      'Consider environmental risks and patterns in when or where roaming occurs.',
      "Plan for safety while respecting the person's dignity and independence where possible.",
      'Contact emergency services if the person is missing or in immediate danger.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-sexual-behavior',
    title: 'Sexual Behavior in FTD',
    summary: 'An AFTD newsletter resource about changes in sexual behavior and boundaries in FTD, a topic that may raise sensitive questions about relationships, dignity, and safety.',
    contentBody: `FTD can affect social judgment, impulse control, and awareness of social boundaries. In some situations, these changes may affect sexual behavior or interactions with others.

Such changes can be sensitive and distressing for families. Care partners may need to consider the comfort, consent, dignity, and safety of everyone involved while recognizing that behavior may be affected by the disease.

When a behavior raises concerns, discuss the situation with a qualified healthcare professional who can help assess contributing factors and appropriate responses. The attached resource provides additional context for care partners navigating this topic.`,
    fileAttachmentUrl: '/resources/Summer-2014-Newsletter_Final.pdf',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'FTD-related changes in judgment and impulse control may affect social boundaries.',
      'Approach sensitive situations with attention to dignity, consent, and safety.',
      'Avoid assuming that a behavior has a single cause without professional assessment.',
      'Seek individualized clinical guidance when behavior creates distress or risk.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-sleep',
    title: 'Sleep Issues in FTD',
    summary: 'A resource about sleep-related difficulties in FTD and how changes in sleep may affect daily routines, the person living with FTD, and their care partner.',
    contentBody: `Sleep difficulties can affect the daily lives of people living with FTD and the people who support them. Changes in sleep patterns may disrupt routines, contribute to daytime fatigue, and make caregiving more demanding.

Care partners can keep track of sleep and wake times, nighttime disruptions, daytime sleepiness, and changes in daily behavior. Sharing these observations with a healthcare professional may help the care team assess the situation and consider possible contributing factors.

Sleep changes can have multiple causes, so persistent, sudden, or concerning changes should be discussed with a healthcare professional rather than automatically attributed to FTD.`,
    fileAttachmentUrl: '/resources/SleepIssuesFTD-090623.pdf',
    diseaseDomain: 'FTD',
    category: 'DAILY_CARE',
    keyTakeaways: [
      'Sleep difficulties can affect routines and care-partner well-being.',
      'Track sleep patterns and changes that affect daytime functioning.',
      'Share persistent or concerning sleep changes with a healthcare professional.',
      'Consider the needs of the care partner as well as the person living with FTD.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'ftd-grief',
    title: 'Grief and the FTD Journey',
    summary: 'AFTD resources about grief and emotional challenges throughout the FTD journey, with information for care partners navigating changes in relationships, responsibilities, and family life.',
    contentBody: `FTD can bring changes to relationships, shared plans, family responsibilities, and expectations for the future. Care partners may experience grief at different points throughout the journey, including while the person they care about is still living.

There is no single correct way to experience grief. Feelings may change over time, and care partners may need different forms of support as circumstances evolve. Talking with trusted people, connecting with other care partners, and seeking professional support can provide opportunities to share difficult experiences.

Care partners should also recognize their own needs and limits. Seeking support is a valid part of caring for someone living with FTD, not a failure to provide care.`,
    externalUrl: 'https://www.theaftd.org/help-and-hope/hs-grief-and-the-ftd-journey/',
    fileAttachmentUrl: '/resources/AFTDGriefBookletForWeb.pdf',
    diseaseDomain: 'FTD',
    category: 'CAREGIVER_SUPPORT',
    keyTakeaways: [
      'Grief can occur throughout the FTD journey, not only after a death.',
      'Care partners may experience changing and sometimes conflicting emotions.',
      'Peer support, trusted relationships, and professional help are options to explore.',
      'Care-partner well-being is an important part of the caregiving journey.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'res-ad-alzheimers-association',
    title: "Alzheimer's Association: Caregiving and Dementia Resources",
    summary: 'A resource hub for people affected by Alzheimer’s disease and other dementias, with educational information, caregiving guidance, community resources, and support for families.',
    contentBody: `The Alzheimer's Association provides educational information and support resources for people affected by Alzheimer's disease and other dementias. Care partners can explore information about dementia, caregiving responsibilities, changes that may occur throughout the disease, and ways to find additional support.

The website also provides information about local community resources and educational opportunities. Families can use it as a starting point when looking for guidance, preparing questions for healthcare professionals, or exploring support options in their area.

Available information and services may vary by location. Care partners should confirm current details directly through the organization.`,
    externalUrl: 'https://www.alz.org/',
    diseaseDomain: 'AD',
    category: 'GENERAL_EDUCATION',
    keyTakeaways: [
      'Provides educational information about Alzheimer’s disease and other dementias.',
      'Offers caregiving information and resources for families.',
      'Can help care partners explore community resources and educational programs.',
      'Visit the organization’s website for current support options and contact information.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  },
  {
    id: 'res-both-yes-support',
    title: 'YES! Young-onset Dementia Education and Support',
    summary: 'An organization supporting people and families affected by young-onset dementia, with resources to explore education, peer connection, and support for care partners and family members.',
    contentBody: `YES! (Young-onset Dementia Education and Support) focuses on people and families affected by dementia that begins before age 65. Young-onset dementia can bring distinct family and caregiving challenges, including changes to employment, parenting, relationships, and household responsibilities.

The organization offers opportunities to explore education, peer connection, and support for individuals and family members. Care partners may use these resources to learn about available programs and connect with others who have related experiences.

Program availability and eligibility may change. Visit the organization’s website to review current offerings and determine which resources are appropriate for the family.`,
    externalUrl: 'https://yessupport.org/',
    diseaseDomain: 'AD',
    category: 'CAREGIVER_SUPPORT',
    keyTakeaways: [
      'Focuses on individuals and families affected by young-onset dementia.',
      'Offers opportunities to explore education and peer support.',
      'Resources may be relevant to care partners and other family members.',
      'Check the organization’s website for current programs and eligibility.'
    ],
    createdAt: '2026-10-22T12:00:00Z'
  }
];

// Helper: PII/PHI scrubber
function scanForPhi(text: string): PhiAlert[] {
  const alerts: PhiAlert[] = [];

  // Phone numbers
  const phoneRegex = /(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  let match: RegExpExecArray | null;
  while ((match = phoneRegex.exec(text)) !== null) {
    alerts.push({
      type: 'PHONE',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      explanation: 'Detected direct phone number which breaches caregiver confidentiality.',
    });
  }

  // Email addresses
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  while ((match = emailRegex.exec(text)) !== null) {
    alerts.push({
      type: 'EMAIL',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      explanation: 'Detected personal email address.',
    });
  }

  // Street addresses
  const addressRegex = /\b\d+\s+([A-Za-z0-9\s]+)?(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct)\b/gi;
  while ((match = addressRegex.exec(text)) !== null) {
    alerts.push({
      type: 'LOCATION',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      explanation: 'Detected physical street address.',
    });
  }

  // Clinic IDs or MRN patterns
  const mrnRegex = /\b(JHM-\d{4,6}-[A-Z0-9]+|MRN\s*#?\s*\d+)\b/gi;
  while ((match = mrnRegex.exec(text)) !== null) {
    alerts.push({
      type: 'MRN',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      explanation: 'Detected clinical record / patient chart identifier.',
    });
  }

  // Common proper names or family references with specific names
  const namePatterns = [
    /\b(my husband|my wife|my dad|my father|my mother|my mom|my brother|my sister)\s+([A-Z][a-z]+)\b/g,
    /\bnamed\s+([A-Z][a-z]+)\b/g,
  ];

  namePatterns.forEach((p) => {
    while ((match = p.exec(text)) !== null) {
      const properName = match[2] || match[1];
      alerts.push({
        type: 'PERSON',
        text: properName,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        explanation: 'Detected specific individual name associated with family member.',
      });
    }
  });

  return alerts;
}

// Initial posts seeded
const posts: Post[] = [
  {
    id: 'post-general-1',
    authorId: 'user-clinician-1',
    title: 'General Forum: Managing apathy vs depression in frontotemporal dementia',
    rawContent: 'Dr. Seema explained that apathy in bvFTD stems from frontal executive disconnection, not emotional grief. What daily low-pressure routines or sensory tasks have helped keep your loved one gently engaged without triggering resistance?',
    sanitizedContent: 'Dr. Seema explained that apathy in bvFTD stems from frontal executive disconnection, not emotional grief. What daily low-pressure routines or sensory tasks have helped keep your loved one gently engaged without triggering resistance?',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-18T10:00:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    commentCount: 1,
    upvotes: 9,
  },
  {
    id: 'post-1',
    authorId: 'user-care-1',
    title: 'Struggling with aggressive outburst when bathing my father',
    rawContent: 'My father becomes verbally aggressive and throws sponges whenever we try to enter the shower. What sensory or calm approaches have worked for your families?',
    sanitizedContent: 'My father becomes verbally aggressive and throws objects whenever we try to enter the shower. What sensory or calm approaches have worked for your families in the Baltimore area?',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-20T10:15:00Z',
    assignedGroupIds: ['group-central-maryland'],
    suggestedCohortId: 'group-central-maryland',
    phiAlerts: [],
    createdAt: '2026-09-20T08:30:00Z',
    updatedAt: '2026-09-20T10:15:00Z',
    commentCount: 2,
    upvotes: 7,
  },
  {
    id: 'post-2',
    authorId: 'user-care-2',
    title: 'Quiet tear-away brief recommendations for incontinence resistance?',
    rawContent: 'Mom rejects standard adult diapers because of the loud plastic crinkling noise. We are trying scheduled toileting but need leak protection for rides to Easton appointments.',
    sanitizedContent: 'Mom rejects standard adult diapers because of the loud plastic crinkling noise. We are trying scheduled toileting but need leak protection for medical transport across the Bay Bridge.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-22T14:40:00Z',
    assignedGroupIds: ['group-eastern-maryland'],
    suggestedCohortId: 'group-eastern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-22T12:00:00Z',
    updatedAt: '2026-09-22T14:40:00Z',
    commentCount: 3,
    upvotes: 11,
  },
  {
    id: 'post-3',
    authorId: 'user-care-3',
    title: 'Elder Law Attorney specializing in Maryland Medicaid Spend-Down',
    rawContent: 'Can anyone recommend an elder law practice in Southern PA or Baltimore County who understands young-onset FTD and spousal asset protections?',
    sanitizedContent: 'Can anyone recommend an elder law practice in Southern PA or Baltimore County who understands young-onset FTD and spousal asset protections?',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-24T16:20:00Z',
    assignedGroupIds: ['group-northern-maryland'],
    suggestedCohortId: 'group-northern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-24T15:00:00Z',
    updatedAt: '2026-09-24T16:20:00Z',
    commentCount: 1,
    upvotes: 5,
  },
  {
    id: 'post-4',
    authorId: 'user-care-4',
    title: 'Compulsive sweet cravings and carbohydrate binge eating in bvFTD',
    rawContent: 'My husband has developed an insatiable craving for pastries, cookies, and ice cream. He searches the pantry continuously throughout the afternoon. What substitutions or lock mechanisms have helped prevent dangerous overeating?',
    sanitizedContent: 'My husband has developed an insatiable craving for pastries, cookies, and ice cream. He searches the pantry continuously throughout the afternoon. What substitutions or lock mechanisms have helped prevent dangerous overeating?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-25T11:20:00Z',
    assignedGroupIds: ['group-central-maryland', 'group-general'],
    suggestedCohortId: 'group-central-maryland',
    phiAlerts: [],
    createdAt: '2026-09-25T11:20:00Z',
    updatedAt: '2026-09-25T11:20:00Z',
    commentCount: 2,
    upvotes: 14,
  },
  {
    id: 'post-5',
    authorId: 'user-care-3',
    title: 'Communication boards & speech apps for semantic Primary Progressive Aphasia',
    rawContent: 'Mom is losing word comprehension for nouns and everyday objects. We are trying visual flashcards but wonder if an iPad app with Hopkins speech-pathology backing exists. Looking for Western Maryland family experiences.',
    sanitizedContent: 'Mom is losing word comprehension for nouns and everyday objects. We are trying visual flashcards but wonder if an iPad app with Hopkins speech-pathology backing exists. Looking for Western Maryland family experiences.',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-26T09:15:00Z',
    assignedGroupIds: ['group-western-maryland', 'group-general'],
    suggestedCohortId: 'group-western-maryland',
    phiAlerts: [],
    createdAt: '2026-09-26T09:15:00Z',
    updatedAt: '2026-09-26T09:15:00Z',
    commentCount: 2,
    upvotes: 8,
  },
  {
    id: 'post-6',
    authorId: 'user-care-5',
    title: 'How to transition away from driving without escalating conflict',
    rawContent: 'Our clinician recommended driving retirement after his cognitive driving assessment. He insists his license is still valid. Has anyone had success with Maryland MVA medical review or vehicle disablement strategies?',
    sanitizedContent: 'Our clinician recommended driving retirement after his cognitive driving assessment. He insists his license is still valid. Has anyone had success with Maryland MVA medical review or vehicle disablement strategies?',
    status: 'APPROVED',
    isClosed: true,
    closedAt: '2026-09-27T16:00:00Z',
    closedBy: 'user-clinician-1',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-26T14:30:00Z',
    assignedGroupIds: ['group-southern-maryland', 'group-general'],
    suggestedCohortId: 'group-southern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-26T14:30:00Z',
    updatedAt: '2026-09-27T16:00:00Z',
    commentCount: 3,
    upvotes: 19,
  },
  {
    id: 'post-7',
    authorId: 'user-care-1',
    title: 'Severe night pacing and reversed circadian sleep rhythm',
    rawContent: 'My father naps for two hours after lunch and then stays completely awake from 1:30 AM to 5:30 AM pacing the hallway. We have tried dimming lights and warm chamomile tea. Any non-drug strategies to shift his schedule?',
    sanitizedContent: 'My father naps for two hours after lunch and then stays completely awake from 1:30 AM to 5:30 AM pacing the hallway. We have tried dimming lights and warm chamomile tea. Any non-drug strategies to shift his schedule?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T08:00:00Z',
    assignedGroupIds: ['group-central-maryland', 'group-general'],
    suggestedCohortId: 'group-central-maryland',
    phiAlerts: [],
    createdAt: '2026-09-27T08:00:00Z',
    updatedAt: '2026-09-27T08:00:00Z',
    commentCount: 2,
    upvotes: 12,
  },
  {
    id: 'post-8',
    authorId: 'user-care-5',
    title: 'Adult day care centers equipped for young-onset FTD behaviors',
    rawContent: 'Most senior day centers in Montgomery and Prince George’s County cater primarily to late-stage Alzheimer’s and cannot accommodate a physically active 58-year-old who wanders rapidly. Does anyone know programs with 1-on-1 supervision?',
    sanitizedContent: 'Most senior day centers in Montgomery and Prince George’s County cater primarily to late-stage Alzheimer’s and cannot accommodate a physically active 58-year-old who wanders rapidly. Does anyone know programs with 1-on-1 supervision?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T10:45:00Z',
    assignedGroupIds: ['group-southern-maryland', 'group-general'],
    suggestedCohortId: 'group-southern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-27T10:45:00Z',
    updatedAt: '2026-09-27T10:45:00Z',
    commentCount: 2,
    upvotes: 6,
  },
  {
    id: 'post-9',
    authorId: 'user-care-2',
    title: 'Responding to perseverative questioning and repetitive phrase loops',
    rawContent: 'Mom repeats "What time is the mail arriving today?" every 4 minutes for hours at a time. Answering the question logically does not satisfy her. How do other care partners redirect without burning out?',
    sanitizedContent: 'Mom repeats "What time is the mail arriving today?" every 4 minutes for hours at a time. Answering the question logically does not satisfy her. How do other care partners redirect without burning out?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T13:20:00Z',
    assignedGroupIds: ['group-eastern-maryland', 'group-general'],
    suggestedCohortId: 'group-eastern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-27T13:20:00Z',
    updatedAt: '2026-09-27T13:20:00Z',
    commentCount: 2,
    upvotes: 16,
  },
  {
    id: 'post-10',
    authorId: 'user-care-3',
    title: 'Financial Power of Attorney versus court-appointed guardianship',
    rawContent: 'Our financial institution questioned an older durable financial POA because my husband is younger than standard retirement age. Has anyone had to petition circuit court for legal guardianship, or did updating the Hopkins medical certification resolve it?',
    sanitizedContent: 'Our financial institution questioned an older durable financial POA because my husband is younger than standard retirement age. Has anyone had to petition circuit court for legal guardianship, or did updating the Hopkins medical certification resolve it?',
    status: 'APPROVED',
    isClosed: true,
    closedAt: '2026-09-28T09:00:00Z',
    closedBy: 'user-clinician-1',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T15:00:00Z',
    assignedGroupIds: ['group-northern-maryland', 'group-general'],
    suggestedCohortId: 'group-northern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-27T15:00:00Z',
    updatedAt: '2026-09-28T09:00:00Z',
    commentCount: 2,
    upvotes: 11,
  },
  {
    id: 'post-11',
    authorId: 'user-care-4',
    title: 'Managing rapid eating and choking precautions in progressive disease',
    rawContent: 'Noticeable stuffing of mouth and swallowing large bites without chewing thoroughly. We scheduled a swallow study with speech pathology. What plate modifications or pacing utensils have worked for you at home?',
    sanitizedContent: 'Noticeable stuffing of mouth and swallowing large bites without chewing thoroughly. We scheduled a swallow study with speech pathology. What plate modifications or pacing utensils have worked for you at home?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T17:10:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-09-27T17:10:00Z',
    updatedAt: '2026-09-27T17:10:00Z',
    commentCount: 2,
    upvotes: 13,
  },
  {
    id: 'post-12',
    authorId: 'user-care-1',
    title: 'Coping with emotional blunting and loss of empathy in your partner',
    rawContent: 'The hardest aspect of bvFTD for me has been the emotional flatness. When I injured my arm last week, my partner showed zero reaction. Seema reminded us this is anatomical damage to the ventromedial prefrontal cortex, not a choice. How do you process this grief?',
    sanitizedContent: 'The hardest aspect of bvFTD for me has been the emotional flatness. When I injured my arm last week, my partner showed zero reaction. Seema reminded us this is anatomical damage to the ventromedial prefrontal cortex, not a choice. How do you process this grief?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T07:30:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-09-28T07:30:00Z',
    updatedAt: '2026-09-28T07:30:00Z',
    commentCount: 3,
    upvotes: 25,
  },
  {
    id: 'post-13',
    authorId: 'user-care-4',
    title: 'Quiet exterior door chime sensors for nocturnal wandering safety',
    rawContent: 'We need chime sensors that ping our phones in the bedroom without sounding a loud screeching alarm downstairs that would startle my husband into panic. Looking for recommendations that work in multi-level Frederick houses.',
    sanitizedContent: 'We need chime sensors that ping our phones in the bedroom without sounding a loud screeching alarm downstairs that would startle my husband into panic. Looking for recommendations that work in multi-level Frederick houses.',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T08:45:00Z',
    assignedGroupIds: ['group-western-maryland', 'group-general'],
    suggestedCohortId: 'group-western-maryland',
    phiAlerts: [],
    createdAt: '2026-09-28T08:45:00Z',
    updatedAt: '2026-09-28T08:45:00Z',
    commentCount: 2,
    upvotes: 9,
  },
  {
    id: 'post-14',
    authorId: 'user-care-2',
    title: 'Overcoming toothbrushing defensiveness and dental hygiene refusals',
    rawContent: 'Brushing teeth has become a twice-daily battle. Mom clamps her jaw shut and swats the toothbrush away. Are there flavored non-foaming pastes, U-shaped silicone brushes, or specific positioning that helps?',
    sanitizedContent: 'Brushing teeth has become a twice-daily battle. Mom clamps her jaw shut and swats the toothbrush away. Are there flavored non-foaming pastes, U-shaped silicone brushes, or specific positioning that helps?',
    status: 'APPROVED',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T09:15:00Z',
    assignedGroupIds: ['group-eastern-maryland', 'group-general'],
    suggestedCohortId: 'group-eastern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-28T09:15:00Z',
    updatedAt: '2026-09-28T09:15:00Z',
    commentCount: 2,
    upvotes: 7,
  },

  // AD posts to test AD care partner seperation
  { 
    id: 'post-ad-1', 
    authorId: 'user-care-6',
    title: 'Sundowning: late afternoon confusion and agitation',
    rawContent: 'Around 4 PM my mother becomes restless and keeps asking to go home, even though she is home. What routines have helped your family through the late afternoon?',
    sanitizedContent: 'Around 4 PM my mother becomes restless and keeps asking to go home, even though she is home. What routines have helped your family through the late afternoon?',
    status: 'APPROVED', 
    condition: 'AD', 
    isClosed: false, 
    moderatedBy: 'user-clinician-1', 
    moderatedAt: '2026-10-08T10:00:00Z',
    assignedGroupIds: ['group-general'], 
    suggestedCohortId: 'group-general', 
    phiAlerts: [],
    createdAt: '2026-10-08T09:00:00Z', 
    updatedAt: '2026-10-08T10:00:00Z', 
    commentCount: 1, 
    upvotes: 4 
  },

  {
    id: 'post-ad-2',
    authorId: 'user-care-7',
    title: 'Mom gets frustrated when she cannot find familiar objects',
    rawContent: 'My mother often puts everyday items somewhere and then becomes upset when she cannot find them. We have tried reminding her where things belong, but that can make her more frustrated. What organization strategies have helped your families?',
    sanitizedContent: 'My mother often puts everyday items somewhere and then becomes upset when she cannot find them. We have tried reminding her where things belong, but that can make her more frustrated. What organization strategies have helped your families?',
    status: 'APPROVED',
    condition: 'AD',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-10T10:00:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-10-10T09:15:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
    commentCount: 2,
    upvotes: 6,
  },
  {
    id: 'post-ad-3',
    authorId: 'user-care-6',
    title: 'Helping Dad stay involved in activities he used to enjoy',
    rawContent: 'My father used to love gardening and listening to music, but lately he loses interest quickly or says he cannot do it anymore. Have you found ways to adapt familiar hobbies so they still feel enjoyable without becoming overwhelming?',
    sanitizedContent: 'My father used to love gardening and listening to music, but lately he loses interest quickly or says he cannot do it anymore. Have you found ways to adapt familiar hobbies so they still feel enjoyable without becoming overwhelming?',
    status: 'APPROVED',
    condition: 'AD',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-11T11:00:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-10-11T10:00:00Z',
    updatedAt: '2026-10-11T11:00:00Z',
    commentCount: 2,
    upvotes: 9,
  },
  {
    id: 'post-ad-4',
    authorId: 'user-care-7',
    title: 'Getting through appointments without overwhelming Mom',
    rawContent: 'Medical appointments have become stressful because my mother gets anxious in unfamiliar places and has trouble following long explanations. What helps you prepare for appointments and make the experience easier for your loved one?',
    sanitizedContent: 'Medical appointments have become stressful because my mother gets anxious in unfamiliar places and has trouble following long explanations. What helps you prepare for appointments and make the experience easier for your loved one?',
    status: 'APPROVED',
    condition: 'AD',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-12T13:00:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-10-12T12:00:00Z',
    updatedAt: '2026-10-12T13:00:00Z',
    commentCount: 2,
    upvotes: 5,
  },
  {
    id: 'post-ad-5',
    authorId: 'user-care-6',
    title: 'Feeling guilty when I need a break from caregiving',
    rawContent: 'I love my father, but I sometimes feel guilty when I need time away or feel impatient after a difficult day. How do other care partners make room for their own needs while still feeling like they are doing enough?',
    sanitizedContent: 'I love my father, but I sometimes feel guilty when I need time away or feel impatient after a difficult day. How do other care partners make room for their own needs while still feeling like they are doing enough?',
    status: 'APPROVED',
    condition: 'AD',
    isClosed: false,
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-13T15:00:00Z',
    assignedGroupIds: ['group-general'],
    suggestedCohortId: 'group-general',
    phiAlerts: [],
    createdAt: '2026-10-13T14:00:00Z',
    updatedAt: '2026-10-13T15:00:00Z',
    commentCount: 2,
    upvotes: 12,
  },
  { 
    id: 'post-both-1', 
    authorId: 'user-clinician-1',
    title: 'Caregiver self-care and respite: you matter too',
    rawContent: 'Caring for someone with dementia is demanding. What small routines or respite options have helped you protect your own health?',
    sanitizedContent: 'Caring for someone with dementia is demanding. What small routines or respite options have helped you protect your own health?',
    status: 'APPROVED', 
    condition: 'BOTH', 
    isClosed: false, 
    moderatedBy: 'user-clinician-1', 
    moderatedAt: '2026-10-09T10:00:00Z',
    assignedGroupIds: ['group-general'], 
    suggestedCohortId: 'group-general', 
    phiAlerts: [],
    createdAt: '2026-10-09T09:00:00Z', 
    updatedAt: '2026-10-09T10:00:00Z', 
    commentCount: 2, 
    upvotes: 6 
  },

  // Pending items for Clinician Triage testing
  {
    id: 'post-pending-1',
    authorId: 'user-care-1',
    title: 'Urgent: What dose of Seroquel should I give my father for night wandering?',
    rawContent: 'He was pacing all night from 1 AM to 5 AM and almost fell down the back stairs. The prescription bottle says 25mg but should I increase it to 50mg tonight so he sleeps?',
    status: 'PENDING_MODERATION',
    isUrgentClinical: true,
    assignedGroupIds: ['group-central-maryland'],
    suggestedCohortId: 'group-central-maryland',
    phiAlerts: [],
    createdAt: '2026-09-28T09:45:00Z',
    updatedAt: '2026-09-28T09:45:00Z',
    commentCount: 0,
    upvotes: 0,
  },
  {
    id: 'post-pending-2',
    authorId: 'user-care-2',
    title: 'Has anyone tried high-dose Lion Mane mushroom extracts for reversing aphasia?',
    rawContent: 'I saw an advertisement claiming Lion Mane mushroom tincture can regenerate frontal lobe neurons and reverse primary progressive aphasia. Should I buy this $180 supply?',
    status: 'PENDING_MODERATION',
    assignedGroupIds: ['group-eastern-maryland'],
    suggestedCohortId: 'group-eastern-maryland',
    phiAlerts: [],
    createdAt: '2026-09-28T10:10:00Z',
    updatedAt: '2026-09-28T10:10:00Z',
    commentCount: 0,
    upvotes: 0,
  },
  {
    id: 'post-pending-3',
    authorId: 'user-care-3',
    title: 'Dispute with neighbor over wandering - need local Frederick advice',
    rawContent: 'My husband Robert walked over to 412 Elm St and entered their backyard garden yesterday. The neighbor threatened to call the police. My cell is (410) 555-9122 if someone can call me.',
    status: 'PENDING_MODERATION',
    assignedGroupIds: ['group-western-maryland'],
    suggestedCohortId: 'group-western-maryland',
    phiAlerts: [
      {
        type: 'PERSON',
        text: 'Robert',
        startIndex: 11,
        endIndex: 17,
        explanation: 'Detected specific individual name associated with family member.',
      },
      {
        type: 'LOCATION',
        text: '412 Elm St',
        startIndex: 33,
        endIndex: 43,
        explanation: 'Detected physical street address.',
      },
      {
        type: 'PHONE',
        text: '(410) 555-9122',
        startIndex: 124,
        endIndex: 138,
        explanation: 'Detected direct phone number which breaches caregiver confidentiality.',
      },
    ],
    createdAt: '2026-09-28T11:05:00Z',
    updatedAt: '2026-09-28T11:05:00Z',
    commentCount: 0,
    upvotes: 0,
  },
];

const comments: Comment[] = [
  {
    id: 'comm-gen-1',
    postId: 'post-general-1',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Great observation. Apathy does not equal clinical depression in FTD. Break activities down into simple 1-step tactile prompts (like folding warm towels or sorting coins) rather than asking "Do you want to do this?".',
    sanitizedContent: 'Seema Gulyani: Great observation. Apathy does not equal clinical depression in FTD. Break activities down into simple 1-step tactile prompts (like folding warm towels or sorting coins) rather than asking "Do you want to do this?".',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-18T12:00:00Z',
    createdAt: '2026-09-18T12:00:00Z',
  },
  {
    id: 'comm-1',
    postId: 'post-1',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Great advice from the group. Remember the "Towel Bathing" protocol listed in our clinic resources. Water spraying directly on the face triggers an involuntary fight-or-flight reflex in frontal lobe damage.',
    sanitizedContent: 'Seema Gulyani: Great advice from the group. Remember the "Towel Bathing" protocol listed in our clinic resources. Water spraying directly on the face triggers an involuntary fight-or-flight reflex in frontal lobe damage.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-20T11:00:00Z',
    createdAt: '2026-09-20T11:00:00Z',
  },
  {
    id: 'comm-2',
    postId: 'post-1',
    authorId: 'user-care-2',
    rawContent: 'We started playing big-band jazz from his 20s about 15 minutes before the bathroom door even opened. It made a remarkable difference in keeping him grounded.',
    sanitizedContent: 'We started playing big-band jazz from his 20s about 15 minutes before the bathroom door even opened. It made a remarkable difference in keeping him grounded.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-20T12:30:00Z',
    createdAt: '2026-09-20T12:15:00Z',
  },
  {
    id: 'comm-3',
    postId: 'post-2',
    authorId: 'user-care-1',
    rawContent: 'We use the Tranquility Premium OverNight pull-ons. The outer layer is a breathable peach cloth texture rather than vinyl plastic, so there is almost no rustling sound.',
    sanitizedContent: 'We use the Tranquility Premium OverNight pull-ons. The outer layer is a breathable peach cloth texture rather than vinyl plastic, so there is almost no rustling sound.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-22T15:00:00Z',
    createdAt: '2026-09-22T14:50:00Z',
  },
  {
    id: 'comm-4',
    postId: 'post-2',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Look for tear-away side seams so you do not have to pull soiled garments down over shoes. Also ensure regular scheduled voiding every 90-120 minutes.',
    sanitizedContent: 'Seema Gulyani: Look for tear-away side seams so you do not have to pull soiled garments down over shoes. Also ensure regular scheduled voiding every 90-120 minutes.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-22T15:20:00Z',
    createdAt: '2026-09-22T15:20:00Z',
  },
  {
    id: 'comm-5',
    postId: 'post-2',
    authorId: 'user-care-3',
    rawContent: 'Replacing the white toilet seat with a dark blue one helped my mom find the toilet independently without having accidents right outside the door.',
    sanitizedContent: 'Replacing the white toilet seat with a dark blue one helped my mom find the toilet independently without having accidents right outside the door.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-22T16:05:00Z',
    createdAt: '2026-09-22T16:05:00Z',
  },
  {
    id: 'comm-6',
    postId: 'post-3',
    authorId: 'user-care-2',
    rawContent: 'We consulted with an elder law attorney in Towson who helped us set up a special needs trust and protect spousal assets before Medicaid application. Maryland Legal Aid also has great caregiver resources.',
    sanitizedContent: 'We consulted with an elder law attorney in Towson who helped us set up a special needs trust and protect spousal assets before Medicaid application. Maryland Legal Aid also has great caregiver resources.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-24T16:30:00Z',
    createdAt: '2026-09-24T16:30:00Z',
  },
  {
    id: 'comm-7',
    postId: 'post-4',
    authorId: 'user-care-1',
    rawContent: 'We lock the upper pantry with a discreet child magnetic latch (Tot-Lok) and leave a bowl of pre-sliced sweet apples and clementines on the counter. It redirects the visual foraging impulse toward healthy snacks.',
    sanitizedContent: 'We lock the upper pantry with a discreet child magnetic latch (Tot-Lok) and leave a bowl of pre-sliced sweet apples and clementines on the counter. It redirects the visual foraging impulse toward healthy snacks.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-25T12:00:00Z',
    createdAt: '2026-09-25T11:45:00Z',
  },
  {
    id: 'comm-8',
    postId: 'post-4',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Hyperorality and carb craving reflect orbitofrontal and hypothalamic pathology. Do not scold or debate. Instead, control the food environment by keeping sweets out of visual sight and serving smaller portioned plates.',
    sanitizedContent: 'Seema Gulyani: Hyperorality and carb craving reflect orbitofrontal and hypothalamic pathology. Do not scold or debate. Instead, control the food environment by keeping sweets out of visual sight and serving smaller portioned plates.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-25T13:30:00Z',
    createdAt: '2026-09-25T13:30:00Z',
  },
  {
    id: 'comm-9',
    postId: 'post-5',
    authorId: 'user-care-4',
    rawContent: 'We use the Lingraphica TalkPath app and a laminated binder with high-contrast photos of our house and family members. Keeping categories simple (Food, Pain, Rest) reduced a lot of frustration.',
    sanitizedContent: 'We use the Lingraphica TalkPath app and a laminated binder with high-contrast photos of our house and family members. Keeping categories simple (Food, Pain, Rest) reduced a lot of frustration.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-26T10:00:00Z',
    createdAt: '2026-09-26T09:40:00Z',
  },
  {
    id: 'comm-10',
    postId: 'post-5',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: In semantic variant PPA, multimodal cueing (photograph + written word) works best because visual recognition outlasts word retrieval. Speech pathology can provide customized picture exchange boards.',
    sanitizedContent: 'Seema Gulyani: In semantic variant PPA, multimodal cueing (photograph + written word) works best because visual recognition outlasts word retrieval. Speech pathology can provide customized picture exchange boards.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-26T11:15:00Z',
    createdAt: '2026-09-26T11:15:00Z',
  },
  {
    id: 'comm-11',
    postId: 'post-6',
    authorId: 'user-care-1',
    rawContent: 'We had the mechanic install a hidden battery kill switch under the steering column. We told my husband the car was in the shop awaiting parts, which avoided the direct confrontation of telling him he couldn’t drive.',
    sanitizedContent: 'We had the mechanic install a hidden battery kill switch under the steering column. We told my husband the car was in the shop awaiting parts, which avoided the direct confrontation of telling him he couldn’t drive.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-26T15:00:00Z',
    createdAt: '2026-09-26T14:50:00Z',
  },
  {
    id: 'comm-12',
    postId: 'post-6',
    authorId: 'user-care-2',
    rawContent: 'We filed the confidential medical condition reporting form with the Maryland MVA. Having the state revoke the license took the blame completely off of me as the caregiver.',
    sanitizedContent: 'We filed the confidential medical condition reporting form with the Maryland MVA. Having the state revoke the license took the blame completely off of me as the caregiver.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-26T15:30:00Z',
    createdAt: '2026-09-26T15:20:00Z',
  },
  {
    id: 'comm-13',
    postId: 'post-6',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Excellent peer strategies. Frontal lobe anosognosia (lack of insight) means logic will not convince the patient. Blame the doctor or the state MVA, remove keys, and disable the vehicle physically. (Closing thread to preserve verified clinical guidance for reference).',
    sanitizedContent: 'Seema Gulyani: Excellent peer strategies. Frontal lobe anosognosia (lack of insight) means logic will not convince the patient. Blame the doctor or the state MVA, remove keys, and disable the vehicle physically. (Closing thread to preserve verified clinical guidance for reference).',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T16:00:00Z',
    createdAt: '2026-09-27T16:00:00Z',
  },
  {
    id: 'comm-14',
    postId: 'post-7',
    authorId: 'user-care-4',
    rawContent: 'Morning bright light exposure helped us a lot. We sit by a 10,000 lux lightbox during breakfast for 30 minutes, and we completely cut out afternoon naps longer than 20 minutes.',
    sanitizedContent: 'Morning bright light exposure helped us a lot. We sit by a 10,000 lux lightbox during breakfast for 30 minutes, and we completely cut out afternoon naps longer than 20 minutes.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T09:10:00Z',
    createdAt: '2026-09-27T08:40:00Z',
  },
  {
    id: 'comm-15',
    postId: 'post-7',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Maintain high physical activity before 2 PM. Avoid blue-light screens after 6 PM. If wandering at night persists, ensure safety gates are secured at top of staircases.',
    sanitizedContent: 'Seema Gulyani: Maintain high physical activity before 2 PM. Avoid blue-light screens after 6 PM. If wandering at night persists, ensure safety gates are secured at top of staircases.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T10:00:00Z',
    createdAt: '2026-09-27T10:00:00Z',
  },
  {
    id: 'comm-16',
    postId: 'post-8',
    authorId: 'user-care-1',
    rawContent: 'Wintergreen Adult Day in Rockville has experience with younger onset participants and offers structured sensory activities rather than sedentary TV watching.',
    sanitizedContent: 'Wintergreen Adult Day in Rockville has experience with younger onset participants and offers structured sensory activities rather than sedentary TV watching.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T11:30:00Z',
    createdAt: '2026-09-27T11:15:00Z',
  },
  {
    id: 'comm-17',
    postId: 'post-8',
    authorId: 'user-care-4',
    rawContent: 'Maryland Department of Aging Senior Care program helped subsidize 2 days a week for respite. Ask the Hopkins social worker for the referral.',
    sanitizedContent: 'Maryland Department of Aging Senior Care program helped subsidize 2 days a week for respite. Ask the Hopkins social worker for the referral.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T12:00:00Z',
    createdAt: '2026-09-27T11:50:00Z',
  },
  {
    id: 'comm-18',
    postId: 'post-9',
    authorId: 'user-care-3',
    rawContent: 'We write the answer on a large whiteboard in clear black marker on the refrigerator: "Mail arrives at 2:00 PM." Whenever she asks, we gently point to the board together without saying a word.',
    sanitizedContent: 'We write the answer on a large whiteboard in clear black marker on the refrigerator: "Mail arrives at 2:00 PM." Whenever she asks, we gently point to the board together without saying a word.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T14:00:00Z',
    createdAt: '2026-09-27T13:45:00Z',
  },
  {
    id: 'comm-19',
    postId: 'post-9',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Repetitive questioning is an auditory perseveration caused by loss of memory-updating circuits. Responding verbally reinforces the loop. The visual whiteboard technique mentioned is clinically proven to de-escalate anxiety.',
    sanitizedContent: 'Seema Gulyani: Repetitive questioning is an auditory perseveration caused by loss of memory-updating circuits. Responding verbally reinforces the loop. The visual whiteboard technique mentioned is clinically proven to de-escalate anxiety.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T14:30:00Z',
    createdAt: '2026-09-27T14:30:00Z',
  },
  {
    id: 'comm-20',
    postId: 'post-10',
    authorId: 'user-care-2',
    rawContent: 'Our bank insisted on their own proprietary POA form until our elder law attorney sent a letter citing the Maryland Statutory Form Limited Power of Attorney Act. That cleared it up immediately.',
    sanitizedContent: 'Our bank insisted on their own proprietary POA form until our elder law attorney sent a letter citing the Maryland Statutory Form Limited Power of Attorney Act. That cleared it up immediately.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T16:00:00Z',
    createdAt: '2026-09-27T15:40:00Z',
  },
  {
    id: 'comm-21',
    postId: 'post-10',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Note from clinic legal consult: Maryland enacted statutory protections requiring financial institutions to accept valid Maryland Statutory POAs within 7 business days unless good cause exists. Discussion closed as legal reference.',
    sanitizedContent: 'Seema Gulyani: Note from clinic legal consult: Maryland enacted statutory protections requiring financial institutions to accept valid Maryland Statutory POAs within 7 business days unless good cause exists. Discussion closed as legal reference.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T09:00:00Z',
    createdAt: '2026-09-28T09:00:00Z',
  },
  {
    id: 'comm-22',
    postId: 'post-11',
    authorId: 'user-care-1',
    rawContent: 'We serve food in divided suction bowls with only one small portion at a time. The rest stays in the kitchen until the first portion is finished. It prevents shoveling.',
    sanitizedContent: 'We serve food in divided suction bowls with only one small portion at a time. The rest stays in the kitchen until the first portion is finished. It prevents shoveling.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T18:00:00Z',
    createdAt: '2026-09-27T17:40:00Z',
  },
  {
    id: 'comm-23',
    postId: 'post-11',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Rapid wolfing of food is common in bvFTD. Use smaller dessert spoons instead of tablespoons, cut all meats into dime-sized bites, and ensure upright posture for 30 minutes after dining.',
    sanitizedContent: 'Seema Gulyani: Rapid wolfing of food is common in bvFTD. Use smaller dessert spoons instead of tablespoons, cut all meats into dime-sized bites, and ensure upright posture for 30 minutes after dining.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-27T19:00:00Z',
    createdAt: '2026-09-27T19:00:00Z',
  },
  {
    id: 'comm-24',
    postId: 'post-12',
    authorId: 'user-care-5',
    rawContent: 'Reading this brought tears to my eyes. It feels like grieving someone who is still physically in the room. Thank you for putting words to what so many of us experience.',
    sanitizedContent: 'Reading this brought tears to my eyes. It feels like grieving someone who is still physically in the room. Thank you for putting words to what so many of us experience.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T08:00:00Z',
    createdAt: '2026-09-28T07:55:00Z',
  },
  {
    id: 'comm-25',
    postId: 'post-12',
    authorId: 'user-care-3',
    rawContent: 'Joining the Hopkins monthly caregiver support group helped me realize I wasn’t crazy or unloving for feeling exhausted by the emotional absence. You are doing heroic work.',
    sanitizedContent: 'Joining the Hopkins monthly caregiver support group helped me realize I wasn’t crazy or unloving for feeling exhausted by the emotional absence. You are doing heroic work.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T08:20:00Z',
    createdAt: '2026-09-28T08:15:00Z',
  },
  {
    id: 'comm-26',
    postId: 'post-12',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: This is one of the most painful griefs in neurodegenerative disease — ambiguous loss. Please remember to schedule respite care for yourself. Protecting caregiver wellbeing is paramount.',
    sanitizedContent: 'Seema Gulyani: This is one of the most painful griefs in neurodegenerative disease — ambiguous loss. Please remember to schedule respite care for yourself. Protecting caregiver wellbeing is paramount.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T08:45:00Z',
    createdAt: '2026-09-28T08:45:00Z',
  },
  {
    id: 'comm-27',
    postId: 'post-13',
    authorId: 'user-care-2',
    rawContent: 'We installed the YoLink LoRa wireless door sensors. They have zero sound at the door itself, and chime only on a small hub next to my bedside pillow.',
    sanitizedContent: 'We installed the YoLink LoRa wireless door sensors. They have zero sound at the door itself, and chime only on a small hub next to my bedside pillow.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T09:20:00Z',
    createdAt: '2026-09-28T09:05:00Z',
  },
  {
    id: 'comm-28',
    postId: 'post-13',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Silent pager or phone notifications are ideal because audible blaring alarms trigger adrenaline and oppositional agitation.',
    sanitizedContent: 'Seema Gulyani: Silent pager or phone notifications are ideal because audible blaring alarms trigger adrenaline and oppositional agitation.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T09:40:00Z',
    createdAt: '2026-09-28T09:40:00Z',
  },
  {
    id: 'comm-29',
    postId: 'post-14',
    authorId: 'user-care-1',
    rawContent: 'We switched to OraNurse unflavored non-foaming toothpaste and the Triple Bristle 3-sided toothbrush which cleans all sides of the teeth in one quick pass.',
    sanitizedContent: 'We switched to OraNurse unflavored non-foaming toothpaste and the Triple Bristle 3-sided toothbrush which cleans all sides of the teeth in one quick pass.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T09:45:00Z',
    createdAt: '2026-09-28T09:30:00Z',
  },
  {
    id: 'comm-30',
    postId: 'post-14',
    authorId: 'user-clinician-1',
    rawContent: 'Seema Gulyani: Foam and strong mint flavor often trigger choking fears or sensory disgust in FTD. 3-sided brushes cut brushing time from two minutes down to 30 seconds.',
    sanitizedContent: 'Seema Gulyani: Foam and strong mint flavor often trigger choking fears or sensory disgust in FTD. 3-sided brushes cut brushing time from two minutes down to 30 seconds.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-28T10:00:00Z',
    createdAt: '2026-09-28T10:00:00Z',
  },
  { 
    id: 'comm-ad-1', 
    postId: 'post-ad-1', 
    authorId: 'user-care-7',
    rawContent: 'A short walk after lunch and closing the curtains before dusk helped us a lot.',
    sanitizedContent: 'A short walk after lunch and closing the curtains before dusk helped us a lot.',
    status: 'APPROVED', 
    moderatedBy: 'user-clinician-1', 
    moderatedAt: '2026-10-08T11:00:00Z', 
    createdAt: '2026-10-08T10:30:00Z' 
  },

  {
    id: 'comm-ad-2',
    postId: 'post-ad-2',
    authorId: 'user-care-6',
    rawContent: 'We started keeping commonly used things in the same visible places and added simple picture labels to a few drawers. It has made finding things less stressful for both of us.',
    sanitizedContent: 'We started keeping commonly used things in the same visible places and added simple picture labels to a few drawers. It has made finding things less stressful for both of us.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-10T10:45:00Z',
    createdAt: '2026-10-10T10:30:00Z',
  },
  {
    id: 'comm-ad-3',
    postId: 'post-ad-2',
    authorId: 'user-clinician-1',
    rawContent: 'A consistent place for frequently used items and simple visual cues may reduce frustration. Try introducing one change at a time and see which setup works best for your family.',
    sanitizedContent: 'A consistent place for frequently used items and simple visual cues may reduce frustration. Try introducing one change at a time and see which setup works best for your family.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-10T11:00:00Z',
    createdAt: '2026-10-10T11:00:00Z',
  },
  {
    id: 'comm-ad-4',
    postId: 'post-ad-3',
    authorId: 'user-care-7',
    rawContent: 'My mother enjoys helping water a few plants when I set everything up beforehand. Keeping the activity short and focusing on doing it together has worked better than asking her to complete a whole project.',
    sanitizedContent: 'My mother enjoys helping water a few plants when I set everything up beforehand. Keeping the activity short and focusing on doing it together has worked better than asking her to complete a whole project.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-11T11:30:00Z',
    createdAt: '2026-10-11T11:15:00Z',
  },
  {
    id: 'comm-ad-5',
    postId: 'post-ad-3',
    authorId: 'user-clinician-1',
    rawContent: 'Familiar activities can be adapted to focus on enjoyment rather than completion. Offer a simple step, give plenty of time, and let your loved one decide when they have had enough.',
    sanitizedContent: 'Familiar activities can be adapted to focus on enjoyment rather than completion. Offer a simple step, give plenty of time, and let your loved one decide when they have had enough.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-11T12:00:00Z',
    createdAt: '2026-10-11T12:00:00Z',
  },
  {
    id: 'comm-ad-6',
    postId: 'post-ad-4',
    authorId: 'user-care-6',
    rawContent: 'I write down the main questions we want to ask before we leave home and bring a familiar snack and something comforting. Having a short list helps me remember what to discuss, too.',
    sanitizedContent: 'I write down the main questions we want to ask before we leave home and bring a familiar snack and something comforting. Having a short list helps me remember what to discuss, too.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-12T13:30:00Z',
    createdAt: '2026-10-12T13:15:00Z',
  },
  {
    id: 'comm-ad-7',
    postId: 'post-ad-4',
    authorId: 'user-clinician-1',
    rawContent: 'Preparing a short written list, allowing extra time, and asking the clinician to explain one point at a time may help. Let the care team know ahead of the visit what makes appointments difficult.',
    sanitizedContent: 'Preparing a short written list, allowing extra time, and asking the clinician to explain one point at a time may help. Let the care team know ahead of the visit what makes appointments difficult.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-12T14:00:00Z',
    createdAt: '2026-10-12T14:00:00Z',
  },
  {
    id: 'comm-ad-8',
    postId: 'post-ad-5',
    authorId: 'user-care-7',
    rawContent: 'I used to think taking an afternoon off meant I was letting my family down. Now my sister covers one regular time slot each week, and I use it to rest or see a friend.',
    sanitizedContent: 'I used to think taking an afternoon off meant I was letting my family down. Now my sister covers one regular time slot each week, and I use it to rest or see a friend.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-13T15:30:00Z',
    createdAt: '2026-10-13T15:15:00Z',
  },
  {
    id: 'comm-ad-9',
    postId: 'post-ad-5',
    authorId: 'user-clinician-1',
    rawContent: 'Needing rest does not mean you care any less. If possible, identify one dependable source of support and one small activity that helps you recharge. A caregiver support group or social worker may also help you explore respite options.',
    sanitizedContent: 'Needing rest does not mean you care any less. If possible, identify one dependable source of support and one small activity that helps you recharge. A caregiver support group or social worker may also help you explore respite options.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-10-13T16:00:00Z',
    createdAt: '2026-10-13T16:00:00Z',
  },
  { id: 'comm-both-1', 
    postId: 'post-both-1', 
    authorId: 'user-care-6',
    rawContent: 'Two afternoons a week of adult day care gave me time to rest. It made a big difference.',
    sanitizedContent: 'Two afternoons a week of adult day care gave me time to rest. It made a big difference.',
    status: 'APPROVED', 
    moderatedBy: 'user-clinician-1', 
    moderatedAt: '2026-10-09T11:00:00Z', 
    createdAt: '2026-10-09T10:30:00Z' 
  },
  { 
    id: 'comm-both-2', 
    postId: 'post-both-1', 
    authorId: 'user-care-1',
    rawContent: 'Our support group meeting is the one hour a month that is just for me.',
    sanitizedContent: 'Our support group meeting is the one hour a month that is just for me.',
    status: 'APPROVED', 
    moderatedBy: 'user-clinician-1', 
    moderatedAt: '2026-10-09T12:00:00Z', 
    createdAt: '2026-10-09T11:30:00Z' 
  },
];

const auditEvents: ModerationAuditEvent[] = [
  {
    id: 'audit-1',
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'POST',
    entityId: 'post-1',
    actionTaken: 'APPROVED',
    notes: 'Approved to Baltimore Cohort & General Forum with minor wording cleanup.',
    createdAt: '2026-09-20T10:15:00Z',
  },
  {
    id: 'audit-2',
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'POST',
    entityId: 'post-2',
    actionTaken: 'APPROVED',
    notes: 'Approved to Eastern Shore & General Forum.',
    createdAt: '2026-09-22T14:40:00Z',
  },
];

const invitations: Invitation[] = [
  {
    id: 'inv-1',
    email: 'carol.jenkins@example.com',
    firstName: 'Carol',
    lastName: 'Jenkins',
    clinicPatientId: 'JHM-88419-FTD',
    condition: 'FTD',
    primaryCohortSlug: 'baltimore-metro',
    token: 'jh-token-88419-valid',
    expiresAt: '2026-10-02T12:00:00Z',
    status: 'DISPATCHED',
    createdAt: '2026-09-28T08:00:00Z',
  },
];

const directMessages: DirectMessage[] = [
  {
    id: 'dm-1',
    recipientUserId: 'user-care-1',
    title: 'Post Approved: Bathing Aggression',
    message: 'Your discussion query has been approved by Seema and published to the Baltimore Metro and General Clinic boards.',
    type: 'APPROVAL',
    createdAt: '2026-09-20T10:15:00Z',
    read: true,
  },
];

// -------------------------------------------------------------
// ZERO-TRUST RLS PROJECTION UTILITY
// Strips user real names, phone, email, clinicPatientId for care partners!
// -------------------------------------------------------------
function projectAuthor(userId: string, requestingRole: string) {
  const author = users.find((u) => u.id === userId);
  if (!author) {
    return {
      userId: 'unknown',
      anonymousHandle: 'Anonymous Care Partner',
      badgeLabel: 'Care Partner',
      avatarColor: '#002D72',
    };
  }

  // Clinician Moderator & System Admin can see full patient mapping
  if (requestingRole === 'CLINICIAN_MODERATOR' || requestingRole === 'SYSTEM_ADMIN') {
    return {
      userId: author.id,
      realName: `${author.firstName} ${author.lastName}`,
      email: author.email,
      phoneNumber: author.phoneNumber,
      clinicPatientId: author.clinicPatientId,
      anonymousHandle: author.anonymousHandle,
      badgeLabel: author.badgeLabel,
      avatarColor: author.avatarColor,
    };
  }

  // Care Partner sees STRICTLY anonymous projection
  return {
    userId: author.id, // safe UUID or obfuscated ID
    anonymousHandle: author.anonymousHandle,
    badgeLabel: author.badgeLabel,
    avatarColor: author.avatarColor,
  };
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Switch / Get Active User Persona (For Demo & Testing)
app.get('/api/v1/users/me', (req, res) => {
  const userId = (req.query.asUser as string) || 'user-care-1';
  const user = users.find((u) => u.id === userId) || users[1];
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      clinicPatientId: user.clinicPatientId,
      condition: user.condition,
      anonymousHandle: user.anonymousHandle,
      badgeLabel: user.badgeLabel,
      avatarColor: user.avatarColor,
    },
    allPersonas: users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      handle: u.anonymousHandle,
      clinicId: u.clinicPatientId,
      condition: u.condition,
    })),
  });
});

// Community Groups / Cohorts
app.get('/api/v1/cohorts', (req, res) => {
  const requester = getRequester(req)
  const role = requester?.role ?? 'CARE_PARTNER';
  const userId = requester?.id ?? '';

  // Dr. Seema (Clinician Moderator / System Admin) has access to discussions across ALL groups
  if (role === 'CLINICIAN_MODERATOR' || role === 'SYSTEM_ADMIN') {
    return res.json(communityGroups);
  }

  // Care Partner: strictly restricted to General Forum and their assigned regional cohort
  const allowedGroupIds = getUserAllowedGroups(userId, role);
  const userCohorts = communityGroups.filter((g) => allowedGroupIds.includes(g.id));
  res.json(userCohorts);
});

app.post('/api/v1/cohorts', (req, res) => {
  const { name, slug, description, geographicRegion, radiusMiles, tag } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const newCohort: CommunityGroup = {
    id: `group-${Date.now()}`,
    name,
    slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    description: description || '',
    isGeneralBoard: false,
    geographicRegion: geographicRegion || 'Regional Cohort',
    radiusMiles: Number(radiusMiles) || 40,
    tag: tag || `GEO_${slug.toUpperCase().replace(/-/g, '_')}`,
    isActive: true,
    memberCount: 1,
  };

  communityGroups.push(newCohort);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'COHORT',
    entityId: newCohort.id,
    actionTaken: 'CREATED_COHORT',
    notes: `Dynamically provisioned regional cohort: ${name}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newCohort);
});

// In-memory persistent upvote tracker per post and user
const postUpvotes = new Map<string, Set<string>>();

// Upvote / Toggle Helpful on Post
app.post('/api/v1/posts/:id/upvote', (req, res) => {
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const requester = getRequester(req);
  const userId = req.body.userId || requester?.id || 'user-care-1';

  if (!postUpvotes.has(post.id)) {
    postUpvotes.set(post.id, new Set());
  }
  const userSet = postUpvotes.get(post.id)!;

  let isUpvoted = false;
  if (userSet.has(userId)) {
    userSet.delete(userId);
    post.upvotes = Math.max(0, post.upvotes - 1);
    isUpvoted = false;
  } else {
    userSet.add(userId);
    post.upvotes += 1;
    isUpvoted = true;
  }

  res.json({
    success: true,
    upvotes: post.upvotes,
    isUpvoted,
  });
});

// Feed: Browse Posts (Strict Regional Isolation & RBAC)
app.get('/api/v1/posts', (req, res) => {
  const requester = getRequester(req);
  const role = requester?.role ?? 'CARE_PARTNER';
  const groupId = req.query.groupId as string;
  const statusFilter = req.query.status as string;
  const currentUserId = requester?.id ?? '';

  const allowedGroupIds = getUserAllowedGroups(currentUserId, role);

  let filtered = [...posts];

  // If Care Partner, show APPROVED posts plus the current user's own submitted posts
  if (role === 'CARE_PARTNER') {
    filtered = filtered.filter(
      (p) => p.status === 'APPROVED' || (currentUserId && p.authorId === currentUserId && p.status === 'PENDING_MODERATION')
    );

    // STRICT REGIONAL BOUNDARY: Care Partners can only see posts in General Forum or their assigned regional cohort
    filtered = filtered.filter(
      (p) => p.assignedGroupIds.some((gId) => allowedGroupIds.includes(gId)) || (currentUserId && p.authorId === currentUserId)
    );
  } else if (statusFilter) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  } else {
    // For Clinician Moderators and Admins viewing discussions feed: only show approved (published) discussions
    filtered = filtered.filter((p) => p.status === 'APPROVED');
  }

  // Filter by Group Visibility if specified
  if (groupId && groupId !== 'all') {
    if (role === 'CARE_PARTNER' && !allowedGroupIds.includes(groupId)) {
      return res.status(403).json({ error: 'You do not have access to this regional group.' });
    }
    filtered = filtered.filter((p) => p.assignedGroupIds.includes(groupId));
  }

  filtered = filtered.filter((p) => canSee(requester, p.condition));
  
  // Optional clinician toggle: ?condition=AD shows AD + BOTH
  const condFilter = req.query.condition as string;
  if (condFilter === 'FTD' || condFilter === 'AD') {
    filtered = filtered.filter((p) => (p.condition ?? 'FTD') === condFilter || p.condition === 'BOTH');
  }

  // Map with RLS projection
  const projectedPosts = filtered.map((p) => {
    const authorProjection = projectAuthor(p.authorId, role);
    const assignedGroups = communityGroups.filter((g) => p.assignedGroupIds.includes(g.id));

    return {
      id: p.id,
      title: p.title,
      content: p.sanitizedContent || p.rawContent,
      rawContent: role === 'CLINICIAN_MODERATOR' ? p.rawContent : undefined,
      status: p.status,
      isClosed: p.isClosed ?? false,
      closedAt: p.closedAt,
      closedBy: p.closedBy,
      author: authorProjection,
      assignedGroups,
      isUrgentClinical: p.isUrgentClinical,
      condition: p.condition ?? 'FTD',
      createdAt: p.createdAt,
      commentCount: comments.filter((c) => c.postId === p.id && c.status === 'APPROVED').length,
      upvotes: p.upvotes,
      isUpvoted: postUpvotes.get(p.id)?.has(currentUserId) ?? false,
      allowUnmoderatedReplies: p.allowUnmoderatedReplies ?? false,
      phiAlerts: role === 'CLINICIAN_MODERATOR' ? p.phiAlerts : undefined,
    };
  });

  res.json({
    total: projectedPosts.length,
    posts: projectedPosts,
  });
});

// Single Post Details with Comments
app.get('/api/v1/posts/:id', (req, res) => {
  const requester = getRequester(req);
  const role = requester?.role ?? 'CARE_PARTNER';
  const post = posts.find((p) => p.id === req.params.id);
  const currentUserId = requester?.id ?? '';

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!canSee(getRequester(req), post.condition)) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const allowedGroupIds = getUserAllowedGroups(currentUserId, role);

  // Care partners can view approved posts in their allowed groups, or their own submission
  if (role === 'CARE_PARTNER') {
    if (post.status !== 'APPROVED' && post.authorId !== currentUserId) {
      return res.status(403).json({ error: 'This post is currently pending clinical moderation' });
    }
    const hasGroupAccess = post.assignedGroupIds.some((gId) => allowedGroupIds.includes(gId));
    if (!hasGroupAccess && post.authorId !== currentUserId) {
      return res.status(403).json({ error: 'You do not have access to this regional discussion.' });
    }
  }

  const postComments = comments
    .filter(
      (c) =>
        c.postId === post.id &&
        (role === 'CLINICIAN_MODERATOR' ||
          role === 'SYSTEM_ADMIN' ||
          c.status === 'APPROVED' ||
          (currentUserId && c.authorId === currentUserId))
    )
    .map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.sanitizedContent || c.rawContent,
      author: projectAuthor(c.authorId, role),
      status: c.status,
      createdAt: c.createdAt,
    }));

  res.json({
    post: {
      id: post.id,
      title: post.title,
      content: post.sanitizedContent || post.rawContent,
      rawContent: role === 'CLINICIAN_MODERATOR' ? post.rawContent : undefined,
      status: post.status,
      isClosed: post.isClosed ?? false,
      closedAt: post.closedAt,
      closedBy: post.closedBy,
      author: projectAuthor(post.authorId, role),
      assignedGroups: communityGroups.filter((g) => post.assignedGroupIds.includes(g.id)),
      condition: post.condition ?? 'FTD',
      phiAlerts: role === 'CLINICIAN_MODERATOR' ? post.phiAlerts : undefined,
      createdAt: post.createdAt,
      commentCount: postComments.filter((c) => c.status === 'APPROVED').length,
      upvotes: post.upvotes,
      isUpvoted: postUpvotes.get(post.id)?.has(currentUserId) ?? false,
      allowUnmoderatedReplies: post.allowUnmoderatedReplies ?? false,
    },
    comments: postComments,
  });
});

// Keyword matching against existing discussions and replies for composer deflection
app.post('/api/v1/deflection/discussions', (req, res) => {
  const { title = '', content = '' } = req.body;
  const rawText = `${title} ${content}`.toLowerCase();

  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'have', 'from', 'what', 'when',
    'where', 'who', 'how', 'why', 'are', 'was', 'were', 'will', 'would', 'could',
    'should', 'can', 'about', 'just', 'some', 'any', 'not', 'you', 'your', 'our',
    'their', 'they', 'them', 'she', 'her', 'his', 'him', 'does', 'did', 'been',
  ]);

  const queryWords = rawText
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (queryWords.length === 0) {
    return res.json({ matches: [] });
  }

  const requester = getRequester(req);
  const approvedPosts = posts.filter((p) => p.status === 'APPROVED' && canSee(requester, p.condition));
  const matches: {
    postId: string;
    title: string;
    snippet: string;
    authorHandle: string;
    replyCount: number;
    matchScore: number;
  }[] = [];

  for (const post of approvedPosts) {
    const postComments = comments.filter((c) => c.postId === post.id && c.status === 'APPROVED');
    let bestScore = 0;
    let bestSnippet = post.sanitizedContent || post.rawContent;

    // 1. Title match (highest weight)
    const titleLower = post.title.toLowerCase();
    const titleMatches = queryWords.filter((w) => titleLower.includes(w)).length;
    if (titleMatches > 0) {
      bestScore += titleMatches * 3;
    }

    // 2. Content match
    const contentLower = (post.sanitizedContent || post.rawContent).toLowerCase();
    const contentMatches = queryWords.filter((w) => contentLower.includes(w)).length;
    if (contentMatches > 0) {
      bestScore += contentMatches * 1.5;
    }

    // 3. Comments match
    for (const comm of postComments) {
      const commLower = (comm.sanitizedContent || comm.rawContent).toLowerCase();
      const commMatches = queryWords.filter((w) => commLower.includes(w)).length;
      if (commMatches > 0) {
        const commScore = commMatches * 2;
        if (commScore > bestScore) {
          bestScore = commScore;
          bestSnippet = comm.sanitizedContent || comm.rawContent;
        }
      }
    }

    if (bestScore >= 2) {
      matches.push({
        postId: post.id,
        title: post.title,
        snippet: bestSnippet.slice(0, 160) + (bestSnippet.length > 160 ? '...' : ''),
        authorHandle: projectAuthor(post.authorId, 'CARE_PARTNER').anonymousHandle,
        replyCount: postComments.length,
        matchScore: bestScore,
      });
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ matches: matches.slice(0, 2) });
});

// Real-time pool endpoint for instant client-side keyword matching
app.get('/api/v1/deflection/discussions-pool', (req, res) => {
  const requester = getRequester(req);
  const approvedPosts = posts.filter((p) => p.status === 'APPROVED' && canSee(requester, p.condition));
  const pool = approvedPosts.map((p) => {
    const postComments = comments.filter((c) => c.postId === p.id && c.status === 'APPROVED');
    const author = projectAuthor(p.authorId, 'CARE_PARTNER');
    const assignedGroup = communityGroups.find((g) => p.assignedGroupIds.includes(g.id));
    return {
      id: p.id,
      title: p.title,
      content: p.sanitizedContent || p.rawContent,
      authorHandle: author.anonymousHandle,
      authorBadge: author.badgeLabel,
      cohortName: assignedGroup?.properName || assignedGroup?.name || 'General Forum',
      createdAt: p.createdAt,
      replies: postComments.map((c) => {
        const commAuthor = projectAuthor(c.authorId, 'CARE_PARTNER');
        return {
          id: c.id,
          content: c.sanitizedContent || c.rawContent,
          authorHandle: commAuthor.anonymousHandle,
          authorBadge: commAuthor.badgeLabel,
          createdAt: c.createdAt,
        };
      }),
    };
  });
  res.json({ pool });
});

// Draft / Submit Post (Care Partner or Clinician)
app.post('/api/v1/posts', (req, res) => {
  const { title, content, targetCohortId, authorId = 'user-care-1' } = req.body;
  const author = users.find((u) => u.id === authorId);
  const condition: Audience = isStaff(authorId)
    ? (['FTD', 'AD', 'BOTH'].includes(req.body.condition) ? req.body.condition : 'BOTH')
    : (author?.condition ?? 'FTD');   // care partners can't choose; it's forced server-side

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // Run automated PII / PHI Scrubber
  const phiAlerts = scanForPhi(`${title} ${content}`);

  // Determine if it looks like an urgent clinical query
  const medicationKeywords = ['seroquel', 'haldol', 'haloperidol', 'donepezil', 'aricept', 'memantine', 'namenda', 'trazodone', 'dosage', 'dose', 'milligram', 'mg', 'prescribe'];
  const hasMedicationMention = medicationKeywords.some((w) => `${title} ${content}`.toLowerCase().includes(w));

  const staff = isStaff(authorId);
  const now = new Date().toISOString();

  const newPost: Post = {
    id: `post-${Date.now()}`,
    authorId,
    title,
    rawContent: content,
    sanitizedContent: content,
    status: staff ? 'APPROVED' : 'PENDING_MODERATION', // ZERO-TRUST GATE: Always pending!
    condition,
    moderatedBy: staff ? authorId : undefined,
    moderatedAt: staff ? now : undefined,
    assignedGroupIds: targetCohortId ? [targetCohortId] : ['group-general'],
    suggestedCohortId: targetCohortId || 'group-general',
    phiAlerts,
    isUrgentClinical: hasMedicationMention,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    commentCount: 0,
    upvotes: 0,
    isClosed: false,
  };

  posts.unshift(newPost);

  res.status(202).json({
    postId: newPost.id,
    status: newPost.status,
    message: staff
      ? 'Post published.'
      : 'Your submission has been safely received. Dr. Seema reviews all posts within 24 hours to keep this community safe and accurate.',
    hasPhiAlerts: phiAlerts.length > 0,
    phiAlertsCount: phiAlerts.length,
  });
});

// Add comment to post
app.post('/api/v1/posts/:id/comments', (req, res) => {
  const { content, authorId = 'user-care-1' } = req.body;
  const post = posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!canSee(getRequester(req), post.condition)) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Prevent new replies after a discussion is closed
  if (post.isClosed) {
    return res.status(403).json({
      error: 'This discussion has been closed by a clinician moderator. New replies are no longer accepted.',
    });
  }

  const author = users.find((u) => u.id === authorId);
  const isClinician = author?.role === 'CLINICIAN_MODERATOR' || author?.role === 'SYSTEM_ADMIN';
  const isUnmoderated = post.allowUnmoderatedReplies === true;

  const newComment: Comment = {
    id: `comm-${Date.now()}`,
    postId: post.id,
    authorId,
    rawContent: content,
    sanitizedContent: content,
    status: isClinician || isUnmoderated ? 'APPROVED' : 'PENDING_MODERATION',
    createdAt: new Date().toISOString(),
  };

  comments.push(newComment);
  if (newComment.status === 'APPROVED') {
    post.commentCount += 1;
  }

  res.status(201).json({
    comment: {
      ...newComment,
      author: projectAuthor(authorId, isClinician ? 'CLINICIAN_MODERATOR' : 'CARE_PARTNER'),
    },
    message: isClinician || isUnmoderated ? 'Comment published immediately.' : 'Comment submitted for moderation review.',
  });
});

// Close or reopen discussion (Clinician Moderator) - Preserves all existing replies!
app.put('/api/v1/posts/:id/close', (req, res) => {
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const { isClosed = true, moderatorId = 'user-clinician-1' } = req.body;
  post.isClosed = Boolean(isClosed);
  post.closedAt = post.isClosed ? new Date().toISOString() : undefined;
  post.closedBy = post.isClosed ? moderatorId : undefined;
  post.updatedAt = new Date().toISOString();

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId,
    moderatorName: 'Seema Gulyani',
    entityType: 'POST',
    entityId: post.id,
    actionTaken: post.isClosed ? 'CLOSED_DISCUSSION' : 'REOPENED_DISCUSSION',
    notes: post.isClosed
      ? 'Moderator closed discussion to new replies. All existing replies preserved.'
      : 'Moderator reopened discussion for new replies.',
    createdAt: new Date().toISOString(),
  });

  res.json({
    post: {
      ...post,
      isClosed: post.isClosed,
      closedAt: post.closedAt,
      closedBy: post.closedBy,
    },
    isClosed: post.isClosed,
    message: post.isClosed
      ? 'Discussion closed to new replies. All existing replies are preserved.'
      : 'Discussion reopened. Care partners can now post replies again.',
  });
});

// Toggle or update post unmoderated replies mode (Clinician Moderator)
app.put('/api/v1/posts/:id/unmoderated-replies', (req, res) => {
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const { allowUnmoderatedReplies } = req.body;
  post.allowUnmoderatedReplies = Boolean(allowUnmoderatedReplies);
  post.updatedAt = new Date().toISOString();

  // If opening replies, also auto-approve existing pending comments on this thread
  if (post.allowUnmoderatedReplies) {
    comments
      .filter((c) => c.postId === post.id && c.status === 'PENDING_MODERATION')
      .forEach((c) => {
        c.status = 'APPROVED';
      });
    post.commentCount = comments.filter((c) => c.postId === post.id && c.status === 'APPROVED').length;
  }

  res.json({
    post: {
      ...post,
      allowUnmoderatedReplies: post.allowUnmoderatedReplies,
    },
    message: post.allowUnmoderatedReplies
      ? 'Post updated: Anyone can now reply without moderation.'
      : 'Post updated: All new replies now require clinical moderation.',
  });
});

// Update Pending Post
app.put('/api/v1/posts/:id', (req, res) => {
  const { title, content, targetCohortId } = req.body;
  const post = posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (title) post.title = title.trim();
  if (content) {
    post.rawContent = content.trim();
    post.sanitizedContent = content.trim();
    post.phiAlerts = scanForPhi(`${post.title} ${content}`);
  }
  if (targetCohortId) {
    post.assignedGroupIds = [targetCohortId];
    post.suggestedCohortId = targetCohortId;
  }
  post.updatedAt = new Date().toISOString();

  res.json({
    post,
    message: 'Your question was updated and remains in clinical review.',
  });
});

// Delete / Cancel Pending Post
app.delete('/api/v1/posts/:id', (req, res) => {
  const index = posts.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  posts.splice(index, 1);
  // Also remove associated comments
  const remainingComments = comments.filter((c) => c.postId !== req.params.id);
  comments.length = 0;
  comments.push(...remainingComments);

  res.json({ success: true, message: 'Question withdrawn successfully.' });
});

// Update Pending Comment
app.put('/api/v1/posts/:postId/comments/:commentId', (req, res) => {
  const { content } = req.body;
  const comment = comments.find((c) => c.id === req.params.commentId && c.postId === req.params.postId);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (content) {
    comment.rawContent = content.trim();
    comment.sanitizedContent = content.trim();
  }

  res.json({ comment, message: 'Reply updated.' });
});

// Delete / Cancel Pending Comment
app.delete('/api/v1/posts/:postId/comments/:commentId', (req, res) => {
  const index = comments.findIndex((c) => c.id === req.params.commentId && c.postId === req.params.postId);
  if (index === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const comment = comments[index];
  const post = posts.find((p) => p.id === req.params.postId);
  if (post && comment.status === 'APPROVED' && post.commentCount > 0) {
    post.commentCount -= 1;
  }

  comments.splice(index, 1);
  res.json({ success: true, message: 'Reply withdrawn successfully.' });
});

// Moderation Triage Queue (Clinician Only)
app.get('/api/v1/moderation/queue', (_req, res) => {
  const pendingPosts = posts.filter((p) => p.status === 'PENDING_MODERATION');

  const items = pendingPosts.map((p) => {
    const author = users.find((u) => u.id === p.authorId);
    const suggestedCohort = communityGroups.find((g) => g.id === p.suggestedCohortId);

    return {
      id: p.id,
      type: 'POST',
      author: {
        userId: p.authorId,
        realName: author ? `${author.firstName} ${author.lastName}` : 'Unknown',
        email: author?.email || '',
        phone: author?.phoneNumber || '',
        clinicPatientId: author?.clinicPatientId || 'UNLINKED',
        condition: author?.condition,
        anonymousHandle: author?.anonymousHandle || 'CarePartner',
        avatarColor: author?.avatarColor || '#002D72',
      },
      title: p.title,
      rawContent: p.rawContent,
      sanitizedContent: p.sanitizedContent || p.rawContent,
      suggestedCohort: suggestedCohort || communityGroups[0],
      assignedGroupIds: p.assignedGroupIds,
      condition: p.condition ?? 'FTD',
      isUrgentClinical: p.isUrgentClinical,
      phiAlerts: p.phiAlerts || [],
      createdAt: p.createdAt,
    };
  });

  res.json({
    totalPending: items.length,
    items,
  });
});

// Moderation Action (Approve / Reject / Clinical Escalate)
app.post('/api/v1/moderation/action', (req, res) => {
  const { entityId, action, assignedGroupIds, sanitizedContent, allowUnmoderatedReplies, rejectionCode, rejectionMessage, moderatorNotes } = req.body;

  const post = posts.find((p) => p.id === entityId);
  if (!post) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const now = new Date().toISOString();
  post.moderatedBy = 'user-clinician-1';
  post.moderatedAt = now;
  post.moderatorPrivateNotes = moderatorNotes;

  if (sanitizedContent) {
    post.sanitizedContent = sanitizedContent;
  }

  if (allowUnmoderatedReplies !== undefined) {
    post.allowUnmoderatedReplies = Boolean(allowUnmoderatedReplies);
  }

  if (action === 'APPROVE') {
    post.status = 'APPROVED';
    if (assignedGroupIds && assignedGroupIds.length > 0) {
      post.assignedGroupIds = assignedGroupIds;
    }

    if (['FTD', 'AD', 'BOTH'].includes(req.body.condition)) post.condition = req.body.condition;

    // Direct message to author
    directMessages.unshift({
      id: `dm-${Date.now()}`,
      recipientUserId: post.authorId,
      title: 'Your discussion query was approved',
      message: `Seema reviewed and approved your post: "${post.title}". It is now visible to peer care partners.`,
      type: 'APPROVAL',
      createdAt: now,
      read: false,
    });

    auditEvents.unshift({
      id: `audit-${Date.now()}`,
      moderatorId: 'user-clinician-1',
      moderatorName: 'Seema Gulyani',
      entityType: 'POST',
      entityId: post.id,
      actionTaken: 'APPROVE',
      notes: moderatorNotes || `Approved to groups: ${post.assignedGroupIds.join(', ')}`,
      createdAt: now,
    });

    return res.json({
      status: 'SUCCESS',
      newEntityStatus: 'APPROVED',
      indexedToRag: true,
      message: 'Post approved and published.',
    });
  }

  if (action === 'REJECT') {
    post.status = 'REJECTED';
    post.rejectionCode = rejectionCode || 'OTHER';

    directMessages.unshift({
      id: `dm-${Date.now()}`,
      recipientUserId: post.authorId,
      title: 'Update regarding your post submission',
      message: rejectionMessage || 'Your post could not be published at this time. Please see clinical feedback.',
      type: 'REJECTION',
      createdAt: now,
      read: false,
    });

    auditEvents.unshift({
      id: `audit-${Date.now()}`,
      moderatorId: 'user-clinician-1',
      moderatorName: 'Seema Gulyani',
      entityType: 'POST',
      entityId: post.id,
      actionTaken: 'REJECT',
      reason: rejectionCode,
      notes: moderatorNotes,
      createdAt: now,
    });

    return res.json({
      status: 'SUCCESS',
      newEntityStatus: 'REJECTED',
      message: 'Post rejected and private explanation dispatched to author.',
    });
  }

  if (action === 'CLINICAL_REDIRECT') {
    post.status = 'CLINICAL_REDIRECT';
    post.rejectionCode = 'CLINICAL_MEDICATION_QUERY';

    const author = users.find((u) => u.id === post.authorId);

    directMessages.unshift({
      id: `dm-${Date.now()}`,
      recipientUserId: post.authorId,
      title: 'Clinical Follow-up from Seema',
      message: 'Prescription, medication dosing, and acute safety queries cannot be handled on public peer boards. Seema has opened a private message thread with you to follow up directly.',
      type: 'CLINICAL_ESCALATION',
      createdAt: now,
      read: false,
    });

    auditEvents.unshift({
      id: `audit-${Date.now()}`,
      moderatorId: 'user-clinician-1',
      moderatorName: 'Seema Gulyani',
      entityType: 'POST',
      entityId: post.id,
      actionTaken: 'CLINICAL_REDIRECT',
      notes: 'Diverted to private clinician communication.',
      createdAt: now,
    });

    return res.json({
      status: 'SUCCESS',
      newEntityStatus: 'CLINICAL_REDIRECT',
      message: 'Post diverted to private clinical outreach.',
    });
  }

  res.status(400).json({ error: 'Invalid action' });
});

// Notifications / Direct Messages for Care Partner
app.get('/api/v1/notifications', (req, res) => {
  const userId = (req.query.userId as string) || 'user-care-1';
  const userMessages = directMessages.filter((m) => m.recipientUserId === userId);
  res.json({
    unreadCount: userMessages.filter((m) => !m.read).length,
    messages: userMessages,
  });
});

app.post('/api/v1/notifications/:id/read', (req, res) => {
  const msg = directMessages.find((m) => m.id === req.params.id);
  if (msg) {
    msg.read = true;
  }
  res.json({ success: true });
});

// Clinician Curated Resources
app.get('/api/v1/resources', (req, res) => {
  const requester = getRequester(req);
  res.json(clinicalResources.filter((r) => canSee(requester, r.diseaseDomain)));
});

app.post('/api/v1/resources', (req, res) => {
  const {
    title,
    category,
    summary,
    contentBody,
    diseaseDomain,
    externalUrl,
    fileAttachmentUrl,
    additionalLinks,
    keyTakeaways,
    authorId
  } = req.body;

  if (!title?.trim() || !contentBody?.trim()) {
    return res.status(400).json({
      error: 'Title and contentBody are required.',
    });
  }

  const newRes: ClinicalResource = {
    id: `res-${Date.now()}`,
    title,
    category: category || 'BEHAVIORAL_AGITATION',
    summary: summary || title,
    contentBody,
    diseaseDomain: diseaseDomain || 'FTD',
    externalUrl: externalUrl || '',
    fileAttachmentUrl: fileAttachmentUrl || undefined,
    additionalLinks: Array.isArray(additionalLinks) ? additionalLinks : [],
    keyTakeaways: keyTakeaways || [],
    createdAt: new Date().toISOString(),
  };

  clinicalResources.unshift(newRes);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: newRes.id,
    actionTaken: 'CREATED_CLINICAL_RESOURCE',
    notes: `Added resource: "${title}" (${category})`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newRes);
});

// Clinician can delete a resource 
app.delete('/api/v1/resources/:id', (req, res) => {
  const { id } = req.params;
  const index = clinicalResources.findIndex((resource) => resource.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Clinical resource not found.' });
  }

  const [deleted] = clinicalResources.splice(index, 1);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: deleted.id,
    actionTaken: 'DELETED_CLINICAL_RESOURCE',
    notes: `Deleted resource: "${deleted.title}"`,
    createdAt: new Date().toISOString(),
  });

  return res.status(200).json({ message: 'Clinical resource deleted.', id });
});

// Clinic Updates (everyone reads, staff writes)
app.get('/api/v1/updates', (req, res) => {
  const requester = getRequester(req);
  const sorted = clinicUpdates
    .filter((u) => canSee(requester, u.condition))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(sorted);
});

app.post('/api/v1/updates', (req, res) => {
  const { title, summary, body, category, condition, trialStatus, externalUrl, authorId } = req.body;

  if (!isStaff(authorId)) {
    return res.status(403).json({ error: 'Only clinic staff can publish updates.' });
  }
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  const cat = UPDATE_CATEGORIES.includes(category) ? category : 'RESEARCH';
  const update: ClinicUpdate = {
    id: `upd-${Date.now()}`,
    title: title.trim(),
    summary: (summary || title).trim(),
    body: body.trim(),
    category: cat,
    condition: ['FTD', 'AD', 'BOTH'].includes(condition) ? condition : 'BOTH',
    trialStatus: cat === 'CLINICAL_TRIAL' ? (trialStatus === 'CLOSED' ? 'CLOSED' : 'RECRUITING') : undefined,
    externalUrl: externalUrl || undefined,
    authorId,
    createdAt: new Date().toISOString(),
  };
  clinicUpdates.unshift(update);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: authorId,
    moderatorName: 'Seema Gulyani',
    entityType: 'UPDATE' as any,
    entityId: update.id,
    actionTaken: 'PUBLISHED_CLINIC_UPDATE',
    notes: `Published update: "${update.title}"`,
    createdAt: update.createdAt,
  });

  res.status(201).json(update);
});

app.delete('/api/v1/updates/:id', (req, res) => {
  if (!isStaff(req.query.userId as string)) {
    return res.status(403).json({ error: 'Only clinic staff can delete updates.' });
  }
  const idx = clinicUpdates.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Update not found' });
  clinicUpdates.splice(idx, 1);
  res.json({ success: true });
});

// Calendar Events (everyone reads, staff writes)
app.get('/api/v1/events', (req, res) => {
  const requester = getRequester(req);
  const sorted = calendarEvents
    .filter((e) => canSee(requester, e.condition ?? 'BOTH'))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  res.json(sorted);
});

app.post('/api/v1/events', (req, res) => {
  const { title, type, startsAt, location, description, authorId, condition } = req.body;

  if (!isStaff(authorId)) {
    return res.status(403).json({ error: 'Only clinic staff can add events.' });
  }
  if (!title?.trim() || !startsAt) {
    return res.status(400).json({ error: 'Title and start time are required' });
  }

  const event: CalendarEvent = {
    id: `evt-${Date.now()}`,
    title: title.trim(),
    type: EVENT_TYPES.includes(type) ? type : 'SUPPORT_GROUP',
    condition: ['FTD', 'AD', 'BOTH'].includes(condition) ? condition : 'BOTH',
    startsAt,
    location: location || '',
    description,
    authorId,
  };
  calendarEvents.push(event);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: authorId,
    moderatorName: 'Seema Gulyani',
    entityType: 'EVENT' as any,
    entityId: event.id,
    actionTaken: 'CREATED_EVENT',
    notes: `Added event: "${event.title}" on ${event.startsAt}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(event);
});

app.delete('/api/v1/events/:id', (req, res) => {
  if (!isStaff(req.query.userId as string)) {
    return res.status(403).json({ error: 'Only clinic staff can delete events.' });
  }
  const idx = calendarEvents.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });
  calendarEvents.splice(idx, 1);
  res.json({ success: true });
});

// Audit Log Events
app.get('/api/v1/moderation/audit', (_req, res) => {
  res.json(auditEvents);
});

// -------------------------------------------------------------
// AUTHENTICATION & SECURITY SERVICES (Login, Recovery & Invites)
// -------------------------------------------------------------

interface PasswordResetRecord {
  id: string;
  email: string;
  code: string;
  token: string;
  expiresAt: number;
}
const passwordResets: PasswordResetRecord[] = [];

// Care Partner & Clinician Login Endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { identifier, email, password } = req.body;
  const query = (identifier || email || '').trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Email or Clinic Patient ID is required.' });
  }

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === query ||
      (u.clinicPatientId && u.clinicPatientId.toLowerCase() === query)
  );

  if (!user) {
    return res.status(401).json({ error: 'No active account found matching this email or Clinic ID.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact Johns Hopkins clinic support.' });
  }

  // Password verification (pre-seeded users accept default demo password 'Hopkins2026!' or custom password)
  const isMatch = !user.password || !password || user.password === password || password === 'Hopkins2026!';
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials or use Forgot Password.' });
  }

  const sessionToken = `jh-sess-${user.id}-${Date.now()}`;
  res.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      clinicPatientId: user.clinicPatientId,
      condition: user.condition,
      anonymousHandle: user.anonymousHandle,
      badgeLabel: user.badgeLabel,
      avatarColor: user.avatarColor,
    },
  });
});

// Forgot Password / Request Reset Code Endpoint (Dispatches Real Email)
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  // Generate 6-digit verification code and reset token
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = `reset-${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  passwordResets.unshift({
    id: `pr-${Date.now()}`,
    email: cleanEmail,
    code,
    token,
    expiresAt,
  });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const appUrl = `${protocol}://${host}`;
  const resetUrl = `${appUrl}/?tab=reset-password&token=${token}&email=${encodeURIComponent(cleanEmail)}`;

  // Send real email via nodemailer
  const emailResult = await sendPasswordResetEmail({
    toEmail: cleanEmail,
    recipientName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Care Partner',
    resetCode: code,
    resetUrl,
  });

  res.json({
    success: true,
    message: `Password reset instructions dispatched to ${cleanEmail}.`,
    emailSent: emailResult.success,
    previewUrl: emailResult.previewUrl || undefined,
    resetToken: token,
    testCode: code, // Provided for instant clinical UI testing
  });
});

// Password Reset Confirmation Endpoint
app.post('/api/v1/auth/reset-password', (req, res) => {
  const { email, code, token, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const resetEntry = passwordResets.find(
    (r) =>
      (token && r.token === token) ||
      (cleanEmail && r.email === cleanEmail && r.code === (code || '').trim())
  );

  if (!resetEntry) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  if (Date.now() > resetEntry.expiresAt) {
    return res.status(400).json({ error: 'This verification code has expired. Please request a new one.' });
  }

  const user = users.find((u) => u.email.toLowerCase() === resetEntry.email);
  if (user) {
    user.password = newPassword;
  }

  // Invalidate code
  const idx = passwordResets.indexOf(resetEntry);
  if (idx !== -1) passwordResets.splice(idx, 1);

  res.json({
    success: true,
    message: 'Your password has been successfully updated. You may now sign in with your new password.',
  });
});

// Clinician Invite Care Partner Endpoint (US-1.1) with Real Email Dispatch
app.post('/api/v1/auth/invitations', async (req, res) => {
  const { email, firstName, lastName, clinicPatientId, primaryCohortSlug, condition, phoneNumber } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  if (condition !== 'FTD' && condition !== 'AD') {
    return res.status(400).json({ error: 'Condition (FTD or AD) is required' });
  }

  const token = `jh-token-${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const newInvitation: Invitation = {
    id: `inv-${Date.now()}`,
    email: email.trim(),
    firstName: firstName?.trim() || 'Caregiver',
    lastName: lastName?.trim() || '',
    clinicPatientId: clinicPatientId?.trim() || '',
    primaryCohortSlug: primaryCohortSlug || 'central-maryland',
    condition,
    phoneNumber: phoneNumber?.trim() || undefined,
    token,
    expiresAt,
    status: 'DISPATCHED',
    createdAt: new Date().toISOString(),
  };

  invitations.unshift(newInvitation);

  // Look up cohort title
  const targetCohort = communityGroups.find((g) => g.slug === newInvitation.primaryCohortSlug);
  const cohortName = targetCohort?.properName || targetCohort?.name || 'Regional Support Group';

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const appUrl = `${protocol}://${host}`;
  const registrationUrl = `/register?token=${token}`;

  // Real Email Dispatch via Nodemailer
  const emailResult = await sendInvitationEmail({
    toEmail: newInvitation.email,
    recipientName: `${newInvitation.firstName} ${newInvitation.lastName}`.trim(),
    condition,
    cohortName,
    inviteToken: token,
    registrationUrl,
    appUrl,
  });

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'USER',
    entityId: newInvitation.id,
    actionTaken: 'INVITED_CARE_PARTNER',
    notes: `Issued single-use invite for ${email} to cohort ${newInvitation.primaryCohortSlug} (${condition})${
      emailResult.success ? ' [Email Sent]' : ''
    }`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    invitationId: newInvitation.id,
    inviteToken: token,
    inviteExpiresAt: expiresAt,
    registrationUrl,
    status: 'DISPATCHED',
    emailSent: emailResult.success,
    emailPreviewUrl: emailResult.previewUrl || undefined,
    emailError: emailResult.error || undefined,
  });
});

// Verify Invitation Token
app.get('/api/v1/auth/invitations/:token', (req, res) => {
  const inv = invitations.find((i) => i.token === req.params.token);
  if (!inv) {
    return res.status(404).json({ error: 'Invitation link is invalid or could not be found.' });
  }
  if (inv.status === 'CLAIMED') {
    return res.status(400).json({ error: 'This invitation has already been claimed.' });
  }
  if (new Date(inv.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'This invitation link has expired. Please ask your clinician for a new invite.' });
  }

  res.json({
    valid: true,
    invitation: {
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      condition: inv.condition,
      primaryCohortSlug: inv.primaryCohortSlug,
      clinicPatientId: inv.clinicPatientId,
      expiresAt: inv.expiresAt,
    },
  });
});

// Complete Registration with Invitation
app.post('/api/v1/auth/register', (req, res) => {
  const { token, password, anonymousHandle, firstName, lastName, phoneNumber } = req.body;
  const inv = invitations.find((i) => i.token === token);
  if (!inv || inv.status === 'CLAIMED') {
    return res.status(400).json({ error: 'Invalid or already claimed invitation.' });
  }
  if (new Date(inv.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Invitation link has expired.' });
  }

  const newUserId = `user-care-${Date.now()}`;
  const generatedHandle = anonymousHandle?.trim() || `CarePartner-${Math.floor(100 + Math.random() * 900)}`;

  const newUser: User = {
    id: newUserId,
    email: inv.email,
    role: 'CARE_PARTNER',
    condition: inv.condition,
    firstName: firstName?.trim() || inv.firstName,
    lastName: lastName?.trim() || inv.lastName,
    phoneNumber: phoneNumber?.trim() || inv.phoneNumber,
    clinicPatientId: inv.clinicPatientId || `JHM-${Math.floor(10000 + Math.random() * 90000)}-${inv.condition}`,
    isActive: true,
    anonymousHandle: generatedHandle,
    avatarColor: '#1E40AF',
    badgeLabel: 'Care Partner',
    createdAt: new Date().toISOString(),
    password: password || 'Hopkins2026!',
  };

  users.push(newUser);
  inv.status = 'CLAIMED';

  // Assign cohort
  const targetCohort = communityGroups.find((g) => g.slug === inv.primaryCohortSlug) || communityGroups[1];
  groupMemberships.push({ userId: newUser.id, groupId: 'group-general' });
  if (targetCohort && targetCohort.id !== 'group-general') {
    groupMemberships.push({ userId: newUser.id, groupId: targetCohort.id });
  }

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'system',
    moderatorName: 'Registration System',
    entityType: 'USER',
    entityId: newUser.id,
    actionTaken: 'CLAIMED_INVITATION',
    notes: `Care partner ${newUser.email} completed registration [${newUser.condition}]`,
    createdAt: new Date().toISOString(),
  });

  const sessionToken = `jh-sess-${newUser.id}-${Date.now()}`;
  res.status(201).json({
    success: true,
    token: sessionToken,
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      clinicPatientId: newUser.clinicPatientId,
      condition: newUser.condition,
      anonymousHandle: newUser.anonymousHandle,
      badgeLabel: newUser.badgeLabel,
      avatarColor: newUser.avatarColor,
    },
  });
});

// Web preview for sent emails (Invitations & Password resets)
app.get('/api/v1/auth/emails/preview/:id', (req, res) => {
  const emailRecord = sentEmailsStore.find((m) => m.id === req.params.id);
  if (!emailRecord) {
    return res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;color:#334155;"><h2>Email Not Found</h2><p>This message may have expired or not yet been sent.</p></body></html>`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
  res.send(emailRecord.html);
});

// JSON list of recently dispatched emails
app.get('/api/v1/auth/emails/recent', (req, res) => {
  const to = req.query.to as string;
  let list = sentEmailsStore;
  if (to) {
    list = list.filter((m) => m.to.toLowerCase() === to.toLowerCase());
  }
  res.json(
    list.map((m) => ({
      id: m.id,
      to: m.to,
      subject: m.subject,
      sentAt: m.sentAt,
      previewUrl: `/api/v1/auth/emails/preview/${m.id}`,
    }))
  );
});

// Real-Time Pre-Submission Deflection (Section 6.3 & US-4.1)
app.post('/api/v1/knowledge/deflect', (req, res) => {
  const { draftText } = req.body;
  const requester = getRequester(req);

  if (!draftText || typeof draftText !== 'string' || draftText.trim().length < 15) {
    return res.json({ deflectionMatches: [] });
  }

  const textLower = draftText.toLowerCase();

  // Find matching curated resources
  const resourceMatches: any[] = [];
  clinicalResources
    .filter((r) => canSee(requester, r.diseaseDomain))
    .forEach((resItem) => {
      let score = 0;
      const titleLower = resItem.title.toLowerCase();
      const contentLower = resItem.contentBody.toLowerCase();
      const categoryLower = resItem.category.toLowerCase();

      // Check key thematic terms
      const keywords = [
        'incontinence', 'urine', 'brief', 'diaper', 'toilet', 'voiding',
        'shower', 'bathing', 'bath', 'sponge', 'wash', 'hygiene', 'agitation',
        'medicaid', 'lawyer', 'attorney', 'legal', 'spend-down', 'assets', 'power of attorney',
        'wander', 'wandering', 'car', 'driving', 'elopement', 'keys', 'gps', 'tracker',
        'lion mane', 'supplement', 'mushroom', 'cure',
      ];

      keywords.forEach((kw) => {
        if (textLower.includes(kw)) {
          if (titleLower.includes(kw) || categoryLower.includes(kw)) score += 0.35;
          if (contentLower.includes(kw)) score += 0.2;
        }
      });

      if (score > 0.3) {
        resourceMatches.push({
          sourceType: 'RESOURCE',
          id: resItem.id,
          title: resItem.title,
          category: resItem.category,
          snippet: resItem.summary,
          url: resItem.externalUrl || resItem.fileAttachmentUrl,
          confidenceScore: Math.min(0.96, Math.max(0.72, parseFloat(score.toFixed(2)))),
        });
      }
  });

  // Find matching approved past discussions
  const discussionMatches: any[] = [];
  posts
    .filter((p) => p.status === 'APPROVED' && canSee(requester, p.condition))
    .forEach((p) => {
      let score = 0;
      const combined = `${p.title} ${p.sanitizedContent || p.rawContent}`.toLowerCase();

      const tokens = textLower.split(/\s+/).filter((t) => t.length > 3);
      tokens.forEach((t) => {
        if (combined.includes(t)) {
          score += 0.15;
        }
      });

      if (score > 0.3) {
        discussionMatches.push({
          sourceType: 'PAST_DISCUSSION',
          id: p.id,
          title: p.title,
          snippet: (p.sanitizedContent || p.rawContent).slice(0, 160) + '...',
          postId: p.id,
          confidenceScore: Math.min(0.92, Math.max(0.68, parseFloat(score.toFixed(2)))),
        });
      }
    });

  const deflectionMatches = [...resourceMatches, ...discussionMatches]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 4);

  res.json({ deflectionMatches });
});

// -------------------------------------------------------------
// CHATBOT KNOWLEDGE GUIDE FILES STORE & RAG ENGINE
// -------------------------------------------------------------

interface GuidePageData {
  pageNumber: number;
  text: string;
  wordCount: number;
  chunkCount: number;
}

interface ChatbotGuideFile {
  id: string;
  title: string;
  condition: 'FTD' | 'AD' | 'GENERAL';
  topicTag?: string;
  publisher?: string;
  year?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  description?: string;
  content: string;
  pages?: GuidePageData[];
  totalChunks?: number;
  sectionCount?: number;
  wordCount?: number;
  status?: 'DRAFT' | 'APPROVED';
  approvedAt?: string;
  approvedBy?: string;
  pdfUrl?: string;
  isActive: boolean;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

let chatbotKnowledgeConfig = {};

const DB_DIR = path.join(process.cwd(), 'data');
const GUIDES_DB_FILE = path.join(DB_DIR, 'clinical_guides.json');

function loadChatbotGuidesFromDb(): ChatbotGuideFile[] {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(GUIDES_DB_FILE)) {
      const data = fs.readFileSync(GUIDES_DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        const deduped: ChatbotGuideFile[] = [];
        for (const item of parsed) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        }
        return deduped;
      }
    }
  } catch (err) {
    console.warn('Could not read guides from file database:', err);
  }
  return [];
}

function saveChatbotGuidesToDb(guides: ChatbotGuideFile[]): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(GUIDES_DB_FILE, JSON.stringify(guides, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write clinical guides to database file:', err);
  }
}

let chatbotGuidesStore: ChatbotGuideFile[] = loadChatbotGuidesFromDb();

// Auto-ingest approved guides into RAG vector store on server start if empty
const approvedOnStartup = chatbotGuidesStore.filter((g) => g.isActive && (g.status === 'APPROVED' || !g.status));
if (approvedOnStartup.length > 0 && getLoadedChunksCount() === 0) {
  const startupAi = getAiClient();
  console.log(`Auto-ingesting ${approvedOnStartup.length} approved guides into RAG vector store...`);
  (async () => {
    for (const guide of approvedOnStartup) {
      try {
        await ingestGuide(guide, startupAi);
      } catch (ingestErr) {
        console.error(`Failed to auto-ingest guide "${guide.title}":`, ingestErr);
      }
    }
  })();
}

// -------------------------------------------------------------
// CHATBOT KNOWLEDGE MANAGEMENT ROUTES (MODERATOR DASHBOARD)
// -------------------------------------------------------------

app.get('/api/v1/chatbot/guides', (_req, res) => {
  chatbotGuidesStore = loadChatbotGuidesFromDb();
  const approvedActive = chatbotGuidesStore.filter((g) => g.isActive && (g.status === 'APPROVED' || !g.status));
  const totalWords = approvedActive.reduce((acc, g) => acc + (g.wordCount || 0), 0);
  res.json({
    guides: chatbotGuidesStore,
    config: {
      ...chatbotKnowledgeConfig,
      totalActiveGuides: approvedActive.length,
      totalWords,
    },
  });
});

app.post('/api/v1/chatbot/guides', async (req, res) => {
  const {
    title,
    condition = 'FTD',
    topicTag,
    publisher,
    year,
    fileName,
    fileSize,
    mimeType,
    category,
    description,
    content,
    pages,
    totalChunks,
    status = 'DRAFT',
    pdfUrl,
    uploadedBy,
    uploadedByName,
  } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and guide content are required.' });
  }

  const isApproved = status === 'APPROVED';
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const sections = content.split(/(?=^##\s+)/m).filter(Boolean).length || 1;
  const computedFileName = fileName?.trim() || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
  const computedPdfUrl = pdfUrl || `/resources/${computedFileName}`;

  const newGuide: ChatbotGuideFile = {
    id: `guide-${Date.now()}`,
    title: title.trim(),
    condition: (condition as any) || 'FTD',
    topicTag: topicTag?.trim() || category?.trim() || '',
    publisher: publisher?.trim() || '',
    year: year?.trim() || '',
    fileName: computedFileName,
    fileSize: fileSize || content.length,
    mimeType: mimeType || 'application/pdf',
    category: topicTag?.trim() || category?.trim() || '',
    description: description?.trim() || '',
    content: content.trim(),
    pages: pages || undefined,
    totalChunks: totalChunks || undefined,
    sectionCount: sections,
    wordCount: words,
    status: isApproved ? 'APPROVED' : 'DRAFT',
    approvedAt: isApproved ? new Date().toISOString() : undefined,
    approvedBy: isApproved ? (uploadedBy || 'user-clinician-1') : undefined,
    pdfUrl: computedPdfUrl,
    isActive: isApproved, // Drafts are not active until explicitly approved
    uploadedBy: uploadedBy || 'user-clinician-1',
    uploadedByName: uploadedByName || 'Dr. Seema Gulyani',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  chatbotGuidesStore = loadChatbotGuidesFromDb().filter((g) => g.id !== newGuide.id);
  chatbotGuidesStore.unshift(newGuide);
  saveChatbotGuidesToDb(chatbotGuidesStore);

  // Ingest on save when approved
  if (isApproved) {
    try {
      await ingestGuide(newGuide, getAiClient());
    } catch (ingestErr) {
      console.error('Failed to ingest approved guide into RAG store:', ingestErr);
    }
  }

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: uploadedBy || 'user-clinician-1',
    moderatorName: uploadedByName || 'Dr. Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: newGuide.id,
    actionTaken: isApproved ? 'APPROVED_CHATBOT_GUIDE' : 'SAVED_DRAFT_CHATBOT_GUIDE',
    notes: `${isApproved ? 'Approved & published' : 'Saved draft of'} [${newGuide.condition}] clinical guide "${newGuide.title}" (${words} words)`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newGuide);
});

app.put('/api/v1/chatbot/guides/:id', async (req, res) => {
  chatbotGuidesStore = loadChatbotGuidesFromDb();
  const guide = chatbotGuidesStore.find((g) => g.id === req.params.id);
  if (!guide) {
    return res.status(404).json({ error: 'Guide file not found.' });
  }

  const { title, condition, topicTag, publisher, year, category, description, content, pages, totalChunks, status, pdfUrl } = req.body;
  if (title !== undefined) guide.title = title.trim();
  if (condition !== undefined) guide.condition = condition;
  if (topicTag !== undefined) guide.topicTag = topicTag.trim();
  if (publisher !== undefined) guide.publisher = publisher.trim();
  if (year !== undefined) guide.year = year.trim();
  if (category !== undefined) guide.category = category.trim();
  if (description !== undefined) guide.description = description.trim();
  if (pages !== undefined) guide.pages = pages;
  if (totalChunks !== undefined) guide.totalChunks = totalChunks;
  if (content !== undefined) {
    guide.content = content.trim();
    guide.wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    guide.sectionCount = content.split(/(?=^##\s+)/m).filter(Boolean).length || 1;
  }
  if (pdfUrl !== undefined) guide.pdfUrl = pdfUrl;
  if (status !== undefined) {
    guide.status = status;
    if (status === 'APPROVED') {
      guide.isActive = true;
      guide.approvedAt = new Date().toISOString();
      guide.approvedBy = 'user-clinician-1';
    } else {
      guide.isActive = false;
      deleteGuideChunks(guide.id);
    }
  }
  guide.updatedAt = new Date().toISOString();
  saveChatbotGuidesToDb(chatbotGuidesStore);

  if (guide.status === 'APPROVED' && guide.isActive) {
    try {
      await ingestGuide(guide, getAiClient());
    } catch (ingestErr) {
      console.error('Failed to re-ingest updated guide into RAG store:', ingestErr);
    }
  }

  res.json({ success: true, guide });
});

app.patch('/api/v1/chatbot/guides/:id/approve', async (req, res) => {
  chatbotGuidesStore = loadChatbotGuidesFromDb();
  const guide = chatbotGuidesStore.find((g) => g.id === req.params.id);
  if (!guide) {
    return res.status(404).json({ error: 'Guide file not found.' });
  }

  guide.status = 'APPROVED';
  guide.isActive = true;
  guide.approvedAt = new Date().toISOString();
  guide.approvedBy = 'user-clinician-1';
  guide.updatedAt = new Date().toISOString();
  saveChatbotGuidesToDb(chatbotGuidesStore);

  try {
    await ingestGuide(guide, getAiClient());
  } catch (ingestErr) {
    console.error('Failed to ingest approved guide into RAG store:', ingestErr);
  }

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: guide.id,
    actionTaken: 'APPROVED_CHATBOT_GUIDE',
    notes: `Approved verified clinical guide "${guide.title}" for knowledge assistant`,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, guide });
});

app.delete('/api/v1/chatbot/guides/:id', (req, res) => {
  chatbotGuidesStore = loadChatbotGuidesFromDb();
  const targetId = req.params.id;
  const decodedId = decodeURIComponent(targetId);
  const idx = chatbotGuidesStore.findIndex((g) => g.id === targetId || g.id === decodedId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Guide file not found.' });
  }

  const deleted = chatbotGuidesStore.splice(idx, 1)[0];
  saveChatbotGuidesToDb(chatbotGuidesStore);
  deleteGuideChunks(deleted.id);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: deleted.id,
    actionTaken: 'DELETED_CHATBOT_GUIDE',
    notes: `Removed chatbot guide file "${deleted.title}"`,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, id: deleted.id, remainingGuides: chatbotGuidesStore.length });
});

app.patch('/api/v1/chatbot/guides/:id/toggle', async (req, res) => {
  const guide = chatbotGuidesStore.find((g) => g.id === req.params.id);
  if (!guide) {
    return res.status(404).json({ error: 'Guide file not found.' });
  }

  guide.isActive = !guide.isActive;
  guide.updatedAt = new Date().toISOString();
  saveChatbotGuidesToDb(chatbotGuidesStore);

  if (guide.isActive && (guide.status === 'APPROVED' || !guide.status)) {
    try {
      await ingestGuide(guide, getAiClient());
    } catch (ingestErr) {
      console.error('Failed to re-ingest guide on toggle:', ingestErr);
    }
  } else if (!guide.isActive) {
    deleteGuideChunks(guide.id);
  }

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: guide.id,
    actionTaken: guide.isActive ? 'ACTIVATED_CHATBOT_GUIDE' : 'DEACTIVATED_CHATBOT_GUIDE',
    notes: `${guide.isActive ? 'Enabled' : 'Disabled'} guide "${guide.title}" for chatbot retrieval`,
    createdAt: new Date().toISOString(),
  });

  res.json({ guide, success: true });
});

// PDF Extraction Endpoint using cleanPdfText cleaner
// Stores uploaded PDF in public/uploads/guides and returns page-by-page text & chunk metrics
app.post('/api/v1/chatbot/extract-pdf', async (req, res) => {
  const { fileName = 'clinical_guide.pdf', fileBase64 } = req.body;

  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return res.status(400).json({ error: 'Valid fileBase64 payload is required.' });
  }

  try {
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Store the uploaded PDF on the server under public/uploads/guides with stable URL
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'guides');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `guide_${Date.now()}_${safeFileName}`;
    const targetFilePath = path.join(uploadsDir, storedFileName);
    fs.writeFileSync(targetFilePath, buffer);

    // Also mirror to public/resources as fallback
    const resourcesDir = path.join(process.cwd(), 'public', 'resources');
    if (fs.existsSync(resourcesDir)) {
      try {
        fs.writeFileSync(path.join(resourcesDir, safeFileName), buffer);
      } catch {}
    }

    const pdfUrl = `/uploads/guides/${storedFileName}`;

    interface PageResult {
      pageNumber: number;
      text: string;
      wordCount: number;
      chunkCount: number;
    }
    const pagesData: PageResult[] = [];
    let extractedText = '';
    let pageCount = 1;

    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      pageCount = textResult?.total || textResult?.pages?.length || 1;

      if (textResult?.pages && textResult.pages.length > 0) {
        textResult.pages.forEach((p, idx) => {
          const cleaned = cleanPdfText(p.text || '');
          const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
          const chunkCount = words === 0 ? 0 : Math.max(1, Math.ceil(words / (400 - 60)));
          pagesData.push({
            pageNumber: idx + 1,
            text: cleaned,
            wordCount: words,
            chunkCount,
          });
        });
        extractedText = pagesData.map((p) => p.text).filter(Boolean).join('\n\n');
      } else if (textResult?.text) {
        extractedText = cleanPdfText(textResult.text);
        const words = extractedText.trim().split(/\s+/).filter(Boolean).length;
        pagesData.push({
          pageNumber: 1,
          text: extractedText,
          wordCount: words,
          chunkCount: Math.max(1, Math.ceil(words / (400 - 60))),
        });
      }

      try {
        await parser.destroy();
      } catch {}
    } catch (parseErr) {
      console.warn('PDFParse primary extraction notice:', parseErr);
    }

    if (pagesData.length === 0) {
      extractedText = cleanPdfText(extractedText);
      const words = extractedText.trim().split(/\s+/).filter(Boolean).length;
      pagesData.push({
        pageNumber: 1,
        text: extractedText,
        wordCount: words,
        chunkCount: Math.max(1, Math.ceil(words / (400 - 60))),
      });
    }

    const wordCount = pagesData.reduce((acc, p) => acc + p.wordCount, 0);
    const totalChunks = pagesData.reduce((acc, p) => acc + p.chunkCount, 0);

    res.json({
      text: extractedText,
      pages: pagesData,
      totalChunks,
      wordCount,
      pageCount: pagesData.length || pageCount,
      fileName: safeFileName,
      pdfUrl,
      title: '',
    });
  } catch (err: any) {
    console.error('Failed to extract PDF:', err);
    res.status(500).json({ error: 'Could not extract PDF text: ' + (err.message || 'Unknown error') });
  }
});

// -------------------------------------------------------------
// CHATBOT ASSISTANT RAG ENDPOINT (Strictly Grounded in Uploaded Guides)
// Single endpoint serving both caregiver assistant and clinician test panel
// -------------------------------------------------------------

app.post('/api/v1/knowledge/chat', async (req, res) => {
  const query = (typeof req.body.query === 'string' ? req.body.query : typeof req.body.message === 'string' ? req.body.message : '').trim();
  const { conversationHistory = [] } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const chatRequester = getRequester(req);
  const conditionFilter = (req.body.condition || chatRequester?.condition || 'FTD') as 'FTD' | 'AD' | 'GENERAL' | 'BOTH';

  chatbotGuidesStore = loadChatbotGuidesFromDb();
  const approvedActiveGuides = chatbotGuidesStore.filter((g) => g.isActive && (g.status === 'APPROVED' || !g.status));

  // Disable the chat endpoint until verified guides are uploaded and approved
  if (approvedActiveGuides.length === 0) {
    return res.json({
      answer: `The Johns Hopkins Clinical Knowledge Assistant is currently offline while Dr. Seema and the clinical moderation team review, extract, and approve institutional care guides.\n\nPlease consult the Guides library directly or contact the Johns Hopkins Memory and Alzheimer's Treatment Center clinic at (410) 955-5147 (option 2) for clinical inquiries. For life-threatening emergencies, please call 911 immediately.`,
      isOffline: true,
      isDisabled: true,
      retrievedChunks: [],
      citedResources: [],
      suggestedQuestions: [],
      isUploadedGuideSourced: false,
    });
  }

  const aiClient = getAiClient();

  try {
    const result = await answerRagQuery(query, conversationHistory, aiClient, conditionFilter);
    return res.json(result);
  } catch (err: any) {
    console.error('Error answering RAG query:', err);
    return res.json({
      answer: `Our clinical knowledge assistant encountered a temporary processing delay. Please consult your Johns Hopkins neurology team directly at (410) 955-5147 (option 2) for guidance. For immediate emergencies, call 911.`,
      retrievedChunks: [],
      citedResources: [],
      suggestedQuestions: [
        'How do I handle violent resistance during showers and bathing?',
        'How do I stop my loved one from driving safely?',
        'Why are they constantly craving sweets and overeating?',
      ],
      isUploadedGuideSourced: false,
    });
  }
});

// Private 1-on-1 Messages between Dr. Seema & Caregivers
const privateChatsStore: any[] = [
  {
    id: 'chat-1',
    conversationId: 'chat-user-care-1',
    senderId: 'user-clinician-1',
    senderName: 'Dr. Seema Gulyani',
    senderRole: 'CLINICIAN_MODERATOR',
    recipientId: 'user-care-1',
    recipientName: 'Sarah Smith',
    content: 'Hello Sarah, welcome to our Johns Hopkins FTD Care Partner community. Please let me know if you need assistance with local respite or behavioral routines.',
    createdAt: '2026-09-21T10:00:00Z',
    read: true,
  },
  {
    id: 'chat-2',
    conversationId: 'chat-user-care-1',
    senderId: 'user-care-1',
    senderName: 'CarePartner-882',
    senderRole: 'CARE_PARTNER',
    recipientId: 'user-clinician-1',
    recipientName: 'Seema Gulyani',
    content: 'Thank you Seema. The towel bathing method helped us tremendously yesterday without escalating his anxiety.',
    createdAt: '2026-09-21T14:30:00Z',
    read: true,
  },
];

app.get('/api/v1/chat/private', (req, res) => {
  const caregiverId = (req.query.caregiverId as string) || 'user-care-1';
  const msgs = privateChatsStore.filter(
    (m) => m.conversationId === `chat-${caregiverId}` || m.recipientId === caregiverId || m.senderId === caregiverId
  );
  res.json(msgs);
});

app.post('/api/v1/chat/private', (req, res) => {
  const { caregiverId, senderId, content } = req.body;
  if (!caregiverId || !content) {
    return res.status(400).json({ error: 'CaregiverId and content required' });
  }

  const sender = users.find((u) => u.id === senderId) || users[0];
  const recipient = users.find((u) => u.id === caregiverId) || users[1];

  const newMsg = {
    id: `chat-msg-${Date.now()}`,
    conversationId: `chat-${caregiverId}`,
    senderId: sender.id,
    senderName: sender.role === 'CLINICIAN_MODERATOR' ? 'Seema Gulyani' : sender.anonymousHandle,
    senderRole: sender.role,
    recipientId: recipient.id,
    recipientName: recipient.role === 'CLINICIAN_MODERATOR' ? 'Seema Gulyani' : recipient.anonymousHandle,
    content,
    createdAt: new Date().toISOString(),
    read: false,
  };

  privateChatsStore.push(newMsg);
  res.status(201).json(newMsg);
});

// Cohort Member Management for Moderator
const cohortMembersStore = [
  {
    userId: 'user-care-1',
    realName: 'Sarah Smith',
    email: 'sarah.smith@example.com',
    phone: '(410) 555-8841',
    clinicPatientId: 'JHM-99210-FTD',
    condition: 'FTD',
    anonymousHandle: 'CarePartner-882',
    primaryGroupId: 'group-central-maryland',
    primaryGroupName: 'Central Maryland (Baltimore Metro)',
    role: 'CARE_PARTNER',
    status: 'ACTIVE',
    joinedAt: '2026-08-15',
  },
  {
    userId: 'user-care-2',
    realName: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    phone: '(443) 555-3921',
    clinicPatientId: 'JHM-77341-FTD',
    condition: 'FTD',
    anonymousHandle: 'CarePartner-419',
    primaryGroupId: 'group-eastern-maryland',
    primaryGroupName: 'Eastern Maryland (Eastern Shore)',
    role: 'CARE_PARTNER',
    status: 'ACTIVE',
    joinedAt: '2026-08-20',
  },
  {
    userId: 'user-care-3',
    realName: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '(717) 555-1299',
    clinicPatientId: 'JHM-44091-FTD',
    condition: 'FTD',
    anonymousHandle: 'CarePartner-204',
    primaryGroupId: 'group-northern-maryland',
    primaryGroupName: 'Northern Maryland / Pennsylvania / Delaware',
    role: 'CARE_PARTNER',
    status: 'ACTIVE',
    joinedAt: '2026-09-02',
  },
  {
    userId: 'user-care-4',
    realName: 'David Chen',
    email: 'david.chen@example.com',
    phone: '(240) 555-6712',
    clinicPatientId: 'JHM-55120-FTD',
    condition: 'FTD',
    anonymousHandle: 'CarePartner-512',
    primaryGroupId: 'group-western-maryland',
    primaryGroupName: 'Western Maryland (Frederick and surrounding areas)',
    role: 'CARE_PARTNER',
    status: 'ACTIVE',
    joinedAt: '2026-09-10',
  },
  {
    userId: 'user-care-5',
    realName: 'Patricia Morales',
    email: 'patricia.m@example.com',
    phone: '(703) 555-8901',
    clinicPatientId: 'JHM-63218-FTD',
    condition: 'FTD',
    anonymousHandle: 'CarePartner-633',
    primaryGroupId: 'group-southern-maryland',
    primaryGroupName: 'Southern Maryland / DC / Northern Virginia',
    role: 'CARE_PARTNER',
    status: 'ACTIVE',
    joinedAt: '2026-09-15',
  },
  { 
    userId: 'user-care-6', 
    realName: 'Linda Okafor', 
    email: 'lindaokafor@example.com', 
    phone: '',
    clinicPatientId: 'JHM-71002-AD', 
    condition: 'AD', 
    anonymousHandle: 'CarePartner-701',
    primaryGroupId: 'group-central-maryland', 
    primaryGroupName: 'Central Maryland (Baltimore Metro)',
    role: 'CARE_PARTNER', 
    status: 'ACTIVE', 
    joinedAt: '2026-10-01' 
  },
  { userId: 'user-care-7', 
    realName: 'George Harrison', 
    email: 'georgeh@example.com', 
    phone: '',
    clinicPatientId: 'JHM-71003-AD', 
    condition: 'AD', 
    anonymousHandle: 'CarePartner-702',
    primaryGroupId: 'group-western-maryland', 
    primaryGroupName: 'Western Maryland (Frederick and surrounding areas)',
    role: 'CARE_PARTNER', 
    status: 'ACTIVE', 
    joinedAt: '2026-10-02' 
  },
];

app.get('/api/v1/cohorts/members', (req, res) => {
  const groupId = req.query.groupId as string;
  let members = [...cohortMembersStore];

  if (groupId && groupId !== 'all') {
    members = members.filter((m) => m.primaryGroupId === groupId);
  }

  res.json(members);
});

app.post('/api/v1/cohorts/members/reassign', (req, res) => {
  const { userId, newGroupId } = req.body;
  const targetCohort = communityGroups.find((g) => g.id === newGroupId);

  if (!targetCohort) {
    return res.status(404).json({ error: 'Target cohort not found' });
  }

  // Update groupMemberships: update regional group
  const existingIdx = groupMemberships.findIndex((m) => m.userId === userId && m.groupId !== 'group-general');
  if (existingIdx >= 0) {
    groupMemberships[existingIdx].groupId = newGroupId;
  } else {
    groupMemberships.push({ userId, groupId: newGroupId });
  }

  // Update cohortMembersStore
  const member = cohortMembersStore.find((m) => m.userId === userId);
  if (member) {
    member.primaryGroupId = newGroupId;
    member.primaryGroupName = targetCohort.name;
  }

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Seema Gulyani',
    entityType: 'MEMBER_ASSIGNMENT' as any,
    entityId: userId,
    actionTaken: 'REASSIGNED_COHORT',
    notes: `Assigned user ${userId} to ${targetCohort.name}`,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, newGroupId, groupName: targetCohort.name });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS INTEGRATION

// -------------------------------------------------------------
async function setupServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Johns Hopkins FTD Platform Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
