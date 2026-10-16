import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Loader2,
  X,
} from "lucide-react";
import type { CurrentUser } from "../types";
import type {
  KnowledgeOverview,
  KnowledgeItem,
  KnowledgeText,
  KnowledgeAnswer,
  KnowledgeState,
} from "../types/knowledge";
import {
  loadKnowledge,
  saveKnowledge,
  staffRequest,
  tryKnowledge,
  knowledgeRoot,
} from "../services/knowledgeApi";
interface Props {
  user: CurrentUser;
  onOverview?: (overview: KnowledgeOverview) => void;
}
type Sheet = {
  name: string;
  rows: string[][];
  questionColumn: number;
  answerColumn: number;
  headerRow: number;
  fileId: string;
};
const primary = "knowledge-primary";
const secondary = "knowledge-button";
const date = (v: string) =>
  new Date(v).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export function ChatbotKnowledge({ user, onOverview }: Props) {
  const [data, setData] = useState<KnowledgeOverview>();
  const [section, setSection] = useState("Add Content");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [step, setStep] = useState(1);
  const [readOnly, setReadOnly] = useState(false);
  const [edit, setEdit] = useState<KnowledgeItem | null>(null);
  const [form, setForm] = useState<KnowledgeText | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState("Saved");
  const revision = useRef(0);
  const saving = useRef<Promise<void> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const editRef = useRef(edit);
  editRef.current = edit;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const [reviewed, setReviewed] = useState<string[]>([]);
  const reviewedRevisions = useRef<Record<string, number>>({});
  const retryOperation = useRef<(() => Promise<void>) | null>(null);
  const [batch, setBatch] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    { name: string; message: string }[]
  >([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [replacing, setReplacing] = useState<string>();
  const [duplicates, setDuplicates] = useState<{ file: File; id: string }[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("");
  const [topicName, setTopicName] = useState("");
  const [privacy, setPrivacy] = useState<string[]>([]);
  const [undo, setUndo] = useState<KnowledgeItem>();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<KnowledgeAnswer>();
  const [historyPerson, setHistoryPerson] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [confirm, setConfirm] = useState<{
    message: string;
    label: string;
    action: () => Promise<void>;
  } | null>(null);
  const [advanced, setAdvanced] = useState<{
    settings: KnowledgeState["settings"];
    snapshots: { id: string; at: string }[];
    topics: KnowledgeState["topics"];
  } | null>(null);
  const [advancedText, setAdvancedText] = useState("");
  const [debug, setDebug] = useState("");
  const [original, setOriginal] = useState<string>();
  const [originalName, setOriginalName] = useState("Original file");
  const [originalType, setOriginalType] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const overviewRef = useRef<KnowledgeOverview | undefined>(undefined);
  const apply = (v: KnowledgeOverview) => {
    overviewRef.current = v;
    setData(v);
    onOverview?.(v);
    return v;
  };
  useEffect(() => {
    loadKnowledge(user.id)
      .then((v) => {
        apply(v);
        setSheets(v.pendingSheets || []);
      })
      .catch((e) => setError(e.message));
    const timer = setInterval(
      () =>
        loadKnowledge(user.id)
          .then(apply)
          .catch(() => {}),
      5000,
    );
    return () => clearInterval(timer);
  }, [user.id]);
  const work = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      retryOperation.current = null;
    } catch (e) {
      retryOperation.current = fn;
      setError(
        e instanceof Error
          ? e.message
          : "We could not finish. Please try again.",
      );
      loadKnowledge(user.id)
        .then(apply)
        .catch(() => {});
    } finally {
      setBusy(false);
      setUpdating(false);
    }
  };
  const saveNow = async () => {
    if (saving.current) {
      await saving.current;
      return saveNow();
    }
    if (!dirtyRef.current || !editRef.current || !formRef.current) return;
    const current = formRef.current;
    const id = editRef.current.id;
    setSaved("Saving…");
    const task = async () => {
      const v = await saveKnowledge(user.id, id, current, revision.current);
      apply(v);
      revision.current = v.items.find((i) => i.id === id)!.revision;
      if (formRef.current === current) {
        dirtyRef.current = false;
        setDirty(false);
      }
      setSaved("Saved automatically");
    };
    saving.current = task();
    try {
      await saving.current;
    } catch (e) {
      setSaved("Not saved — try again");
      throw e;
    } finally {
      saving.current = null;
    }
    if (dirtyRef.current) return saveNow();
  };
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(
      () => saveNow().catch((e) => setError(e.message)),
      700,
    );
    return () => clearTimeout(timer);
  }, [form, dirty]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  useEffect(() => {
    if (!edit) return;
    const timer = setTimeout(
      () =>
        staffRequest<{ highlights: string[] }>(user.id, `/privacy/${edit.id}`)
          .then((v) => setPrivacy(v.highlights))
          .catch(() => {}),
      1100,
    );
    return () => clearTimeout(timer);
  }, [form, edit?.id]);
  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original);
    };
  }, [original]);
  const open = async (item: KnowledgeItem, mode: "read" | "edit" = "edit") => {
    await saveNow();
    const fresh = apply(await loadKnowledge(user.id));
    item = fresh.items.find((i) => i.id === item.id) || item;
    setReadOnly(mode === "read");
    setEdit(item);
    setForm(
      structuredClone(
        mode === "read"
          ? (item.live || item.draft)!
          : (item.draft || item.live)!,
      ),
    );
    revision.current = item.revision;
    setDirty(false);
    dirtyRef.current = false;
    setSaved(item.draft ? "Saved draft" : "Live content");
    setPrivacy([]);
    setOriginal(undefined);
    if (item.fileId) {
      const r = await fetch(`${knowledgeRoot}/files/${item.fileId}`, {
        headers: { "x-user-id": user.id },
      });
      if (r.ok) {
        const blob = await r.blob();
        setOriginalName(
          decodeURIComponent(
            r.headers.get("x-original-name") || "Original file",
          ),
        );
        setOriginalType(blob.type);
        setOriginal(URL.createObjectURL(blob));
      }
    }
  };
  const update = (field: keyof KnowledgeText, value: unknown) => {
    if (edit) delete reviewedRevisions.current[edit.id];
    setForm((f) => (f ? { ...f, [field]: value } : f));
    dirtyRef.current = true;
    setDirty(true);
    setReviewed((r) => r.filter((id) => id !== edit?.id));
    setSaved("Saving…");
  };
  const create = async (kind: "question" | "document", suggestion = "") => {
    await saveNow();
    const before = new Set(data?.items.map((i) => i.id));
    const v = apply(
      await staffRequest<KnowledgeOverview>(user.id, "/drafts", {
        type: kind,
        title: suggestion,
        question: kind === "question" ? suggestion : "",
        answer: "",
        visibility: kind === "document" ? "guides" : "chatbot",
      }),
    );
    const item = v.items.find((i) => !before.has(i.id))!;
    setBatch([item.id]);
    setReviewed([]);
    setSection("Add Content");
    setStep(2);
    await open(item);
  };
  const publish = async (ids: string[]) => {
    await saveNow();
    setUpdating(true);
    setNotice("");
    setResponse(undefined);
    const latest = overviewRef.current!;
    const v = apply(
      await staffRequest<KnowledgeOverview>(user.id, "/publish", {
        ids,
        revisions: Object.fromEntries(
          latest.items
            .filter((i) => ids.includes(i.id))
            .map((i) => [i.id, reviewedRevisions.current[i.id] ?? i.revision]),
        ),
        confirmed: true,
      }),
    );
    setBatch(ids);
    setEdit(null);
    setForm(null);
    setStep(4);
    setSection("Try It");
    setNotice("Done. The chatbot is now using this content.");
    setQuestion(
      v.items.find((i) => ids.includes(i.id))?.live?.samples[0] || "",
    );
  };
  const archive = async (item: KnowledgeItem, restore = false) => {
    setUpdating(true);
    const v = apply(
      await staffRequest<KnowledgeOverview>(
        user.id,
        `/items/${item.id}/${restore ? "restore" : "remove"}`,
        { confirmed: true, revision: item.revision },
      ),
    );
    setNotice(
      restore
        ? "Content restored."
        : "Content removed. You can restore it anytime.",
    );
    if (!restore) setUndo(v.items.find((i) => i.id === item.id));
    else setUndo(undefined);
    setEdit(null);
    setForm(null);
  };
  const askConfirm = (
    message: string,
    label: string,
    action: () => Promise<void>,
  ) => setConfirm({ message, label, action });
  const upload = async (files: File[], replaceId?: string) => {
    if (files.length > 10) {
      setError("Choose no more than 10 files at a time.");
      return;
    }
    setUploadStatus(files.map((f) => ({ name: f.name, message: "Waiting…" })));
    setSection("Add Content");
    setStep(1);
    setReviewed([]);
    const ids: string[] = [];
    for (const [position, file] of files.entries()) {
      const message = (text: string) =>
        setUploadStatus((old) =>
          old.map((v, i) => (i === position ? { ...v, message: text } : v)),
        );
      if (file.size > 25 * 1024 * 1024) {
        message(
          "This file is larger than 25 MB. Please divide it into smaller files.",
        );
        continue;
      }
      message("Reading your file…");
      try {
        const before = await loadKnowledge(user.id);
        const r = await fetch(knowledgeRoot + "/uploads", {
          method: "POST",
          headers: {
            "x-user-id": user.id,
            "x-file-name": encodeURIComponent(file.name),
            "Content-Type": "application/octet-stream",
            ...(replaceId ? { "x-replace-id": replaceId } : {}),
          },
          body: file,
        });
        const result = await r.json();
        if (!r.ok) {
          if (r.status === 409 && result.duplicateId)
            setDuplicates((d) => [...d, { file, id: result.duplicateId }]);
          throw Error(result.error);
        }
        const v = apply(result.overview);
        ids.push(
          ...v.items
            .filter((i) => !before.items.some((b) => b.id === i.id))
            .map((i) => i.id),
        );
        if (result.sheets)
          setSheets((s) => [
            ...s,
            ...result.sheets.map((s: Sheet) => ({
              ...s,
              fileId: result.fileId,
            })),
          ]);
        message("Ready to review");
      } catch (e) {
        message(
          e instanceof Error
            ? e.message
            : "We could not read this file. Please try again.",
        );
      }
    }
    setBatch((b) => [...new Set([...b, ...ids])]);
    if (ids.length) {
      const latest = await loadKnowledge(user.id);
      apply(latest);
      setStep(2);
      await open(latest.items.find((i) => i.id === ids[0])!);
    }
    setReplacing(undefined);
  };
  const reviewNext = async () => {
    await saveNow();
    if (!edit) return;
    const latest = await loadKnowledge(user.id);
    const p = await staffRequest<{ highlights: string[] }>(
      user.id,
      `/privacy/${edit.id}`,
    );
    const item = latest.items.find((i) => i.id === edit.id)!;
    if (item.revision !== revision.current)
      throw Error(
        "Someone else changed this content. Open it again and review the latest text.",
      );
    const d = item.draft || item.live!;
    if (p.highlights.some((h) => !d.privacyAccepted.includes(h))) {
      setPrivacy(p.highlights);
      throw Error("Please remove or mark OK the parts highlighted below.");
    }
    if (!d.title.trim() || !d.answer.trim())
      throw Error("Add a title and the content before continuing.");
    reviewedRevisions.current[edit.id] = item.revision;
    const done = [...reviewed, edit.id];
    setReviewed(done);
    const next = latest.items.find(
      (i) =>
        batch.includes(i.id) && !done.includes(i.id) && i.status === "Draft",
    );
    if (next) await open(next);
    else {
      setStep(3);
      setEdit(null);
      setForm(null);
    }
  };
  const input = (
    label: string,
    field: keyof KnowledgeText,
    multiline = false,
  ) => (
    <label className="knowledge-label">
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          rows={field === "answer" ? 12 : 3}
          value={
            Array.isArray(form?.[field])
              ? (form![field] as string[]).join("\n")
              : String(form?.[field] || "")
          }
          onChange={(e) =>
            update(
              field,
              Array.isArray(form?.[field])
                ? e.target.value.split("\n")
                : e.target.value,
            )
          }
        />
      ) : (
        <input
          aria-label={label}
          value={String(form?.[field] || "")}
          onChange={(e) => update(field, e.target.value)}
        />
      )}
    </label>
  );
  if (!data)
    return (
      <div role="status" className="knowledge-area p-6">
        {error || "Opening your content…"}
        {error && (
          <button
            className={secondary}
            onClick={() =>
              work(async () => {
                apply(await loadKnowledge(user.id));
              })
            }
          >
            Try again
          </button>
        )}
      </div>
    );
  const filtered = data.items.filter((i) => {
    const d = i.draft || i.live;
    return (
      d &&
      (!status || (status === "Draft" ? !!i.draft : i.status === status)) &&
      (!topic || d.topicId === topic) &&
      (!type || i.type === type) &&
      `${d.title} ${d.answer}`.toLowerCase().includes(search.toLowerCase())
    );
  });
  const checks = data.checks;
  const safety = checks.filter((c) => !c.itemId);
  const attention = checks.filter((c) => !c.passed);
  const batchChecks = checks.filter(
    (c) => c.itemId && batch.includes(c.itemId),
  );
  const safetyPassing = safety.length > 0 && safety.every((c) => c.passed);
  return (
    <section
      className="knowledge-area space-y-5 pb-32 md:pb-8"
      aria-label="Chatbot Knowledge"
    >
      <div className="knowledge-card flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <BookOpen />
            Chatbot Knowledge
          </h2>
          <p className="mt-2">
            Your clinic’s guidance, ready for care partners.
          </p>
        </div>
        <p className="flex gap-2 items-center" role="status" aria-live="polite">
          {updating ? (
            <Loader2 className="animate-spin shrink-0" />
          ) : data.status.startsWith("We couldn't") ? (
            <AlertTriangle className="shrink-0" />
          ) : (
            <CheckCircle2 className="shrink-0 text-emerald-700 dark:text-emerald-300" />
          )}
          {updating ? "Updating the chatbot…" : data.status}
        </p>
      </div>
      {error && (
        <div className="knowledge-alert" role="alert">
          <AlertTriangle className="shrink-0" />
          <div>
            {error}
            <button
              className={secondary + " mt-2"}
              onClick={() =>
                work(
                  retryOperation.current ||
                    (async () => {
                      await saveNow();
                      apply(await loadKnowledge(user.id));
                    }),
                )
              }
            >
              Try again
            </button>
            {dirty && edit && form && (
              <button
                className={secondary + " mt-2"}
                onClick={() =>
                  work(async () => {
                    const v = apply(
                      await staffRequest<KnowledgeOverview>(
                        user.id,
                        "/drafts",
                        {
                          ...form,
                          type: edit.type,
                          replacesId: edit.live ? edit.id : undefined,
                        },
                      ),
                    );
                    dirtyRef.current = false;
                    setDirty(false);
                    const copy = v.items.at(-1)!;
                    setSection("Add Content");
                    setStep(2);
                    setBatch([copy.id]);
                    setReviewed([]);
                    await open(copy);
                    setNotice(
                      "Your text is safe in a separate draft. Review it before publishing.",
                    );
                  })
                }
              >
                Keep my text in a separate draft
              </button>
            )}
          </div>
        </div>
      )}
      {attention.length > 0 && (
        <div className="knowledge-alert">
          <AlertTriangle className="shrink-0" />
          <p>
            Some questions need attention. Open Try It to see what to change.
          </p>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="knowledge-card flex flex-wrap gap-3 items-center"
        >
          <CheckCircle2 />
          {notice}
          {undo && (
            <button
              className={secondary}
              onClick={() =>
                askConfirm(
                  "The chatbot will start using this content again.",
                  "Restore",
                  () => archive(undo, true),
                )
              }
            >
              Undo removal
            </button>
          )}
        </div>
      )}
      <nav
        aria-label="Knowledge sections"
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {[
          "Add Content",
          "My Content",
          "Try It",
          "History",
          ...(user.role === "SYSTEM_ADMIN" ? ["Advanced"] : []),
        ].map((s) => (
          <button
            key={s}
            aria-current={section === s ? "page" : undefined}
            className={`${secondary} shrink-0 ${section === s ? "knowledge-selected" : ""}`}
            onClick={() =>
              work(async () => {
                await saveNow();
                setSection(s);
                if (s === "Add Content" && step === 4) {
                  setStep(1);
                  setBatch([]);
                  setReviewed([]);
                  setEdit(null);
                  setForm(null);
                }
                if (s === "Advanced") {
                  const a = await staffRequest<NonNullable<typeof advanced>>(
                    user.id,
                    "/advanced",
                  );
                  setAdvanced(a);
                  setAdvancedText(JSON.stringify(a.settings.synonyms, null, 2));
                }
              })
            }
          >
            {s}
          </button>
        ))}
      </nav>
      {section === "Add Content" && (
        <>
          <div className="knowledge-card">
            <p className="md:hidden font-semibold">
              Step {step} of 4 ·{" "}
              {["Add", "Review", "Publish", "Check"][step - 1]}
            </p>
            <ol className="hidden md:flex gap-3" aria-label="Progress">
              {["Add", "Review", "Publish", "Check"].map((s, i) => (
                <li
                  key={s}
                  className={`flex-1 border-t-4 pt-3 ${i < step ? "border-blue-700 dark:border-blue-300" : "border-slate-300 dark:border-slate-700"}`}
                  aria-current={step === i + 1 ? "step" : undefined}
                >
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          </div>
          {step > 1 && step < 4 && (
            <button
              className={secondary}
              onClick={() => {
                setStep(1);
                setEdit(null);
                setForm(null);
              }}
            >
              Add more files
            </button>
          )}
          {step === 1 && (
            <div className="knowledge-card space-y-5">
              <h3 className="font-serif text-2xl">Add your clinic’s content</h3>
              {data.items.some((i) => i.draft && i.status !== "Removed") && (
                <div className="space-y-2">
                  <h4 className="font-semibold">
                    Drafts · continue where you left off
                  </h4>
                  {data.items
                    .filter((i) => i.draft && i.status !== "Removed")
                    .map((i) => (
                      <button
                        key={i.id}
                        className={secondary + " mr-2"}
                        onClick={() =>
                          work(async () => {
                            setBatch([i.id]);
                            setReviewed([]);
                            setStep(2);
                            await open(i);
                          })
                        }
                      >
                        {i.draft!.title || "Untitled draft"}
                      </button>
                    ))}
                </div>
              )}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  work(() => upload([...e.dataTransfer.files], replacing));
                }}
                className="border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-2xl p-6 sm:p-12 text-center space-y-4"
              >
                <Upload
                  className="mx-auto text-blue-700 dark:text-blue-300"
                  size={38}
                />
                <p className="text-xl font-semibold">
                  Drop files here or tap to choose
                </p>
                <button
                  className={primary}
                  onClick={() => fileInput.current?.click()}
                >
                  Choose files
                </button>
                <p>
                  Up to 10 files at a time, 25 MB each. PDFs can have up to 300
                  pages.
                </p>
              </div>
              <p className="text-sm leading-relaxed">
                PDF, Word (DOCX, DOC), RTF, ODT, text, Markdown, HTML,
                PowerPoint (PPTX), Excel (XLSX, XLS), CSV, TSV, and photos (JPG,
                PNG, TIFF, HEIC).
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className={secondary}
                  onClick={() => photoInput.current?.click()}
                >
                  <FileText size={19} />
                  Photos
                </button>
                <button
                  className={secondary}
                  onClick={() => cameraInput.current?.click()}
                >
                  <Camera size={19} />
                  Take photos of pages
                </button>
                <button
                  className={secondary}
                  onClick={() => work(() => create("document"))}
                >
                  Type or paste it instead
                </button>
                <button
                  className={secondary}
                  onClick={() => work(() => create("question"))}
                >
                  <Plus size={19} />
                  Add a single question and answer
                </button>
              </div>
            </div>
          )}
          {!!uploadStatus.length && (
            <div className="knowledge-card space-y-3" aria-live="polite">
              {uploadStatus.map((f, i) => (
                <div key={i}>
                  <strong>{f.name}</strong>
                  <p>{f.message}</p>
                </div>
              ))}
            </div>
          )}
          {duplicates.map((d, i) => (
            <div className="knowledge-card flex flex-wrap gap-3" key={i}>
              <p>This file was already added.</p>
              <button
                className={secondary}
                onClick={() => {
                  setDuplicates((v) => v.filter((x) => x !== d));
                  work(() => upload([d.file], d.id));
                }}
              >
                Replace the existing one
              </button>
              <button
                className={secondary}
                onClick={() => setDuplicates((v) => v.filter((x) => x !== d))}
              >
                Cancel
              </button>
            </div>
          ))}
          {sheets.map((sheet, si) => {
            const rows = sheet.rows.slice(sheet.headerRow + 1);
            const good = rows.filter(
              (r) =>
                r[sheet.questionColumn]?.trim() &&
                r[sheet.answerColumn]?.trim(),
            );
            return (
              <div
                className="knowledge-card space-y-4"
                key={`${sheet.fileId}-${si}`}
              >
                <h3 className="text-xl font-semibold">
                  Questions from {sheet.name}
                </h3>
                <p>
                  Choose the columns, then review every question below. Empty
                  and hidden sheets are left out.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    "Header row",
                    "Which column holds the questions?",
                    "Which holds the answers?",
                  ].map((label, k) => (
                    <label className="knowledge-label" key={label}>
                      {label}
                      <select
                        value={
                          k === 0
                            ? sheet.headerRow
                            : k === 1
                              ? sheet.questionColumn
                              : sheet.answerColumn
                        }
                        onChange={(e) =>
                          setSheets((all) =>
                            all.map((s, i) =>
                              i === si
                                ? {
                                    ...s,
                                    [k === 0
                                      ? "headerRow"
                                      : k === 1
                                        ? "questionColumn"
                                        : "answerColumn"]: Number(
                                      e.target.value,
                                    ),
                                  }
                                : s,
                            ),
                          )
                        }
                      >
                        {(k === 0
                          ? sheet.rows
                          : sheet.rows[sheet.headerRow] || []
                        ).map((v, i) => (
                          <option key={i} value={i}>
                            {k === 0 ? `Row ${i + 1}` : `Column ${i + 1}: ${v}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Answer</th>
                        <th>Included?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r[sheet.questionColumn]}</td>
                          <td>{r[sheet.answerColumn]}</td>
                          <td>
                            {r[sheet.questionColumn]?.trim() &&
                            r[sheet.answerColumn]?.trim()
                              ? "Yes"
                              : "Skipped: missing question or answer"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  {good.length} questions will be added.{" "}
                  {rows.length - good.length} rows will be skipped because a
                  question or answer is missing.
                </p>
                <button
                  disabled={!good.length || busy}
                  className={primary}
                  onClick={() =>
                    work(async () => {
                      const before = new Set(data.items.map((i) => i.id));
                      const v = apply(
                        await staffRequest<KnowledgeOverview>(
                          user.id,
                          `/uploads/${sheet.fileId}/questions`,
                          {
                            sheetName: sheet.name,
                            rows: good.map((r) => ({
                              question: r[sheet.questionColumn],
                              answer: r[sheet.answerColumn],
                            })),
                          },
                        ),
                      );
                      const newIds = v.items
                        .filter((i) => !before.has(i.id))
                        .map((i) => i.id);
                      setBatch((b) => [...b, ...newIds]);
                      setSheets((s) => s.filter((_, i) => i !== si));
                      setStep(2);
                      await open(v.items.find((i) => i.id === newIds[0])!);
                    })
                  }
                >
                  Review these questions
                </button>
              </div>
            );
          })}
          {step === 2 && !edit && (
            <div className="knowledge-card">
              <p>Choose a draft below to review.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {data.items
                  .filter((i) => batch.includes(i.id) && i.draft)
                  .map((i) => (
                    <button
                      className={secondary}
                      key={i.id}
                      onClick={() => work(() => open(i))}
                    >
                      {i.draft!.title || "Untitled draft"}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="knowledge-card space-y-5">
              <h3 className="font-serif text-2xl">Ready to share?</h3>
              <p>
                This will add{" "}
                {
                  data.items.filter(
                    (i) => batch.includes(i.id) && i.type === "document",
                  ).length
                }{" "}
                documents and{" "}
                {
                  data.items.filter(
                    (i) => batch.includes(i.id) && i.type === "question",
                  ).length
                }{" "}
                questions, and replace{" "}
                {
                  data.items.filter((i) => batch.includes(i.id) && i.replacesId)
                    .length
                }{" "}
                older documents.
              </p>
              <p>
                You’ve reviewed the content. We’ll check the chatbot
                automatically after publishing.
              </p>
              <div className="knowledge-sticky">
                <button
                  className={primary}
                  disabled={busy || batch.some((id) => !reviewed.includes(id))}
                  onClick={() =>
                    askConfirm(
                      "Make this available to care partners? The chatbot will start using it right away.",
                      "Publish content",
                      () => publish(batch),
                    )
                  }
                >
                  Publish content <ArrowRight size={18} />
                </button>
              </div>
              <button
                className={secondary}
                onClick={() => {
                  setStep(2);
                  work(() =>
                    open(data.items.find((i) => batch.includes(i.id))!),
                  );
                }}
              >
                Back to review
              </button>
            </div>
          )}
        </>
      )}
      {section === "My Content" && (
        <>
          <div className="knowledge-card space-y-4 md:sticky md:top-3 z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-2xl">My Content</h3>
              <button
                className={primary}
                onClick={() => work(() => create("question"))}
              >
                <Plus size={18} />
                Add a question and answer
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="knowledge-label">
                Find content
                <input
                  placeholder="Search by title or words"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="knowledge-label">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {["Live", "Draft", "Removed"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="knowledge-label">
                Topic
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="">All topics</option>
                  {data.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="knowledge-label">
                Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All content</option>
                  <option value="question">Questions</option>
                  <option value="document">Documents</option>
                </select>
              </label>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((i) => {
              const d = i.draft || i.live!;
              return (
                <article className="knowledge-card space-y-3" key={i.id}>
                  <p className="text-sm font-semibold">
                    {i.status}
                    {i.status === "Live" && i.draft
                      ? " · Changes waiting in Drafts"
                      : ""}{" "}
                    · {data.topics.find((t) => t.id === d.topicId)?.name}
                  </p>
                  <h4 className="font-serif text-xl break-words">
                    {d.title || "Untitled draft"}
                  </h4>
                  <p className="text-sm">
                    {date(i.updatedAt)} · {i.updatedBy}
                  </p>
                  {i.checkedAt && (
                    <p className="flex gap-2 items-center">
                      <CheckCircle2 size={18} />
                      Checked ✓ on {date(i.checkedAt)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={secondary}
                      onClick={() => work(() => open(i, "read"))}
                    >
                      Open
                    </button>
                    {i.status !== "Removed" && (
                      <>
                        <button
                          className={secondary}
                          onClick={() => work(() => open(i))}
                        >
                          Edit
                        </button>
                        {i.type === "document" && (
                          <button
                            className={secondary}
                            onClick={() => {
                              setReplacing(i.id);
                              setSection("Add Content");
                              setStep(1);
                              setBatch([]);
                              fileInput.current?.click();
                            }}
                          >
                            Replace with a newer version
                          </button>
                        )}
                        <button
                          className={secondary}
                          onClick={() =>
                            i.status === "Draft"
                              ? work(() => archive(i))
                              : askConfirm(
                                  "The chatbot will stop using this. You can restore it anytime.",
                                  "Remove",
                                  () => archive(i),
                                )
                          }
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {i.status === "Removed" && (
                      <button
                        className={secondary}
                        onClick={() =>
                          askConfirm(
                            "The chatbot will start using this content again.",
                            "Restore",
                            () => archive(i, true),
                          )
                        }
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="knowledge-card">
              <p>
                Your clinic’s guidance belongs here. Add your first document or
                question to get started.
              </p>
              <button
                className={primary + " mt-4"}
                onClick={() => {
                  setSection("Add Content");
                  setStep(1);
                }}
              >
                Add content
              </button>
            </div>
          )}
        </>
      )}
      {edit && form && readOnly && section === "My Content" && (
        <article className="knowledge-card space-y-4">
          <h3 className="font-serif text-2xl">{form.title}</h3>
          <p>
            {edit.live
              ? "This is the content the chatbot uses."
              : "This draft is waiting for review."}
          </p>
          <div className="whitespace-pre-wrap leading-relaxed">
            {form.answer}
          </div>
          <button className={primary} onClick={() => work(() => open(edit))}>
            Edit this content
          </button>
          <button
            className={secondary + " ml-3"}
            onClick={() => {
              setEdit(null);
              setForm(null);
            }}
          >
            Close
          </button>
        </article>
      )}
      {edit &&
        form &&
        !readOnly &&
        ["Add Content", "My Content"].includes(section) && (
          <div className="knowledge-card space-y-5" aria-label="Review content">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <h3 className="font-serif text-2xl">
                {edit.status === "Live"
                  ? "Read and edit your content"
                  : "Review your content"}
              </h3>
              <span role="status">{saved}</span>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              {edit.fileId && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Original file</h4>
                  {original ? (
                    <>
                      <a
                        className={secondary}
                        href={original}
                        download={originalName}
                      >
                        Open original file
                      </a>
                      {(originalType === "application/pdf" ||
                        originalType.startsWith("image/")) && (
                        <iframe
                          title="Original file"
                          src={original}
                          sandbox=""
                          className="hidden lg:block w-full h-96 rounded-xl border"
                        />
                      )}
                    </>
                  ) : (
                    <p>Opening the original file…</p>
                  )}
                  <p>
                    Compare the original with the text here. Correct any missing
                    or unclear words.
                  </p>
                </div>
              )}
              <div className="space-y-4 min-w-0">
                {input("Title", "title")}
                {edit.type === "question" &&
                  input("Question", "question", true)}
                {input(
                  edit.type === "question" ? "Answer" : "Content",
                  "answer",
                  true,
                )}
                {input("Key points — one per line", "keyPoints", true)}
                <label className="knowledge-label">
                  Topic{" "}
                  <span className="text-sm">
                    Suggested — choose another if you prefer
                  </span>
                  <select
                    value={form.topicId}
                    onChange={(e) => update("topicId", e.target.value)}
                  >
                    {data.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    aria-label="New topic name"
                    placeholder="Add a topic"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                  />
                  <button
                    className={secondary}
                    onClick={() =>
                      work(async () => {
                        apply(
                          await staffRequest<KnowledgeOverview>(
                            user.id,
                            "/topics",
                            { name: topicName },
                          ),
                        );
                        setTopicName("");
                      })
                    }
                  >
                    Add topic
                  </button>
                </div>
                <label className="knowledge-label">
                  Who sees it?
                  <select
                    value={form.visibility}
                    onChange={(e) => update("visibility", e.target.value)}
                  >
                    <option value="chatbot">Chatbot only</option>
                    <option value="guides">Chatbot and Guides page</option>
                  </select>
                </label>
                <details>
                  <summary className="min-h-11 cursor-pointer">
                    Suggested wording · optional
                  </summary>
                  <p>
                    You can leave these as they are. The chatbot will still use
                    your content.
                  </p>
                  {input(
                    "Search wording — one phrase per line",
                    "searchWords",
                    true,
                  )}
                  {input(
                    "Alternative phrasings — one per line",
                    "alternatives",
                    true,
                  )}
                </details>
                <details open={step === 4}>
                  <summary className="min-h-11 cursor-pointer">
                    Sample questions
                  </summary>
                  <p>
                    Keep at least three questions. We use these to check your
                    content.
                  </p>
                  {input("Sample questions — one per line", "samples", true)}
                </details>
                {privacy.length > 0 && (
                  <div className="knowledge-alert flex-col">
                    <p>
                      This looks like it could identify a patient. Remove it, or
                      mark it OK.
                    </p>
                    {privacy.map((p) => (
                      <label key={p} className="flex gap-3 items-start">
                        <input
                          type="checkbox"
                          checked={form.privacyAccepted.includes(p)}
                          onChange={(e) =>
                            update(
                              "privacyAccepted",
                              e.target.checked
                                ? [...form.privacyAccepted, p]
                                : form.privacyAccepted.filter((x) => x !== p),
                            )
                          }
                        />
                        <span>
                          <mark>{p}</mark> — OK to include
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {!form.unclearAccepted && (
                  <div className="knowledge-alert flex-col">
                    <p>
                      Please double-check this part: the text read from this
                      file may have unclear words.
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          update("unclearAccepted", e.target.checked)
                        }
                      />{" "}
                      I checked and corrected the content above.
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={secondary}
                    onClick={() =>
                      work(async () => {
                        await saveNow();
                        const parts = form.answer.split(/\n\s*\n/);
                        if (parts.length < 2)
                          throw Error(
                            "Add a blank line where you want to split the section.",
                          );
                        const half = Math.ceil(parts.length / 2);
                        const next = {
                          ...form,
                          answer: parts.slice(0, half).join("\n\n"),
                        };
                        setForm(next);
                        formRef.current = next;
                        dirtyRef.current = true;
                        setDirty(true);
                        await saveNow();
                        /* Save the second section as a separate reviewable draft. */
                        const v = apply(
                          await staffRequest<KnowledgeOverview>(
                            user.id,
                            "/drafts",
                            {
                              ...form,
                              title: form.title + " — continued",
                              answer: parts.slice(half).join("\n\n"),
                              type: edit.type,
                            },
                          ),
                        );
                        setBatch((b) => [
                          ...new Set([
                            ...b,
                            edit.id,
                            ...v.items
                              .filter(
                                (i) => !data.items.some((o) => o.id === i.id),
                              )
                              .map((i) => i.id),
                          ]),
                        ]);
                        setNotice(
                          "Section split. Review both parts before publishing.",
                        );
                      })
                    }
                  >
                    Split into two sections
                  </button>
                  <select
                    aria-label="Merge with another draft"
                    defaultValue=""
                    onChange={(e) => {
                      const other = data.items.find(
                        (i) => i.id === e.target.value,
                      );
                      if (!other?.draft) return;
                      work(async () => {
                        update(
                          "answer",
                          form.answer + "\n\n" + other.draft!.answer,
                        );
                        await archive(other);
                        setEdit(edit);
                        setForm({
                          ...form,
                          answer: form.answer + "\n\n" + other.draft!.answer,
                        });
                        dirtyRef.current = true;
                        setDirty(true);
                        setBatch((b) => b.filter((id) => id !== other.id));
                      });
                    }}
                  >
                    <option value="">Merge with another draft…</option>
                    {data.items
                      .filter(
                        (i) =>
                          i.id !== edit.id && i.draft && i.status === "Draft",
                      )
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.draft!.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="knowledge-sticky flex flex-wrap gap-3">
              {section === "Add Content" ? (
                <button
                  disabled={busy}
                  className={primary}
                  onClick={() => work(reviewNext)}
                >
                  Reviewed — continue <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  disabled={busy || edit.status === "Removed"}
                  className={primary}
                  onClick={() =>
                    work(async () => {
                      if (
                        !dirtyRef.current &&
                        !overviewRef.current?.items.find(
                          (i) => i.id === edit.id,
                        )?.draft
                      ) {
                        const next = { ...form };
                        setForm(next);
                        formRef.current = next;
                        dirtyRef.current = true;
                        setDirty(true);
                      }
                      await saveNow();
                      reviewedRevisions.current[edit.id] = revision.current;
                      askConfirm(
                        "Make this available to care partners? The chatbot will start using it right away.",
                        "Save and update chatbot",
                        () => publish([edit.id]),
                      );
                    })
                  }
                >
                  Save and update chatbot
                </button>
              )}
              <button
                className={secondary}
                onClick={() =>
                  work(async () => {
                    await saveNow();
                    setEdit(null);
                    setForm(null);
                    setSection("My Content");
                  })
                }
              >
                Close · keep draft
              </button>
            </div>
          </div>
        )}
      {section === "Try It" && (
        <>
          <div className="knowledge-card space-y-4">
            <h3 className="font-serif text-2xl">
              Try it as a care partner would
            </h3>
            <p>Ask a question to see which clinic content helps.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                work(async () =>
                  setResponse(await tryKnowledge(user.id, question)),
                );
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <label className="knowledge-label flex-1">
                Your question
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What would a care partner ask?"
                  required
                />
              </label>
              <button className={primary + " sm:self-end"} disabled={busy}>
                Ask the chatbot
              </button>
            </form>
            {response && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="knowledge-card whitespace-pre-wrap leading-relaxed">
                  {response.answer}
                </div>
                <div className="space-y-3">
                  {response.noContent ? (
                    <>
                      <p>No content covers this yet</p>
                      <button
                        className={secondary}
                        onClick={() => work(() => create("question", question))}
                      >
                        Add content about this
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">This answer came from:</p>
                      {response.citedResources.map((c) => (
                        <button
                          key={c.id}
                          className={secondary}
                          onClick={() => {
                            setSection("My Content");
                            work(() =>
                              open(data.items.find((i) => i.id === c.id)!),
                            );
                          }}
                        >
                          {c.title}
                        </button>
                      ))}
                    </>
                  )}
                  {response.wording === "local" && (
                    <p className="text-sm">
                      {response.writingUnavailable
                        ? "The writing service is unavailable. The chatbot is sharing your approved text directly."
                        : "The chatbot is sharing your approved text directly. No writing service is needed."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="knowledge-card space-y-4" aria-live="polite">
            <h3 className="font-serif text-xl">Check your content</h3>
            {batch.length > 0 && (
              <p className="flex gap-2">
                {batchChecks.length && batchChecks.every((c) => c.passed) ? (
                  <>
                    <CheckCircle2 className="shrink-0" />
                    Care partners who ask about this topic now get answers from
                    your content. All done.
                  </>
                ) : (
                  <>
                    <AlertTriangle className="shrink-0" />
                    One question isn’t finding your content yet. Review the
                    questions below.
                  </>
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {[
                ...new Set(
                  checks
                    .filter(
                      (c) =>
                        c.itemId && (!batch.length || batch.includes(c.itemId)),
                    )
                    .map((c) => c.itemId!),
                ),
              ].map((id) => (
                <button
                  key={id}
                  className={secondary}
                  onClick={() => {
                    setSection("My Content");
                    work(() => open(data.items.find((i) => i.id === id)!));
                  }}
                >
                  Edit sample questions ·{" "}
                  {data.items.find((i) => i.id === id)?.live?.title}
                </button>
              ))}
            </div>
            {checks
              .filter(
                (c) => c.itemId && (!batch.length || batch.includes(c.itemId)),
              )
              .map((c, i) => (
                <div key={i} className="border-b pb-3 space-y-2">
                  <p>
                    {c.passed ? "✓" : "⚠"} {c.question}
                  </p>
                  {!c.passed && (
                    <>
                      <p>Try a clearer question or title in this item.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={secondary}
                          onClick={() =>
                            work(async () => {
                              apply(
                                await staffRequest<KnowledgeOverview>(
                                  user.id,
                                  `/items/${c.itemId}/fix`,
                                  {},
                                ),
                              );
                            })
                          }
                        >
                          Fix this automatically
                        </button>
                        <button
                          className={secondary}
                          onClick={() => {
                            setSection("My Content");
                            work(() =>
                              open(data.items.find((i) => i.id === c.itemId)!),
                            );
                          }}
                        >
                          Edit this content
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
      {section === "History" && (
        <div className="knowledge-card space-y-5">
          <h3 className="font-serif text-2xl">History</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="knowledge-label">
              Person
              <select
                value={historyPerson}
                onChange={(e) => setHistoryPerson(e.target.value)}
              >
                <option value="">Everyone</option>
                {[...new Set(data.history.map((h) => h.moderatorName))].map(
                  (n) => (
                    <option key={n}>{n}</option>
                  ),
                )}
              </select>
            </label>
            <label className="knowledge-label">
              Date
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
              />
            </label>
          </div>
          <ol className="space-y-5">
            {data.history
              .filter(
                (h) =>
                  (!historyPerson || h.moderatorName === historyPerson) &&
                  (!historyDate || h.createdAt.startsWith(historyDate)),
              )
              .map((h) => (
                <li key={h.id} className="border-l-2 pl-4">
                  <p>
                    {h.moderatorName} · {h.notes}
                  </p>
                  <time className="text-sm">{date(h.createdAt)}</time>
                </li>
              ))}
          </ol>
          {!data.history.length && (
            <p>Your changes and checks will appear here.</p>
          )}
        </div>
      )}
      {section === "Advanced" && user.role === "SYSTEM_ADMIN" && advanced && (
        <div className="knowledge-card space-y-4">
          <h3 className="font-serif text-2xl">Advanced</h3>
          <p>Administrator controls</p>
          <button
            className={primary}
            onClick={() =>
              work(async () => {
                apply(
                  await staffRequest<KnowledgeOverview>(
                    user.id,
                    "/advanced",
                    {},
                  ),
                );
                setNotice("Chatbot knowledge refreshed.");
              })
            }
          >
            Refresh chatbot knowledge
          </button>
          <p>
            Latest snapshot:{" "}
            {advanced.snapshots[0]
              ? date(advanced.snapshots[0].at)
              : "Initial content"}
          </p>
          <label className="knowledge-label">
            Number of results considered
            <input
              type="number"
              min="1"
              max="10"
              value={advanced.settings.resultCount}
              onChange={(e) =>
                setAdvanced({
                  ...advanced,
                  settings: {
                    ...advanced.settings,
                    resultCount: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label className="knowledge-label">
            Minimum match strictness
            <input
              type="number"
              min="0.1"
              max="1"
              step="0.05"
              value={advanced.settings.minimum}
              onChange={(e) =>
                setAdvanced({
                  ...advanced,
                  settings: {
                    ...advanced.settings,
                    minimum: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label className="knowledge-label">
            Related-word groups
            <textarea
              rows={8}
              value={advancedText}
              onChange={(e) => setAdvancedText(e.target.value)}
            />
          </label>
          {advanced.topics.map((t) => (
            <label className="flex gap-3 min-h-11" key={t.id}>
              <input
                type="checkbox"
                checked={t.enabled}
                onChange={(e) =>
                  setAdvanced({
                    ...advanced,
                    topics: advanced.topics.map((x) =>
                      x.id === t.id ? { ...x, enabled: e.target.checked } : x,
                    ),
                  })
                }
              />
              {t.name}
            </label>
          ))}
          <button
            className={secondary}
            onClick={() =>
              askConfirm(
                "These changes will update the content the chatbot can use.",
                "Save settings",
                async () => {
                  apply(
                    await staffRequest<KnowledgeOverview>(
                      user.id,
                      "/advanced",
                      {
                        settings: {
                          ...advanced.settings,
                          synonyms: JSON.parse(advancedText),
                        },
                        topics: advanced.topics,
                      },
                    ),
                  );
                },
              )
            }
          >
            Save settings
          </button>
          <div className="space-y-2">
            {advanced.snapshots.map((s) => (
              <button
                key={s.id}
                className={secondary}
                onClick={() =>
                  askConfirm(
                    "The chatbot will use the content saved on this date.",
                    "Restore saved content",
                    async () => {
                      apply(
                        await staffRequest<KnowledgeOverview>(
                          user.id,
                          "/advanced",
                          { rollback: s.id },
                        ),
                      );
                    },
                  )
                }
              >
                Rollback · {date(s.at)}
              </button>
            ))}
          </div>
          <label className="knowledge-label">
            Test question
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <button
            className={secondary}
            onClick={() =>
              work(async () =>
                setDebug(
                  JSON.stringify(
                    await staffRequest(user.id, "/advanced/verify", {
                      query: question,
                    }),
                    null,
                    2,
                  ),
                ),
              )
            }
          >
            Inspect supplied content and match details
          </button>
          <pre className="overflow-auto max-h-96 text-sm">{debug}</pre>
        </div>
      )}
      <div className="knowledge-card flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <p className="flex gap-2 items-center">
          {safetyPassing ? (
            <ShieldCheck className="shrink-0 text-emerald-700 dark:text-emerald-300" />
          ) : (
            <AlertTriangle className="shrink-0" />
          )}
          {safetyPassing
            ? "Safety checks: all passing"
            : "Safety checks are waiting to run"}
        </p>
        <button
          className={secondary}
          disabled={busy}
          onClick={() =>
            work(async () => {
              const v = apply(
                await staffRequest<KnowledgeOverview>(user.id, "/checks", {}),
              );
              setNotice(
                v.checks.every((c) => c.passed)
                  ? `All ${v.checks.length} checks passed`
                  : "Some questions need attention. See Try It.",
              );
            })
          }
        >
          Check everything again
        </button>
      </div>
      <input
        ref={fileInput}
        className="sr-only"
        tabIndex={-1}
        type="file"
        multiple
        onChange={(e) => {
          work(() => upload([...(e.target.files || [])], replacing));
          e.target.value = "";
        }}
      />
      <input
        ref={photoInput}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          work(() => upload([...(e.target.files || [])]));
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          work(() => upload([...(e.target.files || [])]));
          e.target.value = "";
        }}
      />
      {confirm && (
        <Confirmation
          message={confirm.message}
          label={confirm.label}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const action = confirm.action;
            setConfirm(null);
            work(action);
          }}
        />
      )}
    </section>
  );
}
function Confirmation({
  message,
  label,
  busy,
  onConfirm,
  onCancel,
}: {
  message: string;
  label: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab") {
        const buttons = panel.current?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 flex items-center justify-center md:p-5">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-confirm"
        className="knowledge-card w-full h-full md:h-auto md:max-w-lg flex flex-col justify-center gap-6"
      >
        <h3 id="knowledge-confirm" className="font-serif text-2xl">
          {message}
        </h3>
        <button className={primary} disabled={busy} onClick={onConfirm}>
          {label}
        </button>
        <button className={secondary} onClick={onCancel}>
          Keep reviewing
        </button>
      </div>
    </div>
  );
}
