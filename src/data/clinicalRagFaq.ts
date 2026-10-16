export interface ClinicalFaqItem {
  id: string;
  category: string;
  categoryLabel: string;
  question: string;
  alternateQueries: string[];
  keywords: string[];
  physicianAnswer: string;
  keyProtocols: string[];
  relatedGuideId?: string;
  relatedGuideTitle?: string;
}

export const CLINICAL_50_FAQ: ClinicalFaqItem[] = [
  {
    id: 'faq-1',
    category: 'BEHAVIORAL_DISINHIBITION',
    categoryLabel: 'Behavior & Disinhibition',
    question: 'Why does my loved one make blunt, rude, or offensive comments in public, and how should I handle it?',
    alternateQueries: [
      'saying rude things in public',
      'no filter when talking to strangers',
      'offensive remarks in front of family',
      'social filter gone',
      'inappropriate comments at store',
      'embarrassing comments in public'
    ],
    keywords: ['filter', 'rude', 'blunt', 'offensive', 'public', 'disinhibition', 'embarrassing', 'social', 'insulting'],
    physicianAnswer: `In Behavioral Variant FTD (bvFTD), neurodegeneration damages the orbitofrontal cortex and anterior insula—the biological braking system for social conduct. Your loved one is not being intentionally malicious; the neural circuitry that filters thoughts before speaking has deteriorated.

Clinical Response Protocol:
1. Discreet "Companion Cards": Carry small, pre-printed cards that state: "My companion has a neurological condition causing involuntary blunt speech. Thank you for your patience and understanding." Hand these discreetly to cashiers, waitstaff, or bystanders without making a scene.
2. Avoid Public Confrontation: Never scold, debate, or demand an apology in the moment. A frontal-damaged brain cannot process social shame or meta-cognitive reasoning, and confrontation will escalate anxiety into anger.
3. Rapid Topic Redirection: Acknowledge neutrally ("Yes, that person has red hair. Look at these apples, help me pick three red ones") and physically pivot them away from the stimulus.
4. Pre-empt Fatigue & Hunger: Disinhibition spikes when patients are tired or sensory-overloaded. Schedule outings during optimal morning hours and keep trips brief.`,
    keyProtocols: [
      'Use discreet caregiver cards to explain neurological illness to strangers',
      'Never argue or demand apologies in public',
      'Redirect with tactile or visual tasks immediately',
      'Limit outings to quiet morning hours'
    ],
    relatedGuideId: 'res-aftd-bathing',
    relatedGuideTitle: 'De-escalating Agitation in Frontotemporal Dementia'
  },
  {
    id: 'faq-2',
    category: 'APATHY',
    categoryLabel: 'Apathy & Initiation',
    question: 'My loved one sits on the couch all day and shows zero motivation. Is this depression or FTD apathy?',
    alternateQueries: [
      'loss of motivation won’t do anything',
      'sits staring at the wall all day',
      'refuses to get off the couch',
      'is my spouse depressed or is it dementia',
      'zero interest in hobbies or family',
      'abulia and apathy'
    ],
    keywords: ['apathy', 'motivation', 'couch', 'depression', 'lazy', 'initiation', 'abulia', 'sitting', 'hobbies'],
    physicianAnswer: `Apathy is the single most common symptom of bvFTD, caused by atrophy in the anterior cingulate cortex and dorsolateral prefrontal circuits responsible for cognitive initiation. It is distinctly different from depression: depressed patients feel inner emotional distress, guilt, and sadness, whereas apathetic FTD patients generally feel neutral contentment and have lost the neural "ignition switch" to start activities.

Clinical Strategy:
1. Replace Open Questions with "Action Prompts": Asking "What would you like to do today?" requires executive planning they no longer possess. Instead, hand them their shoes and say: "It is 10:00 AM. We are walking to the mailbox together."
2. Provide Sensory Scaffolding: Initiate the first 20% of the task together. If gardening, place the trowel directly into their palm and scoop the first mound of soil together.
3. Don't Mistake Inertia for Resistance: They often genuinely enjoy the activity once initiated; getting over the starting threshold is where they need your external prefrontal lobe.
4. Avoid Constant Pressure: Allow scheduled quiet downtime without guilt. Forcing constant stimulation will cause irritation.`,
    keyProtocols: [
      'Apathy is neural ignition failure, not emotional sadness or laziness',
      'Use direct, gentle action prompts rather than open-ended choices',
      'Scaffold the start: do the first 20% of the action with them',
      'Keep a predictable visual schedule on the wall'
    ]
  },
  {
    id: 'faq-3',
    category: 'HYGIENE_BATHING',
    categoryLabel: 'Hygiene & Bathing',
    question: 'How do I handle violent resistance and panic during showers and personal bathing?',
    alternateQueries: [
      'screaming when taking a shower',
      'refuses to take a bath',
      'fighting during bathing',
      'hitting during washing',
      'afraid of water in the shower',
      'shower resistance tactics'
    ],
    keywords: ['shower', 'bath', 'bathing', 'water', 'wash', 'hygiene', 'fighting', 'screaming', 'soap', 'towel'],
    physicianAnswer: `Shower resistance in FTD is rarely about hygiene stubbornness; it is an acute terror response driven by sensory bombardment. Rushing water sounds deafening, cold bathroom air causes tactile shock, and being undressed by another person feels like a physical violation.

Dr. Seema's Bathing Protocol:
1. Warm Towel Bathing: Stop forced showers immediately. Cover the individual in large, pre-warmed bath towels. Wash only one limb at a time using warm, no-rinse soothing washcloths while the rest of their body stays covered and warm.
2. Room Heating: Warm the bathroom to 78°F (25°C) with a safe space heater before entering. Cold tiles and chilly air trigger immediate defensive fight-or-flight.
3. Eliminate Overhead Water: Never aim water at their face or head. Use a gentle handheld wand directed only at legs and back.
4. Auditory Calming: Play a continuous playlist of their favorite songs from their twenties to occupy the auditory cortex and damp down amygdala threat alarms.
5. Flexible Schedule: Full daily showers are not medically required. Sponge wash high-bacteria zones (underarms, groin) daily, and full sponge-baths twice a week.`,
    keyProtocols: [
      'Switch to warm, no-rinse towel bathing with body covered',
      'Pre-warm the bathroom to 78°F before undressing',
      'Never spray water overhead onto the face',
      'Play favorite music to dampen amygdala panic responses'
    ],
    relatedGuideId: 'res-aftd-bathing',
    relatedGuideTitle: 'De-escalating Bathing and Shower Agitation in Frontotemporal Dementia'
  },
];
