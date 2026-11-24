export interface CarePartnerDetails {
  patientAge: number;
  carePartnerAge: number;
  relationshipToPatient: string;
  county: string;
  state: string;
}
export type CarePartnerDetailsDraft = {
  [K in keyof CarePartnerDetails]: string;
};
export const emptyCarePartnerDetails: CarePartnerDetailsDraft = {
  patientAge: '',
  carePartnerAge: '',
  relationshipToPatient: '',
  county: '',
  state: '',
};
export function parseCarePartnerDetails(
  draft: CarePartnerDetailsDraft,
): CarePartnerDetails | null {
  const patientAge = Number(draft.patientAge);
  const carePartnerAge = Number(draft.carePartnerAge);
  if (
    ![draft.patientAge, draft.carePartnerAge].every((value) =>
      /^\d+$/.test(value),
    ) ||
    ![patientAge, carePartnerAge].every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 130,
    )
  )
    return null;
  const { relationshipToPatient, county, state } = draft;
  if (
    ![relationshipToPatient, county, state].every(
      (value) =>
        value.trim().length > 0 &&
        value.trim().length <= 100 &&
        !/\p{Cc}/u.test(value),
    )
  )
    return null;
  return {
    patientAge,
    carePartnerAge,
    relationshipToPatient: relationshipToPatient.trim(),
    county: county.trim(),
    state: state.trim(),
  };
}
