import winston from 'winston';
import 'winston-daily-rotate-file';
import { getRequestId } from '../api/middleware/requestId';
import { config } from '../config/env';

/**
 * Centralized logging module using Winston.
 * Supports request correlation via AsyncLocalStorage
 * and structured multi-transport logging (Console + Rotating File).
 */

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const requestId = getRequestId();
    return `${info.timestamp} [${requestId}] ${info.level}: ${info.message}${info.stack ? `\n${info.stack}` : ''}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: jsonFormat,
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: jsonFormat,
  }),
];

/**
 * Winston Logger instance with custom formatting and transports.
 * Automatically injects requestId from the current request context if available.
 */
export const Logger = winston.createLogger({
  level: config.LOG_LEVEL,
  levels: winston.config.npm.levels,
  transports,
});

/**
 * Log stream adapter for Morgan middleware integration.
 */
export const logStream = {
  write: (message: string) => Logger.info(message.trim()),
};
