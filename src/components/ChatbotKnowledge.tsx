import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  MoreHorizontal,
  ChevronLeft,
  Pencil,
  Trash2,
  Filter,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Loader2,
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
  const [section, setSection] = useState("My Content");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [step, setStep] = useState(1);
  const [readOnly, setReadOnly] = useState(false);
  const [editorOptions, setEditorOptions] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);
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
  const [addingTopic, setAddingTopic] = useState(false);
  const [privacy, setPrivacy] = useState<string[]>([]);
  const [undo, setUndo] = useState<KnowledgeItem>();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<KnowledgeAnswer>();
  const [historyPerson, setHistoryPerson] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [allHistory, setAllHistory] = useState(false);
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
  const open = async (
    item: KnowledgeItem,
    mode: "read" | "edit" | "samples" = "edit",
  ) => {
    await saveNow();
    const fresh = apply(await loadKnowledge(user.id));
    item = fresh.items.find((i) => i.id === item.id) || item;
    setNotice("");
    setUndo(undefined);
    setReadOnly(mode === "read");
    setEditorOptions(mode === "samples");
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
  useEffect(() => {
    if (!edit || !["My Content", "Add Content"].includes(section)) return;
    const frame = requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
      editorRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [edit?.id, readOnly, section]);
  const update = (field: keyof KnowledgeText, value: unknown) => {
    if (edit) delete reviewedRevisions.current[edit.id];
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, [field]: value };
      if (
        (field === "question" || field === "title") &&
        typeof value === "string"
      ) {
        const old = f.question || f.title;
        const generated = [
          old,
          `Help me with ${old}`,
          `What should I know about ${old}?`,
        ];
        if (field === "question" && (!f.title || f.title === f.question))
          next.title = value;
        const base = next.question || next.title;
        if (f.samples.every((q, i) => q === generated[i]))
          next.samples = [
            base,
            `Help me with ${base}`,
            `What should I know about ${base}?`,
          ];
        if (f.alternatives.length === 1 && f.alternatives[0] === old)
          next.alternatives = [base];
      }
      return next;
    });
    dirtyRef.current = true;
    setDirty(true);
    setReviewed((r) => r.filter((id) => id !== edit?.id));
    setSaved("Saving…");
  };
  const create = async (kind: "question" | "document", suggestion = "") => {
    await saveNow();
    setNotice("");
    setUndo(undefined);
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
          rows={
            field === "answer"
              ? edit?.type === "question"
                ? 6
                : 12
              : field === "question"
                ? 2
                : 3
          }
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
  const visibleHistory = allHistory
    ? data.history
    : data.history.filter((h) => {
        if (h.actionTaken === "UPDATE_FAILED" || h.actionTaken === "ADVANCED")
          return true;
        if (h.actionTaken === "CHECK_RUN") return h.notes.startsWith("Ran all");
        if (h.actionTaken === "ADD") return !h.notes.startsWith("Added draft");
        return (
          ["EDIT", "PUBLISH", "REMOVE", "RESTORE", "REPLACE"].includes(
            h.actionTaken,
          ) &&
          h.notes.includes("“") &&
          !h.notes.startsWith("Edited draft")
        );
      });
  return (
    <section
      className="knowledge-area space-y-5 pb-32 md:pb-8"
      aria-label="Chatbot Knowledge"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
            Chatbot Knowledge
          </h2>
          <p
            className="mt-1 flex gap-1.5 items-start text-xs text-slate-500 dark:text-slate-400"
            role="status"
            aria-live="polite"
          >
            {updating ? (
              <Loader2 size={16} className="animate-spin shrink-0 mt-1" />
            ) : data.status.startsWith("We couldn't") ? (
              <AlertTriangle
                size={16}
                className="shrink-0 mt-1 text-amber-600 dark:text-amber-400"
              />
            ) : (
              <CheckCircle2
                size={16}
                className="shrink-0 mt-1 text-emerald-600 dark:text-emerald-400"
              />
            )}
            {updating ? "Updating the chatbot…" : data.status}
          </p>
        </div>
        {section === "Add Content" || edit ? (
          <button
            className="knowledge-link self-start sm:self-auto"
            onClick={() =>
              work(async () => {
                await saveNow();
                setEdit(null);
                setForm(null);
                setSection("My Content");
              })
            }
          >
            <ChevronLeft size={16} />
            Back to content
          </button>
        ) : (
          <button
            className={section === "Try It" ? secondary : primary}
            onClick={() =>
              work(async () => {
                await saveNow();
                setEdit(null);
                setForm(null);
                setSection("Add Content");
                setStep(1);
                setBatch([]);
                setReviewed([]);
                setUploadStatus([]);
              })
            }
          >
            <Plus size={16} />
            Add Content
          </button>
        )}
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
          className="flex flex-wrap gap-2 items-center rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200"
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
      {!edit && section !== "Add Content" && (
        <nav
          aria-label="Knowledge sections"
          className="flex items-center gap-5 sm:gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800 no-scrollbar"
        >
          {[
            "My Content",
            "Try It",
            "History",
            ...(user.role === "SYSTEM_ADMIN" ? ["Advanced"] : []),
          ].map((s) => (
            <button
              key={s}
              aria-current={section === s ? "page" : undefined}
              className={`knowledge-tab ${section === s ? "knowledge-selected" : ""}`}
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
                    setAdvancedText(
                      JSON.stringify(a.settings.synonyms, null, 2),
                    );
                  }
                })
              }
            >
              {s}
            </button>
          ))}
        </nav>
      )}
      {section === "Add Content" && (
        <>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <p className="md:hidden font-medium">
              Step {step} of 4 ·{" "}
              {["Add", "Review", "Publish", "Check"][step - 1]}
            </p>
            <ol className="hidden md:flex gap-6" aria-label="Progress">
              {["Add", "Review", "Publish", "Check"].map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 ${i + 1 === step ? "text-[#002D72] dark:text-blue-400 font-semibold" : ""}`}
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
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Add a document or questions
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Review everything before it becomes available to care
                  partners.
                </p>
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  work(() => upload([...e.dataTransfer.files], replacing));
                }}
                className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-850 p-6 sm:p-9 text-center space-y-3"
              >
                <Upload
                  className="mx-auto text-slate-400 dark:text-slate-500"
                  size={28}
                />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Drop files here or tap to choose
                </p>
                <button
                  className={primary}
                  onClick={() => fileInput.current?.click()}
                >
                  Choose files
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Up to 10 files · 25 MB each · 300 pages per PDF
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                <button
                  className="knowledge-link"
                  onClick={() => work(() => create("document"))}
                >
                  Type or paste text
                </button>
                <button
                  className="knowledge-link"
                  onClick={() => work(() => create("question"))}
                >
                  Add a question and answer
                </button>
                <details className="relative">
                  <summary className="knowledge-link cursor-pointer">
                    Use photos
                  </summary>
                  <div className="knowledge-menu right-0">
                    <button onClick={() => photoInput.current?.click()}>
                      <FileText size={16} />
                      Choose photos
                    </button>
                    <button onClick={() => cameraInput.current?.click()}>
                      <Camera size={16} />
                      Take a photo
                    </button>
                  </div>
                </details>
              </div>
              <details className="text-xs text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer py-2">
                  Supported file types
                </summary>
                <p className="mt-1">
                  PDF, Word, PowerPoint, Excel, CSV, TSV, text, Markdown, HTML,
                  RTF, ODT, JPG, PNG, TIFF and HEIC.
                </p>
              </details>
            </div>
          )}
          {!!uploadStatus.length &&
            (step === 1 ||
              uploadStatus.some((f) => f.message !== "Ready to review")) && (
              <div
                className="knowledge-card space-y-3 text-xs"
                aria-live="polite"
              >
                {uploadStatus.map((f, i) => (
                  <div key={i}>
                    <span className="font-medium">{f.name}</span>
                    <p className="text-slate-500 dark:text-slate-400">
                      {f.message}
                    </p>
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
              <h3 className="font-serif text-xl">Ready to share?</h3>
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
      {section === "My Content" && !edit && (
        <div className="knowledge-card !p-0 overflow-visible">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 border-b border-slate-200 dark:border-slate-800">
            <label className="relative flex-1 min-w-0">
              <span className="sr-only">Find content</span>
              <Search
                size={16}
                className="absolute left-3 top-3.5 text-slate-400"
              />
              <input
                className="w-full !pl-9"
                placeholder="Search content…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="sm:w-36">
              <span className="sr-only">Status</span>
              <select
                className="w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {["Live", "Draft", "Removed"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <details className="relative self-start sm:self-auto">
              <summary className={secondary + " cursor-pointer list-none"}>
                <Filter size={16} />
                Filters
                {(topic || type) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#002D72] dark:bg-blue-400" />
                )}
              </summary>
              <div className="knowledge-menu left-0 sm:left-auto sm:right-0 !w-64 space-y-3 !p-4">
                <label className="knowledge-label">
                  Topic
                  <select
                    aria-label="Topic"
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
                  <select
                    aria-label="Type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">All content</option>
                    <option value="question">Questions</option>
                    <option value="document">Documents</option>
                  </select>
                </label>
                <button
                  className="knowledge-link"
                  onClick={() => {
                    setTopic("");
                    setType("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            </details>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((i) => {
              const d = i.draft || i.live!;
              return (
                <article
                  key={i.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <button
                        className="text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-[#002D72] dark:hover:text-blue-400 focus-visible:underline"
                        onClick={() => work(() => open(i, "read"))}
                      >
                        {d.title || "Untitled draft"}
                      </button>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span
                          className={`rounded-md px-2 py-0.5 font-medium ${i.status === "Live" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : i.status === "Draft" ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                        >
                          {i.status}
                        </span>
                        <span>
                          {data.topics.find((t) => t.id === d.topicId)?.name}
                        </span>
                        {i.checkedAt && (
                          <span
                            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
                            title={`Checked on ${date(i.checkedAt)}`}
                          >
                            <CheckCircle2 size={13} />
                            Checked
                          </span>
                        )}
                        {i.status === "Live" && i.draft && (
                          <span className="text-amber-700 dark:text-amber-400">
                            Draft changes
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Updated {date(i.updatedAt)} · {i.updatedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                    {i.status === "Removed" ? (
                      <button
                        className="knowledge-link"
                        onClick={() =>
                          askConfirm(
                            i.live
                              ? "The chatbot will start using this content again."
                              : "This draft will return to your content for review.",
                            "Restore",
                            () => archive(i, true),
                          )
                        }
                      >
                        <RotateCcw size={15} />
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          className="knowledge-link"
                          onClick={() => work(() => open(i))}
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <details name="knowledge-actions" className="relative">
                          <summary
                            aria-label={`More actions for ${d.title || "Untitled draft"}`}
                            className="knowledge-link !px-2 cursor-pointer list-none"
                          >
                            <MoreHorizontal size={18} />
                          </summary>
                          <div className="knowledge-menu right-0">
                            {i.type === "document" && (
                              <button
                                onClick={(e) => {
                                  e.currentTarget
                                    .closest("details")
                                    ?.removeAttribute("open");
                                  setReplacing(i.id);
                                  setSection("Add Content");
                                  setStep(1);
                                  setBatch([]);
                                  setEdit(null);
                                  setForm(null);
                                  fileInput.current?.click();
                                }}
                              >
                                <Upload size={15} />
                                Replace document
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                                i.status === "Draft"
                                  ? work(() => archive(i))
                                  : askConfirm(
                                      "The chatbot will stop using this. You can restore it anytime.",
                                      "Remove",
                                      () => archive(i),
                                    );
                              }}
                            >
                              <Trash2 size={15} />
                              Remove
                            </button>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="py-12 px-5 text-center">
              <BookOpen
                size={28}
                className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
              />
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {data.items.length
                  ? "No content matches your search."
                  : "Add your first document or question."}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {data.items.length
                  ? "Try another search or clear the filters."
                  : "Your drafts stay private until you publish them."}
              </p>
            </div>
          )}
          {filtered.length > 0 && (
            <p className="border-t border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      )}
      {edit && form && readOnly && section === "My Content" && (
        <article
          ref={(node) => {
            editorRef.current = node;
          }}
          tabIndex={-1}
          className="knowledge-card space-y-4 scroll-mt-24 focus:outline-none"
        >
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
          <div
            ref={(node) => {
              editorRef.current = node;
            }}
            tabIndex={-1}
            className="knowledge-card space-y-5 scroll-mt-24 focus:outline-none"
            aria-label="Review content"
          >
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {edit.status === "Live" ? "Edit content" : "Review content"}
              </h3>
              <span
                className="text-xs text-slate-500 dark:text-slate-400"
                role="status"
              >
                {saved}
              </span>
            </div>
            <div
              className={`grid gap-6 ${edit.fileId && edit.type === "document" ? "lg:grid-cols-2" : "max-w-3xl"}`}
            >
              {edit.fileId && edit.type === "document" && (
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
                {edit.type === "question"
                  ? input("Question", "question", true)
                  : input("Title", "title")}
                {input(
                  edit.type === "question" ? "Answer" : "Content",
                  "answer",
                  true,
                )}
                <label className="knowledge-label">
                  Topic{" "}
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
                {addingTopic ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      aria-label="New topic name"
                      placeholder="Topic name"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                    />
                    <button
                      className={secondary}
                      onClick={() =>
                        work(async () => {
                          const v = apply(
                            await staffRequest<KnowledgeOverview>(
                              user.id,
                              "/topics",
                              { name: topicName },
                            ),
                          );
                          const added = v.topics.find(
                            (t) => t.name === topicName.trim(),
                          );
                          if (added) update("topicId", added.id);
                          setTopicName("");
                          setAddingTopic(false);
                        })
                      }
                    >
                      Add topic
                    </button>
                    <button
                      className="knowledge-link"
                      onClick={() => setAddingTopic(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="knowledge-link !min-h-0 !py-0"
                    onClick={() => setAddingTopic(true)}
                  >
                    + New topic
                  </button>
                )}
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
                <details
                  className="knowledge-disclosure"
                  open={editorOptions}
                  onToggle={(e) => setEditorOptions(e.currentTarget.open)}
                >
                  <summary>Additional details · optional</summary>
                  <div className="space-y-4 pt-3">
                    {" "}
                    {edit.type === "question" && input("Display name", "title")}
                    {input("Key points — one per line", "keyPoints", true)}
                    <details className="knowledge-disclosure">
                      <summary>Suggested wording · optional</summary>
                      <p>
                        You can leave these as they are. The chatbot will still
                        use your content.
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
                    <details className="knowledge-disclosure">
                      <summary>Sample questions</summary>
                      <p>
                        Keep at least three questions. We use these to check
                        your content.
                      </p>
                      {input(
                        "Sample questions — one per line",
                        "samples",
                        true,
                      )}
                    </details>
                    {edit.type === "document" && (
                      <details className="knowledge-disclosure">
                        <summary>Organize sections</summary>{" "}
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
                                        (i) =>
                                          !data.items.some(
                                            (o) => o.id === i.id,
                                          ),
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
                                  answer:
                                    form.answer + "\n\n" + other.draft!.answer,
                                });
                                dirtyRef.current = true;
                                setDirty(true);
                                setBatch((b) =>
                                  b.filter((id) => id !== other.id),
                                );
                              });
                            }}
                          >
                            <option value="">Merge with another draft…</option>
                            {data.items
                              .filter(
                                (i) =>
                                  i.id !== edit.id &&
                                  i.draft &&
                                  i.status === "Draft",
                              )
                              .map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.draft!.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      </details>
                    )}
                  </div>
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
                className="knowledge-link"
                onClick={() =>
                  work(async () => {
                    await saveNow();
                    setEdit(null);
                    setForm(null);
                    setSection("My Content");
                  })
                }
              >
                Save for later
              </button>
            </div>
          </div>
        )}
      {section === "Try It" && (
        <>
          <div className="knowledge-card space-y-4">
            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Try it as a care partner would
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Ask a question and see the content behind the answer.
              </p>
            </div>
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
                <div className="rounded-xl bg-slate-50 dark:bg-slate-850 p-4 whitespace-pre-wrap leading-relaxed text-sm">
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
                  {response.writingUnavailable && (
                    <p className="text-sm">
                      Sharing your approved text while the writing service is
                      unavailable.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="knowledge-card space-y-3" aria-live="polite">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="text-emerald-600 dark:text-emerald-400 shrink-0"
              />
              <h3 className="font-semibold text-sm">Content checks</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {batch.length
                ? batchChecks.length && batchChecks.every((c) => c.passed)
                  ? "All done. Care partners can now get answers from your content."
                  : "Some questions need attention. Open the details below."
                : "Your content is checked automatically after every update."}
            </p>
            <details
              className="knowledge-disclosure"
              open={attention.length > 0}
            >
              <summary>View sample questions</summary>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {[
                  ...new Set(
                    checks
                      .filter(
                        (c) =>
                          c.itemId &&
                          (!batch.length || batch.includes(c.itemId)),
                      )
                      .map((c) => c.itemId!),
                  ),
                ].map((id) => {
                  const results = checks.filter((c) => c.itemId === id);
                  const passed = results.every((c) => c.passed);
                  return (
                    <details key={id} className="py-3" open={!passed}>
                      <summary className="cursor-pointer flex gap-2 items-start font-medium text-xs sm:text-sm">
                        {passed ? (
                          <CheckCircle2
                            size={16}
                            className="mt-1 text-emerald-600 dark:text-emerald-400 shrink-0"
                          />
                        ) : (
                          <AlertTriangle
                            size={16}
                            className="mt-1 text-amber-600 dark:text-amber-400 shrink-0"
                          />
                        )}
                        {data.items.find((i) => i.id === id)?.live?.title}
                      </summary>
                      <div className="pl-6 pt-3 space-y-3">
                        {results.map((c, i) => (
                          <div key={i} className="text-xs">
                            <p className="flex gap-2">
                              <span
                                aria-label={
                                  c.passed ? "Passed" : "Needs attention"
                                }
                              >
                                {c.passed ? "✓" : "⚠"}
                              </span>
                              {c.question}
                            </p>
                            {!c.passed && (
                              <div className="mt-2 space-y-2">
                                <p className="text-slate-500 dark:text-slate-400">
                                  Try a clearer question or title.
                                </p>
                                <button
                                  className={secondary}
                                  onClick={() =>
                                    work(async () => {
                                      apply(
                                        await staffRequest<KnowledgeOverview>(
                                          user.id,
                                          `/items/${id}/fix`,
                                          {},
                                        ),
                                      );
                                    })
                                  }
                                >
                                  Fix this automatically
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          className="knowledge-link !px-0"
                          onClick={() => {
                            setSection("My Content");
                            work(() =>
                              open(
                                data.items.find((i) => i.id === id)!,
                                "samples",
                              ),
                            );
                          }}
                        >
                          Edit sample questions
                        </button>
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          </div>
        </>
      )}
      {section === "History" && (
        <div className="knowledge-card space-y-5">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            History
          </h3>
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
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={allHistory}
              onChange={(e) => setAllHistory(e.target.checked)}
            />
            Include draft saves and automatic checks
          </label>
          <ol className="space-y-5">
            {visibleHistory
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
          {!visibleHistory.length && (
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
        <p className="flex gap-2 items-center">
          {safetyPassing ? (
            <ShieldCheck
              size={16}
              className="shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <AlertTriangle className="shrink-0" />
          )}
          {safetyPassing
            ? "Safety checks: all passing"
            : "Safety checks are waiting to run"}
        </p>
        <button
          className="knowledge-link !text-xs !font-medium !px-1"
          disabled={busy}
          hidden={section !== "Try It"}
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
      const target =
        before?.closest("details")?.querySelector<HTMLElement>("summary") ||
        before;
      target?.focus();
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
        <h3
          id="knowledge-confirm"
          className="font-semibold text-lg text-slate-900 dark:text-white"
        >
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
