import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { CLINICAL_50_FAQ, searchClinicalFaq, generateLocalRagResponse, type ClinicalFaqItem } from './src/data/ragEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK on server-side if key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
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

// -------------------------------------------------------------
// IN-MEMORY RELATIONAL DATABASE STORE (Matches Schema Section 4.2)
// -------------------------------------------------------------

interface User {
  id: string;
  email: string;
  role: 'CARE_PARTNER' | 'CLINICIAN_MODERATOR' | 'SYSTEM_ADMIN';
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  clinicPatientId?: string; // e.g. JHM-99210-FTD
  isActive: boolean;
  anonymousHandle: string;
  avatarColor: string;
  badgeLabel: string;
  createdAt: string;
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
  diseaseDomain: 'FTD' | 'ALZHEIMERS' | 'LBD';
  category: 'INCONTINENCE' | 'LEGAL_MEDICAID' | 'BEHAVIORAL_AGITATION' | 'SAFETY_WANDERING' | 'COMMUNICATION_PPA' | 'NUTRITION_DIET';
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
  token: string;
  expiresAt: string;
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
    anonymousHandle: 'Dr. Seema Gulyani (Moderator)',
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
    isActive: true,
    anonymousHandle: 'CarePartner-633',
    avatarColor: '#0E7490',
    badgeLabel: 'Care Partner',
    createdAt: '2026-05-15T14:30:00Z',
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

const communityGroups: CommunityGroup[] = [
  {
    id: 'group-general',
    name: 'General Clinic Forum',
    fullName: 'General Clinic Forum (All Regions)',
    properName: 'General Clinic Forum',
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
    id: 'res-aftd-incontinence',
    title: 'AFTD Practical Care Sheet: Managing Incontinence in bvFTD',
    summary: 'Clinical guidelines on loss of bowel/bladder awareness, toileting schedules, and behavioral strategies without confrontation.',
    contentBody: `In Behavioral Variant FTD (bvFTD), incontinence often stems not from urological failure, but from frontal lobe disinhibition and loss of interoceptive awareness (inability to perceive body cues).

Key Strategies:
1. Scheduled Voiding Routine: Escort patient to restroom every 90-120 minutes on a fixed timer rather than asking "Do you need to go?" (asking frequently triggers automatic oppositional refusal).
2. Adaptive Garments: Tear-away side pull-ons with quiet cloth liners reduce tactile defensiveness compared to noisy plastic briefs.
3. Visual Cueing: Leave restroom door open with the toilet in direct sightline, illuminated by high-contrast warm lighting. Use contrasting color toilet seats (dark blue on white porcelain).
4. Fluid Management: Maintain high hydration during morning and early afternoon to prevent UTIs, but taper fluids 2 hours before bedtime.
5. Escalation Warning: Sudden acute incontinence or delirium may signal a urinary tract infection (UTI). Contact the clinic promptly for urinalysis.`,
    externalUrl: 'https://www.theaftd.org/living-with-ftd/managing-ftd/incontinence/',
    fileAttachmentUrl: '/resources/aftd-incontinence-guide.pdf',
    diseaseDomain: 'FTD',
    category: 'INCONTINENCE',
    keyTakeaways: [
      'Scheduled voiding every 90-120 minutes prevents resistance',
      'Use quiet cloth-backed tear-away briefs rather than crinkly plastic',
      'High-contrast colored toilet seat assists visual spatial processing',
      'Rule out UTI if sudden acute incontinence develops',
    ],
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'res-aftd-bathing',
    title: 'De-escalating Bathing and Shower Agitation in Frontotemporal Dementia',
    summary: 'Trauma-informed, non-pharmacological protocols for severe shower resistance, sponge throwing, and tactile hypersensitivity.',
    contentBody: `Shower aggression in FTD is almost always driven by sensory overload (the sound of rushing water, cold air, naked vulnerability) and loss of cognitive sequence comprehension.

Recommended Clinic Protocols:
1. Towel Bathing Method: Keep the patient wrapped in large warm bath towels. Uncover only one limb at a time to wash with warm, no-rinse soothing washcloths.
2. Ambient Preparation: Heat the bathroom to 78°F with a portable radiant heater before undressing begins. Run the water beforehand so the sound is constant rather than a sudden startling blast.
3. Remove Overhead Showers: Overhead water sprays directly onto the face feel like an assault to a disinhibited frontal lobe. Use a handheld wand directed strictly at the feet and torso.
4. Sing or Play Familiar Music: Familiar songs from early adulthood occupy the auditory cortex and decrease amygdala threat responses.
5. NEVER Argue or Restrain: If agitation escalates to physical defense, step back, ensure physical safety, disengage calmly, and re-attempt 45 minutes later with a different caregiver or technique.`,
    externalUrl: 'https://www.theaftd.org/living-with-ftd/managing-ftd/daily-care/',
    fileAttachmentUrl: '/resources/bathing-agitation-protocol.pdf',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'Pre-warm the bathroom to 78°F before undressing',
      'Utilize no-rinse warm towel bathing when showers cause terror',
      'Handheld shower wand directed away from face',
      'Music and step-by-step calm reassurance reduces fight-or-flight',
    ],
    createdAt: '2026-02-05T12:00:00Z',
  },
  {
    id: 'res-medicaid-legal',
    title: 'Medicaid Long-Term Care & Elder Law Resource Guide (Maryland & PA)',
    summary: 'Guidance on Medicaid five-year look-back, spousal impoverishment protections, and vetted elder law counsel in MD/PA.',
    contentBody: `Navigating long-term residential memory care placement requires early legal structuring before cognitive impairment prevents signing Powers of Attorney.

Crucial Facts for Care Partners:
1. Spousal Impoverishment Protections: In Maryland, the community spouse can retain the primary residence, one automobile, and a substantial Community Spouse Resource Allowance (CSRA) up to statutory limits (~$154,140 in 2026).
2. Five-Year Lookback Rule: Any gift or transfer of assets for less than fair market value within 60 months prior to Medicaid application triggers penalty periods.
3. Special Needs / Supplemental Trusts: Enable families to provide quality-of-life enhancements for the diagnosed individual without jeopardizing Medicaid eligibility.
4. Clinic Vetted Contacts: Maryland Legal Aid Senior Legal Helpline: 1-800-999-8904. National Academy of Elder Law Attorneys (NAELA) directory at naela.org.`,
    externalUrl: 'https://aging.maryland.gov/Pages/medicaid-long-term-care.aspx',
    fileAttachmentUrl: '/resources/md-medicaid-elder-law.pdf',
    diseaseDomain: 'FTD',
    category: 'LEGAL_MEDICAID',
    keyTakeaways: [
      'Community spouse retains primary home and protected asset allowance',
      'Beware 60-month lookback on uncompensated transfers',
      'Execute Durable Financial & Medical Powers of Attorney immediately',
      'Consult vetted NAELA-certified elder law counsel',
    ],
    createdAt: '2026-02-18T15:30:00Z',
  },
  {
    id: 'res-safety-wandering',
    title: 'FTD Wandering, Elopement & Impulsive Driving Risk Management',
    summary: 'Mitigating acute safety risks from loss of hazard awareness, GPS tracker placement, and driving retirement.',
    contentBody: `Unlike Alzheimer's wandering where patients are disoriented and looking for childhood homes, bvFTD wandering is frequently purposeful and rapid (e.g., compulsive walks along known routes or fixated shopping trips), but with total disregard for oncoming traffic.

Protocols:
1. Discrete GPS Tracking: Affix discreet Apple AirTags or AngelSense wearable devices in shoe insoles or jacket linings (wristwatches are often discarded).
2. Key Camouflage & Disabling: Discontinue driving privileges decisively. Hide car keys, install a battery disconnect switch or fuse-pull rather than debating driving competence.
3. Door Alarms: Install magnetic chime sensors on exterior doors placed at top of door frame outside normal line of sight.
4. Safe Return Registry: File a wandering profile with local Baltimore / county police departments including recent photo, favorite walking spots, and de-escalation instructions.`,
    externalUrl: 'https://www.theaftd.org/living-with-ftd/managing-ftd/safety/',
    fileAttachmentUrl: '/resources/wandering-safety-guide.pdf',
    diseaseDomain: 'FTD',
    category: 'SAFETY_WANDERING',
    keyTakeaways: [
      'Place GPS trackers in shoe insoles or sewn into jackets',
      'Physically disable vehicle rather than engaging in logic arguments',
      'Register with local county Safe Return police program',
      'High door-frame chimes alert family during night wandering',
    ],
    createdAt: '2026-03-05T09:15:00Z',
  },
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
    title: 'General Clinic Forum: Managing apathy vs depression in frontotemporal dementia',
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
    rawContent: 'Dr. Seema Gulyani: Great observation. Apathy does not equal clinical depression in FTD. Break activities down into simple 1-step tactile prompts (like folding warm towels or sorting coins) rather than asking "Do you want to do this?".',
    sanitizedContent: 'Dr. Seema Gulyani: Great observation. Apathy does not equal clinical depression in FTD. Break activities down into simple 1-step tactile prompts (like folding warm towels or sorting coins) rather than asking "Do you want to do this?".',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-18T12:00:00Z',
    createdAt: '2026-09-18T12:00:00Z',
  },
  {
    id: 'comm-1',
    postId: 'post-1',
    authorId: 'user-clinician-1',
    rawContent: 'Dr. Seema Gulyani: Great advice from the group. Remember the "Towel Bathing" protocol listed in our clinic resources. Water spraying directly on the face triggers an involuntary fight-or-flight reflex in frontal lobe damage.',
    sanitizedContent: 'Dr. Seema Gulyani: Great advice from the group. Remember the "Towel Bathing" protocol listed in our clinic resources. Water spraying directly on the face triggers an involuntary fight-or-flight reflex in frontal lobe damage.',
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
    rawContent: 'Dr. Seema Gulyani: Look for tear-away side seams so you do not have to pull soiled garments down over shoes. Also ensure regular scheduled voiding every 90-120 minutes.',
    sanitizedContent: 'Dr. Seema Gulyani: Look for tear-away side seams so you do not have to pull soiled garments down over shoes. Also ensure regular scheduled voiding every 90-120 minutes.',
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
];

const auditEvents: ModerationAuditEvent[] = [
  {
    id: 'audit-1',
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'POST',
    entityId: 'post-1',
    actionTaken: 'APPROVED',
    notes: 'Approved to Baltimore Cohort & General Forum with minor wording cleanup.',
    createdAt: '2026-09-20T10:15:00Z',
  },
  {
    id: 'audit-2',
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
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
    message: 'Your discussion query has been approved by Dr. Seema and published to the Baltimore Metro and General Clinic boards.',
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
    })),
  });
});

// Community Groups / Cohorts
app.get('/api/v1/cohorts', (req, res) => {
  const userId = (req.query.userId as string) || '';
  const role = (req.query.role as string) || 'CARE_PARTNER';

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
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'COHORT',
    entityId: newCohort.id,
    actionTaken: 'CREATED_COHORT',
    notes: `Dynamically provisioned regional cohort: ${name}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newCohort);
});

// Feed: Browse Posts (Strict Regional Isolation & RBAC)
app.get('/api/v1/posts', (req, res) => {
  const role = (req.query.role as string) || 'CARE_PARTNER';
  const groupId = req.query.groupId as string;
  const statusFilter = req.query.status as string;
  const currentUserId = (req.query.userId as string) || '';

  const allowedGroupIds = getUserAllowedGroups(currentUserId, role);

  let filtered = [...posts];

  // If Care Partner, show APPROVED posts plus the current user's own submitted posts
  if (role === 'CARE_PARTNER') {
    filtered = filtered.filter((p) => p.status === 'APPROVED' || (currentUserId && p.authorId === currentUserId));

    // STRICT REGIONAL BOUNDARY: Care Partners can only see posts in General Forum or their assigned regional cohort
    filtered = filtered.filter(
      (p) => p.assignedGroupIds.some((gId) => allowedGroupIds.includes(gId)) || (currentUserId && p.authorId === currentUserId)
    );
  } else if (statusFilter) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Filter by Group Visibility if specified
  if (groupId && groupId !== 'all') {
    if (role === 'CARE_PARTNER' && !allowedGroupIds.includes(groupId)) {
      return res.status(403).json({ error: 'You do not have access to this regional group.' });
    }
    filtered = filtered.filter((p) => p.assignedGroupIds.includes(groupId));
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
      author: authorProjection,
      assignedGroups,
      isUrgentClinical: p.isUrgentClinical,
      createdAt: p.createdAt,
      commentCount: comments.filter((c) => c.postId === p.id && c.status === 'APPROVED').length,
      upvotes: p.upvotes,
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
  const role = (req.query.role as string) || 'CARE_PARTNER';
  const post = posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const currentUserId = (req.query.userId as string) || '';
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
      author: projectAuthor(post.authorId, role),
      assignedGroups: communityGroups.filter((g) => post.assignedGroupIds.includes(g.id)),
      phiAlerts: role === 'CLINICIAN_MODERATOR' ? post.phiAlerts : undefined,
      createdAt: post.createdAt,
      commentCount: postComments.filter((c) => c.status === 'APPROVED').length,
      upvotes: post.upvotes,
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

  const approvedPosts = posts.filter((p) => p.status === 'APPROVED');
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
  const approvedPosts = posts.filter((p) => p.status === 'APPROVED');
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
      cohortName: assignedGroup?.properName || assignedGroup?.name || 'General Clinic Forum',
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

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // Run automated PII / PHI Scrubber
  const phiAlerts = scanForPhi(`${title} ${content}`);

  // Determine if it looks like an urgent clinical query
  const medicationKeywords = ['seroquel', 'haldol', 'haloperidol', 'donepezil', 'aricept', 'memantine', 'namenda', 'trazodone', 'dosage', 'dose', 'milligram', 'mg', 'prescribe'];
  const hasMedicationMention = medicationKeywords.some((w) => `${title} ${content}`.toLowerCase().includes(w));

  const newPost: Post = {
    id: `post-${Date.now()}`,
    authorId,
    title,
    rawContent: content,
    sanitizedContent: content,
    status: 'PENDING_MODERATION', // ZERO-TRUST GATE: Always pending!
    assignedGroupIds: targetCohortId ? [targetCohortId] : ['group-general'],
    suggestedCohortId: targetCohortId || 'group-general',
    phiAlerts,
    isUrgentClinical: hasMedicationMention,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    commentCount: 0,
    upvotes: 0,
  };

  posts.unshift(newPost);

  res.status(202).json({
    postId: newPost.id,
    status: 'PENDING_MODERATION',
    message: 'Your submission has been safely received. Dr. Seema reviews all posts within 24 hours to keep this community safe and accurate.',
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
        anonymousHandle: author?.anonymousHandle || 'CarePartner',
        avatarColor: author?.avatarColor || '#002D72',
      },
      title: p.title,
      rawContent: p.rawContent,
      sanitizedContent: p.sanitizedContent || p.rawContent,
      suggestedCohort: suggestedCohort || communityGroups[0],
      assignedGroupIds: p.assignedGroupIds,
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

    // Direct message to author
    directMessages.unshift({
      id: `dm-${Date.now()}`,
      recipientUserId: post.authorId,
      title: 'Your discussion query was approved',
      message: `Dr. Seema reviewed and approved your post: "${post.title}". It is now visible to peer care partners.`,
      type: 'APPROVAL',
      createdAt: now,
      read: false,
    });

    auditEvents.unshift({
      id: `audit-${Date.now()}`,
      moderatorId: 'user-clinician-1',
      moderatorName: 'Dr. Seema Gulyani',
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
      moderatorName: 'Dr. Seema Gulyani',
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
      title: 'Clinical Follow-up from Dr. Seema',
      message: 'Prescription, medication dosing, and acute safety queries cannot be handled on public peer boards. Dr. Seema has opened a private message thread with you to follow up directly.',
      type: 'CLINICAL_ESCALATION',
      createdAt: now,
      read: false,
    });

    auditEvents.unshift({
      id: `audit-${Date.now()}`,
      moderatorId: 'user-clinician-1',
      moderatorName: 'Dr. Seema Gulyani',
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
app.get('/api/v1/resources', (_req, res) => {
  res.json(clinicalResources);
});

app.post('/api/v1/resources', (req, res) => {
  const { title, category, summary, contentBody, diseaseDomain, externalUrl, keyTakeaways } = req.body;
  if (!title || !contentBody) {
    return res.status(400).json({ error: 'Title and contentBody required' });
  }

  const newRes: ClinicalResource = {
    id: `res-${Date.now()}`,
    title,
    category: category || 'BEHAVIORAL_AGITATION',
    summary: summary || title,
    contentBody,
    diseaseDomain: diseaseDomain || 'FTD',
    externalUrl: externalUrl || '',
    keyTakeaways: keyTakeaways || [],
    createdAt: new Date().toISOString(),
  };

  clinicalResources.unshift(newRes);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'RESOURCE' as any,
    entityId: newRes.id,
    actionTaken: 'CREATED_CLINICAL_RESOURCE',
    notes: `Added resource: "${title}" (${category})`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newRes);
});

// Clinic Updates (everyone reads, staff writes)
app.get('/api/v1/updates', (_req, res) => {
  const sorted = [...clinicUpdates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    moderatorName: 'Dr. Seema Gulyani',
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
app.get('/api/v1/events', (_req, res) => {
  const sorted = [...calendarEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  res.json(sorted);
});

app.post('/api/v1/events', (req, res) => {
  const { title, type, startsAt, location, description, authorId } = req.body;

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
    startsAt,
    location: location || '',
    description,
    authorId,
  };
  calendarEvents.push(event);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: authorId,
    moderatorName: 'Dr. Seema Gulyani',
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

// Clinician Invite Care Partner Endpoint (US-1.1)
app.post('/api/v1/auth/invitations', (req, res) => {
  const { email, firstName, lastName, clinicPatientId, primaryCohortSlug } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const token = `jh-token-${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const newInvitation: Invitation = {
    id: `inv-${Date.now()}`,
    email,
    firstName: firstName || 'Caregiver',
    lastName: lastName || '',
    clinicPatientId: clinicPatientId || '',
    primaryCohortSlug: primaryCohortSlug || 'baltimore-metro',
    token,
    expiresAt,
    status: 'DISPATCHED',
    createdAt: new Date().toISOString(),
  };

  invitations.unshift(newInvitation);

  auditEvents.unshift({
    id: `audit-${Date.now()}`,
    moderatorId: 'user-clinician-1',
    moderatorName: 'Dr. Seema Gulyani',
    entityType: 'USER',
    entityId: newInvitation.id,
    actionTaken: 'INVITED_CARE_PARTNER',
    notes: `Issued single-use invite for ${email} to cohort ${primaryCohortSlug}`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    invitationId: newInvitation.id,
    inviteToken: token,
    inviteExpiresAt: expiresAt,
    registrationUrl: `/register?token=${token}`,
    status: 'DISPATCHED',
  });
});

// Real-Time Pre-Submission Deflection (Section 6.3 & US-4.1)
app.post('/api/v1/knowledge/deflect', (req, res) => {
  const { draftText } = req.body;

  if (!draftText || typeof draftText !== 'string' || draftText.trim().length < 15) {
    return res.json({ deflectionMatches: [] });
  }

  const textLower = draftText.toLowerCase();

  // Find matching curated resources
  const resourceMatches: any[] = [];
  clinicalResources.forEach((resItem) => {
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
    .filter((p) => p.status === 'APPROVED')
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

// 50 Clinical FAQs Endpoint
app.get('/api/v1/knowledge/faq', (_req, res) => {
  res.json(CLINICAL_50_FAQ);
});

// Closed-Loop Clinician RAG Assistant (Section 7.1)
app.post('/api/v1/knowledge/chat', async (req, res) => {
  const { query, conversationHistory = [] } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  const queryLower = query.toLowerCase();

  // RULE 1 & 2: Prescription / medication dosage refusal gate
  const restrictedDrugs = [
    'seroquel', 'quetiapine', 'haloperidol', 'haldol', 'donepezil', 'aricept',
    'memantine', 'namenda', 'trazodone', 'risperidone', 'olanzapine', 'zyprexa',
    'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'xanax', 'alprazolam',
    'dose', 'dosage', 'milligrams', 'prescribe',
  ];

  const mentionsDrug = restrictedDrugs.some((d) => queryLower.includes(d));
  if (mentionsDrug) {
    return res.json({
      answer: `Prescription medications and drug dosages must be evaluated directly by your clinic medical team. Please reach out through the clinic direct line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For emergencies, call 911.`,
      isMedicationRefusal: true,
      citedResources: [],
      suggestedQuestions: [
        'How do I administer medicine safely when they spit pills out?',
        'What should I tell Emergency Room doctors about sedatives?',
        'How do I handle sudden acute agitation without sedatives?'
      ]
    });
  }

  // Check unverified supplements
  const unverifiedKeywords = ['ivermectin', 'coconut oil', 'lion mane', 'turmeric', 'hydroxychloroquine', 'cure'];
  if (unverifiedKeywords.some((u) => queryLower.includes(u))) {
    return res.json({
      answer: `I cannot provide guidance on unverified or speculative remedies. Dr. Seema’s repository only includes scientifically verified clinical protocols approved for Johns Hopkins FTD families. Please discuss any dietary supplements directly with your clinical neurology team at (410) 955-5147 (option 2).`,
      isMedicationRefusal: false,
      citedResources: [],
      suggestedQuestions: [
        'Why does my loved one crave sweets and carbohydrates?',
        'How do I manage rapid weight loss or gain?',
        'What are proven non-drug de-escalation techniques?'
      ]
    });
  }

  // RAG: Step 1 - Retrieve Top-K relevant clinical FAQs from 50 verified physician answers
  const topFaqMatches = searchClinicalFaq(query, 4);
  const bestFaq = topFaqMatches[0]?.item;

  // RAG: Step 2 - Compile Curated Clinical Context
  const faqContext = topFaqMatches
    .map(
      (m, idx) =>
        `CLINICAL Q&A #${idx + 1}:\nQUESTION: ${m.item.question}\nCATEGORY: ${m.item.categoryLabel}\nPHYSICIAN ANSWER:\n${m.item.physicianAnswer}\nKEY PROTOCOLS:\n${m.item.keyProtocols.map((p) => `- ${p}`).join('\n')}`
    )
    .join('\n\n--------------------------------\n\n');

  const resourceContext = clinicalResources
    .map(
      (r) =>
        `DOCUMENT TITLE: ${r.title}\nCATEGORY: ${r.category}\nSUMMARY: ${r.summary}\nCLINICAL BODY:\n${r.contentBody}\nKEY PROTOCOLS:\n${r.keyTakeaways.map((t) => `- ${t}`).join('\n')}`
    )
    .join('\n\n--------------------------------\n\n');

  const fullContextCorpus = `VERIFIED PHYSICIAN ANSWERS FROM DR. SEEMA'S 50-FAQ KNOWLEDGE BASE:\n\n${faqContext}\n\n================================\n\nAPPROVED CLINICAL GUIDES:\n\n${resourceContext}`;

  // If Gemini API is available on the server, execute Gemini with Grounded Context & Temperature 0.0
  if (ai) {
    try {
      const systemInstruction = `You are Dr. Seema Gulyani's Clinical Assistant for the Johns Hopkins Frontotemporal Dementia (FTD) clinic. You are speaking directly with family care partners (spouses, adult children, loved ones) who are often exhausted, overwhelmed, and looking for practical help.

YOUR ROLE & VOICE:
Speak with the warmth, compassion, and clarity of an experienced physician sitting down with a patient and their family. Speak in plain, human language that anyone can easily understand, regardless of their background or medical knowledge.

CRITICAL COMMUNICATION GUIDELINES:
1. PLAIN, HUMAN LANGUAGE:
   - Avoid medical jargon. If you explain what is happening in the brain, use simple, everyday analogies (e.g., "the brain's natural social filter," "the brain's internal starter switch," or "loss of brain awareness that anything is wrong").
   - Always validate the caregiver's experience: remind them that their loved one is NOT doing this on purpose, being mean, or stubborn—the illness is changing how their brain processes the world.

2. CLEAR, ACTIONABLE STRUCTURE:
   Structure your answer with clear, easy-to-read sections:
   - A brief, warm opening sentence acknowledging how challenging this symptom is.
   - ### Understanding What Is Happening: 1-2 short, plain-language paragraphs explaining why this happens without clinical coldness.
   - ### Practical Steps You Can Try: 3 to 4 numbered, step-by-step actions. Start each step with a bold action (e.g., "1. **Stay calm and redirect** — ..."). Give concrete, realistic ideas families can try immediately.
   - ### What to Keep in Mind: 2-3 brief, reassuring bullet points that give the caregiver peace of mind and remind them to be kind to themselves.

3. STRICT CLINICAL RULES:
   - Under NO circumstances recommend or discuss specific prescription drug dosages or off-label pharmaceuticals.
   - If the user asks about specific prescription medications (e.g., Seroquel, Haldol, Aricept, Trazodone), politely explain: "Prescription medications must be evaluated directly by your clinic medical team. Please reach out through the clinic direct line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For emergencies, call 911."
   - In physical danger or acute behavioral emergencies, calmly remind them to prioritize their physical safety and call 911.

4. FORMATTING:
   - Keep paragraphs short (2-3 sentences max).
   - Use bolding on key action titles so tired caregivers can quickly scan.
   - Never use robotic prefixes like "CLINICAL Q&A" or "Dr. Seema's Clinical Protocol for:". Address the user warmly and directly.

VERIFIED CLINICAL KNOWLEDGE CORPUS:
${fullContextCorpus}`;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });

      const answerText = response.text || '';

      // Match citations from approved resources & FAQs
      const citedResources: { id: string; title: string; url?: string }[] = [];
      if (bestFaq?.relatedGuideId && bestFaq?.relatedGuideTitle) {
        citedResources.push({
          id: bestFaq.relatedGuideId,
          title: bestFaq.relatedGuideTitle,
        });
      }

      clinicalResources.forEach((r) => {
        const cat = r.category.toLowerCase();
        const title = r.title.toLowerCase();
        if (
          (answerText.toLowerCase().includes(cat) || queryLower.includes(cat) || answerText.toLowerCase().includes(title.split(' ')[0])) &&
          !citedResources.some((c) => c.id === r.id)
        ) {
          citedResources.push({ id: r.id, title: r.title, url: r.externalUrl });
        }
      });

      const suggestedQuestions = CLINICAL_50_FAQ
        .filter((f: ClinicalFaqItem) => f.id !== bestFaq?.id)
        .slice(0, 3)
        .map((f: ClinicalFaqItem) => f.question);

      return res.json({
        answer: answerText,
        citedResources: citedResources.slice(0, 3),
        matchedFaq: bestFaq,
        suggestedQuestions,
      });
    } catch (genAiError) {
      console.warn('Gemini generation unavailable or quota reached, using clinical RAG database:', genAiError);
    }
  }

  // High-Precision Deterministic Clinical RAG Fallback
  const localRag = generateLocalRagResponse(query);
  return res.json(localRag);
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
    recipientName: 'Dr. Seema Gulyani',
    content: 'Thank you Dr. Seema. The towel bathing method helped us tremendously yesterday without escalating his anxiety.',
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
    senderName: sender.role === 'CLINICIAN_MODERATOR' ? 'Dr. Seema Gulyani' : sender.anonymousHandle,
    senderRole: sender.role,
    recipientId: recipient.id,
    recipientName: recipient.role === 'CLINICIAN_MODERATOR' ? 'Dr. Seema Gulyani' : recipient.anonymousHandle,
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
    anonymousHandle: 'CarePartner-633',
    primaryGroupId: 'group-southern-maryland',
    primaryGroupName: 'Southern Maryland / DC / Northern Virginia',
    role: 'CARE_PARTNER',
    status: 'ACTIVE',
    joinedAt: '2026-09-15',
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
    moderatorName: 'Dr. Seema Gulyani',
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
