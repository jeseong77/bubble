enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

interface LogTransport {
  send(entry: LogEntry): void;
}

class ConsoleTransport implements LogTransport {
  send(entry: LogEntry) {
    if (!__DEV__) return; // Don't log in production

    const emoji = {
      [LogLevel.DEBUG]: "🔍",
      [LogLevel.INFO]: "ℹ️",
      [LogLevel.WARN]: "⚠️",
      [LogLevel.ERROR]: "❌",
    }[entry.level];

    const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0];
    const contextStr = entry.context ? JSON.stringify(entry.context) : "";
    const errorStr = entry.error ? `\n${entry.error.stack || entry.error.message}` : "";

    console.log(
      `${emoji} [${timestamp}] ${entry.message}`,
      contextStr,
      errorStr
    );
  }
}

class SentryTransport implements LogTransport {
  send(entry: LogEntry) {
    // TODO: Integrate Sentry in the future
    // For now, only log errors in production
    if (entry.level >= LogLevel.ERROR && !__DEV__) {
      // Future: Sentry.captureException(entry.error || new Error(entry.message));
      console.error("[Sentry]", entry.message, entry.context);
    }
  }
}

class Logger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO) {
    this.minLevel = minLevel;
    this.transports = [new ConsoleTransport(), new SentryTransport()];
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    const errorObj = error instanceof Error ? error : undefined;
    this.log(LogLevel.ERROR, message, context, errorObj);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    this.transports.forEach((transport) => transport.send(entry));
  }

  // Create child logger with persistent context
  child(persistentContext: Record<string, any>): Logger {
    const childLogger = new Logger(this.minLevel);
    childLogger.transports = this.transports;

    // Override log method to include persistent context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, message, context?, error?) => {
      const mergedContext = { ...persistentContext, ...context };
      originalLog(level, message, mergedContext, error);
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export { Logger, LogLevel };
