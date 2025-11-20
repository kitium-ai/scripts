import { exec, log, measure } from '../utils/index.js';

/**
 * Lint configuration options
 */
export interface LintOptions {
  /** Files or patterns to lint */
  paths?: string[];
  /** Whether to auto-fix issues */
  fix?: boolean;
  /** File extensions to check */
  ext?: string[];
  /** Whether to show detailed output */
  verbose?: boolean;
  /** Additional linter flags */
  flags?: string[];
}

/**
 * Run ESLint
 * @param options Lint options
 */
export async function runEslint(options: LintOptions = {}): Promise<void> {
  const {
    paths = ['.'],
    fix = false,
    ext = ['.ts', '.tsx'],
    verbose = false,
    flags = [],
  } = options;

  const args = ['eslint', ...paths, '--ext', ext.join(',')];

  if (fix) {
    args.push('--fix');
  }

  if (verbose) {
    args.push('--format', 'detailed');
  }

  args.push(...flags);

  await measure('ESLint', async () => {
    await exec('npx', args, { throwOnError: !fix });
  });

  log('success', `Linting completed${fix ? ' and fixed' : ''}`);
}

/**
 * Check code formatting with Prettier
 */
export async function checkFormat(options: LintOptions = {}): Promise<void> {
  const { paths = ['src/**/*.ts'], flags = [] } = options;

  const args = ['prettier', '--check', ...paths, ...flags];

  await measure('Format check', async () => {
    await exec('npx', args, { throwOnError: false });
  });

  log('info', 'Format check completed');
}

/**
 * Fix code formatting with Prettier
 */
export async function fixFormat(options: LintOptions = {}): Promise<void> {
  const { paths = ['src/**/*.ts'], flags = [] } = options;

  const args = ['prettier', '--write', ...paths, ...flags];

  await measure('Format fix', async () => {
    await exec('npx', args);
  });

  log('success', 'Code formatting fixed');
}

/**
 * Run all linting checks
 */
export async function lintAll(fix = false): Promise<void> {
  log('info', 'Running all lint checks...');

  try {
    await runEslint({ fix });

    if (!fix) {
      await checkFormat();
    } else {
      await fixFormat();
    }

    log('success', 'All lint checks passed');
  } catch (error) {
    log('error', `Linting failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Watch mode for linting
 */
export async function watchLint(): Promise<void> {
  log('info', 'Starting lint watch mode...');
  await exec('npx', ['eslint', '.', '--ext', '.ts,.tsx', '--watch']);
}

/**
 * Generate lint report
 */
export async function generateLintReport(): Promise<void> {
  const args = [
    'eslint',
    '.',
    '--ext',
    '.ts,.tsx',
    '--format',
    'json',
    '--output-file',
    'lint-report.json',
  ];

  await measure('Lint report generation', async () => {
    await exec('npx', args, { throwOnError: false });
  });

  log('success', 'Lint report generated (lint-report.json)');
}
