import type { ClinicalResource } from '@/types';

export const INITIAL_RESOURCES: ClinicalResource[] = [
  {
    id: 'ftd-aggressive-behavior',
    title: 'Managing Aggressive Behavior in FTD',
    summary:
      'Explores aggressive behavior in frontotemporal dementia (FTD), including possible triggers, changes in impulse control, and ways care partners can approach difficult situations while prioritizing safety.',
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
      'Seek professional guidance when behavior changes are severe, new, or difficult to manage.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-lack-of-insight',
    title: 'Everything Is Just Fine: Lack of Insight in FTD',
    summary:
      'An AFTD newsletter resource exploring reduced awareness of behavioral or cognitive changes in FTD and the challenges this can create for care partners.',
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
      'Consult the care team about persistent disagreements involving support or safety.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-apathy',
    title: 'Understanding Apathy in FTD',
    summary:
      'An AFTD newsletter resource about apathy in FTD, including changes in motivation, initiative, and engagement that may affect everyday activities and caregiving.',
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
      'Discuss significant changes in daily functioning with the healthcare team.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-compulsive-behaviors',
    title: 'Compulsive Behaviors in FTD',
    summary:
      'AFTD resources about compulsive and repetitive behaviors in FTD, helping care partners understand behavioral changes and explore relevant support strategies.',
    contentBody: `Repetitive or compulsive behaviors can occur in FTD and may become part of a person's daily routine. These behaviors can be confusing or disruptive for families, especially when they interfere with meals, activities, relationships, or other responsibilities.

Care partners can observe the type of behavior, when it occurs, and whether it creates distress or safety concerns. Understanding its pattern can help families discuss the behavior more clearly with the person's healthcare team.

Responses should take into account the person's dignity, comfort, and safety. If a repetitive behavior is harmful, causes significant distress, or substantially disrupts daily life, seek individualized guidance from a qualified professional.

The attached newsletter and linked AFTD resource provide additional context about compulsive behaviors in FTD.`,
    fileAttachmentUrl: '/resources/July-2012.pdf',
    externalUrl:
      'https://www.theaftd.org/help-and-hope/ta-compulsive-behaviors/',
    diseaseDomain: 'FTD',
    category: 'BEHAVIORAL_AGITATION',
    keyTakeaways: [
      'Repetitive and compulsive behaviors can be part of the behavioral changes associated with FTD.',
      'Observe patterns and consider whether a behavior creates distress or a safety concern.',
      'Responses should preserve dignity and avoid unnecessary confrontation.',
      'Seek professional guidance when behaviors interfere with daily life or create risk.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-hospice-care',
    title: 'Hospice Care in FTD',
    summary:
      'An AFTD newsletter resource introducing hospice care for people with FTD and providing families with information to explore as care needs change.',
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
      'Eligibility and services depend on individual circumstances.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-driving',
    title: 'Driving and FTD',
    summary:
      'AFTD resources about how FTD-related changes may affect driving, how families can navigate driving-related decisions, and where care partners can seek guidance.',
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
      'Prioritize safety when making decisions about driving.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-loss-of-empathy',
    title: 'The Loss of Empathy and Connection in FTD',
    summary:
      'An AFTD newsletter resource exploring changes in empathy and interpersonal connection in FTD and the emotional impact these changes may have on family relationships.',
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
      'Care partners deserve emotional support as relationships and responsibilities change.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-incontinence',
    title: 'Incontinence in FTD',
    summary:
      'An AFTD newsletter resource about incontinence in FTD, addressing a challenging aspect of daily care that can affect comfort, dignity, and caregiving routines.',
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
      'Do not assume new incontinence is caused solely by FTD.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-resistant-behavior',
    title: 'Approaches to Resistant Behavior in FTD',
    summary:
      'An AFTD newsletter resource about resistance to care in FTD and approaches care partners can explore when everyday activities become difficult.',
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
      'Seek professional guidance when resistance interferes with essential care or safety.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-roaming',
    title: 'Roaming in FTD',
    summary:
      'An AFTD newsletter resource about roaming in FTD and the safety considerations families may need to address when a person walks or leaves familiar surroundings.',
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
      'Contact emergency services if the person is missing or in immediate danger.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-sexual-behavior',
    title: 'Sexual Behavior in FTD',
    summary:
      'An AFTD newsletter resource about changes in sexual behavior and boundaries in FTD, a topic that may raise sensitive questions about relationships, dignity, and safety.',
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
      'Seek individualized professional guidance when behavior creates distress or risk.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-sleep',
    title: 'Sleep Issues in FTD',
    summary:
      'A resource about sleep-related difficulties in FTD and how changes in sleep may affect daily routines, the person living with FTD, and their care partner.',
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
      'Consider the needs of the care partner as well as the person living with FTD.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'ftd-grief',
    title: 'Grief and the FTD Journey',
    summary:
      'AFTD resources about grief and emotional challenges throughout the FTD journey, with information for care partners navigating changes in relationships, responsibilities, and family life.',
    contentBody: `FTD can bring changes to relationships, shared plans, family responsibilities, and expectations for the future. Care partners may experience grief at different points throughout the journey, including while the person they care about is still living.

There is no single correct way to experience grief. Feelings may change over time, and care partners may need different forms of support as circumstances evolve. Talking with trusted people, connecting with other care partners, and seeking professional support can provide opportunities to share difficult experiences.

Care partners should also recognize their own needs and limits. Seeking support is a valid part of caring for someone living with FTD, not a failure to provide care.`,
    externalUrl:
      'https://www.theaftd.org/help-and-hope/hs-grief-and-the-ftd-journey/',
    fileAttachmentUrl: '/resources/AFTDGriefBookletForWeb.pdf',
    diseaseDomain: 'FTD',
    category: 'CAREGIVER_SUPPORT',
    keyTakeaways: [
      'Grief can occur throughout the FTD journey, not only after a death.',
      'Care partners may experience changing and sometimes conflicting emotions.',
      'Peer support, trusted relationships, and professional help are options to explore.',
      'Care-partner well-being is an important part of the caregiving journey.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'res-ad-alzheimers-association',
    title: "Alzheimer's Association: Caregiving and Dementia Resources",
    summary:
      'A resource hub for people affected by Alzheimer’s disease and other dementias, with educational information, caregiving guidance, community resources, and support for families.',
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
      'Visit the organization’s website for current support options and contact information.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'res-both-yes-support',
    title: 'YES! Young-onset Dementia Education and Support',
    summary:
      'An organization supporting people and families affected by young-onset dementia, with resources to explore education, peer connection, and support for care partners and family members.',
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
      'Check the organization’s website for current programs and eligibility.',
    ],
    createdAt: '2026-10-22T12:00:00Z',
  },
];
