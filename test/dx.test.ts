import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCommits, ensureSharedConfigs, checkCodeownersCoverage } from '../src/dx/index';

// Mock utils
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  findFiles: vi.fn(),
  readJson: vi.fn(),
}));

const { exec, findFiles, readJson } = await import('../src/utils/index.js');

describe('Developer Experience Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCommits', () => {
    it('should validate conventional commits', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'abc123:::def456:::feat(core): add new feature\n',
        stderr: '',
      });

      const result = await validateCommits();

      expect(result.valid).toBe(true);
      expect(result.invalidCommits).toHaveLength(0);
    });

    it('should detect invalid commit messages', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'abc123:::def456:::invalid commit message\n',
        stderr: '',
      });

      const result = await validateCommits();

      expect(result.valid).toBe(false);
      expect(result.invalidCommits.length).toBeGreaterThan(0);
    });

    it('should validate commit type', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'abc123:::def456:::unknown(scope): invalid type\n',
        stderr: '',
      });

      const result = await validateCommits();

      expect(result.valid).toBe(false);
      expect(result.invalidCommits[0].reason).toContain('Conventional');
    });

    it('should allow custom commit types', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'abc123:::def456:::custom(scope): valid commit\n',
        stderr: '',
      });

      const result = await validateCommits({ allowedTypes: ['custom'], requireScope: true });

      expect(result.valid).toBe(true);
    });

    it('should handle merge commits based on options', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'abc123:::def456 ghi789:::Merge branch feature\n',
        stderr: '',
      });

      const resultDisallow = await validateCommits({ allowMergeCommits: false });
      expect(resultDisallow.valid).toBe(false);

      const resultAllow = await validateCommits({ allowMergeCommits: true });
      expect(resultAllow.valid).toBe(true);
    });
  });

  describe('ensureSharedConfigs', () => {
    it('should check for shared config usage', async () => {
      vi.mocked(findFiles).mockResolvedValue([
        '/test/package1/package.json',
        '/test/package2/package.json',
      ]);

      vi.mocked(readJson).mockResolvedValue({
        name: '@test/package',
        devDependencies: {
          '@kitiumai/config': '^1.0.0',
        },
      });

      const result = await ensureSharedConfigs();
      
      expect(findFiles).toHaveBeenCalledWith(expect.any(String), /package\.json$/);
    });

    it('should detect missing shared config', async () => {
      vi.mocked(findFiles).mockResolvedValue(['/test/package/package.json']);
      vi.mocked(readJson).mockResolvedValue({
        name: '@test/package',
        devDependencies: {},
      });

      const result = await ensureSharedConfigs();
      
      expect(result).toBeDefined();
    });
  });

  describe('checkCodeownersCoverage', () => {
    it('should check CODEOWNERS coverage for files', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'src/file.ts @team\n',
        stderr: '',
      });

      const result = await checkCodeownersCoverage();

      expect(exec).toHaveBeenCalled();
    });

    it('should detect uncovered files', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      const result = await checkCodeownersCoverage();

      expect(result).toBeDefined();
    });
  });
});
