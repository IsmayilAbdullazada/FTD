import {
  INITIAL_COMMENTS,
  INITIAL_GROUPS,
  INITIAL_POSTS,
  INITIAL_QUEUE_ITEMS,
  INITIAL_RESOURCES,
  INITIAL_USERS,
} from '../data/clinicalStore';
import {
  CalendarEvent,
  ClinicUpdate,
  DirectMessage,
  ModerationAuditEvent,
} from '../types';

export const communityFallbackStore: {
  users: typeof INITIAL_USERS;
  cohorts: typeof INITIAL_GROUPS;
  posts: typeof INITIAL_POSTS;
  comments: typeof INITIAL_COMMENTS;
  moderationQueue: typeof INITIAL_QUEUE_ITEMS;
  auditEvents: ModerationAuditEvent[];
  userCohortAssignments: Record<string, string>;
} = {
  users: [...INITIAL_USERS],
  cohorts: [...INITIAL_GROUPS],
  posts: [...INITIAL_POSTS],
  comments: [...INITIAL_COMMENTS],
  moderationQueue: [...INITIAL_QUEUE_ITEMS],
  auditEvents: [],
  userCohortAssignments: {
    'user-care-1': 'group-central-maryland',
    'user-care-2': 'group-eastern-maryland',
    'user-care-3': 'group-northern-maryland',
    'user-care-4': 'group-western-maryland',
    'user-care-5': 'group-southern-maryland',
    'user-care-6': 'group-central-maryland',
    'user-care-7': 'group-western-maryland',
  },
};

export const contentFallbackStore: {
  resources: typeof INITIAL_RESOURCES;
  updates: ClinicUpdate[];
  events: CalendarEvent[];
} = {
  resources: [...INITIAL_RESOURCES],
  updates: [
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
        'SAMPLE ENTRY: replace with verified information.\n\nWhat was approved and for which condition: [details]\nWhat it may mean for families: [plain-language summary]\n\nPlease do not start, stop, or change any medication based on this post. Discuss all medication questions with your care team.',
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
  ],
  events: [
    { id: 'evt-1', title: 'Caregiver Check-in', type: 'SUPPORT_GROUP', startsAt: '2026-10-14T18:00', location: 'Zoom (link sent by email)', description: 'Informal evening check-in for care partners.', authorId: 'user-clinician-1' },
    { id: 'evt-2', title: 'Baltimore Metro Support Group', type: 'SUPPORT_GROUP', startsAt: '2026-10-21T18:30', location: 'Johns Hopkins Outpatient Center, Baltimore', description: 'Monthly in-person group for Baltimore-area families.', authorId: 'user-clinician-1' },
    { id: 'evt-3', title: 'Care Partner Fall Lunch', type: 'SOCIAL', startsAt: '2026-10-25T12:00', location: 'TBD (Baltimore area)', description: 'A relaxed get-together. Loved ones are welcome.', authorId: 'user-clinician-1' },
    { id: 'evt-4', title: 'Care Partner Conference: Planning Ahead', type: 'CARE_PARTNER_CONFERENCE', startsAt: '2026-11-07T09:30', location: 'Hybrid: in person and Zoom', description: 'A half-day conference on legal, financial, and care planning.', authorId: 'user-clinician-1' },
    { id: 'evt-5', title: 'Eastern Shore Support Group', type: 'SUPPORT_GROUP', startsAt: '2026-11-12T17:30', location: 'Zoom', description: 'Virtual meeting for Eastern Shore families.', authorId: 'user-clinician-1' },
    { id: 'evt-6', title: 'Holiday Social Gathering', type: 'SOCIAL', startsAt: '2026-11-21T14:00', location: 'TBD', description: 'Seasonal get-together for care partners and families.', authorId: 'user-clinician-1' },
  ],
};

export const notificationFallbackStore: { messages: DirectMessage[] } = {
  messages: [
    {
      id: 'dm-1',
      recipientUserId: 'user-care-1',
      title: 'Post Approved: Bathing Aggression',
      message:
        'Your discussion query has been approved by Dr. Seema and published to the community.',
      type: 'APPROVAL',
      createdAt: '2026-09-20T10:15:00Z',
      read: true,
    },
  ],
};
