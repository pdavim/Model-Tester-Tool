import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../infra/Logging';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId || 'unknown';
  
  // Log the detailed error internally
  Logger.error(`[${requestId}] Error: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.errors
      }
    });
  }

  // Handle specific status codes if present
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: {
      message: message,
      requestId: requestId
    }
  });
};
