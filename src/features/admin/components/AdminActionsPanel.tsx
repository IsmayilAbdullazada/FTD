import { Button, fieldClassName } from '@/shared/components/Button';
import { useState } from 'react';
import { MutationDialog } from './MutationDialog';
import { AdminField, parseFields } from './AdminField';
import type { AdminAction, AdminIntent } from '../types';
export function AdminActionsPanel({ actions }: { actions: AdminAction[] }) {
  const [id, setId] = useState(actions[0]?.id || ''),
    [values, setValues] = useState<Record<string, unknown>>({}),
    [reason, setReason] = useState(''),
    [error, setError] = useState<string | null>(null),
    [intent, setIntent] = useState<AdminIntent | null>(null),
    [notice, setNotice] = useState('');
  const action = actions.find((a) => a.id === id)!;
  function preview() {
    try {
      if (reason.trim().length < 10)
        throw new Error('Write a reason of at least 10 characters.');
      setIntent({
        operation: {
          kind: 'action',
          action: id,
          args: parseFields(action.fields, values),
        },
        reason,
      });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid action');
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Actions</h2>
      <p className="text-sm">
        Actions use the same domain operations as the application. A preview and
        a written reason are required.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label className="block">
        Action
        <select
          aria-label="Action"
          className={`mt-1 ${fieldClassName}`}
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setValues({});
            setError(null);
            setNotice('');
          }}
        >
          {actions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {action.fields.map((field) => (
          <AdminField
            key={id + field.name}
            field={field}
            value={values[field.name]}
            onChange={(value) =>
              setValues((v) => ({ ...v, [field.name]: value }))
            }
          />
        ))}
      </div>
      <label className="block text-sm">
        Reason (at least 10 characters)
        <textarea
          aria-label="Reason (at least 10 characters)"
          className={`mt-1 min-h-24 ${fieldClassName}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <Button variant="primary" onClick={preview}>
        Preview action
      </Button>
      {intent && (
        <MutationDialog
          intent={intent}
          onClose={() => setIntent(null)}
          onDone={(id) => {
            setIntent(null);
            setNotice('Change saved. Audit entry: ' + id);
          }}
        />
      )}
    </section>
  );
}
