import { promises as fs } from 'fs';
import path from 'path';
import { exec, findFiles, log } from '../utils/index.js';
export * from './flag-lint.js';
export * from './canary-check.js';

export interface ReleaseNotesOptions {
  changesetDir?: string;
  includeSummaries?: boolean;
  groupBy?: 'package' | 'type';
}

export interface ReleaseNoteEntry {
  packages: string[];
  type: string;
  summary: string;
}

export interface ReleaseNotes {
  entries: ReleaseNoteEntry[];
  markdown: string;
}

function parseChangesetFile(content: string): ReleaseNoteEntry | null {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontMatter = match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const body = match[2].trim();
  const packages: string[] = [];
  let type = 'patch';
  for (const line of frontMatter) {
    const [pkg, bump] = line.replace(/"/g, '').split(':').map((part) => part.trim());
    if (pkg && bump) {
      packages.push(pkg);
      type = bump;
    }
  }
  return { packages, type, summary: body };
}

export async function prepareReleaseNotes(
  options: ReleaseNotesOptions = {}
): Promise<ReleaseNotes> {
  const { changesetDir = path.join(process.cwd(), '.changeset'), groupBy = 'package' } = options;
  const entries: ReleaseNoteEntry[] = [];
  if (!changesetDir || !(await exists(changesetDir))) {
    log('warn', 'No changesets found to prepare release notes.');
    return { entries, markdown: '' };
  }

  const files = await findFiles(changesetDir, /\.md$/);
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    const entry = parseChangesetFile(raw);
    if (entry) {
      entries.push(entry);
    }
  }

  const groups = new Map<string, ReleaseNoteEntry[]>();
  for (const entry of entries) {
    const keys = groupBy === 'type' ? [entry.type] : entry.packages;
    for (const key of keys) {
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }
  }

  const markdownSections: string[] = [];
  for (const [group, groupEntries] of groups.entries()) {
    markdownSections.push(`### ${group}`);
    for (const entry of groupEntries) {
      markdownSections.push(`- ${entry.summary || '(no summary provided)'}`);
    }
    markdownSections.push('');
  }

  const markdown = markdownSections.join('\n').trim();

  log('info', `Prepared release notes for ${entries.length} changeset(s).`);

  return { entries, markdown };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export interface PublishVerificationOptions {
  commands?: string[];
  cwd?: string;
  bailOnFailure?: boolean;
}

export interface PublishVerificationResult {
  passed: boolean;
  failures: string[];
}

export async function verifyPublishState(
  options: PublishVerificationOptions = {}
): Promise<PublishVerificationResult> {
  const {
    commands = ['pnpm lint', 'pnpm test', 'pnpm build'],
    cwd = process.cwd(),
    bailOnFailure = true,
  } = options;
  const failures: string[] = [];

  for (const command of commands) {
    const [cmd, ...args] = command.split(' ');
    const result = await exec(cmd, args, { cwd, throwOnError: false });
    if (result.code !== 0) {
      failures.push(`${command} (exit ${result.code})`);
      log('error', `Pre-publish check failed: ${command}`);
      if (bailOnFailure) {
        break;
      }
    } else {
      log('success', `Pre-publish check passed: ${command}`);
    }
  }

  return { passed: failures.length === 0, failures };
}

export interface VersionSyncOptions {
  packagePath?: string;
  tagPrefix?: string;
  registry?: string;
}

export interface VersionSyncResult {
  packageVersion: string;
  npmVersion?: string;
  gitTagExists: boolean;
  inSync: boolean;
}

export async function syncVersionTags(
  options: VersionSyncOptions = {}
): Promise<VersionSyncResult> {
  const { packagePath = path.join(process.cwd(), 'package.json'), tagPrefix = '', registry } = options;
  const pkg = JSON.parse(await fs.readFile(packagePath, 'utf-8')) as { name: string; version: string };
  const tagName = `${tagPrefix}${pkg.version}`;
  const gitResult = await exec('git', ['tag', '--list', tagName], { throwOnError: false });
  const gitTagExists = gitResult.stdout.includes(tagName);

  let npmVersion: string | undefined;
  if (pkg.name) {
    const npmArgs = ['view', pkg.name, 'version'];
    if (registry) {
      npmArgs.push('--registry', registry);
    }
    const npmResult = await exec('npm', npmArgs, { throwOnError: false });
    if (npmResult.code === 0) {
      npmVersion = npmResult.stdout.trim();
    }
  }

  const inSync = gitTagExists && npmVersion === pkg.version;

  if (inSync) {
    log('success', `${pkg.name} version ${pkg.version} is synced between git and npm.`);
  } else {
    log(
      'warn',
      `Version sync mismatch: git tag (${gitTagExists ? 'present' : 'missing'}), npm version (${
        npmVersion ?? 'unknown'
      }), package.json (${pkg.version}).`
    );
  }

  return { packageVersion: pkg.version, npmVersion, gitTagExists, inSync };
}

