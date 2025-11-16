/**
 * Centralized logging utility
 * Provides consistent logging interface and can be extended to send logs
 * to external services (e.g., Sentry, LogRocket) in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogContext = Record<string, unknown>;

type LogPayload = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

type LogTransport = (payload: LogPayload) => void | Promise<void>;

const isDevelopment = import.meta.env.DEV;

const createBeaconTransport = (endpoint: string): LogTransport => {
  return (payload) => {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }
    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        /* swallow transport errors */
      });
    }
  };
};

class Logger {
  private transport: LogTransport | null = null;

  setTransport(transport: LogTransport | null): void {
    this.transport = transport;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;

    const payload: LogPayload = {
      level,
      message,
      timestamp,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

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
    } else if (level === 'error' || level === 'warn') {
      console.error(`${logPrefix} ${message}`, error || '', context || '');
    }

    if (this.transport && (level === 'error' || level === 'warn')) {
      try {
        this.transport(payload);
      } catch {
        // avoid cascading failures in the logger
      }
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

const logEndpoint = import.meta.env.VITE_LOG_ENDPOINT;
if (logEndpoint) {
  logger.setTransport(createBeaconTransport(logEndpoint));
}
