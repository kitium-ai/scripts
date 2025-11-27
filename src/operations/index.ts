import { promises as fs } from 'fs';
import path from 'path';
import { findFiles, log, readJson } from '../utils/index.js';

export interface SmokeTarget {
  name: string;
  url: string;
  method?: string;
  expectedStatus?: number;
  timeoutMs?: number;
}

export interface SmokeResult {
  name: string;
  url: string;
  status: number;
  ok: boolean;
  error?: string;
}

export async function smokeServices(targets: SmokeTarget[]): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];

  for (const target of targets) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), target.timeoutMs ?? 5000);
    try {
      const response = await fetch(target.url, {
        method: target.method ?? 'GET',
        signal: controller.signal,
      });
      const ok = response.status === (target.expectedStatus ?? 200);
      results.push({ name: target.name, url: target.url, status: response.status, ok });
      if (ok) {
        log('success', `Smoke check passed for ${target.name} (${target.url}).`);
      } else {
        log('warn', `Smoke check failed for ${target.name}: status ${response.status}.`);
      }
    } catch (error) {
      results.push({
        name: target.name,
        url: target.url,
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      log('error', `Smoke check error for ${target.name}: ${results.at(-1)?.error}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  return results;
}

export interface RolloutGuardInput {
  errorBudgetRemaining: number;
  incidentsOpen?: string[];
  changeFreeze?: boolean;
  minimumApprovals?: number;
  approvalsCollected?: number;
}

export interface RolloutGuardResult {
  allow: boolean;
  reasons: string[];
}

export function rolloutGuard(input: RolloutGuardInput): RolloutGuardResult {
  const reasons: string[] = [];
  if (input.errorBudgetRemaining <= 0) {
    reasons.push('Error budget exhausted.');
  }
  if (input.changeFreeze) {
    reasons.push('Org-wide change freeze is active.');
  }
  if (input.incidentsOpen && input.incidentsOpen.length > 0) {
    reasons.push(`Open incidents detected: ${input.incidentsOpen.join(', ')}`);
  }
  if (
    input.minimumApprovals &&
    (input.approvalsCollected ?? 0) < input.minimumApprovals
  ) {
    reasons.push(
      `Insufficient rollout approvals (${input.approvalsCollected ?? 0}/${input.minimumApprovals}).`
    );
  }

  const allow = reasons.length === 0;
  if (allow) {
    log('success', 'Rollout guard checks passed.');
  } else {
    log('warn', `Rollout guard blocked release:\n- ${reasons.join('\n- ')}`);
  }
  return { allow, reasons };
}

export interface LogSchemaOptions {
  schemaDir?: string;
  requiredFields?: string[];
}

export interface LogSchemaReport {
  filesChecked: number;
  issues: Array<{ file: string; message: string }>;
}

export async function verifyLogSchemas(options: LogSchemaOptions = {}): Promise<LogSchemaReport> {
  const { schemaDir = path.join(process.cwd(), 'schemas', 'logging'), requiredFields = ['name', 'version'] } =
    options;
  if (!(await exists(schemaDir))) {
    log('warn', `Schema directory ${schemaDir} not found; skipping log schema verification.`);
    return { filesChecked: 0, issues: [] };
  }

  const schemaFiles = await findFiles(schemaDir, /\.schema\.json$/);
  const issues: Array<{ file: string; message: string }> = [];

  for (const file of schemaFiles) {
    try {
      const schema = await readJson<Record<string, unknown>>(file);
      for (const field of requiredFields) {
        if (!(field in schema)) {
          issues.push({ file, message: `Missing required field "${field}".` });
        }
      }
    } catch (error) {
      issues.push({
        file,
        message: `Failed to read schema: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  if (issues.length === 0) {
    log('success', `Verified ${schemaFiles.length} log schema file(s).`);
  } else {
    log('warn', `Log schema issues detected:\n- ${issues.map((i) => `${i.file}: ${i.message}`).join('\n- ')}`);
  }

  return { filesChecked: schemaFiles.length, issues };
}

async function exists(dir: string): Promise<boolean> {
  try {
    await fs.access(dir);
    return true;
  } catch {
    return false;
  }
}

export * from '../ops/env-bootstrap.js';
export * from '../ops/iac-validate.js';

