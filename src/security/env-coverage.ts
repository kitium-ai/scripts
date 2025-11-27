import { log } from '../utils/index.js';

function isProcessEnv(value: unknown): value is Record<string, string | undefined> {
  return typeof value === 'object' && value !== null;
}

export interface EnvCoverageResult {
  required: string[];
  provided: string[];
  missing: string[];
  extraneous: string[];
  empty: string[];
}

export interface EnvCoverageOptions {
  requiredEnv: string[];
  env?: Record<string, string | undefined>;
  allowEmpty?: boolean;
  verbose?: boolean;
}

export function diffEnvCoverage(options: EnvCoverageOptions): EnvCoverageResult {
  const { requiredEnv, allowEmpty = false, verbose = true } = options;
  const envVars: Record<string, string | undefined> = isProcessEnv(options.env) ? options.env : process.env;
  const provided = Object.keys(envVars);
  const missing = requiredEnv.filter((key) => !(key in envVars));
  const empty = allowEmpty
    ? []
    : requiredEnv.filter((key) => key in envVars && (envVars[key] ?? '') === '');
  const extraneous = provided.filter((key) => !requiredEnv.includes(key));

  const result: EnvCoverageResult = {
    required: [...requiredEnv],
    provided,
    missing,
    extraneous,
    empty,
  };

  if (verbose) {
    log('info', `Required env: ${requiredEnv.length}`);
    log('info', `Present env: ${provided.length}`);
    if (missing.length) {
      log('warn', `Missing env vars: ${missing.join(', ')}`);
    }
    if (empty.length) {
      log('warn', `Empty env vars: ${empty.join(', ')}`);
    }
    if (extraneous.length) {
      log('info', `Extraneous env vars detected: ${extraneous.length}`);
    }
  }

  return result;
}

export function ensureEnvCoverage(options: EnvCoverageOptions): EnvCoverageResult {
  const result = diffEnvCoverage(options);
  if (result.missing.length || result.empty.length) {
    const missing = result.missing.length ? `Missing: ${result.missing.join(', ')}` : '';
    const empty = result.empty.length ? `Empty: ${result.empty.join(', ')}` : '';
    const errorParts = [missing, empty].filter(Boolean).join(' | ');
    throw new Error(`Environment validation failed. ${errorParts}`);
  }
  return result;
}
