import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getState,
  record,
  updateStatus,
  change,
  normalize,
  answer,
  retrieve,
  guides,
  faqItems,
  publicTopics,
  snapshotState,
  dataDir,
  type Actor,
} from "./knowledgeStore.ts";
import { chatbotAnswer } from "./knowledgeAnswer.ts";
import { readUpload } from "./fileReading.ts";
import type { KnowledgeItem } from "../src/types/knowledge.ts";
const root = "/api/v1/staff/knowledge";
type User = Actor & { role: string };
export function registerKnowledge(app: Express, users: User[]) {
  const actor = (req: Request) =>
    users.find((u) => u.id === req.header("x-user-id"));
  const staff = (req: Request, res: Response, next: NextFunction) => {
    const u = actor(req);
    if (!u || !["CLINICIAN_MODERATOR", "SYSTEM_ADMIN"].includes(u.role))
      return res
        .status(403)
        .json({ error: "Only clinic staff can manage this content." });
    next();
  };
  const admin = (req: Request) => {
    if (actor(req)?.role !== "SYSTEM_ADMIN")
      throw Object.assign(
        Error("Only administrators can use these controls."),
        { status: 403 },
      );
  };
  const route =
    (fn: (req: Request, res: Response) => unknown) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .catch(next);
    };
  const overview = () => {
    const s = getState();
    return {
      items: s.items,
      topics: s.topics,
      history: s.history,
      checks: s.checks,
      status: updateStatus(),
      liveCount: s.items.filter((i) => i.status === "Live").length,
      pendingSheets: s.files.flatMap((f) =>
        (f.sheets || []).map((sheet) => ({ ...sheet, fileId: f.id })),
      ),
    };
  };
  app.use(root, staff, express.json({ limit: "30mb" }));
  app.get(root, (_req, res) => res.json(overview()));
  app.post(
    root + "/topics",
    route(async (req, res) => {
      const name = String(req.body.name || "")
        .trim()
        .slice(0, 100);
      if (!name) throw Error("Please give this topic a name.");
      const id = randomUUID();
      await change(
        actor(req)!,
        "ADD",
        id,
        `Added topic “${name}”`,
        (s) => {
          if (s.topics.some((t) => t.name.toLowerCase() === name.toLowerCase()))
            throw Error("This topic is already available.");
          s.topics.push({ id, name, enabled: true });
        },
        true,
      );
      res.json(overview());
    }),
  );
  app.post(
    root + "/drafts",
    route(async (req, res) => {
      const id = randomUUID();
      await change(
        actor(req)!,
        "ADD",
        id,
        `Added draft “${String(req.body.title || "Untitled draft").slice(0, 200)}”`,
        (s) => {
          const d = normalize(req.body, s);
          s.items.push({
            id,
            type: req.body.type === "document" ? "document" : "question",
            status: "Draft",
            live: null,
            draft: d,
            revision: 1,
            updatedAt: new Date().toISOString(),
            updatedBy: `${actor(req)!.firstName} ${actor(req)!.lastName}`,
            replacesId:
              typeof req.body.replacesId === "string"
                ? req.body.replacesId
                : undefined,
          });
        },
      );
      res.json(overview());
    }),
  );
  app.put(
    root + "/items/:id",
    route(async (req, res) => {
      await change(
        actor(req)!,
        "EDIT",
        String(req.params.id),
        `Edited draft “${String(req.body.title || "Untitled draft").slice(0, 200)}”`,
        (s) => {
          const i = s.items.find((i) => i.id === req.params.id);
          if (!i)
            throw Error(
              "This content is no longer available. Refresh the list.",
            );
          if (i.revision !== req.body.revision)
            throw Object.assign(
              Error(
                "Someone else changed this content. Open it again before saving your changes.",
              ),
              { status: 409 },
            );
          i.draft = normalize(req.body, s);
          delete i.checkedAt;
          i.revision++;
          i.updatedAt = new Date().toISOString();
          i.updatedBy = `${actor(req)!.firstName} ${actor(req)!.lastName}`;
        },
      );
      res.json(overview());
    }),
  );
  app.post(
    root + "/publish",
    route(async (req, res) => {
      if (req.body.confirmed !== true)
        throw Error("Please review the content before making it available.");
      const ids: string[] = req.body.ids;
      if (!Array.isArray(ids) || !ids.length || ids.length > 1000)
        throw Error("Choose the content to publish.");
      await change(
        actor(req)!,
        "PUBLISH",
        ids.join(","),
        "Published reviewed content",
        (s) => {
          for (const id of ids) {
            const i = s.items.find((i) => i.id === id);
            if (!i?.draft)
              throw Error("Open each draft and review it before publishing.");
            if (req.body.revisions?.[id] !== i.revision)
              throw Object.assign(
                Error(
                  "Someone else changed a draft. Review the latest content before publishing.",
                ),
                { status: 409 },
              );
            const d = i.draft;
            if (
              !d.title.trim() ||
              !d.answer.trim() ||
              (i.type === "question" && !d.question.trim())
            )
              throw Error(
                "Please add a title, question, and answer where needed.",
              );
            if (d.samples.filter((q) => q.trim()).length < 3)
              throw Error("Please keep at least three sample questions.");
            if (
              s.files.find((f) => f.id === i.fileId)?.unclear &&
              !d.unclearAccepted
            )
              throw Error(
                "Please double-check the highlighted text before publishing.",
              );
            if (i.replacesId) {
              const old = s.items.find((o) => o.id === i.replacesId);
              if (!old?.live)
                throw Error(
                  "The older document is no longer available. Open your content list and try again.",
                );
              record(
                s,
                actor(req)!,
                "REPLACE",
                i.id,
                `Replaced “${old.live!.title}” with “${d.title}”`,
              );
              old.status = "Removed";
              old.revision++;
              old.updatedAt = new Date().toISOString();
              old.updatedBy = `${actor(req)!.firstName} ${actor(req)!.lastName}`;
            }
            record(
              s,
              actor(req)!,
              i.live ? "EDIT" : "PUBLISH",
              id,
              `${i.live ? "Updated" : "Published"} “${d.title}”`,
            );
            i.live = structuredClone(d);
            i.draft = null;
            i.status = "Live";
            i.revision++;
            i.updatedAt = new Date().toISOString();
            i.updatedBy = `${actor(req)!.firstName} ${actor(req)!.lastName}`;
          }
        },
        true,
      );
      res.json(overview());
    }),
  );
  for (const action of ["remove", "restore"] as const)
    app.post(
      root + `/items/:id/${action}`,
      route(async (req, res) => {
        if (req.body.confirmed !== true)
          throw Error("Please confirm this change.");
        await change(
          actor(req)!,
          action === "remove" ? "REMOVE" : "RESTORE",
          String(req.params.id),
          `${action === "remove" ? "Removed" : "Restored"} content`,
          (s) => {
            const i = s.items.find((i) => i.id === req.params.id);
            if (!i) throw Error("This content is no longer available.");
            if (req.body.revision !== i.revision)
              throw Object.assign(
                Error(
                  "Someone else changed this content. Refresh and try again.",
                ),
                { status: 409 },
              );
            if (action === "restore" && !i.live) {
              i.status = "Draft";
            } else i.status = action === "remove" ? "Removed" : "Live";
            record(
              s,
              actor(req)!,
              action === "remove" ? "REMOVE" : "RESTORE",
              i.id,
              `${action === "remove" ? "Removed" : "Restored"} “${(i.live || i.draft)!.title}”`,
            );
            i.revision++;
            i.updatedAt = new Date().toISOString();
            i.updatedBy = `${actor(req)!.firstName} ${actor(req)!.lastName}`;
          },
          true,
        );
        res.json(overview());
      }),
    );
  app.post(
    root + "/checks",
    route(async (req, res) => {
      await change(
        actor(req)!,
        "CHECK_RUN",
        "all",
        "Ran all content and safety checks",
        () => {},
        true,
      );
      res.json(overview());
    }),
  );
  app.post(
    root + "/items/:id/fix",
    route(async (req, res) => {
      await change(
        actor(req)!,
        "EDIT",
        String(req.params.id),
        "Improved wording and checked content",
        (s) => {
          const i = s.items.find((i) => i.id === req.params.id);
          if (!i?.live) throw Error("Publish this content before checking it.");
          i.live.alternatives = [
            ...new Set([
              ...i.live.alternatives,
              ...i.live.samples.filter((q) => !answer(q).isMedicationRefusal),
            ]),
          ];
          i.revision++;
        },
        true,
      );
      res.json(overview());
    }),
  );
  app.post(
    root + "/try",
    route(async (req, res) => {
      if (typeof req.body.query !== "string" || !req.body.query.trim())
        throw Error("Type a question to try.");
      res.json(await chatbotAnswer(req.body.query));
    }),
  );
  app.post(
    root + "/uploads",
    express.raw({ type: "application/octet-stream", limit: "25mb" }),
    route(async (req, res) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        throw Error("Choose a file to add.");
      const name = decodeURIComponent(
        req.header("x-file-name") || "Document",
      ).slice(0, 200);
      const hash = createHash("sha256").update(req.body).digest("hex");
      const existing = getState().files.find((f) => f.hash === hash);
      if (existing && !req.header("x-replace-id"))
        return res.status(409).json({
          error:
            "This file was already added. Replace the existing one, or cancel.",
          duplicateId: getState().items.find((i) => i.fileId === existing.id)
            ?.id,
        });
      const id = randomUUID();
      const path = resolve(dataDir, "uploads", id);
      await writeFile(path, req.body, { flag: "wx" });
      try {
        const result = await readUpload(req.body, name, path);
        if (result.sections.length > 1000)
          throw Error(
            "This file has too many sections. Divide it into smaller files.",
          );
        await change(
          actor(req)!,
          "ADD",
          id,
          `Added “${name}” for review`,
          (s) => {
            s.files.push({
              id,
              name,
              hash,
              mime: result.mime,
              unclear: result.unclear,
              sheets: result.sheets,
            });
            for (const section of result.sections) {
              const d = normalize(
                {
                  title: section.title,
                  answer: section.text,
                  visibility: "guides",
                  unclearAccepted: !result.unclear,
                },
                s,
              );
              s.items.push({
                id: randomUUID(),
                fileId: id,
                type: "document",
                status: "Draft",
                live: null,
                draft: d,
                revision: 1,
                updatedAt: new Date().toISOString(),
                updatedBy: `${actor(req)!.firstName} ${actor(req)!.lastName}`,
                replacesId: req.header("x-replace-id") || undefined,
              });
            }
          },
        );
        res.json({ fileId: id, sheets: result.sheets, overview: overview() });
      } catch (e) {
        await unlink(path);
        throw e;
      }
    }),
  );
  app.post(
    root + "/uploads/:id/questions",
    route(async (req, res) => {
      const rows = req.body.rows;
      if (!getState().files.some((f) => f.id === req.params.id))
        throw Error("Please upload this file again.");
      if (!Array.isArray(rows) || rows.length > 2000)
        throw Error("Please choose up to 2,000 questions at a time.");
      await change(
        actor(req)!,
        "ADD",
        String(req.params.id),
        "Added spreadsheet questions for review",
        (s) => {
          const file = s.files.find((f) => f.id === req.params.id)!;
          file.sheets = (file.sheets || []).filter(
            (sheet) => sheet.name !== req.body.sheetName,
          );
          for (const row of rows) {
            if (
              typeof row.question !== "string" ||
              typeof row.answer !== "string" ||
              !row.question.trim() ||
              !row.answer.trim()
            )
              continue;
            const d = normalize(
              {
                title: row.question,
                question: row.question,
                answer: row.answer,
                visibility: "chatbot",
              },
              s,
            );
            s.items.push({
              id: randomUUID(),
              fileId: String(req.params.id),
              type: "question",
              status: "Draft",
              live: null,
              draft: d,
              revision: 1,
              updatedAt: new Date().toISOString(),
              updatedBy: `${actor(req)!.firstName} ${actor(req)!.lastName}`,
            });
          }
        },
      );
      res.json(overview());
    }),
  );
  app.get(
    root + "/files/:id",
    route(async (req, res) => {
      const f = getState().files.find((f) => f.id === req.params.id);
      if (!f)
        return res
          .status(404)
          .json({ error: "This original file is no longer available." });
      res.setHeader(
        "Content-Type",
        f.mime === "application/pdf" || f.mime.startsWith("image/")
          ? f.mime
          : "text/plain",
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Original-Name", encodeURIComponent(f.name));
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="original-file"',
      );
      res.sendFile(resolve(dataDir, "uploads", f.id));
    }),
  );
  app.get(
    root + "/advanced",
    route(async (req, res) => {
      admin(req);
      const s = getState();
      res.json({
        settings: s.settings,
        snapshots: s.snapshots.map(({ id, at }) => ({ id, at })),
        topics: s.topics,
      });
    }),
  );
  app.post(
    root + "/advanced",
    route(async (req, res) => {
      admin(req);
      await change(
        actor(req)!,
        "ADVANCED",
        "settings",
        "Updated administrator settings",
        (s) => {
          if (req.body.rollback) {
            const old = s.snapshots.find((x) => x.id === req.body.rollback);
            if (!old) throw Error("This saved content is no longer available.");
            const currentIds = new Set(s.items.map((i) => i.id));
            s.items = s.items.map((current) => {
              const saved = old.items.find((i) => i.id === current.id);
              if (!current.live && !saved?.live) return current;
              return {
                ...current,
                live: saved?.live || current.live,
                status:
                  saved?.live && saved.status === "Live" ? "Live" : "Removed",
                revision: current.revision + 1,
                updatedAt: new Date().toISOString(),
                updatedBy: `${actor(req)!.firstName} ${actor(req)!.lastName}`,
              };
            });
            s.items.push(
              ...structuredClone(
                old.items.filter((i) => i.live && !currentIds.has(i.id)),
              ).map((i) => ({ ...i, draft: null, revision: i.revision + 1 })),
            );
            s.topics = [
              ...structuredClone(old.topics),
              ...s.topics
                .filter((t) => !old.topics.some((o) => o.id === t.id))
                .map((t) => ({ ...t, enabled: false })),
            ];
            s.settings = structuredClone(old.settings);
          }
          if (req.body.settings) {
            const v = req.body.settings;
            if (
              !Number.isInteger(v.resultCount) ||
              v.resultCount < 1 ||
              v.resultCount > 10 ||
              !Number.isFinite(v.minimum) ||
              v.minimum < 0.1 ||
              v.minimum > 1 ||
              !v.synonyms ||
              typeof v.synonyms !== "object" ||
              Object.values(v.synonyms).some(
                (x) =>
                  !Array.isArray(x) || x.some((w) => typeof w !== "string"),
              )
            )
              throw Error("Please check the settings and try again.");
            s.settings = v;
          }
          if (Array.isArray(req.body.topics))
            for (const topic of req.body.topics) {
              const t = s.topics.find((t) => t.id === topic.id);
              if (t) t.enabled = topic.enabled === true;
            }
        },
        true,
      );
      res.json(overview());
    }),
  );
  app.post(
    root + "/advanced/verify",
    route(async (req, res) => {
      admin(req);
      res.json({
        ...answer(String(req.body.query || "")),
        debug: {
          matches: retrieve(String(req.body.query || ""), snapshotState()).map(
            (m) => ({ id: m.item.id, score: m.score, content: m.item.live }),
          ),
          suppliedToModel: retrieve(
            String(req.body.query || ""),
            snapshotState(),
          )
            .slice(0, 1)
            .map((m) => ({
              id: m.item.id,
              approvedText: m.item.live!.answer.slice(0, 12000),
            })),
        },
      });
    }),
  );
  app.get("/api/v1/knowledge/topics", (_req, res) => res.json(publicTopics()));
  app.get("/api/v1/knowledge/faq", (_req, res) => res.json(faqItems()));
  app.get("/api/v1/resources", (_req, res) => res.json(guides()));
  app.post("/api/v1/resources", staff, (_req, res) =>
    res.status(409).json({
      error:
        "Add and review this content in Chatbot Knowledge before publishing.",
    }),
  );
  app.post(
    "/api/v1/knowledge/chat",
    route(async (req, res) => {
      const q = req.body.query;
      if (typeof q !== "string" || !q.trim())
        return res.status(400).json({ error: "Query is required" });
      res.json(await chatbotAnswer(q));
    }),
  );
  app.use(
    root,
    (
      err: Error & { status?: number; type?: string; code?: unknown },
      req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status = err.status || 400;
      const message = err.code
        ? "We could not read or save this content. Please try a fresh copy of the file, or type or paste it instead."
        : err.type === "entity.too.large"
          ? "Please choose a file no larger than 25 MB."
          : err.message;
      res.status(status).json({ error: message });
    },
  );
}
