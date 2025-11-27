import { log } from '../utils/index.js';

export interface EnvCoverageResult {
  required: string[];
  provided: string[];
  missing: string[];
  extraneous: string[];
  empty: string[];
}

export interface EnvCoverageOptions {
  requiredEnv: string[];
  env?: NodeJS.ProcessEnv;
  allowEmpty?: boolean;
  verbose?: boolean;
}

export function diffEnvCoverage(options: EnvCoverageOptions): EnvCoverageResult {
  const { requiredEnv, env = process.env, allowEmpty = false, verbose = true } = options;
  const provided = Object.keys(env);
  const missing = requiredEnv.filter((key) => !(key in env));
  const empty = allowEmpty
    ? []
    : requiredEnv.filter((key) => key in env && (env[key] ?? '') === '');
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
