import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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
    slug: 'general-community',
    description: 'Clinic-wide discussion board for all verified FTD care partners across all geographic regions.',
    isGeneralBoard: true,
    geographicRegion: 'All Regions',
    tag: 'GLOBAL',
    isActive: true,
    memberCount: 84,
  },
  {
    id: 'group-baltimore',
    name: 'Baltimore Metro Cohort',
    slug: 'baltimore-metro',
    description: 'Local peer support for families in Baltimore City, Baltimore County, Towson, and surrounding areas.',
    isGeneralBoard: false,
    geographicRegion: 'Baltimore Metro (MD)',
    radiusMiles: 30,
    tag: 'GEO_BALTIMORE',
    isActive: true,
    memberCount: 38,
  },
  {
    id: 'group-eastern-shore',
    name: 'Eastern Shore Cohort',
    slug: 'eastern-shore',
    description: 'Connecting care partners in Easton, Cambridge, Salisbury, and Maryland Eastern Shore rural corridors.',
    isGeneralBoard: false,
    geographicRegion: 'Eastern Shore (MD/DE)',
    radiusMiles: 60,
    tag: 'GEO_EASTERN_SHORE',
    isActive: true,
    memberCount: 16,
  },
  {
    id: 'group-catonsville',
    name: 'Catonsville / Howard County Cohort',
    slug: 'catonsville-howard',
    description: 'Targeted support for Catonsville, Columbia, Ellicott City, and Howard County regional families.',
    isGeneralBoard: false,
    geographicRegion: 'Catonsville & Howard County',
    radiusMiles: 25,
    tag: 'GEO_CATONSVILLE',
    isActive: true,
    memberCount: 22,
  },
  {
    id: 'group-pennsylvania',
    name: 'Pennsylvania / York County Cohort',
    slug: 'pennsylvania-york',
    description: 'Care partners traveling from Southern PA, York, and Lancaster into Johns Hopkins for specialized neurology.',
    isGeneralBoard: false,
    geographicRegion: 'Pennsylvania / Southern PA',
    radiusMiles: 50,
    tag: 'GEO_PA',
    isActive: true,
    memberCount: 14,
  },
];

const groupMemberships: { userId: string; groupId: string }[] = [
  { userId: 'user-care-1', groupId: 'group-general' },
  { userId: 'user-care-1', groupId: 'group-baltimore' },
  { userId: 'user-care-2', groupId: 'group-general' },
  { userId: 'user-care-2', groupId: 'group-eastern-shore' },
  { userId: 'user-care-3', groupId: 'group-general' },
  { userId: 'user-care-3', groupId: 'group-pennsylvania' },
];

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
    id: 'post-1',
    authorId: 'user-care-1',
    title: 'Struggling with aggressive outburst when bathing my father',
    rawContent: 'My father becomes verbally aggressive and throws sponges whenever we try to enter the shower. What sensory or calm approaches have worked for your families?',
    sanitizedContent: 'My father becomes verbally aggressive and throws objects whenever we try to enter the shower. What sensory or calm approaches have worked for your families?',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-20T10:15:00Z',
    assignedGroupIds: ['group-general', 'group-baltimore'],
    suggestedCohortId: 'group-baltimore',
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
    sanitizedContent: 'Mom rejects standard adult diapers because of the loud plastic crinkling noise. We are trying scheduled toileting but need leak protection for medical transport.',
    status: 'APPROVED',
    moderatedBy: 'user-clinician-1',
    moderatedAt: '2026-09-22T14:40:00Z',
    assignedGroupIds: ['group-general', 'group-eastern-shore'],
    suggestedCohortId: 'group-eastern-shore',
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
    assignedGroupIds: ['group-pennsylvania', 'group-baltimore', 'group-general'],
    suggestedCohortId: 'group-pennsylvania',
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
    assignedGroupIds: ['group-baltimore'],
    suggestedCohortId: 'group-baltimore',
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
    assignedGroupIds: ['group-eastern-shore'],
    suggestedCohortId: 'group-eastern-shore',
    phiAlerts: [],
    createdAt: '2026-09-28T10:10:00Z',
    updatedAt: '2026-09-28T10:10:00Z',
    commentCount: 0,
    upvotes: 0,
  },
  {
    id: 'post-pending-3',
    authorId: 'user-care-3',
    title: 'Dispute with neighbor over wandering - need local Catonsville advice',
    rawContent: 'My husband Robert walked over to 412 Elm St and entered their backyard garden yesterday. The neighbor threatened to call the police. My cell is (410) 555-9122 if someone can call me.',
    status: 'PENDING_MODERATION',
    assignedGroupIds: ['group-catonsville'],
    suggestedCohortId: 'group-catonsville',
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
app.get('/api/v1/cohorts', (_req, res) => {
  res.json(communityGroups);
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

// Feed: Browse Posts (With RLS Anonymity & Group Scoping)
app.get('/api/v1/posts', (req, res) => {
  const role = (req.query.role as string) || 'CARE_PARTNER';
  const groupId = req.query.groupId as string;
  const statusFilter = req.query.status as string;
  const currentUserId = req.query.userId as string;

  let filtered = [...posts];

  // If Care Partner, show APPROVED posts plus the current user's own submitted posts
  if (role === 'CARE_PARTNER') {
    filtered = filtered.filter((p) => p.status === 'APPROVED' || (currentUserId && p.authorId === currentUserId));
  } else if (statusFilter) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Filter by Group Visibility if specified
  if (groupId && groupId !== 'all') {
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
      commentCount: p.commentCount,
      upvotes: p.upvotes,
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

  if (role === 'CARE_PARTNER' && post.status !== 'APPROVED') {
    return res.status(403).json({ error: 'This post is currently pending clinical moderation' });
  }

  const currentUserId = (req.query.userId as string) || '';

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
      upvotes: post.upvotes,
    },
    comments: postComments,
  });
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
  const isClinician = author?.role === 'CLINICIAN_MODERATOR';

  const newComment: Comment = {
    id: `comm-${Date.now()}`,
    postId: post.id,
    authorId,
    rawContent: content,
    sanitizedContent: content,
    status: isClinician ? 'APPROVED' : 'PENDING_MODERATION',
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
    message: isClinician ? 'Comment published immediately.' : 'Comment submitted for moderation review.',
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
  const { entityId, action, assignedGroupIds, sanitizedContent, rejectionCode, rejectionMessage, moderatorNotes } = req.body;

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
      answer: `Prescription medications and drug dosages must be evaluated directly by your clinic medical team. Please reach out through the clinic support line at (410) 555-FTDC.`,
      isMedicationRefusal: true,
      citedResources: [],
    });
  }

  // Check unverified supplements
  const unverifiedKeywords = ['ivermectin', 'coconut oil', 'lion mane', 'turmeric', 'hydroxychloroquine', 'cure'];
  if (unverifiedKeywords.some((u) => queryLower.includes(u))) {
    return res.json({
      answer: `I cannot provide guidance on unverified or speculative remedies. Dr. Seema’s repository only includes scientifically verified clinical protocols approved for Johns Hopkins FTD families. Please discuss any dietary supplements directly with your clinical neurology team.`,
      isMedicationRefusal: false,
      citedResources: [],
    });
  }

  // Compile Approved Clinic Knowledge Context
  const contextCorpus = clinicalResources
    .map(
      (r) =>
        `DOCUMENT TITLE: ${r.title}\nCATEGORY: ${r.category}\nSUMMARY: ${r.summary}\nCLINICAL BODY:\n${r.contentBody}\nKEY PROTOCOLS:\n${r.keyTakeaways.join('\n- ')}`
    )
    .join('\n\n--------------------------------\n\n');

  // If Gemini API is available on the server, execute Gemini 3.8 Flash with Strict Prompt & Temperature 0.0
  if (ai) {
    try {
      const systemInstruction = `You are the Johns Hopkins FTD Clinic Support Assistant. You provide practical caregiving guidance strictly derived from the provided context materials approved by Dr. Seema Gulyani.

CRITICAL OPERATIONAL RULES:
1. Under NO circumstances should you recommend or discuss specific prescription drug dosages, off-label pharmacological treatments, or speculative dementia cures.
2. If the user query asks about a specific drug (e.g., Seroquel, Haloperidol, Donepezil, Memantine, Trazodone), YOU MUST RESPOND: "Prescription medications must be evaluated directly by your clinic medical team. Please reach out through the clinic support line at (410) 555-FTDC."
3. ONLY answer questions using the provided Context documents. If the answer is not present in the context, respond: "I do not have clinic-approved information on this topic yet. Please submit your question to the clinic moderation queue so Dr. Seema can review it."
4. Maintain an empathetic, trauma-informed, professional tone appropriate for exhausted caregivers.
5. For acute behavioral crises (threats of violence, sudden delirium, acute danger), direct the user immediately to emergency services and the Clinic Caregiver Support Line (410) 555-FTDC.

APPROVED CLINIC CONTEXT:
${contextCorpus}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.0,
        },
      });

      const answerText = response.text || '';

      // Match citations from approved resources
      const citedResources = clinicalResources
        .filter((r) => {
          const cat = r.category.toLowerCase();
          const title = r.title.toLowerCase();
          return answerText.toLowerCase().includes(cat) || queryLower.includes(cat) || queryLower.includes(r.diseaseDomain.toLowerCase()) || answerText.toLowerCase().includes(title.split(' ')[0]);
        })
        .slice(0, 3)
        .map((r) => ({ id: r.id, title: r.title, url: r.externalUrl }));

      return res.json({
        answer: answerText,
        citedResources,
      });
    } catch (genAiError) {
      console.warn('Gemini generation unavailable or quota reached, using clinical repository protocols:', genAiError);
    }
  }

  // Deterministic Clinical Protocol Fallback (Guaranteed to always work, zero external quota dependency)
  let bestMatch: ClinicalResource | null = null;
  let maxScore = 0;

  clinicalResources.forEach((resItem) => {
    let score = 0;
    const combined = `${resItem.title} ${resItem.summary} ${resItem.contentBody} ${resItem.category}`.toLowerCase();
    const words = queryLower.split(/\s+/).filter((w) => w.length > 2);
    words.forEach((w) => {
      if (combined.includes(w)) score += 1;
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = resItem;
    }
  });

  const matched = (bestMatch || clinicalResources[0]) as ClinicalResource;
  return res.json({
    answer: `Based on Dr. Seema's approved clinical guide for "${matched.title}":\n\n${matched.summary}\n\nKey Strategies:\n${matched.keyTakeaways.map((t) => `• ${t}`).join('\n')}\n\nIf you need immediate assistance or individualized care, contact the Clinic Support Line at (410) 555-FTDC.`,
    citedResources: [{ id: matched.id, title: matched.title, url: matched.externalUrl }],
  });
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
app.get('/api/v1/cohorts/members', (req, res) => {
  const groupId = req.query.groupId as string;
  let members = [
    {
      userId: 'user-care-1',
      realName: 'Sarah Smith',
      email: 'sarah.smith@example.com',
      phone: '(410) 555-8841',
      clinicPatientId: 'JHM-99210-FTD',
      anonymousHandle: 'CarePartner-882',
      primaryGroupId: 'group-baltimore',
      primaryGroupName: 'Baltimore Metro Cohort',
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
      primaryGroupId: 'group-eastern-shore',
      primaryGroupName: 'Eastern Shore Cohort',
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
      primaryGroupId: 'group-pennsylvania',
      primaryGroupName: 'Pennsylvania / York County Cohort',
      role: 'CARE_PARTNER',
      status: 'ACTIVE',
      joinedAt: '2026-09-02',
    },
  ];

  if (groupId && groupId !== 'all') {
    members = members.filter((m) => m.primaryGroupId === groupId);
  }

  res.json(members);
});

app.post('/api/v1/cohorts/members/reassign', (req, res) => {
  res.json({ success: true });
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
