import bcrypt from "bcryptjs";
import { pool, transaction } from "../config/db.js";
import { env } from "../config/env.js";

const users = [
  [
    "user-clinician-1",
    "sgulyan1@jhmi.edu",
    "CLINICIAN_MODERATOR",
    "Seema",
    "Gulyani",
    "(410) 955-5000",
    "STAFF-MD-409",
    null,
    "Seema Gulyani (Moderator)",
    "#002D72",
    "Clinician Moderator",
  ],
  [
    "user-admin-1",
    "cs-admin@cs.jhu.edu",
    "SYSTEM_ADMIN",
    "Hopkins",
    "CS Infrastructure Lead",
    null,
    "STAFF-ADMIN-1",
    null,
    "JHU CS Admin",
    "#475569",
    "System Administrator",
  ],
  [
    "user-care-1",
    "sarah.smith@example.com",
    "CARE_PARTNER",
    "Sarah",
    "Smith",
    "(410) 555-8841",
    "JHM-99210-FTD",
    "FTD",
    "User-882",
    "#1E40AF",
    "Care Partner",
  ],
  [
    "user-care-2",
    "marcus.vance@example.com",
    "CARE_PARTNER",
    "Marcus",
    "Vance",
    "(443) 555-3921",
    "JHM-77341-FTD",
    "FTD",
    "User-419",
    "#047857",
    "Care Partner",
  ],
] as const;

const cohorts = [
  [
    "group-general",
    "General Forum",
    "General Forum (All Regions)",
    "General Forum",
    "general-community",
    "Clinic-wide discussion board for verified care partners.",
    "All Regions",
    null,
    "GLOBAL",
    true,
  ],
  [
    "group-central-maryland",
    "Central Maryland",
    "Central Maryland (Baltimore Metro)",
    "Central Maryland",
    "central-maryland",
    "Local peer support for families in Baltimore and the central Maryland corridor.",
    "Central Maryland (Baltimore Metro)",
    30,
    "GEO_CENTRAL_MD",
    false,
  ],
  [
    "group-eastern-maryland",
    "Eastern Maryland",
    "Eastern Maryland (Eastern Shore)",
    "Eastern Maryland",
    "eastern-maryland",
    "Care partner support for the Eastern Shore.",
    "Eastern Maryland (Eastern Shore)",
    60,
    "GEO_EASTERN_MD",
    false,
  ],
  [
    "group-western-maryland",
    "Western Maryland",
    "Western Maryland (Frederick and surrounding areas)",
    "Western Maryland",
    "western-maryland",
    "Care partner support for Frederick and Western Maryland.",
    "Western Maryland",
    45,
    "GEO_WESTERN_MD",
    false,
  ],
  [
    "group-southern-maryland",
    "Southern Maryland / DC / Northern Virginia",
    "Southern Maryland / DC / Northern Virginia",
    "Southern Maryland / DC / Northern Virginia",
    "southern-maryland-dc-nova",
    "Regional support across Southern Maryland, DC, and Northern Virginia.",
    "Southern Maryland / DC / Northern Virginia",
    40,
    "GEO_SOUTHERN_MD_DC_NOVA",
    false,
  ],
  [
    "group-northern-maryland",
    "Northern Maryland / Pennsylvania / Delaware",
    "Northern Maryland / Pennsylvania / Delaware",
    "Northern Maryland / Pennsylvania / Delaware",
    "northern-maryland-pa-de",
    "Regional support for Northern Maryland, southern Pennsylvania, and Delaware.",
    "Northern Maryland / Pennsylvania / Delaware",
    50,
    "GEO_NORTHERN_MD_PA_DE",
    false,
  ],
] as const;

async function seed() {
  if (env.NODE_ENV === "production" && env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Production seed is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional bootstrap.",
    );
  }
  const passwordHash = await bcrypt.hash("Hopkins2026!", 12);
  await transaction(async (client) => {
    for (const c of cohorts)
      await client.query(
        `INSERT INTO cohorts(id,name,full_name,proper_name,slug,description,geographic_region,radius_miles,tag,is_general_board)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`,
        [...c],
      );
    for (const u of users)
      await client.query(
        `INSERT INTO users(id,email,role,first_name,last_name,phone_number,clinic_patient_id,condition,anonymous_handle,avatar_color,badge_label,password_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email`,
        [...u, passwordHash],
      );
    const memberships = [
      ["group-general", "user-clinician-1", false],
      ["group-central-maryland", "user-clinician-1", true],
      ["group-general", "user-admin-1", true],
      ["group-general", "user-care-1", false],
      ["group-central-maryland", "user-care-1", true],
      ["group-general", "user-care-2", false],
      ["group-eastern-maryland", "user-care-2", true],
    ];
    for (const m of memberships)
      await client.query(
        `INSERT INTO cohort_members(cohort_id,user_id,is_primary) VALUES($1,$2,$3)
       ON CONFLICT(cohort_id,user_id) DO UPDATE SET is_primary=EXCLUDED.is_primary`,
        m,
      );
    await client.query(
      `INSERT INTO resources(id,title,summary,content_body,file_attachment_url,disease_domain,category,key_takeaways,created_by)
       VALUES('ftd-aggressive-behavior','Managing Aggressive Behavior in FTD','Recognize triggers and respond while prioritizing safety.',
       'Observe patterns, reduce avoidable triggers, and involve the care team when behavior is new, severe, or unsafe.',
       '/resources/Managing-Aggressive-Behavior.pdf','FTD','BEHAVIORAL_AGITATION',$1,'user-clinician-1') ON CONFLICT(id) DO NOTHING`,
      [
        JSON.stringify([
          "Document what happened before the behavior.",
          "Use calm, safety-conscious responses.",
        ]),
      ],
    );
  });
  console.log(
    "[Seed] Development identities, cohorts, and clinical resources are ready.",
  );
}

seed()
  .catch((error) => {
    console.error("[Seed error]", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
