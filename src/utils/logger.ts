export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  channel?: string;
  customerId?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private correlationId?: string;

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      ...metadata
    };

    // Structured JSON logging for CloudWatch
    console.log(JSON.stringify(entry));
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      this.log(LogLevel.DEBUG, message, metadata);
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
}

export const logger = new Logger();
