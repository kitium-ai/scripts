import fs from 'fs-extra';
import path from 'node:path';
import { logger as consoleLogger } from '../utils/logger.js';

export const DEFAULT_REDACTION_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'sessionId',
];

export const DEFAULT_CONTEXT_KEYS = ['traceId', 'spanId', 'requestId', 'correlationId', 'userId'];

export interface LoggingBootstrapOptions {
  serviceName: string;
  targetDir?: string;
  schemaPath?: string;
  otlpEndpoint?: string;
  redactFields?: string[];
  environmentLevels?: Record<string, string>;
  includeExample?: boolean;
}

export interface StructuredLoggerContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface StructuredLoggerOptions {
  serviceName: string;
  environment?: string;
  level?: string;
  otlpEndpoint?: string;
  redactFields?: string[];
  context?: StructuredLoggerContext;
}

export interface StructuredLogger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  fatal?: (message: string, meta?: Record<string, unknown>) => void;
}

const DEFAULT_ENVIRONMENT_LEVELS: Record<string, string> = {
  development: 'debug',
  test: 'info',
  ci: 'info',
  staging: 'info',
  production: 'warn',
};

type KitiumLoggerFactory = (options: {
  serviceName: string;
  environment?: string;
  level?: string;
  otlpEndpoint?: string;
  redact?: string[];
  format?: 'json' | 'pretty';
  includeContext?: Record<string, unknown>;
}) => StructuredLogger & {
  child?: (bindings: Record<string, unknown>) => StructuredLogger;
  log?: (level: string, message: string, meta?: Record<string, unknown>) => void;
};

interface KitiumLoggerModule {
  createLogger?: KitiumLoggerFactory;
  default?: { createLogger?: KitiumLoggerFactory };
}

export async function bootstrapStructuredLogging(options: LoggingBootstrapOptions): Promise<string> {
  const targetDir = options.targetDir ?? process.cwd();
  const configDir = path.join(targetDir, '.kitium');
  const configPath = path.join(configDir, 'logging.config.json');
  const levels = { ...DEFAULT_ENVIRONMENT_LEVELS, ...options.environmentLevels };
  const redactFields = options.redactFields ?? DEFAULT_REDACTION_FIELDS;
  const contextKeys = DEFAULT_CONTEXT_KEYS;

  const config = {
    service: {
      name: options.serviceName,
      schemaPath: options.schemaPath ?? 'schemas/logging',
    },
    output: {
      format: 'json',
      otlp: options.otlpEndpoint
        ? {
            endpoint: options.otlpEndpoint,
            enabled: true,
          }
        : { enabled: false },
    },
    levels,
    redaction: {
      fields: redactFields,
      patterns: ['(?i)password', '(?i)secret', '(?i)authorization', '(?i)api[_-]?key'],
    },
    context: {
      keys: contextKeys,
      propagate: true,
    },
  };

  await fs.ensureDir(configDir);
  await fs.writeJson(configPath, config, { spaces: 2 });

  if (options.includeExample) {
    const examplePath = path.join(configDir, 'logging.example.md');
    const example = [
      '# Logging quickstart',
      '',
      '```typescript',
      "import { createStructuredLogger } from '@kitiumai/scripts/observability';",
      '',
      'const logger = await createStructuredLogger({',
      `  serviceName: '${options.serviceName}',`,
      "  environment: process.env.NODE_ENV ?? 'development',",
      '  context: { requestId: "req_123", traceId: "trace_abc" },',
      '});',
      '',
      'logger.info("Service started", { port: 3000 });',
      '```',
      '',
      'The logger forwards structured JSON logs through the Kitium logger, attaches trace metadata,',
      'and respects the redaction policy defined in `.kitium/logging.config.json`.',
    ].join('\n');
    await fs.writeFile(examplePath, example, 'utf8');
  }

  consoleLogger.success(`Created Kitium logging config at ${configPath}`);
  return configPath;
}

function bindContext<T extends StructuredLogger>(loggerInstance: T, context: StructuredLoggerContext) {
  const metadata = context ?? {};
    const emit = (level: keyof StructuredLogger, message: string, meta?: Record<string, unknown>) => {
      const payload = { ...metadata, ...meta };
      const levelMethod = loggerInstance[level];
      const genericLog:
        | ((level: string, message: string, meta?: Record<string, unknown>) => void)
        | undefined = (loggerInstance as {
        log?: (level: string, message: string, meta?: Record<string, unknown>) => void;
      }).log;

    if (typeof levelMethod === 'function') {
      levelMethod(message, payload);
      return;
    }

      if (typeof genericLog === 'function') {
        const normalizedLevel = level === 'fatal' ? 'fatal' : level;
        genericLog(normalizedLevel, message, payload);
        return;
      }

    if (typeof loggerInstance.info === 'function') {
      loggerInstance.info(message, payload);
      return;
    }

    consoleLogger.info(`${level.toUpperCase()}: ${message} ${payload ? JSON.stringify(payload) : ''}`);
  };

  return {
    debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
    info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
    fatal: loggerInstance.fatal
      ? (message: string, meta?: Record<string, unknown>) => emit('fatal', message, meta)
      : undefined,
  } satisfies StructuredLogger;
}

export async function createStructuredLogger(options: StructuredLoggerOptions): Promise<StructuredLogger> {
  const kitiumLoggerModule: KitiumLoggerModule = (await import('@kitiumai/logger')) as KitiumLoggerModule;
  const resolveFactory = (module: KitiumLoggerModule): KitiumLoggerModule['createLogger'] | undefined => {
    if (typeof module.createLogger === 'function') {
      return module.createLogger;
    }
    if (typeof module.default?.createLogger === 'function') {
      return module.default.createLogger;
    }
    return undefined;
  };

  const kitiumFactory = resolveFactory(kitiumLoggerModule);

  if (typeof kitiumFactory !== 'function') {
    throw new Error('Expected @kitiumai/logger to export createLogger(options)');
  }

  const baseLogger = kitiumFactory({
    serviceName: options.serviceName,
    environment: options.environment,
    level: options.level ?? DEFAULT_ENVIRONMENT_LEVELS[options.environment ?? ''] ?? 'info',
    otlpEndpoint: options.otlpEndpoint,
    redact: options.redactFields ?? DEFAULT_REDACTION_FIELDS,
    format: 'json',
    includeContext: options.context,
  });

  const contextual = typeof baseLogger.child === 'function' ? baseLogger.child(options.context ?? {}) : baseLogger;
  return bindContext(contextual, options.context ?? {});
}
