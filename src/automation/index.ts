import os from 'os';
import { exec, log } from '../utils/index.js';

export interface BulkTaskOptions {
  command: string;
  targets: string[];
  concurrency?: number;
  stopOnError?: boolean;
}

export interface BulkTaskResult {
  target: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runBulkRepoTask(
  options: BulkTaskOptions
): Promise<BulkTaskResult[]> {
  const { command, targets, concurrency = os.cpus().length, stopOnError = false } = options;
  const queue = [...targets];
  const results: BulkTaskResult[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const target = queue.shift();
      if (!target) break;
      const [cmd, ...args] = command.split(' ');
      const result = await exec(cmd, args, { cwd: target, throwOnError: false });
      results.push({ target, exitCode: result.code, stdout: result.stdout, stderr: result.stderr });
      if (result.code !== 0) {
        log('error', `Command failed in ${target}: ${result.stderr || result.stdout}`);
        if (stopOnError) {
          queue.length = 0;
          break;
        }
      } else {
        log('success', `Command succeeded in ${target}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export interface EnvValidationOptions {
  requiredEnv?: string[];
  requiredCommands?: Array<{ cmd: string; args?: string[]; minVersion?: string }>;
}

export interface EnvValidationResult {
  missingEnv: string[];
  failedCommands: string[];
}

function compareSemver(a: string, b: string): number {
  const parse = (version: string) => version.replace(/[^\d.]/g, '').split('.').map(Number);
  const [a1 = 0, a2 = 0, a3 = 0] = parse(a);
  const [b1 = 0, b2 = 0, b3 = 0] = parse(b);
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

export async function validateEnv(
  options: EnvValidationOptions = {}
): Promise<EnvValidationResult> {
  const { requiredEnv = [], requiredCommands = [] } = options;
  const missingEnv: string[] = [];
  for (const name of requiredEnv) {
    if (!process.env[name]) {
      missingEnv.push(name);
    }
  }

  const failedCommands: string[] = [];
  for (const requirement of requiredCommands) {
    const result = await exec(requirement.cmd, requirement.args ?? ['--version'], {
      throwOnError: false,
    });
    if (result.code !== 0) {
      failedCommands.push(`${requirement.cmd} (not available)`);
      continue;
    }
    if (requirement.minVersion) {
      const actual = result.stdout.trim();
      if (compareSemver(actual, requirement.minVersion) < 0) {
        failedCommands.push(
          `${requirement.cmd} version ${actual} < required ${requirement.minVersion}`
        );
      }
    }
  }

  if (missingEnv.length === 0 && failedCommands.length === 0) {
    log('success', 'Environment validation passed.');
  } else {
    if (missingEnv.length > 0) {
      log('error', `Missing env vars: ${missingEnv.join(', ')}`);
    }
    if (failedCommands.length > 0) {
      log('error', `Command validation failed:\n- ${failedCommands.join('\n- ')}`);
    }
  }

  return { missingEnv, failedCommands };
}

export interface DriftDetectionOptions {
  paths: string[];
  includeUntracked?: boolean;
}

export interface DriftReport {
  dirtyFiles: string[];
}

export async function detectDrift(options: DriftDetectionOptions): Promise<DriftReport> {
  const { paths, includeUntracked = true } = options;
  const args = ['status', '--porcelain'];
  if (!includeUntracked) {
    args.push('--untracked-files=no');
  }
  args.push('--', ...paths);
  const status = await exec('git', args, { throwOnError: false });
  const dirtyFiles = status.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3));

  if (dirtyFiles.length === 0) {
    log('success', 'No drift detected for monitored paths.');
  } else {
    log('warn', `Drift detected:\n- ${dirtyFiles.join('\n- ')}`);
  }

  return { dirtyFiles };
}

