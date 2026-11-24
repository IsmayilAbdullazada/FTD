# Guide topics and reviewed resource catalog

The UI uses **Topic** consistently. A shared catalog supplies filters and all PDF, pasted-text, webpage and admin guide forms. The existing API/database field is still named `category` for compatibility. The legacy `topicTag` transport field mirrors that selection when saving; it is no longer a second editable field.

## Topics

- Understanding Dementia
- Behavior and Personality
- Daily Living and Personal Hygiene
- Communication and Relationships
- Safety and Driving
- Sleep and Rest
- Eating and Nutrition
- Legal and Financial Planning
- Support and Wellbeing
- Grief and Loss
- Later-Stage Dementia and Hospice

Upload forms no longer show clinic-library recommendations or quick-select buttons. The normal PDF/text file picker and direct text entry remain available, including filename-based metadata suggestions.

Topic selection is optional. Unassigned or unrecognized legacy values have no badge in cards or the guide reader; they can be found using **Without a Topic**. The old Incontinence and Daily Care entries map to the same Daily Living topic. Known legacy labels remain readable while new selections use stable keys. Unknown custom values are retained in storage for staff review rather than guessed into a topic.

## PDF titles and primary topics

All PDFs below are FTD-specific. Titles summarize the actual article rather than using a generic newsletter/date label. Dates reflect the issue, not the later website upload date. Original PDF bytes, filenames and source wording are preserved.

| PDF                                     | UI title                                               | Topic                             |
| --------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| `Managing-Aggressive-Behavior.pdf`      | Managing Aggressive Behavior in FTD                    | Behavior and Personality          |
| `SleepIssuesFTD-090623.pdf`             | Sleep Issues in FTD                                    | Sleep and Rest                    |
| `PinFTDcare_Newsletter_Fall_2016.pdf`   | Comfort and Hospice in Advanced FTD (Fall 2016)        | Later-Stage Dementia and Hospice  |
| `PinFTDcare_Newsletter_Winter_2018.pdf` | Understanding and Managing Apathy in FTD (Winter 2018) | Behavior and Personality          |
| `PinFTDcare_Newsletter_Winter_2019.pdf` | Understanding Anosognosia in FTD (Winter 2019)         | Behavior and Personality          |
| `PinFTDcare_sprng_2020.pdf`             | Responding to Resistance to Help in FTD (Spring 2020)  | Daily Living and Personal Hygiene |
| `January-2014.pdf`                      | Managing Incontinence in FTD (Winter 2014)             | Daily Living and Personal Hygiene |
| `July-2012.pdf`                         | Compulsive Behaviors in FTD (Summer 2012)              | Behavior and Personality          |
| `PiC-fall-2014-WTDA.pdf`                | Loss of Empathy and Connection in FTD (Fall 2014)      | Communication and Relationships   |
| `Summer-2014-Newsletter_Final.pdf`      | Changes in Sexual Behavior in FTD (Summer 2014)        | Behavior and Personality          |
| `Spring-2013.pdf`                       | Roaming Is Not Wandering in FTD (Spring 2013)          | Safety and Driving                |
| `AFTDGriefBookletForWeb.pdf`            | Walking with Grief: Loss and the FTD Journey           | Grief and Loss                    |

Known PDF uploads prefill these titles, topics, the AFTD publisher and the available year without overwriting fields staff already selected. Migration 015 improves recognized default titles and generic/missing topics for already-stored bundled PDFs, while retaining custom titles and specific topic selections.

## Eight new sources

The six pages were fetched and reviewed, and both supplied PDFs were extracted for title/content review. The two driving articles are distinct pages. For this platform, YES! and the Alzheimer’s Association are assigned to the AD audience only, as specified by the resource owner. The AFTD symptom/grief documents are FTD-specific. A condition assignment does not imply every article on an organization website is relevant to every diagnosis.

| Title                                                     | Type    | Audience         | Topic                    | Original source                                                               |
| --------------------------------------------------------- | ------- | ---------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Managing Compulsive Behaviors in FTD                      | Webpage | FTD              | Behavior and Personality | https://www.theaftd.org/help-and-hope/ta-compulsive-behaviors/                |
| Driving and FTD: Making a Difficult Decision              | Webpage | FTD              | Safety and Driving       | https://www.theaftd.org/help-and-hope/hs-driving-and-ftd/                     |
| Driving and FTD: Tips for Care Partners                   | Webpage | FTD              | Safety and Driving       | https://www.theaftd.org/help-and-hope/caregiver-tips-driving-and-ftd/         |
| Roaming Is Not Wandering in FTD (Spring 2013)             | PDF     | FTD              | Safety and Driving       | https://www.theaftd.org/wp-content/uploads/2018/01/Spring-2013.pdf            |
| Grief and the FTD Journey                                 | Webpage | FTD              | Grief and Loss           | https://www.theaftd.org/help-and-hope/hs-grief-and-the-ftd-journey/           |
| Walking with Grief: Loss and the FTD Journey              | PDF     | FTD              | Grief and Loss           | https://www.theaftd.org/wp-content/uploads/2020/02/AFTDGriefBookletForWeb.pdf |
| YES!: Young-Onset Dementia Education and Support          | Webpage | Alzheimer’s (AD) | Support and Wellbeing    | https://yessupport.org                                                        |
| Alzheimer’s Association: Dementia Information and Support | Webpage | Alzheimer’s (AD) | Understanding Dementia   | https://www.alz.org                                                           |

Spring 2013 is stored as `/resources/Spring-2013.pdf`; the grief booklet is stored as `/resources/AFTDGriefBookletForWeb.pdf`. Original publisher PDF URLs remain available as source links. PostgreSQL stores metadata and these URLs, not PDF binaries. These are published library resources; their resource summaries participate in resource full-text search. They are not a new claim of generated chatbot answers or an external model integration.

The grief booklet is 20,626,302 bytes, so it is distributed as a bundled public source rather than sent through the 12 MB upload endpoint. The upload limit remains unchanged. SHA-256: `f69434ec5d8c6110a3da5e7dfbbc371e173800ee881b10b5704189fc3920b719`. Spring 2013 SHA-256: `b13322d9fcaa0098a21c903d001dcd0c2b02733f81f42e7aa813215588bedbd1`.

## Deployment

Build and deploy the matching frontend and backend, including both PDFs copied from `public/resources/` into frontend `dist/resources/`. Apply **015_guide_topics_and_resources** and **016_ad_resource_audiences** before restarting the API. Migration 016 corrects the two organization resources to AD-only, including existing copies with matching source URLs. No production seed command is required. The migration adds the eight sources on fresh and upgraded databases and avoids duplicating matching existing URLs/PDFs. Sources already added manually retain their existing staff metadata; the explicit AD-only assignment for YES! and the Alzheimer’s Association also applies to matching copies. Existing staff drafts or unpublished copies are not silently republished.

## Verification

- 65 frontend tests cover shared dropdown behavior, legacy topic normalization, no generic Guide badge, filtering unassigned resources and preserving older custom topics during title-only edits.
- 70 backend tests on PostgreSQL 16 and 18, including idempotent migration, duplicate handling, staff-edit preservation, source metadata/audiences, original PDF URLs and legacy topic-tag fallback.
- Desktop 1440 × 900 and touch-enabled mobile 390 × 844 in local Chromium: all eight sources, FTD/AD audience filtering, unchanged PDF downloads, optional topics, editing/filtering a topic, webpage and admin dropdowns, plus light/dark axe checks with no render errors or horizontal overflow. Screenshots visually reviewed. This does not represent physical-device, Safari or production-server testing.
- TypeScript, ESLint, Prettier, delayed-loading App workflows, release-tooling checks and production builds.

Browser evidence and source review notes are in `/workspace/artifacts/guide-topic-catalog/` in this task workspace, outside production assets.
