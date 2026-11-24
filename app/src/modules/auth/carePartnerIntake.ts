import { z } from 'zod';
import type { PoolClient } from 'pg';

const detailText = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[^\p{Cc}]+$/u);
export const carePartnerDetailsSchema = z.object({
  patientAge: z.number().int().min(0).max(130),
  carePartnerAge: z.number().int().min(0).max(130),
  relationshipToPatient: detailText,
  county: detailText,
  state: detailText,
});
export const guidelinesAgreementSchema = z.literal(true, {
  error: 'Please read and agree to the Community Guidelines.',
});

export async function saveCarePartnerDetails(
  client: PoolClient,
  userId: string,
  details: z.infer<typeof carePartnerDetailsSchema>,
) {
  await client.query(
    `INSERT INTO care_partner_profiles
     (user_id,patient_age,care_partner_age,relationship_to_patient,county,state)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO NOTHING`,
    [
      userId,
      details.patientAge,
      details.carePartnerAge,
      details.relationshipToPatient,
      details.county,
      details.state,
    ],
  );
}
