import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import postRoutes from "./modules/posts/posts.routes.js";
import messageRoutes from "./modules/messages/messages.routes.js";
import cohortRoutes from "./modules/cohorts/cohorts.routes.js";
import resourceRoutes from "./modules/resources/resources.routes.js";
import moderationRoutes from "./modules/moderation/moderation.routes.js";
import contentRoutes from "./modules/content/content.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import guideRoutes, { extractPdf } from "./modules/guides/guides.routes.js";
import knowledgeRoutes from "./modules/knowledge/knowledge.routes.js";
import deflectionRoutes from "./modules/knowledge/deflection.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { authenticateToken, requireStaff } from "./middleware/auth.js";
import { HttpError } from "./lib/http.js";

export const app = express();
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const origins = env.CORS_ORIGIN.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      callback(new HttpError(403, "Origin is not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(
  "/uploads/guides",
  express.static(path.join(repositoryRoot, "public", "uploads", "guides"), {
    index: false,
  }),
);
app.use(
  "/resources",
  express.static(path.join(repositoryRoot, "public", "resources"), {
    index: false,
  }),
);
app.use("/api", globalLimiter);

const health = async (_req: express.Request, res: express.Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "Hopkins Care Partner Connect Backend",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
};
app.get("/api/health", health);
app.get("/api/v1/health", health);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/chat/private", messageRoutes);
app.use("/api/v1/cohorts", cohortRoutes);
app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/moderation", moderationRoutes);
app.use("/api/v1", contentRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/chatbot/guides", guideRoutes);
app.post(
  "/api/v1/chatbot/extract-pdf",
  authenticateToken,
  requireStaff,
  extractPdf,
);
app.use("/api/v1/knowledge", knowledgeRoutes);
app.use("/api/v1/deflection", deflectionRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API endpoint not found" }),
);
app.use(errorHandler);
