import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.get('X-Request-Id') as string) || uuidv4();
  
  requestContext.run({ requestId }, () => {
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });
};

export const getRequestId = (): string => {
  return requestContext.getStore()?.requestId || 'system';
};
