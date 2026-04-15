import { v4 as uuidv4 } from 'uuid';
import { createNamespace, getNamespace } from 'cls-hooked';
import { Request, Response, NextFunction } from 'express';

const namespace = 'app-request';
const session = createNamespace(namespace);

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('X-Request-Id') || uuidv4();
  
  session.run(() => {
    session.set('requestId', requestId);
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });
};

export const getRequestId = (): string => {
  const loggerNamespace = getNamespace(namespace);
  return loggerNamespace?.get('requestId') || 'system';
};
