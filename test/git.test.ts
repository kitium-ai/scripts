import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentBranch, isWorkingDirectoryClean, getChangedFiles, stageFiles } from '../src/git/index';

// Mock exec function
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  pathExists: vi.fn(),
  getEnv: vi.fn((name, defaultVal) => defaultVal || ''),
}));

const { exec } = await import('../src/utils/index.js');

describe('Git Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'main\n',
        stderr: '',
      });

      const branch = await getCurrentBranch();
      expect(branch).toBe('main');
      expect(exec).toHaveBeenCalledWith('git', ['rev-parse', '--abbrev-ref', 'HEAD'], expect.any(Object));
    });

    it('should handle feature branch names', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'feature/new-feature\n',
        stderr: '',
      });

      const branch = await getCurrentBranch();
      expect(branch).toBe('feature/new-feature');
    });
  });

  describe('isWorkingDirectoryClean', () => {
    it('should return true for clean working directory', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      const isClean = await isWorkingDirectoryClean();
      expect(isClean).toBe(true);
      expect(exec).toHaveBeenCalledWith('git', ['status', '--porcelain'], expect.any(Object));
    });

    it('should return false for dirty working directory', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'M file.ts\n',
        stderr: '',
      });

      const isClean = await isWorkingDirectoryClean();
      expect(isClean).toBe(false);
    });
  });

  describe('getChangedFiles', () => {
    it('should return list of changed files', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'src/file1.ts\nsrc/file2.ts\n',
        stderr: '',
      });

      const files = await getChangedFiles();
      expect(files).toEqual(['src/file1.ts', 'src/file2.ts']);
    });

    it('should return empty array when no files changed', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      const files = await getChangedFiles();
      expect(files).toEqual([]);
    });

    it('should filter out empty strings', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'src/file1.ts\n\n\nsrc/file2.ts\n',
        stderr: '',
      });

      const files = await getChangedFiles();
      expect(files).toEqual(['src/file1.ts', 'src/file2.ts']);
    });
  });

  describe('stageFiles', () => {
    it('should stage files for commit', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await stageFiles(['file1.ts', 'file2.ts']);
      expect(exec).toHaveBeenCalledWith('git', ['add', 'file1.ts', 'file2.ts']);
    });

    it('should log warning when no files to stage', async () => {
      const { log } = await import('../src/utils/index.js');
      await stageFiles([]);
      expect(log).toHaveBeenCalledWith('warn', 'No files to stage');
      expect(exec).not.toHaveBeenCalled();
    });
  });
});
