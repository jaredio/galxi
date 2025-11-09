/**
 * Centralized logging utility
 * Provides consistent logging interface and can be extended to send logs
 * to external services (e.g., Sentry, LogRocket) in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogContext = Record<string, unknown>;

const isDevelopment = import.meta.env.DEV;

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // In development, log everything to console
    if (isDevelopment) {
      switch (level) {
        case 'info':
          console.log(`${logPrefix} ${message}`, context || '');
          break;
        case 'warn':
          console.warn(`${logPrefix} ${message}`, context || '');
          break;
        case 'error':
          console.error(`${logPrefix} ${message}`, error || '', context || '');
          break;
        case 'debug':
          console.debug(`${logPrefix} ${message}`, context || '');
          break;
      }
    }

    // In production, only log errors and warnings
    if (!isDevelopment && (level === 'error' || level === 'warn')) {
      // TODO: Send to error tracking service (e.g., Sentry)
      // Example: Sentry.captureException(error, { extra: context });
      console.error(`${logPrefix} ${message}`, error || '', context || '');
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }
}

export const logger = new Logger();
