import winston from 'winston';
import { getNamespace } from 'cls-hooked';

const namespace = 'app-request';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const loggerNamespace = getNamespace(namespace);
      const requestId = loggerNamespace?.get('requestId') || 'system';
      return `${info.timestamp} [${requestId}] ${info.level}: ${info.message}`;
    }
  )
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/all.log' }),
];

export const Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: winston.config.npm.levels,
  format: logFormat,
  transports,
});

// Middleware for morgan to use winston
export const logStream = {
  write: (message: string) => Logger.info(message.trim()),
};
