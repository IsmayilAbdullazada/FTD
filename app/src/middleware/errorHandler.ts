import { logger } from '../lib/logger.js';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

// Parser errors occur before Express selects a route. Keep known route names,
// masking dynamic identifiers and excluding the query string.
const routeSegments = new Set(
  'api v1 auth login logout register forgot-password reset-password chatbot extract-pdf posts comments cohorts resources knowledge chat private deflect deflection discussions discussions-pool moderation action queue notifications users me invitations guides admin updates events'.split(
    ' ',
  ),
);
function parserRoute(path: string): string {
  return path
    .split('/')
    .map((segment) =>
      !segment || routeSegments.has(segment) ? segment : ':id',
    )
    .join('/');
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  _next,
) => {
  const e = error as {
    code?: string;
    type?: string;
    status?: number;
    message?: string;
  };
  const parserStatus =
    e?.type === 'entity.too.large'
      ? 413
      : [
            'entity.parse.failed',
            'request.aborted',
            'request.size.invalid',
            'encoding.unsupported',
            'charset.unsupported',
          ].includes(e?.type ?? '')
        ? (e.status ?? 400)
        : undefined;
  const status =
    error instanceof ZodError
      ? 400
      : error instanceof HttpError
        ? error.status
        : e?.code === 'P1001'
          ? 503
          : e?.code === '23505'
            ? 409
            : (parserStatus ?? 500);
  logger.error('HTTP request failed', error, {
    requestId: res.locals.requestId,
    method: req.method,
    route: req.route ? req.baseUrl + req.route.path : parserRoute(req.path),
  });
  const message =
    error instanceof ZodError
      ? error.issues[0]?.message
      : error instanceof HttpError
        ? error.message
        : e?.code === 'P1001'
          ? 'Registration is temporarily unavailable. Please contact your care team.'
          : status === 409
            ? 'A record with that identifier already exists'
            : status === 413
              ? 'Request body is too large'
              : status === 400
                ? 'Malformed request body'
                : 'Internal Server Error';
  res.status(status).json({ error: message, requestId: res.locals.requestId });
};
