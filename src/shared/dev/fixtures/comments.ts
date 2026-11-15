import type { Comment } from "@/types";

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: "comm-gen-1",
    postId: "post-general-1",
    content:
      'Seema Gulyani: Remember to break tasks into concrete 1-step tactile prompts (like folding warm towels or sorting familiar coins) rather than asking open-ended questions like "What do you want to do today?".',
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-18T12:00:00Z",
  },
  {
    id: "comm-1",
    postId: "post-1",
    content:
      'Seema Gulyani: Remember the "Towel Bathing" protocol listed in our care resources. Water spraying directly on the face triggers an involuntary fight-or-flight reflex in frontal lobe damage.',
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-20T11:00:00Z",
  },
  {
    id: "comm-2",
    postId: "post-1",
    content:
      "We started playing big-band jazz from his 20s about 15 minutes before the bathroom door even opened. It made a remarkable difference in keeping him grounded.",
    status: "APPROVED",
    author: {
      userId: "user-care-2",
      anonymousHandle: "User-419",
      badgeLabel: "Care Partner",
      avatarColor: "#047857",
    },
    createdAt: "2026-09-20T12:15:00Z",
  },
  {
    id: "comm-3",
    postId: "post-2",
    content:
      "We use the Tranquility Premium OverNight pull-ons. The outer layer is a breathable peach cloth texture rather than vinyl plastic, so there is almost no rustling sound.",
    status: "APPROVED",
    author: {
      userId: "user-care-1",
      anonymousHandle: "User-882",
      badgeLabel: "Care Partner",
      avatarColor: "#1E40AF",
    },
    createdAt: "2026-09-22T14:50:00Z",
  },
  {
    id: "comm-4",
    postId: "post-2",
    content:
      "Seema Gulyani: Look for tear-away side seams so you do not have to pull soiled garments down over shoes. Also ensure regular scheduled voiding every 90-120 minutes.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-22T15:20:00Z",
  },
  {
    id: "comm-5",
    postId: "post-2",
    content:
      "Replacing the white toilet seat with a dark blue one helped my mom find the toilet independently without having accidents right outside the door.",
    status: "APPROVED",
    author: {
      userId: "user-care-3",
      anonymousHandle: "User-204",
      badgeLabel: "Care Partner",
      avatarColor: "#6D28D9",
    },
    createdAt: "2026-09-22T16:05:00Z",
  },
  {
    id: "comm-6",
    postId: "post-3",
    content:
      "We consulted with an elder law attorney in Towson who helped us set up a special needs trust and protect spousal assets before Medicaid application. Maryland Legal Aid also has great caregiver resources.",
    status: "APPROVED",
    author: {
      userId: "user-care-2",
      anonymousHandle: "User-419",
      badgeLabel: "Care Partner",
      avatarColor: "#047857",
    },
    createdAt: "2026-09-24T16:30:00Z",
  },
  {
    id: "comm-7",
    postId: "post-4",
    content:
      "We lock the upper pantry with a discreet child magnetic latch (Tot-Lok) and leave a bowl of pre-sliced sweet apples and clementines on the counter. It redirects the visual foraging impulse toward healthy snacks.",
    status: "APPROVED",
    author: {
      userId: "user-care-1",
      anonymousHandle: "User-882",
      badgeLabel: "Care Partner",
      avatarColor: "#1E40AF",
    },
    createdAt: "2026-09-25T11:45:00Z",
  },
  {
    id: "comm-8",
    postId: "post-4",
    content:
      "Seema Gulyani: Hyperorality and carb craving reflect orbitofrontal and hypothalamic pathology. Do not scold or debate. Instead, control the food environment by keeping sweets out of visual sight and serving smaller portioned plates.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-25T13:30:00Z",
  },
  {
    id: "comm-9",
    postId: "post-5",
    content:
      "We use the Lingraphica TalkPath app and a laminated binder with high-contrast photos of our house and family members. Keeping categories simple (Food, Pain, Rest) reduced a lot of frustration.",
    status: "APPROVED",
    author: {
      userId: "user-care-4",
      anonymousHandle: "User-512",
      badgeLabel: "Care Partner",
      avatarColor: "#B45309",
    },
    createdAt: "2026-09-26T09:40:00Z",
  },
  {
    id: "comm-10",
    postId: "post-5",
    content:
      "Seema Gulyani: In semantic variant PPA, multimodal cueing (photograph + written word) works best because visual recognition outlasts word retrieval. Speech pathology can provide customized picture exchange boards.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-26T11:15:00Z",
  },
  {
    id: "comm-11",
    postId: "post-6",
    content:
      "We had the mechanic install a hidden battery kill switch under the steering column. We told my husband the car was in the shop awaiting parts, which avoided the direct confrontation of telling him he couldn’t drive.",
    status: "APPROVED",
    author: {
      userId: "user-care-1",
      anonymousHandle: "User-882",
      badgeLabel: "Care Partner",
      avatarColor: "#1E40AF",
    },
    createdAt: "2026-09-26T14:50:00Z",
  },
  {
    id: "comm-12",
    postId: "post-6",
    content:
      "We filed the confidential medical condition reporting form with the Maryland MVA. Having the state revoke the license took the blame completely off of me as the caregiver.",
    status: "APPROVED",
    author: {
      userId: "user-care-2",
      anonymousHandle: "User-419",
      badgeLabel: "Care Partner",
      avatarColor: "#047857",
    },
    createdAt: "2026-09-26T15:20:00Z",
  },
  {
    id: "comm-13",
    postId: "post-6",
    content:
      "Seema Gulyani: Excellent peer strategies. Frontal lobe anosognosia (lack of insight) means logic will not convince the patient. Blame the doctor or the state MVA, remove keys, and disable the vehicle physically. (Closing thread to preserve verified care guidance for reference).",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-27T16:00:00Z",
  },
  {
    id: "comm-14",
    postId: "post-7",
    content:
      "Morning bright light exposure helped us a lot. We sit by a 10,000 lux lightbox during breakfast for 30 minutes, and we completely cut out afternoon naps longer than 20 minutes.",
    status: "APPROVED",
    author: {
      userId: "user-care-4",
      anonymousHandle: "User-512",
      badgeLabel: "Care Partner",
      avatarColor: "#B45309",
    },
    createdAt: "2026-09-27T08:40:00Z",
  },
  {
    id: "comm-15",
    postId: "post-7",
    content:
      "Seema Gulyani: Maintain high physical activity before 2 PM. Avoid blue-light screens after 6 PM. If wandering at night persists, ensure safety gates are secured at top of staircases.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-27T10:00:00Z",
  },
  {
    id: "comm-16",
    postId: "post-8",
    content:
      "Wintergreen Adult Day in Rockville has experience with younger onset participants and offers structured sensory activities rather than sedentary TV watching.",
    status: "APPROVED",
    author: {
      userId: "user-care-1",
      anonymousHandle: "User-882",
      badgeLabel: "Care Partner",
      avatarColor: "#1E40AF",
    },
    createdAt: "2026-09-27T11:15:00Z",
  },
  {
    id: "comm-17",
    postId: "post-8",
    content:
      "Maryland Department of Aging Senior Care program helped subsidize 2 days a week for respite. Ask the Hopkins social worker for the referral.",
    status: "APPROVED",
    author: {
      userId: "user-care-4",
      anonymousHandle: "User-512",
      badgeLabel: "Care Partner",
      avatarColor: "#B45309",
    },
    createdAt: "2026-09-27T11:50:00Z",
  },
  {
    id: "comm-18",
    postId: "post-9",
    content:
      'We write the answer on a large whiteboard in clear black marker on the refrigerator: "Mail arrives at 2:00 PM." Whenever she asks, we gently point to the board together without saying a word.',
    status: "APPROVED",
    author: {
      userId: "user-care-3",
      anonymousHandle: "User-204",
      badgeLabel: "Care Partner",
      avatarColor: "#6D28D9",
    },
    createdAt: "2026-09-27T13:45:00Z",
  },
  {
    id: "comm-19",
    postId: "post-9",
    content:
      "Seema Gulyani: Repetitive questioning is an auditory perseveration caused by loss of memory-updating circuits. Responding verbally reinforces the loop. The visual whiteboard technique mentioned is proven to de-escalate anxiety.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-27T14:30:00Z",
  },
  {
    id: "comm-20",
    postId: "post-10",
    content:
      "Our bank insisted on their own proprietary POA form until our elder law attorney sent a letter citing the Maryland Statutory Form Limited Power of Attorney Act. That cleared it up immediately.",
    status: "APPROVED",
    author: {
      userId: "user-care-2",
      anonymousHandle: "User-419",
      badgeLabel: "Care Partner",
      avatarColor: "#047857",
    },
    createdAt: "2026-09-27T15:40:00Z",
  },
  {
    id: "comm-21",
    postId: "post-10",
    content:
      "Seema Gulyani: Note from clinic legal consult: Maryland enacted statutory protections requiring financial institutions to accept valid Maryland Statutory POAs within 7 business days unless good cause exists. Discussion closed as legal reference.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-28T09:00:00Z",
  },
  {
    id: "comm-22",
    postId: "post-11",
    content:
      "We serve food in divided suction bowls with only one small portion at a time. The rest stays in the kitchen until the first portion is finished. It prevents shoveling.",
    status: "APPROVED",
    author: {
      userId: "user-care-1",
      anonymousHandle: "User-882",
      badgeLabel: "Care Partner",
      avatarColor: "#1E40AF",
    },
    createdAt: "2026-09-27T17:40:00Z",
  },
  {
    id: "comm-23",
    postId: "post-11",
    content:
      "Seema Gulyani: Rapid wolfing of food is common in bvFTD. Use smaller dessert spoons instead of tablespoons, cut all meats into dime-sized bites, and ensure upright posture for 30 minutes after dining.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-27T19:00:00Z",
  },
  {
    id: "comm-24",
    postId: "post-12",
    content:
      "Reading this brought tears to my eyes. It feels like grieving someone who is still physically in the room. Thank you for putting words to what so many of us experience.",
    status: "APPROVED",
    author: {
      userId: "user-care-5",
      anonymousHandle: "User-633",
      badgeLabel: "Care Partner",
      avatarColor: "#0E7490",
    },
    createdAt: "2026-09-28T07:55:00Z",
  },
  {
    id: "comm-25",
    postId: "post-12",
    content:
      "Joining the Hopkins monthly caregiver support group helped me realize I wasn’t crazy or unloving for feeling exhausted by the emotional absence. You are doing heroic work.",
    status: "APPROVED",
    author: {
      userId: "user-care-3",
      anonymousHandle: "User-204",
      badgeLabel: "Care Partner",
      avatarColor: "#6D28D9",
    },
    createdAt: "2026-09-28T08:15:00Z",
  },
  {
    id: "comm-26",
    postId: "post-12",
    content:
      "Seema Gulyani: This is one of the most painful griefs in neurodegenerative disease — ambiguous loss. Please remember to schedule respite care for yourself. Protecting caregiver wellbeing is paramount.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-28T08:45:00Z",
  },
  {
    id: "comm-27",
    postId: "post-13",
    content:
      "We installed the YoLink LoRa wireless door sensors. They have zero sound at the door itself, and chime only on a small hub next to my bedside pillow.",
    status: "APPROVED",
    author: {
      userId: "user-care-2",
      anonymousHandle: "User-419",
      badgeLabel: "Care Partner",
      avatarColor: "#047857",
    },
    createdAt: "2026-09-28T09:05:00Z",
  },
  {
    id: "comm-28",
    postId: "post-13",
    content:
      "Seema Gulyani: Silent pager or phone notifications are ideal because audible blaring alarms trigger adrenaline and oppositional agitation.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-28T09:40:00Z",
  },
  {
    id: "comm-29",
    postId: "post-14",
    content:
      "We switched to OraNurse unflavored non-foaming toothpaste and the Triple Bristle 3-sided toothbrush which cleans all sides of the teeth in one quick pass.",
    status: "APPROVED",
    author: {
      userId: "user-care-1",
      anonymousHandle: "User-882",
      badgeLabel: "Care Partner",
      avatarColor: "#1E40AF",
    },
    createdAt: "2026-09-28T09:30:00Z",
  },
  {
    id: "comm-30",
    postId: "post-14",
    content:
      "Seema Gulyani: Foam and strong mint flavor often trigger choking fears or sensory disgust in FTD. 3-sided brushes cut brushing time from two minutes down to 30 seconds.",
    status: "APPROVED",
    author: {
      userId: "user-clinician-1",
      anonymousHandle: "Seema Gulyani",
      badgeLabel: "Clinician Moderator",
      avatarColor: "#002D72",
    },
    createdAt: "2026-09-28T10:00:00Z",
  },
];
