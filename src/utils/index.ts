import { spawn, SpawnOptions } from 'node:child_process';

// Import file system utilities from @kitiumai/utils-ts
export {
  findFiles,
  getProjectRoot,
  getRelativePath,
  pathExists,
  readJson,
  writeJson,
} from '@kitiumai/utils-ts/runtime/node';

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
