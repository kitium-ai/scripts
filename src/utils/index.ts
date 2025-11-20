import { spawn, SpawnOptions } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Options for executing a command
 */
export interface ExecOptions extends SpawnOptions {
  /** Whether to print output to console */
  verbose?: boolean;
  /** Whether to throw on non-zero exit code */
  throwOnError?: boolean;
}

/**
 * Result of command execution
 */
export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute a shell command and capture output
 * @param command Command to execute
 * @param args Arguments to pass to the command
 * @param options Execution options
 * @returns Result with exit code and output
 */
export async function exec(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { verbose = true, throwOnError = true, ...spawnOptions } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...spawnOptions,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
      if (verbose) {
        process.stdout.write(data);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      if (verbose) {
        process.stderr.write(data);
      }
    });

    child.on('close', (code: number) => {
      if (throwOnError && code !== 0) {
        reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
      } else {
        resolve({ code, stdout, stderr });
      }
    });

    child.on('error', (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Check if a file or directory exists
 * @param filePath Path to check
 * @returns True if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON file
 * @param filePath Path to JSON file
 * @returns Parsed JSON object
 */
export async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write a JSON file
 * @param filePath Path to write to
 * @param data Object to serialize
 * @param pretty Whether to pretty-print JSON
 */
export async function writeJson(
  filePath: string,
  data: unknown,
  pretty = true
): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Find files matching a pattern
 * @param dir Directory to search
 * @param pattern File pattern to match
 * @returns Array of matching file paths
 */
export async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip common non-source directories
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

/**
 * Get the root directory of the current project
 * @returns Root directory path
 */
export function getProjectRoot(): string {
  return process.cwd();
}

/**
 * Get a relative path from project root
 * @param filePath Absolute path
 * @returns Relative path from project root
 */
export function getRelativePath(filePath: string): string {
  return path.relative(getProjectRoot(), filePath);
}

/**
 * Log a message with prefix
 * @param level Log level (info, warn, error, success)
 * @param message Message to log
 */
export function log(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
  const prefix = {
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
    success: '[✓]',
  }[level];

  console.log(`${prefix} ${message}`);
}

/**
 * Get environment variable or throw
 * @param name Environment variable name
 * @param defaultValue Default value if not set
 * @returns Environment variable value
 */
export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || defaultValue || '';
}

/**
 * Measure execution time of an async function
 * @param label Label for the measurement
 * @param fn Async function to measure
 * @returns Function result
 */
export async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  log('info', `${label} completed in ${duration}ms`);
  return result;
}
