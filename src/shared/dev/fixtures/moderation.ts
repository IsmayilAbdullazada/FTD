import type { QueueItem } from '@/types';
import { INITIAL_GROUPS } from './groups';

export const INITIAL_QUEUE_ITEMS: QueueItem[] = [
  {
    id: 'post-pending-1',
    type: 'POST',
    author: {
      userId: 'user-care-1',
      realName: 'Sarah Smith',
      email: 'sarah.smith@example.com',
      phone: '(410) 555-8841',
      clinicPatientId: 'JHM-99210-FTD',
      anonymousHandle: 'User-882',
      avatarColor: '#1E40AF',
    },
    title:
      'Urgent: What dose of Seroquel should I give my father for night wandering?',
    rawContent:
      'He was pacing all night from 1 AM to 5 AM and almost fell down the back stairs. The prescription bottle says 25mg but should I increase it to 50mg tonight so he sleeps?',
    sanitizedContent:
      'He was pacing all night from 1 AM to 5 AM and almost fell down the back stairs. The prescription bottle says 25mg but should I increase it to 50mg tonight so he sleeps?',
    suggestedCohort: INITIAL_GROUPS[1],
    assignedGroupIds: ['group-central-maryland', 'group-general'],
    isUrgentClinical: true,
    phiAlerts: [],
    createdAt: '2026-09-28T09:45:00Z',
  },
  {
    id: 'post-pending-2',
    type: 'POST',
    author: {
      userId: 'user-care-2',
      realName: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: '(443) 555-3921',
      clinicPatientId: 'JHM-77341-FTD',
      anonymousHandle: 'User-419',
      avatarColor: '#047857',
    },
    title:
      'Has anyone tried high-dose Lion Mane mushroom extracts for reversing aphasia?',
    rawContent:
      'I saw an advertisement claiming Lion Mane mushroom tincture can regenerate frontal lobe neurons and reverse primary progressive aphasia. Should I buy this $180 supply?',
    sanitizedContent:
      'I saw an advertisement claiming Lion Mane mushroom tincture can regenerate frontal lobe neurons and reverse primary progressive aphasia. Should I buy this $180 supply?',
    suggestedCohort: INITIAL_GROUPS[2],
    assignedGroupIds: ['group-eastern-maryland', 'group-general'],
    phiAlerts: [],
    createdAt: '2026-09-28T10:10:00Z',
  },
  {
    id: 'post-pending-3',
    type: 'POST',
    author: {
      userId: 'user-care-3',
      realName: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '(717) 555-1299',
      clinicPatientId: 'JHM-44091-FTD',
      anonymousHandle: 'User-204',
      avatarColor: '#6D28D9',
    },
    title: 'Dispute with neighbor over wandering - need local advice',
    rawContent:
      'My husband Robert walked over to 412 Elm St and entered their backyard garden yesterday. The neighbor threatened to call the police. My cell is (410) 555-9122 if someone can call me.',
    sanitizedContent:
      'My husband [Name Redacted] walked over to [Local Address Redacted] and entered their backyard garden yesterday. The neighbor threatened to call the police.',
    suggestedCohort: INITIAL_GROUPS[3],
    assignedGroupIds: ['group-western-maryland', 'group-general'],
    phiAlerts: [
      {
        type: 'PERSON',
        text: 'Robert',
        startIndex: 11,
        endIndex: 17,
        explanation: 'Detected individual name associated with family member.',
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
        explanation: 'Detected direct phone number.',
      },
    ],
    createdAt: '2026-09-28T11:05:00Z',
  },
];
