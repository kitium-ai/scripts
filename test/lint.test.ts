import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEslint, checkFormat, fixFormat, lintAll } from '../src/lint/index';

// Mock exec and utils
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  measure: vi.fn((label, fn) => fn()),
}));

const { exec } = await import('../src/utils/index.js');

describe('Lint Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runEslint', () => {
    it('should run ESLint with default options', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'No errors found',
        stderr: '',
      });

      await runEslint();

      expect(exec).toHaveBeenCalledWith(
        'npx',
        ['eslint', '.', '--ext', '.ts,.tsx'],
        { throwOnError: true }
      );
    });

    it('should apply --fix flag when fix is true', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Fixed 5 errors',
        stderr: '',
      });

      await runEslint({ fix: true });

      expect(exec).toHaveBeenCalledWith(
        'npx',
        ['eslint', '.', '--ext', '.ts,.tsx', '--fix'],
        { throwOnError: false }
      );
    });

    it('should use custom paths when provided', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await runEslint({ paths: ['src', 'test'] });

      expect(exec).toHaveBeenCalledWith(
        'npx',
        ['eslint', 'src', 'test', '--ext', '.ts,.tsx'],
        { throwOnError: true }
      );
    });

    it('should include verbose flag when verbose is true', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await runEslint({ verbose: true });

      expect(exec).toHaveBeenCalledWith(
        'npx',
        ['eslint', '.', '--ext', '.ts,.tsx', '--format', 'detailed'],
        { throwOnError: true }
      );
    });
  });

  describe('checkFormat', () => {
    it('should check formatting with Prettier', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'All files formatted correctly',
        stderr: '',
      });

      await checkFormat();

      expect(exec).toHaveBeenCalledWith(
        'npx',
        ['prettier', '--check', 'src/**/*.ts'],
        { throwOnError: false }
      );
    });
  });

  describe('fixFormat', () => {
    it('should fix formatting with Prettier', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Formatted 3 files',
        stderr: '',
      });

      await fixFormat();

      expect(exec).toHaveBeenCalledWith(
        'npx',
        ['prettier', '--write', 'src/**/*.ts']
      );
    });
  });

  describe('lintAll', () => {
    it('should run all linting checks without fixing', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await lintAll(false);

      expect(exec).toHaveBeenCalledTimes(2); // ESLint + Prettier
    });

    it('should run all linting checks with fixing', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await lintAll(true);

      expect(exec).toHaveBeenCalledTimes(2); // ESLint + Prettier
    });
  });
});
