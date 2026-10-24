import {
  CurrentUser,
  PersonaOption,
  CommunityGroup,
  ClinicalResource,
  Post,
  Comment,
  QueueItem,
  ModerationAuditEvent,
  DirectMessage,
  DeflectionMatch,
  PhiAlert,
  RejectionReason,
} from '../types';

export const INITIAL_USERS: (CurrentUser & { phoneNumber?: string })[] = [
  {
    id: 'user-clinician-1',
    email: 'sgulyan1@jhmi.edu',
    role: 'CLINICIAN_MODERATOR',
    firstName: 'Seema',
    lastName: 'Gulyani',
    phoneNumber: '(410) 955-5000',
    clinicPatientId: 'STAFF-MD-409',
    anonymousHandle: 'Seema Gulyani',
    avatarColor: '#002D72',
    badgeLabel: 'Clinician Moderator',
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
    anonymousHandle: 'User-882',
    avatarColor: '#1E40AF',
    badgeLabel: 'Care Partner',
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
    anonymousHandle: 'User-419',
    avatarColor: '#047857',
    badgeLabel: 'Care Partner',
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
    anonymousHandle: 'User-204',
    avatarColor: '#6D28D9',
    badgeLabel: 'Care Partner',
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
    anonymousHandle: 'User-512',
    avatarColor: '#B45309',
    badgeLabel: 'Care Partner',
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
    anonymousHandle: 'User-633',
    avatarColor: '#0E7490',
    badgeLabel: 'Care Partner',
  },
  {
    id: 'user-admin-1',
    email: 'cs-admin@cs.jhu.edu',
    role: 'SYSTEM_ADMIN',
    firstName: 'Hopkins',
    lastName: 'CS Infrastructure Lead',
    anonymousHandle: 'JHU CS Admin',
    avatarColor: '#475569',
    badgeLabel: 'System Administrator',
  },
  {
    id: 'user-care-6',
    email: 'lindaokafor@example.com',
    role: 'CARE_PARTNER',
    firstName: 'Linda',
    lastName: 'Okafor',
    clinicPatientId: 'JHM-71002-AD',
    condition: 'AD',
    anonymousHandle: 'User-701',
    avatarColor: '#0F766E',
    badgeLabel: 'Care Partner',
  },
  {
    id: 'user-care-7',
    email: 'georgeh@example.com',
    role: 'CARE_PARTNER',
    firstName: 'George',
    lastName: 'Harrison',
    clinicPatientId: 'JHM-71003-AD',
    condition: 'AD',
    anonymousHandle: 'User-702',
    avatarColor: '#9333EA',
    badgeLabel: 'Care Partner',
  },
];

export const INITIAL_GROUPS: CommunityGroup[] = [
  {
    id: 'group-general',
    name: 'General Forum',
    fullName: 'General Forum (All Regions)',
    properName: 'General Forum',
    slug: 'general-community',
    description: 'Clinic-wide discussion board for all verified care partners across all geographic regions.',
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

export const INITIAL_RESOURCES: ClinicalResource[] = [
  {
    id: 'ftd-aggressive-behavior',
    title: 'Managing Aggressive Behavior in FTD',
    summary: 'Explores aggressive behavior in frontotemporal dementia (FTD), including possible triggers, changes in impulse control, and ways care partners can approach difficult situations while prioritizing safety.',
    contentBody: `Aggressive behavior can be challenging for people living with FTD and their care partners. Changes in behavior may be related to the disease and can affect communication, daily routines, and relationships.

Care partners can use this resource to better understand aggressive behavior, recognize situations in which it occurs, and consider how to respond in a calm and safety-conscious way. When documenting difficult episodes, it may help to note what happened before the behavior, the surrounding environment, and how the situation was resolved.

Behavior changes that are new, severe, or pose a safety risk should be discussed with an appropriate healthcare professional. This resource is intended to support understanding and caregiving, not replace individualized professional guidance.`,
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
      'Seek individualized professional guidance when behavior creates distress or risk.'
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

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-general-1',
    title: 'General Forum: Managing apathy vs depression in frontotemporal dementia',
    content: 'Dr. Seema explained that apathy in bvFTD stems from frontal executive disconnection, not emotional grief. What daily low-pressure routines or sensory tasks have helped keep your loved one gently engaged without triggering resistance?',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    assignedGroups: [INITIAL_GROUPS[0]],
    createdAt: '2026-09-18T10:00:00Z',
    commentCount: 1,
    upvotes: 9,
  },
  {
    id: 'post-1',
    title: 'Struggling with aggressive outburst when bathing my father',
    content: 'My father becomes verbally aggressive and throws objects whenever we try to enter the shower. What sensory or calm approaches have worked for your families in the Baltimore area?',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    assignedGroups: [INITIAL_GROUPS[1]],
    createdAt: '2026-09-20T08:30:00Z',
    commentCount: 2,
    upvotes: 7,
  },
  {
    id: 'post-2',
    title: 'Quiet tear-away brief recommendations for incontinence resistance?',
    content: 'Mom rejects standard adult diapers because of the loud plastic crinkling noise. We are trying scheduled toileting but need leak protection for medical transport across the Bay Bridge.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    assignedGroups: [INITIAL_GROUPS[2]],
    createdAt: '2026-09-22T12:00:00Z',
    commentCount: 3,
    upvotes: 11,
  },
  {
    id: 'post-3',
    title: 'Elder Law Attorney specializing in Maryland Medicaid Spend-Down',
    content: 'Can anyone recommend an elder law practice in Southern PA or Baltimore County who understands young-onset FTD and spousal asset protections?',
    status: 'APPROVED',
    author: {
      userId: 'user-care-3',
      anonymousHandle: 'User-204',
      badgeLabel: 'Care Partner',
      avatarColor: '#6D28D9',
    },
    assignedGroups: [INITIAL_GROUPS[5]],
    createdAt: '2026-09-24T15:00:00Z',
    commentCount: 1,
    upvotes: 5,
  },
  {
    id: 'post-4',
    title: 'Compulsive sweet cravings and carbohydrate binge eating in bvFTD',
    content: 'My husband has developed an insatiable craving for pastries, cookies, and ice cream. He searches the pantry continuously throughout the afternoon. What substitutions or lock mechanisms have helped prevent dangerous overeating?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-4',
      anonymousHandle: 'User-512',
      badgeLabel: 'Care Partner',
      avatarColor: '#B45309',
    },
    assignedGroups: [INITIAL_GROUPS[1], INITIAL_GROUPS[0]],
    createdAt: '2026-09-25T11:20:00Z',
    commentCount: 2,
    upvotes: 14,
  },
  {
    id: 'post-5',
    title: 'Communication boards & speech apps for semantic Primary Progressive Aphasia',
    content: 'Mom is losing word comprehension for nouns and everyday objects. We are trying visual flashcards but wonder if an iPad app with Hopkins speech-pathology backing exists. Looking for Western Maryland family experiences.',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-3',
      anonymousHandle: 'User-204',
      badgeLabel: 'Care Partner',
      avatarColor: '#6D28D9',
    },
    assignedGroups: [INITIAL_GROUPS[3], INITIAL_GROUPS[0]],
    createdAt: '2026-09-26T09:15:00Z',
    commentCount: 2,
    upvotes: 8,
  },
  {
    id: 'post-6',
    title: 'How to transition away from driving without escalating conflict',
    content: 'Our clinician recommended driving retirement after his cognitive driving assessment. He insists his license is still valid. Has anyone had success with Maryland MVA medical review or vehicle disablement strategies?',
    status: 'APPROVED',
    isClosed: true,
    closedAt: '2026-09-27T16:00:00Z',
    closedBy: 'user-clinician-1',
    author: {
      userId: 'user-care-5',
      anonymousHandle: 'User-633',
      badgeLabel: 'Care Partner',
      avatarColor: '#0E7490',
    },
    assignedGroups: [INITIAL_GROUPS[4], INITIAL_GROUPS[0]],
    createdAt: '2026-09-26T14:30:00Z',
    commentCount: 3,
    upvotes: 19,
  },
  {
    id: 'post-7',
    title: 'Severe night pacing and reversed circadian sleep rhythm',
    content: 'My father naps for two hours after lunch and then stays completely awake from 1:30 AM to 5:30 AM pacing the hallway. We have tried dimming lights and warm chamomile tea. Any non-drug strategies to shift his schedule?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    assignedGroups: [INITIAL_GROUPS[1], INITIAL_GROUPS[0]],
    createdAt: '2026-09-27T08:00:00Z',
    commentCount: 2,
    upvotes: 12,
  },
  {
    id: 'post-8',
    title: 'Adult day care centers equipped for young-onset FTD behaviors',
    content: 'Most senior day centers in Montgomery and Prince George’s County cater primarily to late-stage Alzheimer’s and cannot accommodate a physically active 58-year-old who wanders rapidly. Does anyone know programs with 1-on-1 supervision?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-5',
      anonymousHandle: 'User-633',
      badgeLabel: 'Care Partner',
      avatarColor: '#0E7490',
    },
    assignedGroups: [INITIAL_GROUPS[4], INITIAL_GROUPS[0]],
    createdAt: '2026-09-27T10:45:00Z',
    commentCount: 2,
    upvotes: 6,
  },
  {
    id: 'post-9',
    title: 'Responding to perseverative questioning and repetitive phrase loops',
    content: 'Mom repeats "What time is the mail arriving today?" every 4 minutes for hours at a time. Answering the question logically does not satisfy her. How do other care partners redirect without burning out?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    assignedGroups: [INITIAL_GROUPS[2], INITIAL_GROUPS[0]],
    createdAt: '2026-09-27T13:20:00Z',
    commentCount: 2,
    upvotes: 16,
  },
  {
    id: 'post-10',
    title: 'Financial Power of Attorney versus court-appointed guardianship',
    content: 'Our financial institution questioned an older durable financial POA because my husband is younger than standard retirement age. Has anyone had to petition circuit court for legal guardianship, or did updating the Hopkins medical certification resolve it?',
    status: 'APPROVED',
    isClosed: true,
    closedAt: '2026-09-28T09:00:00Z',
    closedBy: 'user-clinician-1',
    author: {
      userId: 'user-care-3',
      anonymousHandle: 'User-204',
      badgeLabel: 'Care Partner',
      avatarColor: '#6D28D9',
    },
    assignedGroups: [INITIAL_GROUPS[5], INITIAL_GROUPS[0]],
    createdAt: '2026-09-27T15:00:00Z',
    commentCount: 2,
    upvotes: 11,
  },
  {
    id: 'post-11',
    title: 'Managing rapid eating and choking precautions in progressive disease',
    content: 'Noticeable stuffing of mouth and swallowing large bites without chewing thoroughly. We scheduled a swallow study with speech pathology. What plate modifications or pacing utensils have worked for you at home?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-4',
      anonymousHandle: 'User-512',
      badgeLabel: 'Care Partner',
      avatarColor: '#B45309',
    },
    assignedGroups: [INITIAL_GROUPS[0]],
    createdAt: '2026-09-27T17:10:00Z',
    commentCount: 2,
    upvotes: 13,
  },
  {
    id: 'post-12',
    title: 'Coping with emotional blunting and loss of empathy in your partner',
    content: 'The hardest aspect of bvFTD for me has been the emotional flatness. When I injured my arm last week, my partner showed zero reaction. Seema reminded us this is anatomical damage to the ventromedial prefrontal cortex, not a choice. How do you process this grief?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    assignedGroups: [INITIAL_GROUPS[0]],
    createdAt: '2026-09-28T07:30:00Z',
    commentCount: 3,
    upvotes: 25,
  },
  {
    id: 'post-13',
    title: 'Quiet exterior door chime sensors for nocturnal wandering safety',
    content: 'We need chime sensors that ping our phones in the bedroom without sounding a loud screeching alarm downstairs that would startle my husband into panic. Looking for recommendations that work in multi-level Frederick houses.',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-4',
      anonymousHandle: 'User-512',
      badgeLabel: 'Care Partner',
      avatarColor: '#B45309',
    },
    assignedGroups: [INITIAL_GROUPS[3], INITIAL_GROUPS[0]],
    createdAt: '2026-09-28T08:45:00Z',
    commentCount: 2,
    upvotes: 9,
  },
  {
    id: 'post-14',
    title: 'Overcoming toothbrushing defensiveness and dental hygiene refusals',
    content: 'Brushing teeth has become a twice-daily battle. Mom clamps her jaw shut and swats the toothbrush away. Are there flavored non-foaming pastes, U-shaped silicone brushes, or specific positioning that helps?',
    status: 'APPROVED',
    isClosed: false,
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    assignedGroups: [INITIAL_GROUPS[2], INITIAL_GROUPS[0]],
    createdAt: '2026-09-28T09:15:00Z',
    commentCount: 2,
    upvotes: 7,
  },
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comm-gen-1',
    postId: 'post-general-1',
    content: 'Seema Gulyani: Remember to break tasks into concrete 1-step tactile prompts (like folding warm towels or sorting familiar coins) rather than asking open-ended questions like "What do you want to do today?".',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-18T12:00:00Z',
  },
  {
    id: 'comm-1',
    postId: 'post-1',
    content: 'Seema Gulyani: Remember the "Towel Bathing" protocol listed in our care resources. Water spraying directly on the face triggers an involuntary fight-or-flight reflex in frontal lobe damage.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-20T11:00:00Z',
  },
  {
    id: 'comm-2',
    postId: 'post-1',
    content: 'We started playing big-band jazz from his 20s about 15 minutes before the bathroom door even opened. It made a remarkable difference in keeping him grounded.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    createdAt: '2026-09-20T12:15:00Z',
  },
  {
    id: 'comm-3',
    postId: 'post-2',
    content: 'We use the Tranquility Premium OverNight pull-ons. The outer layer is a breathable peach cloth texture rather than vinyl plastic, so there is almost no rustling sound.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    createdAt: '2026-09-22T14:50:00Z',
  },
  {
    id: 'comm-4',
    postId: 'post-2',
    content: 'Seema Gulyani: Look for tear-away side seams so you do not have to pull soiled garments down over shoes. Also ensure regular scheduled voiding every 90-120 minutes.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-22T15:20:00Z',
  },
  {
    id: 'comm-5',
    postId: 'post-2',
    content: 'Replacing the white toilet seat with a dark blue one helped my mom find the toilet independently without having accidents right outside the door.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-3',
      anonymousHandle: 'User-204',
      badgeLabel: 'Care Partner',
      avatarColor: '#6D28D9',
    },
    createdAt: '2026-09-22T16:05:00Z',
  },
  {
    id: 'comm-6',
    postId: 'post-3',
    content: 'We consulted with an elder law attorney in Towson who helped us set up a special needs trust and protect spousal assets before Medicaid application. Maryland Legal Aid also has great caregiver resources.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    createdAt: '2026-09-24T16:30:00Z',
  },
  {
    id: 'comm-7',
    postId: 'post-4',
    content: 'We lock the upper pantry with a discreet child magnetic latch (Tot-Lok) and leave a bowl of pre-sliced sweet apples and clementines on the counter. It redirects the visual foraging impulse toward healthy snacks.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    createdAt: '2026-09-25T11:45:00Z',
  },
  {
    id: 'comm-8',
    postId: 'post-4',
    content: 'Seema Gulyani: Hyperorality and carb craving reflect orbitofrontal and hypothalamic pathology. Do not scold or debate. Instead, control the food environment by keeping sweets out of visual sight and serving smaller portioned plates.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-25T13:30:00Z',
  },
  {
    id: 'comm-9',
    postId: 'post-5',
    content: 'We use the Lingraphica TalkPath app and a laminated binder with high-contrast photos of our house and family members. Keeping categories simple (Food, Pain, Rest) reduced a lot of frustration.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-4',
      anonymousHandle: 'User-512',
      badgeLabel: 'Care Partner',
      avatarColor: '#B45309',
    },
    createdAt: '2026-09-26T09:40:00Z',
  },
  {
    id: 'comm-10',
    postId: 'post-5',
    content: 'Seema Gulyani: In semantic variant PPA, multimodal cueing (photograph + written word) works best because visual recognition outlasts word retrieval. Speech pathology can provide customized picture exchange boards.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-26T11:15:00Z',
  },
  {
    id: 'comm-11',
    postId: 'post-6',
    content: 'We had the mechanic install a hidden battery kill switch under the steering column. We told my husband the car was in the shop awaiting parts, which avoided the direct confrontation of telling him he couldn’t drive.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    createdAt: '2026-09-26T14:50:00Z',
  },
  {
    id: 'comm-12',
    postId: 'post-6',
    content: 'We filed the confidential medical condition reporting form with the Maryland MVA. Having the state revoke the license took the blame completely off of me as the caregiver.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    createdAt: '2026-09-26T15:20:00Z',
  },
  {
    id: 'comm-13',
    postId: 'post-6',
    content: 'Seema Gulyani: Excellent peer strategies. Frontal lobe anosognosia (lack of insight) means logic will not convince the patient. Blame the doctor or the state MVA, remove keys, and disable the vehicle physically. (Closing thread to preserve verified care guidance for reference).',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-27T16:00:00Z',
  },
  {
    id: 'comm-14',
    postId: 'post-7',
    content: 'Morning bright light exposure helped us a lot. We sit by a 10,000 lux lightbox during breakfast for 30 minutes, and we completely cut out afternoon naps longer than 20 minutes.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-4',
      anonymousHandle: 'User-512',
      badgeLabel: 'Care Partner',
      avatarColor: '#B45309',
    },
    createdAt: '2026-09-27T08:40:00Z',
  },
  {
    id: 'comm-15',
    postId: 'post-7',
    content: 'Seema Gulyani: Maintain high physical activity before 2 PM. Avoid blue-light screens after 6 PM. If wandering at night persists, ensure safety gates are secured at top of staircases.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-27T10:00:00Z',
  },
  {
    id: 'comm-16',
    postId: 'post-8',
    content: 'Wintergreen Adult Day in Rockville has experience with younger onset participants and offers structured sensory activities rather than sedentary TV watching.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    createdAt: '2026-09-27T11:15:00Z',
  },
  {
    id: 'comm-17',
    postId: 'post-8',
    content: 'Maryland Department of Aging Senior Care program helped subsidize 2 days a week for respite. Ask the Hopkins social worker for the referral.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-4',
      anonymousHandle: 'User-512',
      badgeLabel: 'Care Partner',
      avatarColor: '#B45309',
    },
    createdAt: '2026-09-27T11:50:00Z',
  },
  {
    id: 'comm-18',
    postId: 'post-9',
    content: 'We write the answer on a large whiteboard in clear black marker on the refrigerator: "Mail arrives at 2:00 PM." Whenever she asks, we gently point to the board together without saying a word.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-3',
      anonymousHandle: 'User-204',
      badgeLabel: 'Care Partner',
      avatarColor: '#6D28D9',
    },
    createdAt: '2026-09-27T13:45:00Z',
  },
  {
    id: 'comm-19',
    postId: 'post-9',
    content: 'Seema Gulyani: Repetitive questioning is an auditory perseveration caused by loss of memory-updating circuits. Responding verbally reinforces the loop. The visual whiteboard technique mentioned is proven to de-escalate anxiety.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-27T14:30:00Z',
  },
  {
    id: 'comm-20',
    postId: 'post-10',
    content: 'Our bank insisted on their own proprietary POA form until our elder law attorney sent a letter citing the Maryland Statutory Form Limited Power of Attorney Act. That cleared it up immediately.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    createdAt: '2026-09-27T15:40:00Z',
  },
  {
    id: 'comm-21',
    postId: 'post-10',
    content: 'Seema Gulyani: Note from clinic legal consult: Maryland enacted statutory protections requiring financial institutions to accept valid Maryland Statutory POAs within 7 business days unless good cause exists. Discussion closed as legal reference.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-28T09:00:00Z',
  },
  {
    id: 'comm-22',
    postId: 'post-11',
    content: 'We serve food in divided suction bowls with only one small portion at a time. The rest stays in the kitchen until the first portion is finished. It prevents shoveling.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    createdAt: '2026-09-27T17:40:00Z',
  },
  {
    id: 'comm-23',
    postId: 'post-11',
    content: 'Seema Gulyani: Rapid wolfing of food is common in bvFTD. Use smaller dessert spoons instead of tablespoons, cut all meats into dime-sized bites, and ensure upright posture for 30 minutes after dining.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-27T19:00:00Z',
  },
  {
    id: 'comm-24',
    postId: 'post-12',
    content: 'Reading this brought tears to my eyes. It feels like grieving someone who is still physically in the room. Thank you for putting words to what so many of us experience.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-5',
      anonymousHandle: 'User-633',
      badgeLabel: 'Care Partner',
      avatarColor: '#0E7490',
    },
    createdAt: '2026-09-28T07:55:00Z',
  },
  {
    id: 'comm-25',
    postId: 'post-12',
    content: 'Joining the Hopkins monthly caregiver support group helped me realize I wasn’t crazy or unloving for feeling exhausted by the emotional absence. You are doing heroic work.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-3',
      anonymousHandle: 'User-204',
      badgeLabel: 'Care Partner',
      avatarColor: '#6D28D9',
    },
    createdAt: '2026-09-28T08:15:00Z',
  },
  {
    id: 'comm-26',
    postId: 'post-12',
    content: 'Seema Gulyani: This is one of the most painful griefs in neurodegenerative disease — ambiguous loss. Please remember to schedule respite care for yourself. Protecting caregiver wellbeing is paramount.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-28T08:45:00Z',
  },
  {
    id: 'comm-27',
    postId: 'post-13',
    content: 'We installed the YoLink LoRa wireless door sensors. They have zero sound at the door itself, and chime only on a small hub next to my bedside pillow.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-2',
      anonymousHandle: 'User-419',
      badgeLabel: 'Care Partner',
      avatarColor: '#047857',
    },
    createdAt: '2026-09-28T09:05:00Z',
  },
  {
    id: 'comm-28',
    postId: 'post-13',
    content: 'Seema Gulyani: Silent pager or phone notifications are ideal because audible blaring alarms trigger adrenaline and oppositional agitation.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-28T09:40:00Z',
  },
  {
    id: 'comm-29',
    postId: 'post-14',
    content: 'We switched to OraNurse unflavored non-foaming toothpaste and the Triple Bristle 3-sided toothbrush which cleans all sides of the teeth in one quick pass.',
    status: 'APPROVED',
    author: {
      userId: 'user-care-1',
      anonymousHandle: 'User-882',
      badgeLabel: 'Care Partner',
      avatarColor: '#1E40AF',
    },
    createdAt: '2026-09-28T09:30:00Z',
  },
  {
    id: 'comm-30',
    postId: 'post-14',
    content: 'Seema Gulyani: Foam and strong mint flavor often trigger choking fears or sensory disgust in FTD. 3-sided brushes cut brushing time from two minutes down to 30 seconds.',
    status: 'APPROVED',
    author: {
      userId: 'user-clinician-1',
      anonymousHandle: 'Seema Gulyani',
      badgeLabel: 'Clinician Moderator',
      avatarColor: '#002D72',
    },
    createdAt: '2026-09-28T10:00:00Z',
  },
];

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
    title: 'Urgent: What dose of Seroquel should I give my father for night wandering?',
    rawContent: 'He was pacing all night from 1 AM to 5 AM and almost fell down the back stairs. The prescription bottle says 25mg but should I increase it to 50mg tonight so he sleeps?',
    sanitizedContent: 'He was pacing all night from 1 AM to 5 AM and almost fell down the back stairs. The prescription bottle says 25mg but should I increase it to 50mg tonight so he sleeps?',
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
    title: 'Has anyone tried high-dose Lion Mane mushroom extracts for reversing aphasia?',
    rawContent: 'I saw an advertisement claiming Lion Mane mushroom tincture can regenerate frontal lobe neurons and reverse primary progressive aphasia. Should I buy this $180 supply?',
    sanitizedContent: 'I saw an advertisement claiming Lion Mane mushroom tincture can regenerate frontal lobe neurons and reverse primary progressive aphasia. Should I buy this $180 supply?',
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
    rawContent: 'My husband Robert walked over to 412 Elm St and entered their backyard garden yesterday. The neighbor threatened to call the police. My cell is (410) 555-9122 if someone can call me.',
    sanitizedContent: 'My husband [Name Redacted] walked over to [Local Address Redacted] and entered their backyard garden yesterday. The neighbor threatened to call the police.',
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
