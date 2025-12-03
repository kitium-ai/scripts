import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTests, runTestsCoverage, watchTests } from '../src/test/index';

// Mock exec and utils
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  measure: vi.fn((label, fn) => fn()),
  findFiles: vi.fn(),
}));

const { exec } = await import('../src/utils/index.js');

describe('Test Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runTests', () => {
    it('should run tests with default options', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Tests passed',
        stderr: '',
      });

      await runTests();

      expect(exec).toHaveBeenCalledWith(
        'node',
        ['--test', 'dist/**/*.test.js']
      );
    });

    it('should include coverage flag when coverage is true', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Tests passed with coverage',
        stderr: '',
      });

      await runTests({ coverage: true });

      expect(exec).toHaveBeenCalledWith(
        'node',
        ['--test', '--coverage', 'dist/**/*.test.js']
      );
    });

    it('should include watch flag when watch is true', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Watching for changes',
        stderr: '',
      });

      await runTests({ watch: true });

      expect(exec).toHaveBeenCalledWith(
        'node',
        ['--test', '--watch', 'dist/**/*.test.js']
      );
    });

    it('should pass additional flags', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await runTests({ flags: ['--verbose', '--bail'] });

      expect(exec).toHaveBeenCalledWith(
        'node',
        ['--test', 'dist/**/*.test.js', '--verbose', '--bail']
      );
    });
  });

  describe('runTestsCoverage', () => {
    it('should run tests with coverage', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Coverage: 85%',
        stderr: '',
      });

      await runTestsCoverage();

      expect(exec).toHaveBeenCalledWith(
        'node',
        ['--test', '--coverage', 'dist/**/*.test.js']
      );
    });
  });

  describe('watchTests', () => {
    it('should run tests in watch mode', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Watching...',
        stderr: '',
      });

      await watchTests();

      expect(exec).toHaveBeenCalledWith(
        'node',
        ['--test', '--watch', 'dist/**/*.test.js']
      );
    });
  });
});
