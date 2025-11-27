declare module '@kitiumai/logger' {
  export interface KitiumLogger {
    debug?: (message: string, meta?: Record<string, unknown>) => void;
    info?: (message: string, meta?: Record<string, unknown>) => void;
    warn?: (message: string, meta?: Record<string, unknown>) => void;
    error?: (message: string, meta?: Record<string, unknown>) => void;
    fatal?: (message: string, meta?: Record<string, unknown>) => void;
    child?: (bindings: Record<string, unknown>) => KitiumLogger;
    log?: (level: string, message: string, meta?: Record<string, unknown>) => void;
  }

  export interface CreateLoggerOptions {
    serviceName: string;
    environment?: string;
    level?: string;
    otlpEndpoint?: string;
    redact?: string[];
    format?: 'json' | 'pretty';
    includeContext?: Record<string, unknown>;
  }

  export function createLogger(options: CreateLoggerOptions): KitiumLogger;

  const loggerModule: {
    createLogger: typeof createLogger;
    default?: { createLogger: typeof createLogger };
  };

  export default loggerModule;
}
