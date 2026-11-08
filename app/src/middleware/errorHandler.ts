import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res
      .status(400)
      .json({ error: error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error("[Application error]", error);
  res.status(status).json({
    error:
      status === 500 && env.NODE_ENV === "production"
        ? "Internal Server Error"
        : error.message,
  });
};
