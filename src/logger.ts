/**
 * Logger Utility
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

export class WyrmLogger {
  private logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info';

  constructor(logLevel?: 'error' | 'warn' | 'info' | 'debug') {
    if (logLevel) this.logLevel = logLevel;
  }

  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  }

  warn(message: string): void {
    if (this.logLevel === 'error') return;
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  }

  info(message: string): void {
    if (this.logLevel === 'error' || this.logLevel === 'warn') return;
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }

  debug(message: string): void {
    if (this.logLevel !== 'debug') return;
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }
}
