import { exec, log, ExecResult, pathExists, getEnv } from '../utils/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Get current git branch
 */
export async function getCurrentBranch(): Promise<string> {
  const result = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    throwOnError: true,
    verbose: false,
  });
  return result.stdout.trim();
}

/**
 * Check if working directory is clean
 */
export async function isWorkingDirectoryClean(): Promise<boolean> {
  const result = await exec('git', ['status', '--porcelain'], {
    throwOnError: false,
    verbose: false,
  });
  return result.stdout.trim().length === 0;
}

/**
 * Get list of changed files
 */
export async function getChangedFiles(): Promise<string[]> {
  const result = await exec('git', ['diff', '--name-only'], {
    throwOnError: false,
    verbose: false,
  });
  return result.stdout
    .trim()
    .split('\n')
    .filter((file) => file.length > 0);
}

/**
 * Stage files for commit
 * @param files Files to stage
 */
export async function stageFiles(files: string[]): Promise<void> {
  if (files.length === 0) {
    log('warn', 'No files to stage');
    return;
  }

  await exec('git', ['add', ...files]);
  log('success', `Staged ${files.length} file(s)`);
}

/**
 * Create a commit
 * @param message Commit message
 * @param options Additional git commit options
 */
export async function commit(message: string, options: string[] = []): Promise<void> {
  if (!message.trim()) {
    throw new Error('Commit message cannot be empty');
  }

  await exec('git', ['commit', '-m', message, ...options]);
  log('success', `Committed: ${message}`);
}

/**
 * Get commit history
 * @param limit Number of commits to retrieve
 */
export async function getCommitHistory(limit = 10): Promise<string[]> {
  const result = await exec('git', ['log', `--oneline`, `-${limit}`], {
    throwOnError: false,
    verbose: false,
  });
  return result.stdout.trim().split('\n').filter((line) => line.length > 0);
}

/**
 * Push to remote
 * @param branch Branch name
 * @param remote Remote name (default: origin)
 */
export async function push(branch?: string, remote = 'origin'): Promise<void> {
  const branchName = branch || (await getCurrentBranch());
  await exec('git', ['push', '-u', remote, branchName]);
  log('success', `Pushed to ${remote}/${branchName}`);
}

/**
 * Pull from remote
 * @param branch Branch name
 * @param remote Remote name (default: origin)
 */
export async function pull(branch?: string, remote = 'origin'): Promise<void> {
  const branchName = branch || (await getCurrentBranch());
  await exec('git', ['pull', remote, branchName]);
  log('success', `Pulled from ${remote}/${branchName}`);
}

/**
 * Create a new branch
 * @param branchName Name of the new branch
 * @param startPoint Starting point (default: HEAD)
 */
export async function createBranch(branchName: string, startPoint = 'HEAD'): Promise<void> {
  await exec('git', ['checkout', '-b', branchName, startPoint]);
  log('success', `Created branch: ${branchName}`);
}

/**
 * Switch to a branch
 * @param branchName Branch to switch to
 */
export async function switchBranch(branchName: string): Promise<void> {
  await exec('git', ['checkout', branchName]);
  log('success', `Switched to branch: ${branchName}`);
}

/**
 * Get list of branches
 */
export async function listBranches(): Promise<string[]> {
  const result = await exec('git', ['branch', '-a'], {
    throwOnError: false,
    verbose: false,
  });
  return result.stdout
    .trim()
    .split('\n')
    .map((branch) => branch.trim())
    .filter((branch) => branch.length > 0);
}

/**
 * Get git status
 */
export async function getStatus(): Promise<ExecResult> {
  return exec('git', ['status', '--porcelain'], {
    throwOnError: false,
    verbose: false,
  });
}

/**
 * Get tag list
 */
export async function listTags(): Promise<string[]> {
  const result = await exec('git', ['tag', '-l'], {
    throwOnError: false,
    verbose: false,
  });
  return result.stdout.trim().split('\n').filter((tag) => tag.length > 0);
}

/**
 * Create a git tag
 * @param tagName Tag name
 * @param message Tag message (optional)
 */
export async function createTag(tagName: string, message?: string): Promise<void> {
  const args = ['tag'];

  if (message) {
    args.push('-a', tagName, '-m', message);
  } else {
    args.push(tagName);
  }

  await exec('git', args);
  log('success', `Created tag: ${tagName}`);
}

/**
 * Set NPM authentication token
 * Updates both local .npmrc and user-level .npmrc
 * @param token NPM token (defaults to NPM_TOKEN env var or hardcoded default)
 * @param options Options for token setup
 */
export async function setNpmToken(
  token?: string,
  options: { verify?: boolean } = {}
): Promise<void> {
  const { verify = true } = options;
  
  // Get token from parameter, env var, or default
  const DEFAULT_TOKEN = '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';
  const npmToken = token || getEnv('NPM_TOKEN', DEFAULT_TOKEN);

  if (!npmToken) {
    throw new Error('NPM_TOKEN is required');
  }

  const npmrcPath = path.join(process.cwd(), '.npmrc');
  const homeNpmrcPath = path.join(os.homedir(), '.npmrc');

  // Create local .npmrc file with token
  const npmrcContent = `//registry.npmjs.org/:_authToken=${npmToken}\n`;
  await fs.writeFile(npmrcPath, npmrcContent, 'utf-8');
  log('success', 'Created local .npmrc with authentication token');

  // Update user-level .npmrc (this is what npm actually uses)
  try {
    let homeNpmrc = '';
    if (await pathExists(homeNpmrcPath)) {
      homeNpmrc = await fs.readFile(homeNpmrcPath, 'utf-8');
    }

    // Remove any existing auth token line
    const lines = homeNpmrc
      .split('\n')
      .filter((line) => !line.includes('//registry.npmjs.org/:_authToken'));

    // Add the new token
    lines.push(`//registry.npmjs.org/:_authToken=${npmToken}`);

    await fs.writeFile(homeNpmrcPath, lines.join('\n') + '\n', 'utf-8');
    log('success', 'Updated user-level .npmrc with authentication token');
  } catch (error) {
    log('warn', `Could not update user-level .npmrc: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Verify authentication if requested
  if (verify) {
    try {
      const result = await exec('npm', ['whoami', '--registry', 'https://registry.npmjs.org'], {
        throwOnError: false,
        verbose: false,
      });
      if (result.code === 0) {
        log('success', `Authentication verified! Logged in as: ${result.stdout.trim()}`);
      } else {
        log('warn', 'Could not verify authentication. Please run: npm whoami');
      }
    } catch (error) {
      log('warn', 'Could not verify authentication. Please run: npm whoami');
    }
  }
}

/**
 * Add .npmrc configuration to current package directory
 * Copies .npmrc-package-template from monorepo root to current directory
 * @param force Whether to overwrite existing .npmrc
 */
export async function addNpmrc(force = false): Promise<void> {
  const currentDir = process.cwd();
  const npmrcPath = path.join(currentDir, '.npmrc');
  const packageJsonPath = path.join(currentDir, 'package.json');

  // Verify this is a package directory
  if (!(await pathExists(packageJsonPath))) {
    throw new Error('No package.json found in current directory');
  }

  // Check if .npmrc exists
  if ((await pathExists(npmrcPath)) && !force) {
    log('warn', '.npmrc already exists. Use force=true to overwrite.');
    return;
  }

  // Find monorepo root by looking for .npmrc-package-template
  let rootDir: string | null = null;
  let searchDir = currentDir;

  for (let i = 0; i < 20; i++) {
    const templatePath = path.join(searchDir, '.npmrc-package-template');
    if (await pathExists(templatePath)) {
      rootDir = searchDir;
      break;
    }

    const parent = path.dirname(searchDir);
    if (parent === searchDir) {
      break;
    }
    searchDir = parent;
  }

  if (!rootDir) {
    throw new Error('Could not find .npmrc-package-template in parent directories');
  }

  const templatePath = path.join(rootDir, '.npmrc-package-template');

  // Copy template
  try {
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    await fs.writeFile(npmrcPath, templateContent, 'utf-8');
    const relativePath = path.relative(rootDir, currentDir);
    log('success', `.npmrc configured for: ${relativePath}`);
  } catch (error) {
    throw new Error(`Could not copy .npmrc template: ${error instanceof Error ? error.message : String(error)}`);
  }
}
