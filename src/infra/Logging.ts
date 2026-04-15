/**
 * Centralized logging module using Winston.
 * Supports request correlation via CLS (Continuation Local Storage)
 * and structured multi-transport logging (Console + File).
 */
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

/**
 * Winston Logger instance with custom formatting and transports.
 * Automatically injects requestId from the current request context if available.
 */
export const Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: winston.config.npm.levels,
  format: logFormat,
  transports,
});

/**
 * Log stream adapter for Morgan middleware integration.
 */
export const logStream = {
  write: (message: string) => Logger.info(message.trim()),
};
