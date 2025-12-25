import { promises as fs } from 'node:fs';
import path from 'node:path';

import { exec, log } from '../utils/index.js';
import type { SecretScanFinding, SecretScanResult } from './index.js';

export type SecretScanner = 'gitleaks' | 'trufflehog';

export interface PrecommitSecretOptions {
  scanner?: SecretScanner;
  configPath?: string;
  cwd?: string;
  includeUntracked?: boolean;
  extraArgs?: string[];
}

export interface HookOptions extends PrecommitSecretOptions {
  hook?: 'pre-commit' | 'pre-push';
  hookDir?: string;
}

function parseJsonLines(output: string): SecretScanFinding[] {
  const findings: SecretScanFinding[] = [];
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      findings.push(JSON.parse(line) as SecretScanFinding);
    } catch {
      continue;
    }
  }

  return findings;
}

function buildGitleaksArguments(options: PrecommitSecretOptions): string[] {
  const args = ['detect', '--staged', '--no-banner', '--redact', '--report-format', 'json'];
  if (options.includeUntracked) {
    args.push('--unstaged');
  }
  if (options.configPath) {
    args.push('--config', options.configPath);
  }
  if (options.extraArgs?.length) {
    args.push(...options.extraArgs);
  }
  return args;
}

function buildTrufflehogArguments(options: PrecommitSecretOptions): string[] {
  const args = ['filesystem', '.', '--fail', '--json'];
  if (options.configPath) {
    args.push('--rules', options.configPath);
  }
  if (options.extraArgs?.length) {
    args.push(...options.extraArgs);
  }
  return args;
}

async function runScanner(
  scanner: SecretScanner,
  args: string[],
  cwd: string,
): Promise<SecretScanResult> {
  const bin = scanner === 'gitleaks' ? 'gitleaks' : 'trufflehog';
  let result = await exec(bin, args, { cwd, throwOnError: false });
  const missingBinary =
    result.code === 127 ||
    /not recognized|command not found|ENOENT|could not find/i.test(result.stderr);

  if (missingBinary) {
    const package_ = scanner === 'gitleaks' ? 'gitleaks@latest' : 'trufflehog@latest';
    result = await exec('npx', ['--yes', package_, ...args], { cwd, throwOnError: false });
  }

  const findings = parseJsonLines(result.stdout);
  if (findings.length === 0) {
    log('success', `${scanner} pre-commit scan clean.`);
  } else {
    log('warn', `${scanner} pre-commit scan found ${findings.length} potential secret(s).`);
  }

  return {
    scanner,
    findings,
    exitCode: result.code,
    rawOutput: result.stdout,
  };
}

export async function runPrecommitSecretScan(
  options: PrecommitSecretOptions = {},
): Promise<SecretScanResult> {
  const scanner: SecretScanner = options.scanner ?? 'gitleaks';
  const cwd = options.cwd ?? process.cwd();
  const args = scanner === 'gitleaks' ? buildGitleaksArguments(options) : buildTrufflehogArguments(options);
  const result = await runScanner(scanner, args, cwd);

  if (result.findings.length > 0) {
    throw new Error('Secret scan failed. Review findings before committing.');
  }

  return result;
}

export async function installSecretScanHook(options: HookOptions = {}): Promise<string> {
  const hook = options.hook ?? 'pre-commit';
  const scanner: SecretScanner = options.scanner ?? 'gitleaks';
  const cwd = options.cwd ?? process.cwd();
  const hookDir = options.hookDir ?? path.join(cwd, '.git', 'hooks');
  const hookPath = path.join(hookDir, hook);

  const args = scanner === 'gitleaks' ? buildGitleaksArguments(options) : buildTrufflehogArguments(options);
  const hookBody = `#!/usr/bin/env sh\n` +
    `echo "[kitium] running ${scanner} secret scan"\n` +
    `${scanner} ${args.join(' ')} 2>/dev/null || npx --yes ${scanner}@latest ${args.join(' ')}\n`;

  await fs.mkdir(hookDir, { recursive: true });
  await fs.writeFile(hookPath, hookBody, { mode: 0o755 });

  log('success', `Installed ${hook} hook for ${scanner} secret scanning at ${hookPath}`);
  return hookPath;
}
