import type { ClinicalResource } from "../src/types/index.ts";
export const clinicalResources: ClinicalResource[] = [
  {
    id: "res-aftd-incontinence",
    title: "AFTD Practical Care Sheet: Managing Incontinence in bvFTD",
    summary:
      "Clinical guidelines on loss of bowel/bladder awareness, toileting schedules, and behavioral strategies without confrontation.",
    contentBody: `In Behavioral Variant FTD (bvFTD), incontinence often stems not from urological failure, but from frontal lobe disinhibition and loss of interoceptive awareness (inability to perceive body cues).

Key Strategies:
1. Scheduled Voiding Routine: Escort patient to restroom every 90-120 minutes on a fixed timer rather than asking "Do you need to go?" (asking frequently triggers automatic oppositional refusal).
2. Adaptive Garments: Tear-away side pull-ons with quiet cloth liners reduce tactile defensiveness compared to noisy plastic briefs.
3. Visual Cueing: Leave restroom door open with the toilet in direct sightline, illuminated by high-contrast warm lighting. Use contrasting color toilet seats (dark blue on white porcelain).
4. Fluid Management: Maintain high hydration during morning and early afternoon to prevent UTIs, but taper fluids 2 hours before bedtime.
5. Escalation Warning: Sudden acute incontinence or delirium may signal a urinary tract infection (UTI). Contact the clinic promptly for urinalysis.`,
    externalUrl:
      "https://www.theaftd.org/living-with-ftd/managing-ftd/incontinence/",
    fileAttachmentUrl: "/resources/aftd-incontinence-guide.pdf",
    diseaseDomain: "FTD",
    category: "INCONTINENCE",
    keyTakeaways: [
      "Scheduled voiding every 90-120 minutes prevents resistance",
      "Use quiet cloth-backed tear-away briefs rather than crinkly plastic",
      "High-contrast colored toilet seat assists visual spatial processing",
      "Rule out UTI if sudden acute incontinence develops",
    ],
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "res-aftd-bathing",
    title:
      "De-escalating Bathing and Shower Agitation in Frontotemporal Dementia",
    summary:
      "Trauma-informed, non-pharmacological protocols for severe shower resistance, sponge throwing, and tactile hypersensitivity.",
    contentBody: `Shower aggression in FTD is almost always driven by sensory overload (the sound of rushing water, cold air, naked vulnerability) and loss of cognitive sequence comprehension.

Recommended Clinic Protocols:
1. Towel Bathing Method: Keep the patient wrapped in large warm bath towels. Uncover only one limb at a time to wash with warm, no-rinse soothing washcloths.
2. Ambient Preparation: Heat the bathroom to 78°F with a portable radiant heater before undressing begins. Run the water beforehand so the sound is constant rather than a sudden startling blast.
3. Remove Overhead Showers: Overhead water sprays directly onto the face feel like an assault to a disinhibited frontal lobe. Use a handheld wand directed strictly at the feet and torso.
4. Sing or Play Familiar Music: Familiar songs from early adulthood occupy the auditory cortex and decrease amygdala threat responses.
5. NEVER Argue or Restrain: If agitation escalates to physical defense, step back, ensure physical safety, disengage calmly, and re-attempt 45 minutes later with a different caregiver or technique.`,
    externalUrl:
      "https://www.theaftd.org/living-with-ftd/managing-ftd/daily-care/",
    fileAttachmentUrl: "/resources/bathing-agitation-protocol.pdf",
    diseaseDomain: "FTD",
    category: "BEHAVIORAL_AGITATION",
    keyTakeaways: [
      "Pre-warm the bathroom to 78°F before undressing",
      "Utilize no-rinse warm towel bathing when showers cause terror",
      "Handheld shower wand directed away from face",
      "Music and step-by-step calm reassurance reduces fight-or-flight",
    ],
    createdAt: "2026-02-05T12:00:00Z",
  },
  {
    id: "res-medicaid-legal",
    title: "Medicaid Long-Term Care & Elder Law Resource Guide (Maryland & PA)",
    summary:
      "Guidance on Medicaid five-year look-back, spousal impoverishment protections, and vetted elder law counsel in MD/PA.",
    contentBody: `Navigating long-term residential memory care placement requires early legal structuring before cognitive impairment prevents signing Powers of Attorney.

Crucial Facts for Care Partners:
1. Spousal Impoverishment Protections: In Maryland, the community spouse can retain the primary residence, one automobile, and a substantial Community Spouse Resource Allowance (CSRA) up to statutory limits (~$154,140 in 2026).
2. Five-Year Lookback Rule: Any gift or transfer of assets for less than fair market value within 60 months prior to Medicaid application triggers penalty periods.
3. Special Needs / Supplemental Trusts: Enable families to provide quality-of-life enhancements for the diagnosed individual without jeopardizing Medicaid eligibility.
4. Clinic Vetted Contacts: Maryland Legal Aid Senior Legal Helpline: 1-800-999-8904. National Academy of Elder Law Attorneys (NAELA) directory at naela.org.`,
    externalUrl:
      "https://aging.maryland.gov/Pages/medicaid-long-term-care.aspx",
    fileAttachmentUrl: "/resources/md-medicaid-elder-law.pdf",
    diseaseDomain: "FTD",
    category: "LEGAL_MEDICAID",
    keyTakeaways: [
      "Community spouse retains primary home and protected asset allowance",
      "Beware 60-month lookback on uncompensated transfers",
      "Execute Durable Financial & Medical Powers of Attorney immediately",
      "Consult vetted NAELA-certified elder law counsel",
    ],
    createdAt: "2026-02-18T15:30:00Z",
  },
  {
    id: "res-safety-wandering",
    title: "FTD Wandering, Elopement & Impulsive Driving Risk Management",
    summary:
      "Mitigating acute safety risks from loss of hazard awareness, GPS tracker placement, and driving retirement.",
    contentBody: `Unlike Alzheimer's wandering where patients are disoriented and looking for childhood homes, bvFTD wandering is frequently purposeful and rapid (e.g., compulsive walks along known routes or fixated shopping trips), but with total disregard for oncoming traffic.

Protocols:
1. Discrete GPS Tracking: Affix discreet Apple AirTags or AngelSense wearable devices in shoe insoles or jacket linings (wristwatches are often discarded).
2. Key Camouflage & Disabling: Discontinue driving privileges decisively. Hide car keys, install a battery disconnect switch or fuse-pull rather than debating driving competence.
3. Door Alarms: Install magnetic chime sensors on exterior doors placed at top of door frame outside normal line of sight.
4. Safe Return Registry: File a wandering profile with local Baltimore / county police departments including recent photo, favorite walking spots, and de-escalation instructions.`,
    externalUrl: "https://www.theaftd.org/living-with-ftd/managing-ftd/safety/",
    fileAttachmentUrl: "/resources/wandering-safety-guide.pdf",
    diseaseDomain: "FTD",
    category: "SAFETY_WANDERING",
    keyTakeaways: [
      "Place GPS trackers in shoe insoles or sewn into jackets",
      "Physically disable vehicle rather than engaging in logic arguments",
      "Register with local county Safe Return police program",
      "High door-frame chimes alert family during night wandering",
    ],
    createdAt: "2026-03-05T09:15:00Z",
  },
];
