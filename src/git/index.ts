import { exec, log, ExecResult } from '../utils/index.js';

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
