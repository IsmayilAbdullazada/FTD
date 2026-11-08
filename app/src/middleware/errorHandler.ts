import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Application Error]:', err.stack || err);

  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 
    ? 'Internal Server Error' 
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
