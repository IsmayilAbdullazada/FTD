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
  {
    id: 'faq-4',
    category: 'REPETITIVE_BEHAVIORS',
    categoryLabel: 'Compulsions & Pacing',
    question: 'Why does my loved one pace constantly or perform compulsive tapping and clapping?',
    alternateQueries: [
      'walking laps around the house non-stop',
      'repetitive tapping fingers or humming',
      'compulsive clapping or counting',
      'pacing back and forth all day',
      'motor stereotypies in dementia',
      'restless walking loops'
    ],
    keywords: ['pacing', 'compulsive', 'tapping', 'clapping', 'walking', 'repetitive', 'stereotypy', 'motor', 'restless'],
    physicianAnswer: `Repetitive motor stereotypies—such as walking identical floor patterns, clapping, foot tapping, or humming—stem from striatal-frontal circuit disruption in FTD. These repetitive behaviors serve as an unconscious soothing mechanism to regulate internal neurological restlessness.

Clinical Management:
1. Channel Rather Than Restrict: Unless pacing presents a fall risk, do not physically block or stop them. Forcing them to sit down will convert peaceful pacing into explosive agitation.
2. Create a Clear "Walking Track": Remove throw rugs, secure loose cords, and clear a circular indoor hallway path where they can pace safely.
3. Supportive Footwear: Provide sturdy, non-skid, orthotic supportive shoes to prevent plantar fasciitis and blisters from high daily step counts.
4. Tactile Replacement Objects: Offer textured sensory items like fidget muffs, smooth worry stones, or folded towels to fold and unfold if their hands are compulsively restless.
5. Caloric Compensation: Pacing burns hundreds of extra calories daily. Offer frequent hydration and nutrient-dense, high-protein finger foods.`,
    keyProtocols: [
      'Do not physically block harmless pacing; channel it into a safe walking path',
      'Ensure non-skid footwear to prevent blisters and falls',
      'Provide tactile substitutes like fidget objects or laundry to fold',
      'Increase caloric and fluid intake to offset high energy expenditure'
    ]
  },
  {
    id: 'faq-5',
    category: 'NUTRITION_HYPERORALITY',
    categoryLabel: 'Diet & Sweet Cravings',
    question: 'Why is my spouse constantly craving sweets, overeating, or putting non-food items in their mouth?',
    alternateQueries: [
      'eating entire boxes of cookies',
      'obsessed with sugar and candy',
      'eating non food items hyperorality',
      'stealing food from others plates',
      'binge eating in FTD',
      'putting objects in mouth'
    ],
    keywords: ['sweets', 'sugar', 'eating', 'food', 'hyperorality', 'candy', 'cookies', 'binge', 'mouth', 'choking'],
    physicianAnswer: `Hyperorality and altered dietary preferences are hallmark symptoms of bvFTD, caused by atrophy in the hypothalamus and insular cortex that regulate satiety and taste perception. Patients often develop an insatiable craving for carbohydrates and sweets, and in later stages may mouth inedible objects (Klüver-Bucy syndrome features).

Clinical Safety Strategies:
1. Environmental Control: Lock pantries and refrigerators if necessary. Keep sweet treats out of sight. A person with FTD will eat whatever is visible regardless of fullness.
2. Healthier Sweet Substitutions: Offer naturally sweet, fiber-rich alternatives: sliced strawberries with a dusting of cinnamon, frozen grapes, vanilla-flavored Greek yogurt, or sugar-free pudding.
3. Plate Portioning: Serve meals in individual small bowls rather than family-style platters to prevent rapid overeating or taking food from others.
4. Non-Food Item Safeguards: Lock away small choking hazards, buttons, detergent pods, decorative soaps, and toxic cleaning supplies. If they mouth items, substitute with safe chewing sensory aids (e.g., silicone chewable necklaces).`,
    keyProtocols: [
      'Lock pantries and keep high-sugar snacks out of plain sight',
      'Substitute with sweet fruits, protein yogurt, and low-sugar alternatives',
      'Serve single-portioned plates rather than open buffet-style food',
      'Store toxic cleaning products and small objects under child-proof locks'
    ]
  },
  {
    id: 'faq-6',
    category: 'NUTRITION_HYPERORALITY',
    categoryLabel: 'Swallowing & Choking',
    question: 'My loved one shovels food rapidly and does not chew. How do I prevent choking?',
    alternateQueries: [
      'stuffing mouth too fast food',
      'swallowing without chewing',
      'choking risk while eating',
      'coughing during meals dysphagia',
      'eating too fast bolus choking',
      'food bolting behavior'
    ],
    keywords: ['choking', 'swallowing', 'dysphagia', 'shoveling', 'chewing', 'bolting', 'eating', 'coughing', 'food'],
    physicianAnswer: `Food bolting (rapidly shoveling large quantities without chewing) combines frontal loss of impulse control with progressive dysphagia (impaired swallowing coordination). This is a critical aspiration and choking risk that requires immediate environmental management.

Clinical Prevention Guidelines:
1. Bite-by-Bite Presentation: Never put a full plate of food in front of them. Serve one bite or one small piece at a time. Keep the rest of the meal on a side counter out of their line of vision.
2. Food Texture Modification: Cut all solids into dime-sized pieces. Moisten meats with gravies or sauces. Avoid dry, sticky, or stringy foods (dry bread, peanut butter, celery).
3. Utensil Downsizing: Swap large soup spoons and dinner forks for small dessert spoons or cocktail forks to physically limit bite volumes.
4. Upright Posture: Ensure they sit upright at a strict 90-degree angle during meals and remain sitting upright for at least 30 minutes after eating to prevent reflux aspiration.
5. Speech-Language Pathology (SLP) Referral: Request a clinical swallow study (videofluoroscopy) through our clinic team if coughing or wet, gurgly vocal quality occurs during meals.`,
    keyProtocols: [
      'Serve only one small portion at a time; keep remainder out of reach',
      'Cut food into dime-sized pieces and add moisture or sauce',
      'Use small teaspoons rather than large tablespoons',
      'Maintain upright 90-degree posture for 30 minutes post-meal'
    ]
  },
  {
    id: 'faq-7',
    category: 'WANDERING_SAFETY',
    categoryLabel: 'Wandering & Exit-Seeking',
    question: 'How do I protect my loved one from wandering away and crossing busy streets without looking?',
    alternateQueries: [
      'walking out the front door elopement',
      'wandering off in the neighborhood',
      'crossing street without looking',
      'patient lost in the neighborhood',
      'door locks for dementia wandering',
      'gps tracker for wandering'
    ],
    keywords: ['wandering', 'elopement', 'door', 'lost', 'street', 'traffic', 'gps', 'locks', 'safe return', 'shoes'],
    physicianAnswer: `Unlike Alzheimer's wandering where patients are confused about their whereabouts, FTD wandering is often brisk, purposeful, and goal-directed (e.g., walking a habitual 5-mile route to a store). However, their frontal lobe has lost perception of danger, leading them to step into heavy traffic without looking.

Clinical Protection Checklist:
1. Covert GPS Tracking: Place discreet trackers (Apple AirTag, AngelSense, Jiobit) into custom shoe insoles or sewn securely inside jacket linings. FTD patients routinely remove watches, necklaces, or bracelets.
2. Concealed Door Alarms & Locks: Install slide deadbolts or keypad locks at the very top or bottom of exterior doors, outside their direct eye-level scan. Install chime alarms that alert you whenever an exterior door opens.
3. Visual Camouflage: Hang a full-length curtain or removable fabric screen matching the wall color across exterior exit doors to reduce visual temptation to open them.
4. Safe Return & Police Registry: Register with your local Maryland or county police department's Special Needs / Safe Return Registry. Provide recent photos, typical walking directions, and instructions that approaching with authority commands can provoke flight.`,
    keyProtocols: [
      'Conceal GPS trackers inside shoe insoles or jacket linings',
      'Install locks at top of doorframes outside line of sight',
      'Camouflage exit doors with curtains matching wall color',
      'File a wandering profile with local county police department'
    ],
    relatedGuideId: 'res-safety-wandering',
    relatedGuideTitle: 'FTD Wandering, Elopement & Impulsive Driving Risk Management'
  },
  {
    id: 'faq-8',
    category: 'DRIVING_SAFETY',
    categoryLabel: 'Driving Safety & Retirement',
    question: 'How do I stop my loved one from driving when they insist they are fine?',
    alternateQueries: [
      'refuses to give up car keys',
      'driving with frontotemporal dementia',
      'how to stop spouse from driving',
      'taking away the car keys',
      'unsafe driving blowing through red lights',
      'disabling the car'
    ],
    keywords: ['driving', 'car', 'keys', 'vehicle', 'license', 'dmv', 'crash', 'speeding', 'disable', 'retirement'],
    physicianAnswer: `Driving with FTD is an immediate, catastrophic safety risk. Executive dysfunction, slow reaction times, impulsive lane-changing, and aggressive tailgating occur early in the disease. Because patients lack insight (anosognosia), debating their driving skills will never succeed.

Clinical De-escalation Strategy:
1. Shift the Blame to the Doctor / DMV: Say: "Dr. Seema and the Maryland Motor Vehicle Administration require a medical pause on driving pending your neurology review." Have the clinic provide an official letterhead order stating: "No driving permitted."
2. Mechanically Disable the Vehicle: Do not rely on hiding keys (they will search and demand them). Have a mechanic install a hidden battery kill-switch, disconnect the starter relay, or pull the fuel pump fuse. When the car doesn't start, say: "The car is broken and waiting for parts."
3. Park Car Out of Sight: Park the vehicle down the street, at a neighbor's driveway, or sell it. "Out of sight, out of mind" dramatically lowers driving fixations.
4. Confidential MVA/DMV Reporting: Our clinic can file a confidential Medical Advisory Board report with the state licensing department to revoke the license officially.`,
    keyProtocols: [
      'Never debate driving ability; blame the doctor or state licensing agency',
      'Mechanically disable the car (battery kill-switch or pull fuse)',
      'Park the vehicle out of sight to extinguish visual trigger',
      'Request clinic official medical driving suspension letter'
    ],
    relatedGuideId: 'res-safety-wandering',
    relatedGuideTitle: 'FTD Wandering, Elopement & Impulsive Driving Risk Management'
  },
  {
    id: 'faq-9',
    category: 'BEHAVIORAL_AGITATION',
    categoryLabel: 'Agitation & Meltdowns',
    question: 'What is the best way to de-escalate acute agitation, yelling, or catastrophic reactions?',
    alternateQueries: [
      'sudden rage and yelling meltdown',
      'calming down explosive anger',
      'screaming at caregiver for no reason',
      'de-escalation techniques dementia',
      'aggressive outburst handling',
      'catastrophic reaction in FTD'
    ],
    keywords: ['agitation', 'yelling', 'meltdown', 'anger', 'rage', 'screaming', 'de-escalate', 'calm', 'catastrophic'],
    physicianAnswer: `Catastrophic emotional reactions in FTD occur when environmental demands exceed cognitive coping capacity. The amygdala perceives a threat and triggers a survival response. Rational logic is completely inaccessible during these peaks.

Dr. Seema's 4-Step De-escalation Protocol:
1. Step Back & Ensure Physical Safety: Maintain at least two arm-lengths of distance. Never corner the individual, block their exit path, or touch them without verbal warning. Keep your hands open and visible.
2. Lower Tone and Speed: Speak at half your normal volume and speed. Use short, concrete phrases: "You are safe. I am right here. We are okay."
3. Validate Emotion, Ignore Logic: If they are screaming that someone stole their coat, do not say "Nobody stole it, it's right there!" Instead, validate the feeling: "That is so frustrating. I will help you look for it right now."
4. Change the Scenery: Gently shift physical location: "Let's walk into the kitchen and get a warm cup of cider." Physical movement helps break neurological perseverative loops.
5. Crisis Warning: If physical violence threatens anyone's safety, step into a secure room and call 911. Instruct dispatch: "This is a medical emergency involving neurological dementia; send a Crisis Intervention Team (CIT)."`,
    keyProtocols: [
      'Maintain two arm-lengths distance; never corner or restrain',
      'Speak in low, slow, comforting tone with short words',
      'Validate emotion instead of arguing the facts',
      'Call 911 and request CIT trained responders if physical harm is imminent'
    ],
    relatedGuideId: 'res-aftd-bathing',
    relatedGuideTitle: 'De-escalating Agitation in Frontotemporal Dementia'
  },
  {
    id: 'faq-10',
    category: 'COMMUNICATION_PPA',
    categoryLabel: 'Communication & PPA',
    question: 'How do I communicate with someone experiencing Primary Progressive Aphasia (PPA) as words disappear?',
    alternateQueries: [
      'cannot find words primary progressive aphasia',
      'speech getting worse loss of words',
      'how to talk to someone with PPA',
      'non verbal communication aphasia',
      'frustration when cannot speak',
      'semantic variant word comprehension'
    ],
    keywords: ['ppa', 'aphasia', 'words', 'speech', 'language', 'talking', 'communication', 'comprehension', 'nonverbal'],
    physicianAnswer: `Primary Progressive Aphasia (PPA) selectively attacks the brain's language networks (left temporal and frontal lobes). Whether semantic, non-fluent agrammatic, or logopenic variant, communication must transition from complex verbal dialogue to multi-modal visual connection.

Clinical Communication Rules:
1. Simplify Sentence Structure: Use simple subject-verb-object statements ("Time for lunch") rather than compound sentences ("After you finish putting your jacket away, would you like to have some soup?").
2. One Question at a Time: Ask closed questions with visual choices: Hold up a blue shirt and a green shirt: "Blue or green?"
3. Augment with High-Contrast Visual Cards: Create a laminated binder of photos: toilet, water cup, bed, pain, walking shoes, family photos. They can point directly to communicate needs.
4. Increase Processing Wait Time: Allow 10 to 15 full seconds of silence after speaking before expecting a response. Rushing or repeating interrupts their cognitive retrieval cycle.
5. Non-Verbal Warmth: Rely on gentle eye contact, smiling facial expressions, and soothing vocal melody. Tone conveys safety even when words are lost.`,
    keyProtocols: [
      'Use 3-to-4 word direct sentences with zero background noise',
      'Offer visual binary choices (holding two objects up)',
      'Wait 10-15 seconds silently for delayed cognitive processing',
      'Employ personalized communication photo books or tablets'
    ]
  },
  {
    id: 'faq-11',
    category: 'ANOSOGNOSIA',
    categoryLabel: 'Lack of Insight (Anosognosia)',
    question: 'My loved one insists there is nothing wrong with them and says I am the one who needs help. How do I cope?',
    alternateQueries: [
      'denial of dementia diagnosis',
      'patient does not believe they are sick',
      'anosognosia lack of insight',
      'says I am crazy and they are fine',
      'thinks doctor is lying',
      'cannot see their own decline'
    ],
    keywords: ['anosognosia', 'insight', 'denial', 'sick', 'doctor', 'unaware', 'diagnosis', 'healthy', 'blame'],
    physicianAnswer: `This is anosognosia—not psychological denial or stubbornness, but a neurological inability of the brain to perceive its own deficits. The parietal-frontal self-monitoring networks that update self-awareness are damaged by the disease. To your loved one, they feel 100% healthy.

Clinical Coping Guidelines:
1. Never Try to "Prove" the Diagnosis: Showing them cognitive test scores, specialist letters, or recordings of their behavior will only trigger intense betrayal, anger, and paranoia. They cannot neurologically agree with you.
2. Join Their Reality (Therapeutic Fibbing): Do not force acceptance of the term "dementia." Frame support services around acceptable pretexts: "The clinic asked us to do brain wellness exercises" or "The helper is here to assist me with cleaning and cooking."
3. Grieve the Loss Privately: It is heartbreaking that your loved one cannot acknowledge your caregiving burden or thank you for your sacrifices. Seek support in our peer caregiver groups where others share this exact invisible grief.
4. Focus on Safety, Not Insight: You do not need their agreement to implement safety measures (GPS in shoes, disabled car, financial safeguards). Act as their loving executive surrogate.`,
    keyProtocols: [
      'Anosognosia is neurological blindness to one’s own deficits, not denial',
      'Never argue test scores or try to force diagnosis acceptance',
      'Introduce assistance framed as help for you, not for them',
      'Implement safety measures quietly without requiring their consent'
    ]
  },
  {
    id: 'faq-12',
    category: 'PARANOIA_DELUSIONS',
    categoryLabel: 'Paranoia & Accusations',
    question: 'My spouse accuses me of stealing their money, hiding their items, or having an affair. How do I react?',
    alternateQueries: [
      'accuses me of stealing their wallet',
      'paranoia thinking people are breaking in',
      'thinks spouse is cheating infidelity delusion',
      'hiding money and claiming stolen',
      'delusions in frontotemporal dementia',
      'false accusations from partner'
    ],
    keywords: ['paranoia', 'stealing', 'stole', 'money', 'affair', 'cheating', 'delusion', 'accusation', 'wallet', 'purse'],
    physicianAnswer: `Paranoia and accusatory delusions occur when memory loss, executive misplacement, and frontal perceptual deficits collide. When an FTD patient misplaces their wallet, their damaged brain cannot deduce "I forgot where I put it"; instead, it fabricates an external explanation: "Someone took it from me."

Clinical Protocol:
1. Never Defend or Argue: Saying "I would never steal from you! You had it five minutes ago!" validates to their anxious brain that there is a battle, confirming their suspicion.
2. Validate the Emotion Immediately: Say: "It is scary to not find your wallet. I hate that feeling. Let's look together right now."
3. Keep Duplicates of Critical Fixation Items: Buy identical cheap copies of their wallet, handbag, glasses, or keys. Place a duplicate in a designated spot and "find" it together: "Look, here it is under the newspaper!"
4. Check for Hidden Hoards: Patients frequently hide valuables in bizarre spots (wastebaskets, freezer, behind couch cushions, inside shoes). Conduct routine discreet room sweeps.
5. Rule Out Delirium: If intense paranoia emerges suddenly over 48 hours, contact the clinic to check for infection (UTI), medication side effects, or sensory impairment.`,
    keyProtocols: [
      'Do not defend yourself or argue facts; validate their emotional distress',
      'Keep duplicate wallets, keys, and glasses on hand to "find" quickly',
      'Discreetly check common hoarding hiding spots (freezer, trash, hampers)',
      'Contact clinic if acute paranoia spikes suddenly (rule out UTI)'
    ]
  },
  {
    id: 'faq-13',
    category: 'INCONTINENCE',
    categoryLabel: 'Incontinence & Toileting',
    question: 'Why has my loved one started having bowel or bladder accidents, and how do I manage toileting?',
    alternateQueries: [
      'bladder accidents wetting pants',
      'not making it to the toilet in time',
      'bowel incontinence in bvFTD',
      'refuses to wear adult diapers briefs',
      'hiding soiled underwear',
      'toileting schedule for dementia'
    ],
    keywords: ['incontinence', 'toilet', 'bathroom', 'bladder', 'bowel', 'accidents', 'briefs', 'diapers', 'underwear', 'uti'],
    physicianAnswer: `In bvFTD, incontinence usually does not start as a bladder failure; it is a breakdown in interoception (perceiving bodily fullness signals) coupled with apathy and loss of social norms. Patients may feel the urge but lack the executive drive to walk to the bathroom, or they may fail to realize accidents are socially problematic.

Dr. Seema's Toileting Schedule Protocol:
1. Proactive Timed Voiding: Never ask "Do you need to go to the bathroom?" (they will reflexively say "No"). Instead, every 90 to 120 minutes, say: "It is time to use the restroom now," and guide them directly there.
2. High-Contrast Bathroom Environment: Paint the bathroom door a distinct color or hang a clear toilet sign. Install a dark-colored toilet seat on white porcelain so the target is visually unmistakable.
3. Adaptive Clothing: Switch to elastic-waist pants without zippers, buttons, or belts. Use quiet cloth-like tear-away side pull-ups rather than crinkly plastic diapers, which cause sensory irritation.
4. Hydration Timing: Provide ample water and juices before 4:00 PM to flush kidneys and prevent UTIs, but taper fluid volume 2 hours before bedtime.
5. Medical Rule-Out: Any sudden onset of wetness, fever, foul odor, or worsening confusion warrants a same-day urinalysis through the clinic to rule out a UTI.`,
    keyProtocols: [
      'Escort to toilet on a strict 90-120 minute timer without asking',
      'Install dark contrasting toilet seat on white porcelain',
      'Switch to elastic pants and tear-away quiet pull-on briefs',
      'Taper evening liquids 2 hours prior to sleep'
    ],
    relatedGuideId: 'res-aftd-incontinence',
    relatedGuideTitle: 'AFTD Practical Care Sheet: Managing Incontinence in bvFTD'
  },
  {
    id: 'faq-14',
    category: 'SLEEP_SUNDOWNING',
    categoryLabel: 'Sleep & Sundowning',
    question: 'How do I manage severe restlessness in late afternoon (sundowning) and wandering all night?',
    alternateQueries: [
      'sundowning agitation late afternoon',
      'waking up at 2 am and packing bags',
      'reversed sleep wake cycle',
      'night wandering keeping caregiver awake',
      'cannot sleep through the night dementia',
      'melatonin or sleep aid for FTD'
    ],
    keywords: ['sleep', 'sundowning', 'night', 'wandering', 'evening', 'insomnia', 'awake', 'shadows', 'melatonin', 'restless'],
    physicianAnswer: `Sundowning and circadian disruption occur because neurodegeneration degrades the suprachiasmatic nucleus (the master biological clock), combined with accumulated mental exhaustion by late afternoon. When daylight wanes, shadows create illusions and anxiety peaks.

Clinical Sleep Protocol:
1. Morning Bright Light Exposure: Ensure 30-45 minutes of direct morning sunlight or use a 10,000-lux medical lightbox before 10:00 AM. This anchors the circadian rhythm.
2. Eliminate Daytime Catnaps: Keep the patient gently engaged during mid-day. If an afternoon nap is essential, cap it at 30 minutes before 2:00 PM.
3. Early Evening Lighting Adjustment: Turn on bright, warm indoor ambient lights at 4:00 PM before natural dusk arrives. Close window blinds to prevent unsettling exterior shadows and reflections.
4. Calming Evening Ritual: Avoid television news, violent shows, or chaotic household noise after 6:00 PM. Use soft classical music, warm foot baths, or decaffeinated chamomile tea.
5. Safe Sleep Environment: Install motion-activated floor pathway nightlights from bed to bathroom. Use bed alarms or door sensors that alert you if they stand up, allowing you to rest without terror. Discuss safe circadian supplements (e.g., low-dose melatonin) with the clinic team.`,
    keyProtocols: [
      'Get 30-45 minutes of morning sunlight to set circadian rhythm',
      'Illuminate rooms before dusk (4 PM) and close blinds to banish shadows',
      'Restrict naps to under 30 minutes before 2 PM',
      'Use motion nightlights and floor sensors for caregiver peace of mind'
    ]
  },
  {
    id: 'faq-15',
    category: 'FINANCES_SCAMS',
    categoryLabel: 'Finances & Scams',
    question: 'How do I protect our life savings from scams, reckless spending, and wire transfers?',
    alternateQueries: [
      'giving money to telemarketers',
      'wire transferring savings online scam',
      'compulsive spending buying random things online',
      'how to protect bank accounts dementia',
      'freeze credit for dementia patient',
      'financial exploitation protection'
    ],
    keywords: ['finances', 'money', 'scams', 'bank', 'credit', 'spending', 'wire', 'savings', 'freeze', 'exploitation'],
    physicianAnswer: `Financial vulnerability is often the catastrophic first symptom in FTD, occurring years before formal diagnosis. Orbitofrontal and insular atrophy strips away healthy skepticism, leaving patients entirely defenseless against predatory phone calls, romance scams, sweepstakes mailings, and impulse buying.

Immediate Financial Defense Steps:
1. Place Security Freezes on Credit Bureaus: Contact all three credit bureaus (Equifax, Experian, TransUnion) and execute immediate credit freezes and fraud alerts on their Social Security number.
2. Restructure Bank Accounts: Move primary savings and investment accounts into accounts requiring dual signatures or managed under a revocable living trust where you serve as sole acting trustee.
3. Replace Cards with Prepaid Allowance Cards: Confiscate major high-limit credit and debit cards. Replace them with a pre-paid reloadable card (e.g., True Link Financial) with a $50 limit and merchant category blocking (blocks gambling, telemarketers, wire transfers).
4. Phone & Mail Interception: Register on the National Do Not Call registry. Route home landlines through call-screening devices (like CPR Call Blocker) that only ring for programmed family numbers. Intercept and shred sweepstakes mail before they see it.`,
    keyProtocols: [
      'Freeze credit with Experian, Equifax, and TransUnion immediately',
      'Remove name from sole-access high-balance bank accounts',
      'Issue customized debit card with daily dollar limits (e.g. True Link)',
      'Install landline call blocker to intercept scam callers'
    ],
    relatedGuideId: 'res-medicaid-legal',
    relatedGuideTitle: 'Medicaid Long-Term Care & Elder Law Resource Guide (Maryland & PA)'
  },
  {
    id: 'faq-16',
    category: 'LEGAL_PLANNING',
    categoryLabel: 'Legal Planning & POA',
    question: 'What legal documents must be completed immediately before my loved one loses legal capacity?',
    alternateQueries: [
      'power of attorney durable medical financial',
      'advance directives healthcare proxy',
      'guardianship or conservatorship',
      'legal documents needed for FTD',
      'estate planning elder law attorney',
      'when is it too late to sign power of attorney'
    ],
    keywords: ['legal', 'poa', 'power of attorney', 'healthcare proxy', 'advance directive', 'will', 'guardianship', 'elder law', 'attorney'],
    physicianAnswer: `In progressive neurodegeneration, the window of "testamentary capacity" (the legal ability to sign binding documents) narrows rapidly. If capacity is lost before documents are signed, families must undergo expensive, adversarial court-ordered guardianship proceedings.

Essential Legal Document Portfolio:
1. Durable Financial Power of Attorney (DPOA): Grants authority to manage banking, tax filings, real estate, and government benefits. Ensure it includes specific gifting and Medicaid asset-protection expansion powers.
2. Medical Power of Attorney / Healthcare Proxy: Appoints a surrogate healthcare decision-maker with full HIPAA release authority to discuss clinical conditions and authorize treatments.
3. Advance Healthcare Directive / Living Will: Explicitly records end-of-life wishes regarding mechanical ventilation, feeding tubes (PEG tubes), artificial hydration, and CPR.
4. HIPAA Privacy Waivers: Independent stand-alone forms naming key care partners for immediate access to medical records.
5. Consult a Vetted Elder Law Attorney: Work with an attorney certified by the National Academy of Elder Law Attorneys (NAELA.org). General attorneys often do not understand Medicaid five-year lookback rules or FTD capacity nuances.`,
    keyProtocols: [
      'Execute Durable Financial & Medical POAs immediately while capacity remains',
      'Establish explicit Advance Directives addressing feeding tubes and CPR',
      'Ensure stand-alone HIPAA disclosures are filed with all clinic providers',
      'Consult a certified NAELA elder law specialist'
    ],
    relatedGuideId: 'res-medicaid-legal',
    relatedGuideTitle: 'Medicaid Long-Term Care & Elder Law Resource Guide (Maryland & PA)'
  },
  {
    id: 'faq-17',
    category: 'BEHAVIORAL_AGITATION',
    categoryLabel: 'Dressing & Grooming',
    question: 'Why does my loved one resist dressing and grooming, often lashing out physically?',
    alternateQueries: [
      'fighting during putting on clothes',
      'wearing the same dirty clothes every day',
      'refuses to change clothes or underwear',
      'hitting while putting on shirt or pants',
      'dressing apraxia in dementia',
      'grooming struggles'
    ],
    keywords: ['dressing', 'clothes', 'grooming', 'shirt', 'pants', 'dirty', 'apraxia', 'lashing out', 'changing', 'underwear'],
    physicianAnswer: `Dressing resistance usually stems from dressing apraxia (the brain forgets how arm sleeves correspond to body parts) paired with tactile defensiveness. Pulling shirts over someone's head temporarily blinds them, inducing instant claustrophobic panic.

Clinical Dressing Strategies:
1. Eliminate Pullovers: Switch exclusively to front-buttoning, front-zipping, or magnetic/velcro closure shirts. Never pull tight garments over their head.
2. Duplicate Favorite Outfits: If they compulsively insist on wearing one specific blue shirt, buy three identical copies of it. Launder the dirty one while handing them the fresh twin without conflict.
3. Lay Out Clothes in Order: Present only one item of clothing at a time in the exact sequence of dressing (underwear first, then pants, then shirt). Having an entire pile of clothes causes visual sensory overload.
4. Break Down the Sequence: Instead of saying "Get dressed," give one gentle sensory cue: "Let's slide your right foot into this pant leg."
5. Pick Your Battles: If clothes are clean enough and they are staying home, do not engage in a high-stress battle over changing into formal attire. Protect the relationship over fashion.`,
    keyProtocols: [
      'Use front-buttoning or adaptive magnetic garments; avoid tight pullovers',
      'Buy identical duplicates of favorite clothing items',
      'Hand one garment at a time in sequential order',
      'Prioritize peace over outfit perfection'
    ]
  },
  {
    id: 'faq-18',
    category: 'REPETITIVE_BEHAVIORS',
    categoryLabel: 'Repetitive Questioning',
    question: 'How do I respond when my loved one asks the same question every two minutes without losing my temper?',
    alternateQueries: [
      'repeating the same question over and over',
      'what time are we leaving asked 50 times',
      'perseveration and repetitive questions',
      'losing patience with repeated questions',
      'how to stop repetitive asking',
      'looping on the same sentence'
    ],
    keywords: ['repetitive', 'repeating', 'questions', 'asking', 'loop', 'perseveration', 'patience', 'time', 'leaving'],
    physicianAnswer: `Repetitive questioning (perseveration) occurs because the frontal-temporal retrieval loop is broken. The brain experiences an underlying surge of free-floating anxiety, attaches that anxiety to a specific recurring topic ("What time are we going?"), and immediately forgets the verbal answer within seconds.

Clinical Technique:
1. Address the Underlying Emotion, Not the Logic: The repetitive question is an SOS signal of inner anxiety. Instead of answering the time for the twentieth time, say: "Everything is taken care of. You are safe with me. We have plenty of time."
2. Write It Down on a Whiteboard: FTD patients often preserve reading comprehension longer than auditory processing. Write in large bold marker: "Doctor visit is at 2:00 PM. We leave after lunch." When they ask, gently point to the board without speaking.
3. Don't Announce Appointments Days in Advance: Announcing a doctor visit three days early guarantees 72 hours of non-stop repetitive interrogation. Announce events 20 minutes before departure.
4. Tactile Distraction: Hand them a warm snack, a glass of water, or a repetitive hand task (sorting coins, folding napkins) to re-route their mental loop.`,
    keyProtocols: [
      'Respond to the anxiety rather than the factual question',
      'Use a large dry-erase whiteboard for schedule reassurance',
      'Do not announce future appointments until 20 minutes before leaving',
      'Redirect with tactile tasks or favorite music'
    ]
  },
  {
    id: 'faq-19',
    category: 'BEHAVIORAL_DISINHIBITION',
    categoryLabel: 'Hoarding & Collecting',
    question: 'Why is my loved one collecting trash, hoarding napkins, or accumulating piles of worthless objects?',
    alternateQueries: [
      'hoarding paper napkins and plastic cups',
      'collecting rocks and trash on walks',
      'piles of junk in bedroom dementia',
      'stealing items from restaurants hoarding',
      'compulsive collecting behavior bvFTD',
      'stuffing pockets with trash'
    ],
    keywords: ['hoarding', 'collecting', 'trash', 'napkins', 'piles', 'junk', 'pockets', 'compulsion', 'objects'],
    physicianAnswer: `Compulsive collecting (utilization behavior and sensory hoarding) occurs in bvFTD when the brain's parietal grasping reflex is disinhibited. When the patient sees an object (napkins, rocks, packets of sugar), the visual perception automatically triggers an uncontrollable physical impulse to seize and pocket it.

Management Strategy:
1. Neutral Acceptance of Harmless Items: If they are collecting paper napkins or smooth stones, do not argue or snatch them away. Forcing them to surrender items triggers severe combativeness.
2. Establish a "Collector's Basket": Give them a decorative wooden box or tote bag: "Put your treasures in here so they stay safe." This confines the clutter to one manageable container.
3. Discreet Nightly Thinning: Thin out the hoarded collection after they fall asleep at night. Remove only 30% of items at a time so the difference is not noticeable in the morning.
4. Protect Living Areas: Keep bedroom doorways and walking paths clear of clutter to prevent catastrophic tripping hazards.
5. Watch for Food Hoarding: Check drawers and closets regularly for perishable food (sandwiches, fruit) that can attract insects or spoil.`,
    keyProtocols: [
      'Do not battle over harmless objects like napkins or stones',
      'Provide a designated basket or treasure box to contain items',
      'Discreetly purge items when the patient is asleep',
      'Inspect hiding places weekly for perishable spoiled food'
    ]
  },
  {
    id: 'faq-20',
    category: 'BEHAVIORAL_DISINHIBITION',
    categoryLabel: 'Shoplifting & Law Enforcement',
    question: 'My loved one walked out of a store without paying. How do I handle shoplifting and police interactions?',
    alternateQueries: [
      'stealing items from grocery store',
      'shoplifting in frontotemporal dementia',
      'walked out without paying dementia',
      'police called for shoplifting',
      'criminal charges in dementia',
      'unintentional theft bvFTD'
    ],
    keywords: ['shoplifting', 'stealing', 'store', 'police', 'theft', 'paying', 'charges', 'arrest', 'security', 'grocery'],
    physicianAnswer: `Unintentional shoplifting is surprisingly common in bvFTD. The patient sees an item they want (candy, soda, trinket), picks it up, and walks out without the executive awareness of monetary transaction or property laws. It is not criminal intent; it is frontostriatal moral processing failure.

Clinical Protection & Crisis Protocol:
1. Intercept at the Register: Stay adjacent to them at store exits. If you see items in their hands or pockets, smoothly step up to the cashier: "We are purchasing these as well."
2. Carry Clinical Identification: Keep a physician diagnostic letter in your wallet stating: "Patient is diagnosed with Frontotemporal Dementia, a degenerative neurocognitive brain disorder causing lack of impulse control and incapacity to understand legal consequences."
3. De-escalate Store Security: Approach security or managers privately: "My spouse has advanced neurological dementia. I will immediately pay for all items or return them. Please accept my apologies." Most merchants drop complaints immediately when presented with medical reality.
4. Legal Advocacy: If criminal charges are ever filed, our clinic team can provide sworn clinical affidavits of neurocognitive incompetence to dismiss charges in diversion court.`,
    keyProtocols: [
      'Walk alongside them in stores to intercept unpurchased goods at register',
      'Carry Dr. Seema’s official clinic diagnostic letter in your wallet at all times',
      'Privately inform store managers that the individual has neurological dementia',
      'Contact clinic team immediately if law enforcement becomes involved'
    ]
  },
  {
    id: 'faq-21',
    category: 'EMPATHY_EMOTIONS',
    categoryLabel: 'Loss of Empathy & Coldness',
    question: 'My spouse shows zero empathy when I cry or get sick. Why have they become so emotionally cold?',
    alternateQueries: [
      'complete lack of empathy in marriage',
      'spouse does not care when I am hurt',
      'cold detached partner frontotemporal',
      'loss of emotional warmth and caring',
      'emotional blunting in bvFTD',
      'narcissism vs frontal dementia'
    ],
    keywords: ['empathy', 'cold', 'unfeeling', 'crying', 'hurt', 'detached', 'blunting', 'sympathy', 'narcissist', 'care'],
    physicianAnswer: `Loss of emotional empathy is one of the core diagnostic criteria of bvFTD. Neurodegeneration in the right anterior insula and orbitofrontal cortex destroys the neural substrate that generates "theory of mind" and mirrors other people's feelings. Your spouse has physically lost the neurobiological hardware required to feel your pain.

Care Partner Guidance:
1. Recognize the Neurological Origin: This emotional blunting is not selfishness, marital resentment, or narcissism. The person you loved is neurologically unable to perceive emotional cues.
2. Stop Looking for Validation from Them: Trying to explain your exhaustion, crying in front of them, or asking "Don't you see how hard this is for me?" will yield blank stares or irritated dismissal, causing you deeper heartbreak.
3. Build an External Support Circle: You must draw empathy, validation, and emotional warmth from outside the relationship—from family, close friends, therapists, and our Care Partner support community.
4. Protect Vulnerable Relatives: Explain to children and grandchildren that the emotional absence is caused by a brain disease, not a lack of love.`,
    keyProtocols: [
      'Emotional blunting is caused by damage to the anterior insula, not coldness',
      'Do not seek emotional validation or reciprocity from the patient',
      'Seek counseling and peer care partner support to process ambiguous loss',
      'Educate family members that this is a neurological symptom'
    ]
  },
  {
    id: 'faq-22',
    category: 'SHADOWING',
    categoryLabel: 'Shadowing & Clinging',
    question: 'Why does my loved one follow me into every single room, even the bathroom (shadowing)?',
    alternateQueries: [
      'shadowing behavior following me everywhere',
      'cannot go to the bathroom alone',
      'clinging to caregiver all day',
      'anxiety when caregiver leaves the room',
      'separation anxiety in dementia',
      'needs to see me every second'
    ],
    keywords: ['shadowing', 'following', 'clinging', 'bathroom', 'room', 'separation', 'anxiety', 'space', 'alone'],
    physicianAnswer: `Shadowing occurs when the patient's damaged brain recognizes that it cannot navigate the world alone and identifies you as its sole cognitive anchor. When you leave their visual field, their world feels terrifyingly fragmented.

Coping Strategies:
1. Provide a "View Station": Set up a comfortable armchair with a direct sightline to where you are working (e.g., facing the kitchen counter while you cook). Say: "Sit here and keep me company while I chop these vegetables."
2. Auditory Tethering: When you must step into another room or bathroom, keep up a continuous auditory presence: talk, sing, or narrate what you are doing through the door: "I'm right here in the bathroom washing my hands, I'll be out in two minutes."
3. Transition Tasks: Before leaving the room, engage them in an absorbing activity (e.g., viewing a photo album, holding a comforting weighted blanket, listening to audiobooks).
4. Introduce Second-Party Respite: Introduce another trusted family member or paid companion early so they become accustomed to anchors other than you alone.`,
    keyProtocols: [
      'Position comfortable seating where they can watch you work safely',
      'Use continuous vocal narration when out of sight to reassure them',
      'Engage them in a tactile activity before stepping away',
      'Gradually introduce familiar second companions to reduce reliance'
    ]
  },
  {
    id: 'faq-23',
    category: 'EMPATHY_EMOTIONS',
    categoryLabel: 'Pseudobulbar Affect (PBA)',
    question: 'Why does my loved one suddenly burst into uncontrollable, inappropriate laughter or sobbing?',
    alternateQueries: [
      'laughing uncontrollably at sad news',
      'sudden crying spells for no reason',
      'inappropriate laughter pseudobulbar affect',
      'emotional outbursts laughing sobbing',
      'emotional lability in dementia',
      'crying spells without feeling sad'
    ],
    keywords: ['laughing', 'crying', 'laughter', 'sobbing', 'pseudobulbar', 'pba', 'inappropriate', 'emotions', 'outburst'],
    physicianAnswer: `Uncontrollable, sudden emotional outbursts that don't match the social context—such as laughing at a funeral or sobbing over a spilled napkin—are known as Pseudobulbar Affect (PBA). It is caused by a disruption in the corticobulbar brainstem circuits that regulate emotional expression.

Clinical Advice:
1. Understand the Disconnect: The patient's facial expressions and tears often do not reflect their true internal mood. They are not actually devastated when crying, nor amused when laughing.
2. Calm Distraction: During an episode, do not ask "Why are you laughing?" or try to console the crying as deep sadness. Instead, calmly redirect attention to a sensory focus: "Take a deep breath with me. Look out the window at that bluebird."
3. Educate Bystanders: Inform visitors: "These emotional outbursts are a neurological reflex called PBA. It passes quickly."
4. Clinical Pharmacotherapy: Unlike behavioral disinhibition, true PBA can frequently be treated with FDA-approved targeted medications (such as dextromethorphan/quinidine or SSRIs). Ask Dr. Seema at your next clinic review.`,
    keyProtocols: [
      'PBA is a physical neurological reflex, not genuine sadness or mockery',
      'Do not probe reasons for outbursts; redirect with deep breathing and sensory cues',
      'Reassure visitors that the reaction is involuntary',
      'Discuss medical treatment options with Dr. Seema at clinic visit'
    ]
  },
  {
    id: 'faq-24',
    category: 'MEDICATION_SAFETY',
    categoryLabel: 'Medication Administration',
    question: 'My loved one refuses to take their pills or spits them out. How do I administer medicine safely?',
    alternateQueries: [
      'spitting out medication pills',
      'refuses to swallow pills',
      'how to give medicine to dementia patient',
      'crushing pills in applesauce',
      'pill refusal fighting',
      'liquid medications dementia'
    ],
    keywords: ['medication', 'pills', 'crush', 'applesauce', 'spit', 'swallow', 'refusal', 'medicine', 'liquid', 'pharmacy'],
    physicianAnswer: `Medication refusal is common due to paranoia (fearing poisoning), difficulty swallowing large capsules, or loss of understanding of why pills are necessary.

Safe Administration Protocols:
1. NEVER Crush Extended-Release (ER/XR) Pills: Many cardiac, neurological, and blood pressure pills are extended-release. Crushing them can cause a dangerous drug overdose. Always consult our clinic or your pharmacist first before crushing any pill.
2. Food Substrates: For pills approved for crushing, mix fine powder into a single tablespoon of sweet food: chocolate pudding, applesauce, or ice cream. Never mix into a whole bowl (if they eat half, they only get half the dose).
3. Request Liquid or Patch Formulations: Many essential medications can be switched to liquid drops, transdermal skin patches (e.g., Exelon patch for cognition, clonidine patch for BP), or disintegrating tablets (ODT) that dissolve on the tongue instantly.
4. Calm Presentation: Give pills without asking for permission. Hand them a glass of juice with the pill and say: "Here is your morning vitamin with breakfast."`,
    keyProtocols: [
      'Check with pharmacist before crushing any pill (never crush ER/XR)',
      'Mix approved crushed meds into a single small spoonful of pudding',
      'Ask clinic to switch to liquid or transdermal skin patches where available',
      'Pair pill taking with breakfast beverages in a relaxed routine'
    ]
  },
  {
    id: 'faq-25',
    category: 'PAIN_MANAGEMENT',
    categoryLabel: 'Pain Recognition in Aphasia',
    question: 'How do I know if my non-verbal or aphasic loved one is in pain when they cannot tell me?',
    alternateQueries: [
      'signs of pain in non verbal patient',
      'cannot tell me where it hurts',
      'pain assessment in dementia PAINAD',
      'grimacing groaning agitation pain',
      'how to recognize pain when they cannot talk',
      'hidden pain behavioral changes'
    ],
    keywords: ['pain', 'nonverbal', 'aphasia', 'hurting', 'grimacing', 'groaning', 'painad', 'agitation', 'teeth', 'joints'],
    physicianAnswer: `People with advanced FTD or PPA often cannot verbalize or locate physical pain. Instead, hidden pain (dental abscess, arthritis, UTI, constipation) manifests as sudden aggression, pacing, grimacing, or refusal to eat.

The PAINAD Clinical Assessment Scale:
1. Facial Expression: Look for tight grimacing, furrowed brows, clenched teeth, or wincing when shifting positions.
2. Vocalizations: Listen for repetitive groaning, grunting, whimpering, or sudden sharp cries during movement.
3. Body Language: Look for rigid posture, guarding a specific body part (holding abdomen or jaw), curled-up fetal position, or striking out when a specific limb is moved.
4. Breathing Changes: Observe noisy, labored, or rapid shallow breathing at rest.
5. Inability to Console: If standard distraction or favorite music fails to soothe agitation, assume an underlying physical source of pain and contact our clinic team for a physical evaluation.`,
    keyProtocols: [
      'Unexplained aggression often signals untreated physical pain',
      'Monitor facial grimacing, body guarding, and shallow breathing',
      'Investigate common sources: constipation, dental pain, arthritis, UTI',
      'Contact clinic team for pain management plan'
    ]
  },
  {
    id: 'faq-26',
    category: 'DENTAL_ORAL_CARE',
    categoryLabel: 'Dental & Oral Hygiene',
    question: 'How do I brush their teeth when they clamp their jaw shut or bite the toothbrush?',
    alternateQueries: [
      'biting toothbrush refusing oral care',
      'clamping jaw shut brushing teeth',
      'dental hygiene dementia',
      'swallowing toothpaste',
      'bleeding gums tooth decay FTD',
      'mouth care strategies'
    ],
    keywords: ['teeth', 'brushing', 'dental', 'mouth', 'jaw', 'biting', 'toothbrush', 'oral', 'toothpaste', 'gums'],
    physicianAnswer: `Oral care triggers the primitive bite reflex when an object approaches the mouth. If teeth are neglected, severe periodontal disease and tooth abscesses can cause agonizing, uncommunicated pain and systemic infections.

Clinical Oral Care Techniques:
1. The Two-Toothbrush Technique: Hold one toothbrush in your non-dominant hand for them to bite down on softly, while using a second soft-bristle toothbrush to gently clean the opposite side of the mouth.
2. Use Non-Foaming, Ingestible Toothpaste: Foaming detergents (SLS) cause gagging and aspiration. Use unflavored or mild-flavored pediatric non-foaming toothpaste that is safe to swallow.
3. Collis Curve / Triple-Sided Brushes: These specialized brushes clean the top, front, and back of teeth simultaneously in one stroke, cutting brushing time by two-thirds.
4. Foam Oral Swabs: If toothbrushing triggers panic, use chlorhexidine or mouth-moisturizing foam swabs to wipe gums and tongue after meals.
5. Gentle Lip Massage: Before entering the mouth, gently stroke the cheek and lips with a warm washcloth to relax facial muscle tension.`,
    keyProtocols: [
      'Use the two-toothbrush method to manage the biting reflex',
      'Switch to non-foaming, swallow-safe toothpaste',
      'Use triple-sided toothbrushes to clean three surfaces in one stroke',
      'Wipe with moist oral swabs if full brushing causes distress'
    ]
  },
  {
    id: 'faq-27',
    category: 'SENSORY_ENVIRONMENT',
    categoryLabel: 'Sensory Overload',
    question: 'Why does my loved one melt down in crowded restaurants, grocery stores, and holiday gatherings?',
    alternateQueries: [
      'sensory overload in public places',
      'agitation at family holiday party',
      'grocery store shopping panic',
      'too much noise causing meltdown',
      'hyperacusis noise sensitivity FTD',
      'crowded environments agitation'
    ],
    keywords: ['sensory', 'overload', 'noise', 'restaurant', 'store', 'crowds', 'holidays', 'sound', 'fluorescent', 'party'],
    physicianAnswer: `The frontal lobes filter out irrelevant sensory data (clattering dishes, fluorescent flicker, chatter). In FTD, this sensory filter is shredded. A busy restaurant feels like standing inside a blaring siren, overwhelming cognitive processing.

Preventive Guidelines:
1. Noise-Cancelling Headphones: Provide discrete over-ear noise-cancelling headphones or soft earplugs during unavoidable outings in loud environments.
2. Off-Peak Hours: Dine at 4:30 PM instead of 7:00 PM; shop on Tuesday morning at 8:30 AM rather than Saturday afternoon. Ask for corner booth seating away from kitchen doors and televisions.
3. Manage Family Gatherings: Limit family visits to 2 or 3 quiet people at a time. Designate a quiet "decompression sanctuary" bedroom with low lighting and familiar music where they can retreat.
4. Exit Plan: Always have a pre-arranged exit strategy. If early signs of restlessness (pacing, sighing, finger tapping) appear, leave immediately before a full meltdown occurs.`,
    keyProtocols: [
      'Use noise-cancelling headphones in public venues',
      'Schedule outings during quiet, off-peak morning hours',
      'Create a quiet retreat room during family holiday visits',
      'Leave immediately upon the first subtle sign of restlessness'
    ]
  },
  {
    id: 'faq-28',
    category: 'DELIRIUM_UTI',
    categoryLabel: 'Sudden Delirium & UTIs',
    question: 'My loved one suddenly got drastically worse overnight with extreme confusion and weakness. What happened?',
    alternateQueries: [
      'sudden drastic decline over 24 hours',
      'overnight worsening of dementia',
      'urinary tract infection causing delirium',
      'acute confusion sudden weakness',
      'is this a stroke or a UTI',
      'delirium in frontotemporal dementia'
    ],
    keywords: ['delirium', 'uti', 'sudden', 'overnight', 'decline', 'infection', 'fever', 'hallucinations', 'confusion', 'hospital'],
    physicianAnswer: `FTD is a slow, gradual neurodegenerative illness. A sudden, dramatic drop in function over 24 to 48 hours is NEVER standard progression—it is medical delirium until proven otherwise.

Urgent Clinical Checklist:
1. Rule Out Urinary Tract Infection (UTI): A UTI in dementia rarely presents with complaints of burning. It presents as sudden delirium, falls, hallucinations, or acute agitation.
2. Check for Other Physical Infections: Inspect skin for cellulitis or bedsores, check lungs for cough or fever (aspiration pneumonia), and verify bowel movements (severe constipation/impaction can trigger delirium).
3. Inspect for Acute Dehydration: Check dry tongue, dark amber urine, and sunken eyes.
4. Rule Out Stroke (BE FAST): Check for facial droop, arm weakness, or one-sided paralysis. If present, call 911 immediately.
5. Action: Contact the Johns Hopkins clinic line immediately for a same-day urinalysis order and clinical triage.`,
    keyProtocols: [
      'Rapid overnight decline is delirium, not normal FTD progression',
      'UTIs frequently present as sudden confusion and falls without fever',
      'Check for bowel impaction, pneumonia, or dehydration',
      'Call the clinic direct line at (410) 955-5147 (option 2) for immediate triage'
    ]
  },
  {
    id: 'faq-29',
    category: 'INTIMACY_SEXUALITY',
    categoryLabel: 'Intimacy & Sexual Disinhibition',
    question: 'How do I handle hypersexual comments, public undressing, or demanding sexual intimacy?',
    alternateQueries: [
      'hypersexuality in frontotemporal dementia',
      'inappropriate sexual touching or comments',
      'undressing in public disinhibition',
      'uncomfortable sexual demands from spouse',
      'managing hypersexual behavior dementia',
      'loss of intimacy vs hypersexuality'
    ],
    keywords: ['sexual', 'hypersexuality', 'intimacy', 'undressing', 'touching', 'disinhibition', 'demands', 'boundaries', 'spouse'],
    physicianAnswer: `Altered sexual behavior in bvFTD stems from orbitofrontal disinhibition and loss of moral boundary processing. It can manifest as sexual advances toward strangers, compulsive pornography, demanding physical intimacy, or conversely, public disrobing due to sensory irritation from clothing.

Caregiver Management:
1. Public Undressing: If they begin disrobing in public, recognize it is usually tactile discomfort (overheating or itching), not sexual exhibitionism. Calmly guide them to a restroom and switch to adaptive one-piece clothing with back zippers if chronic.
2. Firm, Emotionless Boundaries: For unwanted sexual advances at home, establish a neutral physical boundary without anger or scolding: "We are not doing that right now. Let's sit together and watch our movie." Physically disengage and step out of the room.
3. Provide Tactile Sensory Substitutes: Offer heavy weighted blankets, plush pillows, or hand massages to satisfy sensory needs safely.
4. Protect Yourself: You have the complete ethical and human right to sleep in separate bedrooms and maintain bodily autonomy. Caregiving does not obligate non-consensual intimacy.
5. Clinical Medication Options: If hypersexuality causes severe distress, anti-androgenic or serotonergic medications can safely moderate compulsive drives. Discuss with Dr. Seema.`,
    keyProtocols: [
      'Public disrobing is usually tactile sensory distress, not exhibitionism',
      'Maintain firm, neutral boundaries and physically disengage',
      'You are never obligated to engage in non-consensual intimacy; use separate bedrooms',
      'Consult Dr. Seema regarding safe pharmacotherapy for compulsive hypersexuality'
    ]
  },
  {
    id: 'faq-30',
    category: 'NUTRITION_WEIGHT',
    categoryLabel: 'Weight Fluctuations',
    question: 'Why is my loved one losing weight despite eating huge meals, or gaining 30 pounds rapidly?',
    alternateQueries: [
      'rapid weight loss in dementia',
      'extreme weight gain sweet binge eating',
      'losing weight even though eating a lot',
      'hypermetabolism in frontotemporal dementia',
      'unexplained weight changes FTD',
      'nutrition and caloric needs'
    ],
    keywords: ['weight', 'losing', 'gaining', 'metabolism', 'calories', 'eating', 'appetite', 'nutrition', 'supplements'],
    physicianAnswer: `Weight swings in FTD reflect autonomic and neuroendocrine dysregulation. Some patients gain massive weight from compulsive carbohydrate consumption, while others lose weight rapidly despite voracious eating due to continuous motor pacing and hypothalamic hypermetabolism.

Nutritional Action Plan:
1. For Rapid Weight Loss:
   - Provide calorie-dense nutrient smoothies: blend whole milk, Greek yogurt, peanut butter, bananas, and clinical nutritional powders (Ensure Plus or Boost VHC).
   - Add healthy fats to every meal: drizzle olive oil over vegetables, add butter to mashed potatoes, and serve whole milk.
   - Screen for swallowing difficulty or hidden dental pain.
2. For Rapid Weight Gain:
   - Restrict access to kitchen cabinets with magnetic locks.
   - Serve volume-rich, low-calorie substitutes: air-popped popcorn, baby carrots with hummus, crisp apple slices, and sparkling flavored water.
   - Maintain daily walking routines to offset sedentary storage.
3. Track Weekly Weights: Weigh them once weekly on the same scale to monitor trends and alert the clinic of sudden shifts (>5% in 30 days).`,
    keyProtocols: [
      'Weight loss with high intake often indicates pacing hypermetabolism',
      'Add calorie-dense healthy fats and nutritional shakes for weight loss',
      'Lock pantries and substitute volume-rich low-calorie foods for bingeing',
      'Report weekly weight shifts greater than 5% to the clinical team'
    ]
  },
  {
    id: 'faq-31',
    category: 'FAMILY_DYNAMICS',
    categoryLabel: 'Explaining FTD to Children',
    question: 'How do I explain my partner’s strange, unemotional behavior to our teenage children or young grandchildren?',
    alternateQueries: [
      'explaining FTD to young kids',
      'talking to teenagers about parents dementia',
      'how to explain frontotemporal dementia to family',
      'children embarrassed by parent behavior',
      'kids scared of grandpa behavior',
      'talking to grandchildren about FTD'
    ],
    keywords: ['children', 'kids', 'teenagers', 'grandchildren', 'explaining', 'family', 'parent', 'behavior', 'school', 'grief'],
    physicianAnswer: `Young family members frequently interpret FTD symptoms (blunt insults, indifference, strange quirks) as personal rejection or parental abandonment. It is vital to clearly separate the disease from the person they love.

Clinical Framework for Talking with Youth:
1. Use the "Brain Filter" Metaphor: Explain: "Mom's brain has a broken filter. The part of the brain that tells us not to say rude things or tells us when someone is sad is damaged by an illness called FTD. She loves you deeply, but her brain cannot show it right now."
2. Clear Them of Blame: Explicitly reassure them: "Nothing you did caused this disease, and nothing you do can cure it. It is not your fault when Dad acts angry or doesn't answer."
3. Validate Embarrassment and Anger: Allow them to voice frustration without guilt: "It is normal to feel embarrassed when Dad says weird things in front of your friends."
4. Find Parallel Activities: Foster connection through non-verbal, shared activities: watching a favorite sports game, listening to music, walking the dog, or looking through childhood photo albums.
5. Connect with Youth Resources: Recommend AFTD's Kids & Teens resources (theaftd.org/kids-and-teens).`,
    keyProtocols: [
      'Explain using the "broken brain filter" biological analogy',
      'Reassure youth that their actions did not cause the parent’s withdrawal',
      'Acknowledge and validate anger, sadness, and embarrassment',
      'Foster low-demand connection through music, pets, and quiet activities'
    ]
  },
  {
    id: 'faq-32',
    category: 'COMMUNITY_EDUCATION',
    categoryLabel: 'Educating Friends & Neighbors',
    question: 'How do I explain my loved one’s bizarre actions to neighbors and extended family without shame?',
    alternateQueries: [
      'what to tell neighbors about dementia behavior',
      'explaining FTD to friends and church',
      'family thinks spouse is just being a jerk',
      'overcoming stigma of frontotemporal dementia',
      'educating extended family on FTD diagnosis',
      'handling rumors in the neighborhood'
    ],
    keywords: ['neighbors', 'friends', 'stigma', 'shame', 'embarrassment', 'explaining', 'community', 'church', 'family'],
    physicianAnswer: `Because people with FTD often look physically robust and speak fluently in early stages, neighbors and relatives assume bad manners, marital rebellion, or psychiatric breakdown rather than neurological illness. Open communication banishes isolation.

Action Steps:
1. Send a Neighborhood Letter: Distribute a warm, candid note to immediate neighbors: "We wanted to share that John was recently diagnosed with Frontotemporal Dementia (FTD), a neurological condition affecting memory and social judgment. You may notice him taking long walks or making repetitive comments. He is safe and gentle, but if you ever see him in the street without me, please contact me immediately at [phone]."
2. Transform Neighbors into Safety Allies: Neighbors will transition from being confused critics into vigilant safety lookouts who will alert you if your loved one wanders.
3. Educate Skeptical Relatives: Share official Johns Hopkins or AFTD clinical brochures. Offer to invite doubtful relatives to a joint telehealth consultation with Dr. Seema.
4. Release the Burden of Shame: You have nothing to apologize for. This is a cruel biological disease, no different than Parkinson's or pancreatic cancer.`,
    keyProtocols: [
      'Send a brief neighborhood note explaining the neurological diagnosis',
      'Turn neighbors into a proactive neighborhood safety watch network',
      'Share AFTD clinical literature with skeptical extended family',
      'Release shame: FTD is a biological illness that requires zero apology'
    ]
  },
  {
    id: 'faq-33',
    category: 'GENETICS_COUNSELING',
    categoryLabel: 'Genetics & Familial Risk',
    question: 'Is FTD hereditary, and should our adult children get genetic testing for C9orf72, MAPT, or GRN?',
    alternateQueries: [
      'is frontotemporal dementia genetic',
      'c9orf72 mutation testing for children',
      'mapt or grn gene hereditary FTD',
      'should adult kids get tested for FTD gene',
      'genetic counseling Johns Hopkins FTD',
      'familial vs sporadic frontotemporal'
    ],
    keywords: ['genetic', 'genetics', 'hereditary', 'c9orf72', 'mapt', 'grn', 'children', 'inherited', 'testing', 'counselor'],
    physicianAnswer: `Approximately 10% to 20% of all FTD cases are autosomal dominant (familial), most commonly linked to mutations in C9orf72, MAPT, or GRN genes. The remaining 80% are sporadic with no single inherited cause.

Clinical Genetic Guidance:
1. Test the Affected Individual First: Genetic testing should be performed on the diagnosed patient, not on healthy adult children. Identifying whether a causative mutation exists in the affected parent is the prerequisite first step.
2. Mandatory Pre-Test Genetic Counseling: Never order direct-to-consumer genetic kits (like 23andMe) for FTD genes. Adult children must meet with a certified neurogenetic counselor at Johns Hopkins before testing.
3. Protect Life and Long-Term Care Insurance First: Federal GINA laws protect against health insurance discrimination, but DO NOT protect against life, disability, or long-term care insurance discrimination based on genetic results. Adult children should secure policies prior to testing.
4. Psychological Readiness: Knowing mutation status carries immense psychological weight. There is no right or wrong decision; counseling helps each child decide if testing is appropriate for them.`,
    keyProtocols: [
      'Test the diagnosed individual first to determine if a mutation is present',
      'Consult a certified neurogenetic counselor prior to any family testing',
      'Secure life and disability insurance before entering genetic test records',
      'Respect individual autonomy: adult children can choose not to know'
    ]
  },
  {
    id: 'faq-34',
    category: 'CAREGIVER_HEALTH',
    categoryLabel: 'Caregiver Burnout & Guilt',
    question: 'I feel completely overwhelmed, angry, and exhausted. How do I survive caregiver burnout and guilt?',
    alternateQueries: [
      'caregiver burnout and depression',
      'feeling angry at dementia spouse',
      'exhaustion from caregiving 24 7',
      'caregiver guilt wanting it to be over',
      'mental health support for FTD caregivers',
      'cannot take this caregiving anymore'
    ],
    keywords: ['burnout', 'exhaustion', 'guilt', 'anger', 'overwhelmed', 'caregiver', 'counseling', 'respite', 'alone', 'sleep'],
    physicianAnswer: `Caring for a person with FTD carries the highest rates of clinical depression, immune suppression, and caregiver mortality of any neurodegenerative disorder due to relentless behavioral changes and emotional blunting. Feeling rage, profound grief, or wishing for an end is a normal human response to catastrophic stress—not a moral defect.

Survival Guidelines:
1. Put on Your Own Oxygen Mask First: If you collapse from a heart attack, stroke, or psychiatric breakdown, who cares for your loved one? Self-care is a clinical requirement, not a luxury.
2. Unapologetic Respite Care: Secure weekly respite. Even 4 hours twice a week away from the house restores nervous system baseline. Use adult day programs, in-home aides, or family rotations.
3. Validate Ambiguous Loss: Grieve the living loss of your companion. You are mourning the loss of the person they were while caring for the person they have become.
4. Join Our Care Partner Support Groups: Isolation is toxic. Sharing honestly with other FTD caregivers who understand the blunt remarks and hygiene battles restores sanity.
5. Reach Out for Professional Help: If you experience thoughts of self-harm or despair, contact the National Crisis Lifeline (988) or our clinic care partner support line at (410) 502-4163.`,
    keyProtocols: [
      'Caregiver burnout is a medical hazard; self-care is mandatory for survival',
      'Schedule non-negotiable weekly respite time away from the caregiving role',
      'Process ambiguous loss without shame or self-judgment',
      'Call the Clinic Support Line at (410) 502-4163 for counseling referrals'
    ]
  },
  {
    id: 'faq-35',
    category: 'DAILY_ROUTINE',
    categoryLabel: 'Daily Routine & Structure',
    question: 'How do I structure a daily schedule to minimize anxiety and keep days peaceful?',
    alternateQueries: [
      'daily routine for FTD dementia patient',
      'how to structure the day',
      'visual schedule dementia',
      'reducing agitation with routines',
      'morning and evening daily schedule',
      'keeping days predictable'
    ],
    keywords: ['schedule', 'routine', 'structure', 'daily', 'calendar', 'morning', 'predictable', 'activities', 'structure'],
    physicianAnswer: `FTD brains thrive on rigid, predictable structure. Unexpected surprises, chaotic schedules, and unstructured downtime foster anxiety, wandering, and agitation.

Sample Predictable Daily Rhythm:
- 8:00 AM: Gentle wake-up, warm washcloth, dressing in duplicate clothing.
- 8:30 AM: Breakfast with protein and fiber; morning hydration; medication.
- 9:30 AM: Outdoor morning walk (30-45 mins) for bright sunlight and motor energy expenditure.
- 11:00 AM: Structured quiet task (folding laundry, sorting matching cards, jigsaw puzzle).
- 12:30 PM: Hydrating lunch served in small, sequential portions.
- 1:30 PM: Rest period (soft music, quiet reclining; avoid heavy sleep over 30 mins).
- 2:30 PM: Sensory engagement (hand massage, art, rhythmic drumming, or scenic drive).
- 4:00 PM: Pre-sundowning preparation: turn on bright warm indoor lights, close blinds, calm music.
- 5:30 PM: Dinner with family.
- 7:00 PM: Warm foot soak or bath; herbal tea; aromatherapy (lavender).
- 8:30 PM: Bedtime ritual with low-contrast nightlights and motion sensors enabled.`,
    keyProtocols: [
      'Maintain identical meal and wake-up times seven days a week',
      'Include daily morning outdoor walking for sunlight and motor pacing',
      'Engage in failure-free tactile tasks (folding, sorting, music)',
      'Prepare rooms by 4:00 PM to prevent sundowning anxiety'
    ]
  },
  {
    id: 'faq-36',
    category: 'TRAVEL_OUTINGS',
    categoryLabel: 'Travel & Flying',
    question: 'Can we still travel or fly on an airplane to visit family with an FTD patient?',
    alternateQueries: [
      'flying on an airplane with dementia',
      'traveling with frontotemporal dementia patient',
      'vacation with FTD spouse',
      'TSA airport security dementia',
      'road trips and hotel stays with dementia',
      'is it safe to travel'
    ],
    keywords: ['travel', 'flying', 'airplane', 'airport', 'tsa', 'hotel', 'vacation', 'road trip', 'disruption'],
    physicianAnswer: `Traveling removes an FTD patient from their familiar environment, dramatically increasing disorientation, wandering risk, and catastrophic meltdowns. Long flights and hotel changes are rarely recommended in moderate-to-advanced stages.

If Travel is Unavoidable:
1. TSA Cares Assistance: Call TSA Cares (1-855-787-2227) at least 72 hours before your flight. A dedicated passenger support specialist will escort you through private security screening without waiting in loud lines.
2. Travel in Pairs: Never fly alone with an FTD patient. If you need to use the restroom, your loved one cannot be left unattended in a bustling terminal.
3. Direct Non-Stop Flights: Book direct morning flights. Avoid layovers and terminal transfers that compound sensory overload.
4. Prepare Hotel Rooms Immediately: Upon arrival, childproof the hotel room: place a heavy chair in front of the exit door, remove breakable glassware, and set up familiar blankets and bedside photos.
5. Have Medication and Clinic Contacts on Person: Keep all medications in your carry-on bag alongside Dr. Seema's diagnosis letter.`,
    keyProtocols: [
      'Contact TSA Cares 72 hours prior for private expedited security screening',
      'Always have a second adult travel companion to assist',
      'Book only direct non-stop flights during optimal morning hours',
      'Childproof hotel room doors immediately to prevent elopement'
    ]
  },
  {
    id: 'faq-37',
    category: 'HOME_SAFETY_FALLS',
    categoryLabel: 'Fall Prevention & Home Safety',
    question: 'How do I prevent dangerous falls and modify our home as motor symptoms emerge?',
    alternateQueries: [
      'fall prevention for dementia patient',
      'balance problems and tripping FTD',
      'corticobasal or PSP motor symptoms falls',
      'home safety modifications grab bars',
      'bathroom fall safety shower chair',
      'preventing head injuries from falls'
    ],
    keywords: ['falls', 'falling', 'balance', 'tripping', 'grab bars', 'bathroom', 'walker', 'mobility', 'rugs', 'lighting'],
    physicianAnswer: `In motor variants of FTD (such as Progressive Supranuclear Palsy PSP or Corticobasal Syndrome CBS) or late-stage bvFTD, loss of postural reflexes leads to sudden backward falls and severe injury.

Home Safety Modifications:
1. Strip Out All Fall Hazards: Remove 100% of throw rugs, runner rugs, and low coffee tables. Tape down electrical cords along baseboards.
2. Professional Grab Bar Installation: Install commercial grab bars (screwed into wall studs, never suction cups) beside the toilet and inside the shower.
3. Shower Chair & Handheld Wand: Eliminate standing during bathing. Use an anchored shower chair with a safety belt and handheld wand.
4. High-Contrast Flooring: Avoid flooring with busy geometric patterns, which damaged brains perceive as physical holes or steps, leading to freezing and falls.
5. Physical Therapy (PT) Assessment: Request a home-health PT evaluation through our clinic team for assistive devices (e.g., U-Step weighted walker designed for neurological balance disorders).`,
    keyProtocols: [
      'Remove all throw rugs and clutter from walking pathways',
      'Install stud-anchored grab bars beside toilets and inside showers',
      'Utilize a sturdy shower chair with chest/lap harness',
      'Request physical therapy evaluation for specialized neuro-walkers'
    ]
  },
  {
    id: 'faq-38',
    category: 'RESPITE_CARE',
    categoryLabel: 'Introducing Respite Aides',
    question: 'How do I introduce an in-home professional caregiver when my loved one fires every helper?',
    alternateQueries: [
      'patient firing home health aides',
      'introducing in home caregiver dementia',
      'refuses to let paid aide in the house',
      'how to hire caregiver help for FTD',
      'introducing respite care without fighting',
      'aide rejection strategies'
    ],
    keywords: ['respite', 'caregiver', 'aide', 'helper', 'home care', 'firing', 'refuses', 'companion', 'assistant'],
    physicianAnswer: `FTD patients frequently reject home care aides, screaming "I don't need a babysitter!" and ordering them out of the house. Introducing a helper requires psychological reframing.

Introduction Strategies:
1. Frame the Aide as Help for YOU: Never say "This is an aide to watch you." Say: "This is my friend Maria, who is helping me with laundry and cooking so I don't get so tired."
2. The Overlap Period: Have the aide spend the first three sessions working alongside you while the patient observes. Do not leave the house immediately. Let the patient get used to their presence.
3. Tap into Their Professional Past: If your spouse was an accountant or teacher, frame the aide as an "assistant" or "intern" who needs their guidance: "Maria is learning about bookkeeping and wants to sit with you."
4. Instruct the Aide in Advance: Coach the aide not to quiz, test, or boss the patient. An FTD aide must be calm, flexible, and comfortable with quiet parallel presence.`,
    keyProtocols: [
      'Introduce the aide as your personal assistant for household chores',
      'Spend the first 2-3 visits together before attempting solo departures',
      'Frame the helper as an assistant or intern seeking the patient’s guidance',
      'Coach aides in non-confrontational, low-demand parallel engagement'
    ]
  },
  {
    id: 'faq-39',
    category: 'MEMORY_CARE_TRANSITION',
    categoryLabel: 'When is it Time for Facility Care?',
    question: 'How do I know when it is no longer safe to keep my loved one at home and memory care is needed?',
    alternateQueries: [
      'when to move dementia spouse to memory care',
      'signs it is time for nursing home facility',
      'caregiver cannot manage at home anymore',
      'guilt about placing spouse in memory care',
      'safety risks at home needing placement',
      'transition to residential facility'
    ],
    keywords: ['memory care', 'facility', 'placement', 'nursing home', 'transition', 'safety', 'burnout', 'guilt', 'home'],
    physicianAnswer: `The decision to transition to residential memory care is not a failure of love—it is an act of love to guarantee physical safety when medical and behavioral needs exceed what one human can provide at home.

Objective Clinical Placement Indicators:
1. Chronic Physical Danger: Frequent elopements near traffic, leaving stoves burning, physical aggression toward family, or recurrent falls.
2. Severe Caregiver Health Deterioration: When the primary care partner develops medical emergencies (hypertension spikes, severe depression, sleep deprivation hallucinations).
3. Need for Two-Person Transfers: When toileting, bathing, and transfers require two physically capable adults around the clock.
4. Total Care Exhaustion: When you spend 100% of your energy acting as an exhausted nurse, and have lost the ability to be a loving spouse or child.
5. In Memory Care, You Return to Being Family: Placement allows trained professional shifts to handle the toileting and agitation, freeing you to visit as a loving companion.`,
    keyProtocols: [
      'Placement is about physical safety, never a failure of personal devotion',
      'Key triggers include wandering, aggression, and caregiver health collapse',
      'Two-person physical transfer requirements necessitate professional staffing',
      'Residential care allows you to return to being a loving spouse rather than an exhausted nurse'
    ],
    relatedGuideId: 'res-medicaid-legal',
    relatedGuideTitle: 'Medicaid Long-Term Care & Elder Law Resource Guide (Maryland & PA)'
  },
  {
    id: 'faq-40',
    category: 'MEMORY_CARE_TRANSITION',
    categoryLabel: 'Choosing FTD-Capable Facilities',
    question: 'How do I choose a memory care facility that actually understands FTD instead of only Alzheimer’s?',
    alternateQueries: [
      'finding memory care facility for FTD',
      'Alzheimers facility kicked out FTD patient',
      'memory care that accepts behavioral variant',
      'questions to ask memory care facilities',
      'evaluating dementia nursing homes for FTD',
      'memory care rejected my spouse'
    ],
    keywords: ['facility', 'memory care', 'nursing home', 'questions', 'alzheimers', 'staff', 'kicked out', 'behavioral', 'evaluating'],
    physicianAnswer: `Standard memory care facilities are designed for frail, elderly Alzheimer's residents who are sedentary and memory-impaired. A 58-year-old FTD patient is physically strong, fast, and disinhibited. If the facility is unprepared, they will chemically restrain the patient or issue a 30-day eviction notice.

Vetting Questions to Ask Facility Directors:
1. "How many residents with diagnosed Frontotemporal Dementia do you currently care for?" (If the answer is zero, be cautious).
2. "How do your staff manage a strong resident who paces 15 miles a day or makes inappropriate social comments?" (Listen for non-pharmacological pacing paths vs. threats of isolation).
3. "Do you have secure, expansive outdoor walking courtyards?" (Critical for high-energy motor pacing).
4. "What is your discharge/eviction policy for behavioral escalation?" (Ensure they do not immediately transfer to psych ERs upon verbal outbursts).
5. "What is your staff-to-resident ratio during evening and night shifts?" (Must be at least 1:5 or 1:6 for high-acuity behavioral supervision).`,
    keyProtocols: [
      'Ask specifically how many FTD residents they have successfully managed',
      'Verify they have expansive, secure outdoor walking paths for motor pacing',
      'Demand to read their behavioral discharge and psych hospital transfer policies',
      'Verify night-shift staffing ratios are adequate for restless wanderers'
    ]
  },
  {
    id: 'faq-41',
    category: 'MEMORY_CARE_TRANSITION',
    categoryLabel: 'Move-In Day Protocols',
    question: 'How do we manage move-in day to memory care to minimize trauma and catastrophic reactions?',
    alternateQueries: [
      'move in day memory care tips',
      'how to transition loved one to facility',
      'what to do on move in day dementia',
      'saying goodbye on memory care move in day',
      'reducing trauma during facility placement',
      'first week in memory care'
    ],
    keywords: ['move in', 'transition', 'facility', 'placement', 'goodbye', 'first week', 'trauma', 'room setup'],
    physicianAnswer: `Move-in day is intensely emotional. Managing the transition requires careful timing and coordination with the facility clinical director.

Move-In Day Protocol:
1. Set Up the Room Completely in Advance: Move clothing, photos, favorite bedspreads, and familiar lamps into the room the day before. The room must look and smell like home before the patient ever steps through the door.
2. Arrive Mid-Morning Around Lunch: Arrive around 11:00 AM. Engage them immediately in a meal or structured activity with other residents, rather than sitting in an empty bedroom waiting.
3. The "Loving Departure": Do not engage in a prolonged, tearful goodbye. Say: "I need to run to an appointment and will see you soon. The team here has lunch ready for you." Step away smoothly.
4. The First Week Visiting Boundary: Follow the facility clinical team's advice regarding the initial adjustment period (often 3 to 5 days of low-stimulation settling before long visits).
5. Give Staff a "Personal Biography Sheet": Provide a 1-page summary with their favorite music, previous career, soothing phrases, and triggers so aides understand them as an individual.`,
    keyProtocols: [
      'Pre-stage the bedroom with familiar bedspreads and photos before arrival',
      'Arrive mid-morning directly into a planned meal or group activity',
      'Keep goodbyes short, calm, and matter-of-fact',
      'Provide staff with a 1-page personal biography and de-escalation profile'
    ]
  },
  {
    id: 'faq-42',
    category: 'PALLIATIVE_HOSPICE',
    categoryLabel: 'Palliative Care vs Hospice',
    question: 'When is it time for palliative care or hospice in end-stage FTD, and what are the benefits?',
    alternateQueries: [
      'when to start hospice for dementia patient',
      'palliative care vs hospice frontotemporal',
      'end of life signs in advanced FTD',
      'hospice criteria for dementia Medicare',
      'benefits of hospice at home dementia',
      'terminal stage frontotemporal dementia'
    ],
    keywords: ['hospice', 'palliative', 'end of life', 'terminal', 'medicare', 'comfort', 'morphine', 'swallowing', 'advanced'],
    physicianAnswer: `Palliative care focuses on symptom relief and quality of life and can begin at ANY stage of diagnosis. Hospice is specialized comfort care for the final chapter (prognosis of 6 months or less), shifting focus from aggressive medical testing to peace, dignity, and pain-free living.

Medicare Hospice Criteria in Advanced Dementia:
- FAST Stage 7c or higher: Unable to speak more than 6 words; unable to walk without assistance; unable to sit up or smile.
- Recurrent Aspiration Pneumonias, sepsis, or multiple stage 3-4 pressure ulcers.
- Significant Weight Loss (>10% in 6 months) with refusal or inability to take oral nutrition.

Why Enroll in Hospice Early:
1. Comprehensive Home Support: Hospice brings specialized nurses, home health aides for daily bathing, social workers, and chaplains directly to your home or facility at zero out-of-pocket cost under Medicare.
2. Medications & Equipment Delivered: Hospital beds, oxygen, alternating-pressure air mattresses, and comfort medications (morphine, lorazepam drops) are provided free.
3. 24/7 Triage Line: You never have to rush to a chaotic emergency room at 2:00 AM. A hospice nurse comes to the bedside to resolve crises with comfort protocols.`,
    keyProtocols: [
      'Palliative care can start at any stage; hospice begins when focus shifts to comfort',
      'Hospice provides hospital beds, bathing aides, and supplies at zero cost under Medicare',
      'Avoid traumatic ER visits: 24/7 hospice nurses manage crises at the bedside',
      'Speak to Dr. Seema regarding hospice evaluation when swallowing fails'
    ]
  },
  {
    id: 'faq-43',
    category: 'PALLIATIVE_HOSPICE',
    categoryLabel: 'Aspiration Pneumonia Prevention',
    question: 'What are the warning signs of aspiration pneumonia, and how do we prevent it?',
    alternateQueries: [
      'aspiration pneumonia signs in dementia',
      'coughing after drinking water pneumonia',
      'fever and wet cough swallowing difficulty',
      'preventing food entering lungs dementia',
      'thickened liquids for aspiration',
      'leading cause of death in FTD'
    ],
    keywords: ['aspiration', 'pneumonia', 'coughing', 'lungs', 'fever', 'thickener', 'dysphagia', 'choking', 'swallowing', 'death'],
    physicianAnswer: `Aspiration pneumonia (food, liquid, or saliva sliding into the lungs instead of the stomach) is the single leading cause of hospitalization and mortality in advanced FTD due to progressive bulbar muscle coordination failure.

Warning Signs of Aspiration:
- Coughing, throat-clearing, or tearing up immediately during or after swallowing.
- "Wet," gurgling vocal quality after taking a drink.
- Spike in body temperature (fever) with rapid, shallow breathing.
- Sudden lethargy and drop in oxygen saturation (<92%).

Clinical Prevention Strategies:
1. Upright Seating: Never feed someone reclining in bed. Ensure they sit upright at 90 degrees and remain upright for at least 30 to 45 minutes after meals.
2. Texture-Modified Diets: Transition to pureed or mechanical-soft diets (smooth mashed potatoes, yogurt, pureed soups). Use commercial nectar or honey thickeners for thin liquids if prescribed by an SLP.
3. Chin-Tuck Maneuver: Gently prompt them to tuck their chin toward their chest when swallowing; this physically closes the airway and widens the esophagus.
4. Diligent Oral Hygiene: Bacteria from plaque in the mouth aspirates into the lungs with saliva. Brushing teeth or wiping gums twice daily drastically cuts pneumonia rates.`,
    keyProtocols: [
      'Maintain strict 90-degree upright posture during and 45 minutes post-meals',
      'Use thickened liquids and pureed textures as prescribed by SLP',
      'Prompt chin-tuck posture to close the airway during swallows',
      'Perform diligent oral hygiene to prevent oral bacteria from reaching lungs'
    ]
  },
  {
    id: 'faq-44',
    category: 'MOTOR_SYMPTOMS',
    categoryLabel: 'Stiffness & Parkinsonism',
    question: 'Why are my loved one’s limbs becoming stiff and rigid, and why do they shuffle when walking?',
    alternateQueries: [
      'stiff rigid muscles frontotemporal dementia',
      'shuffling gait balance problems FTD',
      'parkinsonism in FTD corticobasal syndrome',
      'alien hand syndrome limb apraxia',
      'muscle stiffness and tremors dementia',
      'PSP parkinsonian symptoms'
    ],
    keywords: ['stiff', 'rigidity', 'shuffling', 'parkinsonism', 'corticobasal', 'psp', 'gait', 'tremor', 'muscles', 'falls'],
    physicianAnswer: `Motor symptoms in FTD—including cogwheel rigidity, muscle stiffness, shuffling gait, and sudden freezing—occur when pathology spreads into the basal ganglia and brainstem (common in Corticobasal Syndrome CBS and Progressive Supranuclear Palsy PSP).

Clinical Care Strategies:
1. Daily Gentle Range-of-Motion Exercises: Perform slow, passive arm and leg stretching daily to prevent permanent muscle contractures and painful joint stiffness.
2. U-Step Weighted Walkers: Standard rolling walkers roll away, causing forward falls. Specialized weighted walkers with reverse brakes (the walker only rolls when squeezing the handlebar) provide vital stability.
3. Physical & Occupational Therapy: Request home-based PT/OT referrals through our clinic for customized gait training and adaptive transfer devices.
4. Medication Evaluation: Unlike idiopathic Parkinson's disease, FTD-associated parkinsonism often responds poorly to levodopa; however, a supervised trial with Dr. Seema can determine if low-dose dopaminergics offer partial relief.
5. Avoid Antipsychotics that Worsen Rigidity: Traditional antipsychotics (Haldol) can induce life-threatening muscle stiffness (neuroleptic malignant syndrome). Ensure all emergency doctors know this contraindication.`,
    keyProtocols: [
      'Perform daily gentle passive range-of-motion stretches to prevent contractures',
      'Utilize specialized weighted reverse-braking walkers (e.g. U-Step)',
      'Request PT/OT home evaluation for transfer safety',
      'Avoid high-potency typical antipsychotics that trigger extreme rigidity'
    ]
  },
  {
    id: 'faq-45',
    category: 'MUSIC_THERAPY',
    categoryLabel: 'Music Therapy & Grounding',
    question: 'Why does familiar music calm my loved one when words fail, and how should I use it?',
    alternateQueries: [
      'music therapy for dementia agitation',
      'calming FTD patient with favorite songs',
      'personalized playlist dementia',
      'why does music help dementia patients',
      'using music during bathing and routines',
      'auditory grounding in dementia'
    ],
    keywords: ['music', 'songs', 'playlist', 'calm', 'therapy', 'auditory', 'singing', 'agitation', 'soothing', 'memory'],
    physicianAnswer: `Musical memory and rhythm processing are anchored in the auditory cortex and spared temporal-parietal networks that remain resilient long after language and executive circuits fail. Music directly stimulates dopamine release and quiets the hyperactive amygdala.

How to Build an Effective Clinical Playlist:
1. Target the "Musical Reminiscence Bump": Curate songs that were popular when the patient was between 15 and 25 years old (their teenage years and early adulthood). These tracks evoke the deepest neural grounding.
2. Use Music Strategically During Stress Points: Start the playlist 10 minutes BEFORE stressful transitions: before starting the bath, before getting dressed, or at 4:00 PM during sundowning hours.
3. Match Tempo to Desired State: Use upbeat, rhythmic big-band or Motown to stimulate motor initiation in the morning; switch to slow, acoustic instrumental melodies (60 beats per minute) for evening wind-down.
4. Sing Along Together: Singing bypasses damaged speech output circuits. Even non-verbal PPA patients can often sing full lyrics to familiar hymns or childhood folk songs fluently!`,
    keyProtocols: [
      'Curate favorite songs from their teenage and early adult years (ages 15-25)',
      'Start music 10 minutes prior to stressful routines like bathing',
      'Use 60 BPM acoustic tempos to reduce evening sundowning anxiety',
      'Singing activates preserved neural pathways even when speech is lost'
    ]
  },
  {
    id: 'faq-46',
    category: 'COMMUNICATION_PPA',
    categoryLabel: 'Assistive Tech & Picture Boards',
    question: 'What assistive technology or picture boards work best for non-verbal PPA patients?',
    alternateQueries: [
      'communication boards for non verbal dementia',
      'iPad speech apps for primary progressive aphasia',
      'picture communication book PPA',
      'augmentative alternative communication AAC',
      'how to help non verbal spouse communicate',
      'tools for lost speech in aphasia'
    ],
    keywords: ['aac', 'picture board', 'ipad', 'communication', 'nonverbal', 'technology', 'cards', 'apps', 'speech'],
    physicianAnswer: `While electronic tablets and complex speech-generating apps (AAC) sound promising, FTD patients frequently lack the executive planning to navigate digital menus. Low-tech, personalized visual tools almost always succeed where complex electronics fail.

Recommended Communication Tools:
1. Low-Tech Personalized Photo Binder: Create a pocket-sized, laminated spiral notebook with 10 to 15 high-contrast real photographs (not cartoon icons): their bed, their favorite chair, a glass of water, bathroom toilet, shoes, pain scale, and immediate family members.
2. High-Tech Tablet Apps (Lingraphica / TouchChat): If introduced in early stages with an SLP, high-contrast, single-screen picture-to-voice apps can assist communication.
3. Dry-Erase Communication Boards: Keep mini dry-erase boards in high-traffic rooms where they can point to pre-written binary choices.
4. Alert Cards for Outings: Small wallet cards they can hand to waiters or clerks saying: "I have a speech disorder. Please give me a moment to point to what I need."`,
    keyProtocols: [
      'Prioritize simple, low-tech laminated photo books over complex digital apps',
      'Use real photographs of their actual cups and bed, not abstract cartoons',
      'Work with a Speech-Language Pathologist early to train visual pointing',
      'Provide wallet alert cards for independent transactions'
    ]
  },
  {
    id: 'faq-47',
    category: 'CLINIC_VISITS',
    categoryLabel: 'Medical & Dental Visits',
    question: 'How do I take my loved one to doctor and dentist visits without terrifying escalations?',
    alternateQueries: [
      'taking dementia patient to the doctor',
      'dentist appointment agitation dementia',
      'waiting room meltdowns doctor visit',
      'how to prepare for clinic appointment FTD',
      'medical appointments with difficult patient',
      'doctor visit preparation tips'
    ],
    keywords: ['doctor', 'dentist', 'clinic', 'appointment', 'waiting room', 'visit', 'meltdown', 'telehealth', 'preparation'],
    physicianAnswer: `Crowded waiting rooms, delays, invasive physical examinations, and cold exam rooms are prime triggers for acute panic and combativeness in FTD.

Clinical Visit Preparation Guide:
1. First Appointment of the Morning: Always book the first appointment slot of the day (8:00 AM or 8:30 AM). This eliminates long clinic delays in noisy waiting rooms.
2. Wait in the Car: Ask the receptionist if you can check in via phone and wait in your car listening to soothing music until the exam room is ready.
3. Send Your Caregiver Notes in Advance: Send your list of behavioral challenges, medications, and sensitive questions through the portal or hand a typed letter to the nurse before entering. Never describe their decline in front of them, which provokes humiliation and rage.
4. Prioritize Telehealth: For routine medication management and behavioral reviews with Dr. Seema, schedule telehealth video appointments so the patient remains comfortable at home.
5. Mobile In-Home Dentistry: In late stages, seek out mobile geriatric dental hygienists who clean teeth in your living room chair.`,
    keyProtocols: [
      'Book the very first morning appointment slot to avoid waiting room delays',
      'Wait in the quiet car until the exam room is immediately available',
      'Send confidential caregiver updates to the doctor prior to the appointment',
      'Utilize telehealth whenever in-person physical exam is not strictly required'
    ]
  },
  {
    id: 'faq-48',
    category: 'LEGAL_MEDICAID',
    categoryLabel: 'Medicaid & Financial Waivers',
    question: 'How do we afford memory care? What are Medicaid spousal impoverishment protections?',
    alternateQueries: [
      'how to pay for memory care dementia',
      'Medicaid five year lookback rule',
      'spousal impoverishment protections Maryland',
      'will nursing home take our house',
      'Medicaid long term care waiver',
      'qualifying for Medicaid without going broke'
    ],
    keywords: ['medicaid', 'spousal impoverishment', 'memory care', 'nursing home', 'assets', 'lookback', 'elder law', 'house', 'waiver'],
    physicianAnswer: `Memory care costs average $6,000 to $10,000+ monthly in Maryland and Pennsylvania. Many families fear they must deplete every dime and lose their family home before government assistance begins. Understanding Medicaid elder law safeguards is essential.

Crucial Legal & Financial Protections:
1. Spousal Impoverishment Rules: Federal and state law explicitly protects the "community spouse" (the healthy spouse living at home). The community spouse can retain the primary home, one vehicle, and a Community Spouse Resource Allowance (CSRA) up to statutory maximums (~$154,140 in 2026).
2. The 60-Month (5-Year) Lookback Rule: Any gift or transfer of assets for less than fair market value within the 60 months prior to Medicaid application triggers penalty delays. Never transfer deeds or cash without elder law guidance.
3. Home and Community-Based Services (HCBS) Waivers: Maryland offers Medicaid waiver programs that pay for in-home caregivers and adult medical day programs to delay nursing home placement.
4. Consult Certified Elder Law Counsel: Connect with legal specialists certified by NAELA (naela.org) or the Maryland Senior Legal Helpline (1-800-999-8904).`,
    keyProtocols: [
      'The community spouse can retain the primary home and protected asset allowance',
      'Never gift money or transfer titles within the 60-month lookback period',
      'Explore Maryland HCBS waivers to fund in-home caregivers',
      'Consult vetted NAELA-certified elder law counsel before spending down'
    ],
    relatedGuideId: 'res-medicaid-legal',
    relatedGuideTitle: 'Medicaid Long-Term Care & Elder Law Resource Guide (Maryland & PA)'
  },
  {
    id: 'faq-49',
    category: 'CRISIS_EMERGENCY',
    categoryLabel: 'Acute Safety Crisis & 911',
    question: 'What do I do if my loved one becomes physically violent or wields an object at home?',
    alternateQueries: [
      'patient physically violent at home',
      'spouse attacking caregiver with object',
      'when to call 911 dementia emergency',
      'crisis de escalation violent behavior',
      'danger to self or others FTD',
      'emergency protocol violent outburst'
    ],
    keywords: ['violent', 'violence', '911', 'emergency', 'hitting', 'weapon', 'police', 'crisis', 'danger', 'safety'],
    physicianAnswer: `If your loved one brandishes an object, strikes you, or presents an immediate danger to themselves or others, your sole responsibility is physical safety.

Immediate Crisis Protocol:
1. Disengage and Evacuate: Do NOT attempt physical restraint or wrestling away objects. Back away, exit the immediate room, lock yourself in a secure room, or leave the house.
2. Call 911 Immediately: Clearly tell the dispatcher: "This is a medical psychiatric emergency. My family member has a diagnosed neurological brain disorder called Frontotemporal Dementia. They are in an acute behavioral crisis. Please dispatch a Crisis Intervention Team (CIT) officer trained in mental health."
3. Brief Arriving Officers Outside: Meet police outside your home before they enter. Explain: "He has a physical brain disease, not a criminal intent. Loud yelling, drawn weapons, or aggressive physical commands will escalate the panic. Please speak calmly."
4. Contact the Clinic Emergency Line: Notify the Johns Hopkins clinic team at (410) 955-5147 (option 2) so we can coordinate with the receiving hospital emergency department.`,
    keyProtocols: [
      'Retreat immediately to safety; never attempt physical restraint alone',
      'Call 911 and explicitly request a Crisis Intervention Team (CIT) officer',
      'Meet officers outside to brief them on the neurological diagnosis before they enter',
      'Alert the Johns Hopkins clinic line at (410) 955-5147 to coordinate hospital intake'
    ]
  },
  {
    id: 'faq-50',
    category: 'CRISIS_EMERGENCY',
    categoryLabel: 'ER & Hospital Preparedness',
    question: 'What should I do if we end up in the Emergency Room? How do I prevent harmful sedatives?',
    alternateQueries: [
      'taking FTD patient to emergency room',
      'preventing Haldol in ER dementia',
      'hospital emergency department FTD tips',
      'what to tell ER doctors about FTD',
      'hospital delirium in dementia patient',
      'emergency room packet for dementia'
    ],
    keywords: ['emergency room', 'hospital', 'er', 'sedatives', 'haldol', 'antipsychotic', 'delirium', 'packet', 'doctors'],
    physicianAnswer: `General Emergency Rooms are noisy, chaotic environments staffed by physicians who often mistake FTD for psychiatric psychosis or standard Alzheimer's. Without your advocacy, the ER may administer high-dose typical antipsychotics (like Haldol), which can trigger catastrophic parkinsonian rigidity or fatal neuroleptic reactions.

Hospital Advocacy Packet:
1. Carry the "ER Diagnostic Dossier": Keep an envelope in your car containing:
   - Diagnostic confirmation letter from Johns Hopkins / Dr. Seema.
   - Comprehensive medication list with exact doses.
   - Medical Power of Attorney (DPOA) and Advance Directives.
2. Put the Warning in Writing: Hand this note to the triage nurse: "PATIENT HAS FRONTOTEMPORAL DEMENTIA (FTD). HIGHLY SENSITIVE TO TYPICAL ANTIPSYCHOTICS (HALOPERIDOL). DO NOT ADMINISTER WITHOUT CONTACTING OUR NEUROLOGIST."
3. Stay at the Bedside: A hospital bed in a strange room triggers terrifying delirium. Ensure a family member remains present 24/7 to provide continuous familiar grounding.
4. Request Immediate Neurology Consult: Ask the attending ER physician to place a consultation order to the on-call neurology service.`,
    keyProtocols: [
      'Warn ER physicians in writing against typical antipsychotics like Haldol',
      'Carry the emergency dossier: Dr. Seema’s letter, medication list, and Medical POA',
      'Keep a familiar family caregiver at the hospital bedside 24/7',
      'Request an immediate hospital neurology consultation'
    ]
  }
];
