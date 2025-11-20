import { exec, log, measure, findFiles } from '../utils/index.js';

/**
 * Test execution options
 */
export interface TestOptions {
  /** Test file pattern */
  pattern?: string | RegExp;
  /** Whether to run with coverage */
  coverage?: boolean;
  /** Whether to run in watch mode */
  watch?: boolean;
  /** Test timeout in milliseconds */
  timeout?: number;
  /** Whether to run sequentially */
  sequential?: boolean;
  /** Additional test flags */
  flags?: string[];
}

/**
 * Run unit tests
 * @param options Test options
 */
export async function runTests(options: TestOptions = {}): Promise<void> {
  const { coverage = false, watch = false, flags = [] } = options;

  const args = ['--test'];

  if (coverage) {
    args.push('--coverage');
  }

  if (watch) {
    args.push('--watch');
  }

  args.push('dist/**/*.test.js');
  args.push(...flags);

  await measure('Tests', async () => {
    await exec('node', args);
  });

  log('success', 'Tests completed');
}

/**
 * Run tests with coverage report
 */
export async function runTestsCoverage(): Promise<void> {
  log('info', 'Running tests with coverage...');

  await measure('Coverage analysis', async () => {
    await exec('node', ['--test', '--coverage', 'dist/**/*.test.js']);
  });

  log('success', 'Coverage report generated');
}

/**
 * Run tests in watch mode
 */
export async function watchTests(): Promise<void> {
  log('info', 'Starting test watch mode...');
  await exec('node', ['--test', '--watch', 'dist/**/*.test.js']);
}

/**
 * Find all test files
 */
export async function findTestFiles(pattern: RegExp = /\.test\.ts$/): Promise<string[]> {
  return findFiles(process.cwd(), pattern);
}

/**
 * Validate test setup
 */
export async function validateTests(): Promise<boolean> {
  try {
    const testFiles = await findTestFiles();

    if (testFiles.length === 0) {
      log('warn', 'No test files found');
      return false;
    }

    log('info', `Found ${testFiles.length} test file(s)`);
    return true;
  } catch (error) {
    log('error', `Failed to validate tests: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
