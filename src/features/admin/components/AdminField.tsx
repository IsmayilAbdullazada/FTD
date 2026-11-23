import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import type { AdminActionField, AdminColumn, AdminTable } from '../types';
export function AdminField({
  field,
  value,
  onChange,
  disabled = false,
  table,
}: {
  field: AdminActionField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  table?: AdminTable;
}) {
  const [choices, setChoices] = useState<{ value: unknown; label: string }[]>(
      [],
    ),
    [text, setText] = useState('');
  const foreign = table?.foreignKeys.some((f) =>
    f.columns.includes(field.name),
  );
  useEffect(() => {
    let active = true;
    if (table && foreign)
      void adminApi
        .choices(table.name, field.name, text)
        .then((result) => {
          if (active) setChoices(result.choices);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [table, foreign, field.name, text]);
  const inputValue =
    field.type === 'date' && value
      ? (() => {
          const date = new Date(String(value));
          return Number.isNaN(date.getTime())
            ? ''
            : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
        })()
      : String(value ?? '');
  const common =
    'mt-1 min-h-11 w-full rounded border border-slate-400 bg-transparent p-2 text-sm disabled:opacity-50';
  return (
    <label className="block text-sm font-semibold">
      {field.label}
      {field.required ? ' *' : ''}
      {field.type === 'boolean' ? (
        <select
          aria-label={field.label + (field.required ? ' *' : '')}
          className={common}
          disabled={disabled}
          value={value === undefined ? '' : String(value)}
          onChange={(e) =>
            onChange(
              e.target.value === '' ? undefined : e.target.value === 'true',
            )
          }
        >
          <option value="">Choose…</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      ) : field.type === 'select' ? (
        <select
          aria-label={field.label + (field.required ? ' *' : '')}
          className={common}
          disabled={disabled}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose…</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : ['longtext', 'json'].includes(field.type) ? (
        <textarea
          aria-label={field.label + (field.required ? ' *' : '')}
          className={common + ' min-h-28 font-normal'}
          disabled={disabled}
          value={
            typeof value === 'string'
              ? value
              : value === undefined
                ? ''
                : JSON.stringify(value, null, 2)
          }
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={field.label + (field.required ? ' *' : '')}
          className={common}
          list={foreign ? 'fk-' + field.name : undefined}
          disabled={disabled}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'date'
                ? 'datetime-local'
                : 'text'
          }
          value={inputValue}
          onChange={(e) => {
            setText(e.target.value);
            onChange(
              field.type === 'number' && e.target.value !== ''
                ? Number(e.target.value)
                : e.target.value,
            );
          }}
        />
      )}
      {foreign && (
        <datalist id={'fk-' + field.name}>
          {choices.map((choice) => (
            <option key={String(choice.value)} value={String(choice.value)}>
              {choice.label}
            </option>
          ))}
        </datalist>
      )}
    </label>
  );
}
export function columnField(column: AdminColumn): AdminActionField {
  return {
    name: column.name,
    label: column.name.replaceAll('_', ' '),
    required: !column.nullable && !column.defaultValue,
    type: column.enumValues
      ? 'select'
      : column.type === 'boolean'
        ? 'boolean'
        : ['json', 'jsonb', 'ARRAY'].includes(column.type)
          ? 'json'
          : [
                'integer',
                'bigint',
                'smallint',
                'numeric',
                'double precision',
                'real',
              ].includes(column.type)
            ? 'number'
            : column.type.includes('timestamp')
              ? 'date'
              : column.sensitive
                ? 'longtext'
                : 'text',
    options: column.enumValues,
  };
}
export function parseFields(
  fields: AdminActionField[],
  values: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([name, value]) => {
        const field = fields.find((f) => f.name === name);
        if (field?.type === 'json' && typeof value === 'string') {
          try {
            return [name, JSON.parse(value)];
          } catch {
            throw new Error(`Enter valid JSON for ${field.label}`);
          }
        }
        if (field?.type === 'date' && typeof value === 'string') {
          const date = new Date(value);
          if (Number.isNaN(date.getTime()))
            throw new Error('Enter a valid date');
          return [name, date.toISOString()];
        }
        return [name, value];
      }),
  );
}
