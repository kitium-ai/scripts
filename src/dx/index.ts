import { accessSync, promises as fs } from 'node:fs';
import path from 'node:path';

import { exec, findFiles, log, readJson } from '../utils/index.js';

export interface CommitValidationOptions {
  from?: string;
  to?: string;
  allowMergeCommits?: boolean;
  allowedTypes?: string[];
  requireScope?: boolean;
  maxCommits?: number;
}

export interface CommitValidationResult {
  valid: boolean;
  invalidCommits: Array<{ hash: string; message: string; reason: string }>;
}

const DEFAULT_TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
];


function validateCommit(
  commit: { hash: string; message: string; parents: string },
  allowMergeCommits: boolean,
  conventionalRegex: RegExp
): { hash: string; message: string; reason: string } | null {
  const isMerge = commit.parents?.split(' ').length > 1;
  if (isMerge && allowMergeCommits) {
    return null;
  }
  if (isMerge && !allowMergeCommits) {
    return {
      hash: commit.hash,
      message: commit.message,
      reason: 'Merge commits are not allowed in the range.',
    };
  }
  if (!conventionalRegex.test(commit.message)) {
    return {
      hash: commit.hash,
      message: commit.message,
      reason: 'Commit message does not follow Conventional Commits.',
    };
  }
  return null;
}

export async function validateCommits(
  options: CommitValidationOptions = {}
): Promise<CommitValidationResult> {
  const {
    from = 'origin/main',
    to = 'HEAD',
    allowMergeCommits = false,
    allowedTypes = DEFAULT_TYPES,
    requireScope = true,
    maxCommits = 50,
  } = options;

  const range = `${from}..${to}`;
  const format = '%H:::%P:::%s';
  const logResult = await exec('git', ['log', range, `--max-count=${maxCommits}`, `--pretty=${format}`], {
    throwOnError: false,
  });

  if (!logResult.stdout.trim()) {
    return { valid: true, invalidCommits: [] };
  }

  const commits = logResult.stdout
    .trim()
    .split('\n')
    .map((line) => {
      const [hash, parents, message] = line.split(':::');
      return { hash, parents, message };
    });

  const invalidCommits: Array<{ hash: string; message: string; reason: string }> = [];
  const typePattern = `(${allowedTypes.join('|')})`;
  const scopePattern = requireScope ? '\\([a-z0-9-/]+\\)' : '(\\([a-z0-9-/]+\\))?';
  const conventionalRegex = new RegExp(`^${typePattern}${scopePattern}!:?\\s.+|^${typePattern}${scopePattern}:\\s.+`);

  for (const commit of commits) {
    const error = validateCommit(commit, allowMergeCommits, conventionalRegex);
    if (error) {
      invalidCommits.push(error);
    }
  }

  if (invalidCommits.length === 0) {
    log('success', 'All commits follow Conventional Commit rules.');
  } else {
    log('error', `Found ${invalidCommits.length} commit(s) violating commit policy.`);
  }

  return { valid: invalidCommits.length === 0, invalidCommits };
}

export interface SharedConfigResult {
  packageDir: string;
  issues: string[];
}

export interface SharedConfigOptions {
  root?: string;
  requireTsconfig?: boolean;
  requireEslint?: boolean;
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}


async function checkTsConfig(packageDir: string): Promise<string[]> {
  const issues: string[] = [];
  const tsconfigPath = path.join(packageDir, 'tsconfig.json');
  const tsconfigContent = await readFileIfExists(tsconfigPath);
  if (!tsconfigContent) {
    issues.push('tsconfig.json not found.');
  } else {
    try {
      const tsconfig = JSON.parse(tsconfigContent) as { extends?: string };
      if (!tsconfig.extends?.includes('@kitiumai/config/tsconfig.base.json')) {
        issues.push('tsconfig.json does not extend @kitiumai/config/tsconfig.base.json.');
      }
    } catch {
      issues.push('tsconfig.json could not be parsed.');
    }
  }
  return issues;
}

async function checkEslint(packageDir: string): Promise<string[]> {
  const issues: string[] = [];
  const eslintPath = ['eslint.config.js', 'eslint.config.cjs', 'eslint.config.mjs']
    .map((file) => path.join(packageDir, file))
    .find((file) => existsSync(file));

  if (!eslintPath) {
    issues.push('ESLint flat config not found.');
  } else {
    const eslintContent = await readFileIfExists(eslintPath);
    if (eslintContent && !eslintContent.includes('@kitiumai/config')) {
      issues.push('ESLint config does not reference @kitiumai/config.');
    }
  }
  return issues;
}

async function validatePackageConfig(
  packageFile: string,
  requireTsconfig: boolean,
  requireEslint: boolean
): Promise<SharedConfigResult | null> {
  const packageDir = path.dirname(packageFile);
  if (packageDir.includes('node_modules')) { return null; }

  try {
    const package_ = await readJson<{
      name?: string;
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    }>(packageFile);

    if (!package_.name || package_.name.startsWith('@kitiumai/scripts')) {
      return null;
    }

    const issues: string[] = [];
    const deps = { ...package_.dependencies, ...package_.devDependencies };
    if (!deps['@kitiumai/config']) {
      issues.push('Missing devDependency on @kitiumai/config.');
    }

    if (requireTsconfig) {
      issues.push(...await checkTsConfig(packageDir));
    }

    if (requireEslint) {
      issues.push(...await checkEslint(packageDir));
    }

    if (issues.length > 0) {
      return { packageDir, issues };
    }
  } catch {
    return null;
  }
  return null;
}


export async function ensureSharedConfigs(
  options: SharedConfigOptions = {}
): Promise<SharedConfigResult[]> {
  const { root = process.cwd(), requireTsconfig = true, requireEslint = true } = options;
  const packageFiles = await findFiles(root, /package\.json$/);
  const results: SharedConfigResult[] = [];

  for (const packageFile of packageFiles) {
    const result = await validatePackageConfig(packageFile, requireTsconfig, requireEslint);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    log('success', 'All packages appear to consume the shared config presets.');
  } else {
    log('warn', `Found ${results.length} package(s) missing shared config requirements.`);
  }

  return results;
}


export interface CodeownersRule {
  pattern: string;
  owners: string[];
}

export interface CodeownersReport {
  missingOwners: string[];
  rulesEvaluated: number;
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

export function existsSync(file: string): boolean {
  try {
    accessSync(file);
    return true;
  } catch {
    return false;
  }
}

export async function checkCodeownersCoverage(files?: string[]): Promise<CodeownersReport> {
  const root = process.cwd();
  const codeownersPath = path.join(root, '.github', 'CODEOWNERS');
  if (!existsSync(codeownersPath)) {
    log('warn', 'CODEOWNERS file not found; skipping coverage check.');
    return { missingOwners: [], rulesEvaluated: 0 };
  }

  const content = await fs.readFile(codeownersPath, 'utf-8');
  const rules: CodeownersRule[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) { continue; }
    const [pattern, ...owners] = trimmed.split(/\s+/);
    if (pattern && owners.length > 0) {
      rules.push({ pattern, owners });
    }
  }

  let changedFiles = files;
  if (!changedFiles || changedFiles.length === 0) {
    const gitResult = await exec('git', ['status', '--porcelain'], { throwOnError: false });
    changedFiles = gitResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  }

  const missingOwners: string[] = [];
  for (const file of changedFiles ?? []) {
    const matched = rules.find((rule) => globToRegex(rule.pattern).test(file));
    if (!matched) {
      missingOwners.push(file);
    }
  }

  if (missingOwners.length === 0) {
    log('success', 'All changed files have CODEOWNERS coverage.');
  } else {
    log('warn', `CODEOWNERS missing for:\n- ${missingOwners.join('\n- ')}`);
  }

  return { missingOwners, rulesEvaluated: rules.length };
}
