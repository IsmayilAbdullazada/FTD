import { useId } from 'react';
import { fieldClassName } from '@/shared/components/Button';
import type { CarePartnerDetailsDraft } from '../lib/carePartnerDetails';

const fields = [
  ['patientAge', 'Patient age (years)', 'number'],
  ['carePartnerAge', 'Care partner age (years)', 'number'],
  ['relationshipToPatient', 'Relationship to the patient', 'text'],
  ['county', 'County of residence', 'text'],
  ['state', 'State of residence', 'text'],
] as const;
export function CarePartnerDetailsFields({
  value,
  onChange,
}: {
  value: CarePartnerDetailsDraft;
  onChange: (value: CarePartnerDetailsDraft) => void;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-4">
      <legend className="mb-2 font-semibold text-slate-900 dark:text-white">
        About you and the person you support
      </legend>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        All five fields are required. Enter your county and state of residence.
        These details are kept out of public community profiles.
      </p>
      {fields.map(([key, label, type]) => (
        <div key={key}>
          <label
            htmlFor={`${id}-${key}`}
            className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
          <input
            id={`${id}-${key}`}
            required
            type={type}
            min={type === 'number' ? 0 : undefined}
            max={type === 'number' ? 130 : undefined}
            step={type === 'number' ? 1 : undefined}
            maxLength={type === 'text' ? 100 : undefined}
            autoComplete={key === 'state' ? 'address-level1' : 'off'}
            className={fieldClassName}
            value={value[key]}
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
          />
        </div>
      ))}
    </fieldset>
  );
}
