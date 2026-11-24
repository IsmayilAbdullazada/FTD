import { Button, fieldClassName } from '@/shared/components/Button';
import { useEffect, useState } from 'react';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { adminApi } from '../api/adminApi';
import { MutationDialog } from './MutationDialog';
import { AdminField, columnField, parseFields } from './AdminField';
import type { AdminTable, AdminPage, AdminRow, AdminIntent } from '../types';
export function AdminDataPanel({ tables }: { tables: AdminTable[] }) {
  const [name, setName] = useState(tables[0]?.name || ''),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(50),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState(''),
    [direction, setDirection] = useState('asc'),
    [filterColumn, setFilterColumn] = useState(''),
    [filterValue, setFilterValue] = useState('');
  const [result, setResult] = useState<AdminPage | null>(null),
    [error, setError] = useState<string | null>(null),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<Record<string, unknown>[]>([]),
    [editor, setEditor] = useState<{
      mode: 'create' | 'update';
      row: AdminRow;
      keys: Record<string, unknown>[];
    } | null>(null),
    [intent, setIntent] = useState<AdminIntent | null>(null),
    [reason, setReason] = useState('');
  const [loadedName, setLoadedName] = useState('');
  const table = tables.find((t) => t.name === name)!;
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    direction,
    ...(sort ? { sort } : {}),
    ...(filterColumn && filterValue
      ? { filters: JSON.stringify({ [filterColumn]: filterValue }) }
      : {}),
  });
  const serialized = params.toString();
  useEffect(() => {
    let active = true;
    void adminApi
      .rows(name, new URLSearchParams(serialized))
      .then((result) => {
        if (active) {
          setResult(result);
          setLoadedName(name);
          setSelected([]);
          setError(null);
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error ? error.message : 'Could not load rows',
          );
      });
    return () => {
      active = false;
    };
  }, [name, serialized, revision]);
  function remove(keys: Record<string, unknown>[]) {
    if (reason.trim().length < 10) {
      setError('Enter a reason of at least 10 characters before deleting.');
      return;
    }
    setIntent({
      operation: {
        kind: 'data',
        table: name,
        mode: 'delete',
        keys,
        values: {},
      },
      reason,
    });
  }
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Data</h2>
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          Table
          <select
            aria-label="Table"
            className={`mt-1 ${fieldClassName}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPage(1);
              setSort('');
              setFilterColumn('');
              setFilterValue('');
              setEditor(null);
            }}
          >
            {tables.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            className={`mt-1 ${fieldClassName}`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Sort column
          <select
            aria-label="Sort column"
            className={`mt-1 ${fieldClassName}`}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="">Primary key</option>
            {table.columns
              .filter((c) => !c.sensitive)
              .map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
          </select>
        </label>
        <label>
          Direction
          <select
            aria-label="Direction"
            className={`mt-1 ${fieldClassName}`}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label>
          Filter column
          <select
            aria-label="Filter column"
            className={fieldClassName}
            value={filterColumn}
            onChange={(e) => {
              setFilterColumn(e.target.value);
              setPage(1);
            }}
          >
            <option value="">No column filter</option>
            {table.columns
              .filter((c) => !c.sensitive)
              .map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
          </select>
        </label>
        <label>
          Exact filter value
          <input
            className={fieldClassName}
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Rows per page
          <select
            aria-label="Rows per page"
            className={fieldClassName}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Button
          onClick={() =>
            void adminApi
              .exportPage(name, new URLSearchParams(serialized))
              .catch((error) => setError(error.message))
          }
        >
          Export masked CSV page
        </Button>
        {!table.readOnly && (
          <Button
            onClick={() => setEditor({ mode: 'create', row: {}, keys: [] })}
          >
            Create row
          </Button>
        )}
      </div>
      {table.readOnly && (
        <p className="text-sm">
          Read-only table. Use a dedicated action for supported maintenance.
        </p>
      )}
      {!table.readOnly && !!selected.length && (
        <div className="flex flex-wrap items-end gap-3">
          <p>{selected.length} selected (maximum 200)</p>
          <label>
            Reason for change
            <input
              className={fieldClassName}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button
            onClick={() =>
              setEditor({
                mode: 'update',
                row:
                  result?.items.find(
                    (row) =>
                      JSON.stringify(row._key) === JSON.stringify(selected[0]),
                  ) || {},
                keys: selected,
              })
            }
          >
            Edit selected
          </Button>
          <Button variant="danger" onClick={() => remove(selected)}>
            Delete selected
          </Button>
        </div>
      )}
      <div
        tabIndex={0}
        role="region"
        aria-label="Database rows"
        className="max-w-full overflow-x-auto rounded border dark:border-slate-700"
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {!table.readOnly && <th className="p-3">Select</th>}
              <th className="p-3">Row</th>
              {table.columns.map((c) => (
                <th className="whitespace-nowrap p-3" key={c.name}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(loadedName === name ? result?.items : [])?.map((row, index) => (
              <tr
                className="border-t dark:border-slate-700"
                key={JSON.stringify(row._key)}
              >
                {!table.readOnly && (
                  <td className="p-3">
                    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                      <input
                        className="h-4 w-4 accent-[#002D72] dark:accent-blue-500"
                        type="checkbox"
                        aria-label={`Select row ${index + 1}`}
                        checked={selected.some(
                          (key) =>
                            JSON.stringify(key) === JSON.stringify(row._key),
                        )}
                        onChange={(e) =>
                          setSelected((keys) =>
                            e.target.checked
                              ? [...keys, row._key!].slice(0, 200)
                              : keys.filter(
                                  (key) =>
                                    JSON.stringify(key) !==
                                    JSON.stringify(row._key),
                                ),
                          )
                        }
                      />
                    </label>
                  </td>
                )}
                <td className="p-3">
                  <Button
                    onClick={() =>
                      setEditor({ mode: 'update', row, keys: [row._key!] })
                    }
                  >
                    {table.readOnly ? 'View' : 'View / edit'}
                  </Button>
                </td>
                {table.columns.map((c) => (
                  <td key={c.name} className="max-w-52 truncate p-3">
                    {typeof row[c.name] === 'object'
                      ? JSON.stringify(row[c.name])
                      : String(row[c.name] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page}; {result?.total ?? 0} rows
        </span>
        <Button
          disabled={!result || page * pageSize >= result.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      {editor && (
        <RowEditor
          table={table}
          editor={editor}
          onClose={() => setEditor(null)}
          onPreview={(intent) => setIntent(intent)}
        />
      )}
      {intent && (
        <MutationDialog
          intent={intent}
          onClose={() => setIntent(null)}
          onDone={() => {
            setIntent(null);
            setEditor(null);
            setRevision(revision + 1);
          }}
        />
      )}
    </section>
  );
}
function RowEditor({
  table,
  editor,
  onClose,
  onPreview,
}: {
  table: AdminTable;
  editor: {
    mode: 'create' | 'update';
    row: AdminRow;
    keys: Record<string, unknown>[];
  };
  onClose: () => void;
  onPreview: (intent: AdminIntent) => void;
}) {
  const ref = useDialogFocus(true, onClose);
  const [row, setRow] = useState(editor.row),
    [values, setValues] = useState<Record<string, unknown>>({}),
    [reason, setReason] = useState(''),
    [error, setError] = useState<string | null>(null),
    [revealed, setRevealed] = useState(false);
  const fields = table.columns.filter(
    (c) =>
      !c.readOnly &&
      ![
        'author_id',
        'sender_id',
        'created_by',
        'uploaded_by',
        'moderated_by',
        'approved_by',
        'closed_by',
        'issued_by',
      ].includes(c.name),
  );
  async function reveal() {
    if (reason.trim().length < 10) {
      setError(
        'Write a reason of at least 10 characters before revealing text.',
      );
      return;
    }
    try {
      setRow(await adminApi.reveal(table.name, editor.keys[0], reason));
      setRevealed(true);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Reveal failed');
    }
  }
  function preview() {
    try {
      if (reason.trim().length < 10)
        throw new Error('Write a reason of at least 10 characters.');
      onPreview({
        operation: {
          kind: 'data',
          table: table.name,
          mode: editor.mode,
          keys: editor.keys,
          values: parseFields(fields.map(columnField), values),
        },
        reason,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid values');
    }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="row-editor-title"
        className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 text-slate-900 dark:bg-slate-900 dark:text-white"
      >
        <h2 id="row-editor-title" className="mb-4 text-lg font-semibold">
          {editor.mode === 'create'
            ? 'Create'
            : table.readOnly
              ? 'View'
              : 'Edit'}{' '}
          {table.name}
          {editor.keys.length > 1 ? ` (${editor.keys.length} rows)` : ''}
        </h2>
        {error && (
          <p role="alert" className="my-3 text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {!table.readOnly && editor.mode === 'update' && (
          <dl className="mb-4 grid gap-3 sm:grid-cols-2">
            {table.columns
              .filter((column) => !fields.includes(column))
              .map((column) => (
                <div key={column.name} className="min-w-0">
                  <dt className="text-sm font-semibold">
                    {column.name} (read-only)
                  </dt>
                  <dd className="break-words text-sm">
                    {String(row[column.name] ?? '')}
                  </dd>
                </div>
              ))}
          </dl>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {table.readOnly
            ? table.columns.map((c) => (
                <div key={c.name} className="min-w-0">
                  <strong className="text-sm">{c.name}</strong>
                  <pre
                    tabIndex={0}
                    className="overflow-auto whitespace-pre-wrap break-words text-xs"
                  >
                    {typeof row[c.name] === 'object'
                      ? JSON.stringify(row[c.name], null, 2)
                      : String(row[c.name] ?? '')}
                  </pre>
                </div>
              ))
            : fields.map((c) => (
                <AdminField
                  key={c.name}
                  table={table}
                  field={columnField(c)}
                  value={
                    Object.hasOwn(values, c.name) ? values[c.name] : row[c.name]
                  }
                  disabled={
                    editor.mode === 'update' &&
                    (table.primaryKey.includes(c.name) ||
                      (c.sensitive && !revealed))
                  }
                  onChange={(value) =>
                    setValues((v) => ({ ...v, [c.name]: value }))
                  }
                />
              ))}
        </div>
        <label className="mt-4 block text-sm">
          Reason (at least 10 characters)
          <textarea
            aria-label="Reason (at least 10 characters)"
            className={`mt-1 min-h-24 ${fieldClassName}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          {editor.mode === 'update' &&
            table.columns.some((c) => c.sensitive) && (
              <Button onClick={() => void reveal()}>
                Reveal protected text (audited)
              </Button>
            )}
          <Button onClick={onClose}>Close</Button>
          {!table.readOnly && (
            <Button variant="primary" onClick={preview}>
              Preview change
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
