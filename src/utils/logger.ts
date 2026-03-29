/**
 * Logger Configuration - Winston-based logging
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'spectral-scraper' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
    // File output
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

export function getLogger(component: string): winston.Logger {
  return logger.child({ component });
}
