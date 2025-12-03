import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareReleaseNotes, verifyPublishState, syncVersionTags } from '../src/release/index';

// Mock utils and fs
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  findFiles: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
  },
}));

const { exec, findFiles } = await import('../src/utils/index.js');
const { promises: fs } = await import('fs');

describe('Release Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findFiles).mockClear();
    vi.mocked(fs.readFile).mockClear();
  });

  describe('prepareReleaseNotes', () => {
    beforeEach(() => {
      vi.mocked(findFiles).mockReset();
      vi.mocked(fs.readFile).mockReset();
      vi.mocked(fs.access).mockReset();
      vi.mocked(fs.access).mockResolvedValue(undefined);
    });
    it('should prepare release notes from changesets', async () => {
      vi.mocked(findFiles).mockResolvedValue([
        '/repo/.changeset/feature-change.md',
      ]);

      vi.mocked(fs.readFile).mockResolvedValue(`---
"@test/package": minor
---

Add new feature
` as unknown as Buffer);

      const notes = await prepareReleaseNotes();

      expect(notes.entries.length).toBeGreaterThan(0);
      expect(notes.markdown).toContain('Add new feature');
    });

    it('should group release notes by package', async () => {
      vi.mocked(findFiles).mockResolvedValue([
        '/repo/.changeset/change1.md',
      ]);

      vi.mocked(fs.readFile).mockResolvedValue(`---
"@test/package1": patch
"@test/package2": minor
---

Fix bugs and add features
` as unknown as Buffer);

      const notes = await prepareReleaseNotes({ groupBy: 'package' });

      expect(notes.entries[0].packages.length).toBeGreaterThan(0);
    });

    it('should handle empty changeset directory', async () => {
      vi.mocked(findFiles).mockResolvedValue([]);

      const notes = await prepareReleaseNotes();

      expect(notes.entries).toEqual([]);
      expect(notes.markdown).toBe('');
    });
  });

  describe('verifyPublishState', () => {
    it('should run pre-publish checks', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'All checks passed',
        stderr: '',
      });

      await verifyPublishState();
      
      expect(exec).toHaveBeenCalledWith('pnpm', ['lint'], expect.any(Object));
      expect(exec).toHaveBeenCalledWith('pnpm', ['test'], expect.any(Object));
      expect(exec).toHaveBeenCalledWith('pnpm', ['build'], expect.any(Object));
    });

    it('should fail on check failures', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 1,
        stdout: '',
        stderr: 'Lint errors found',
      });

      const result = await verifyPublishState();
      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    it('should support custom commands', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await verifyPublishState({ commands: ['pnpm custom:check'] });

      expect(exec).toHaveBeenCalledWith('pnpm', ['custom:check'], expect.any(Object));
    });
  });

  describe('syncVersionTags', () => {
    it('should verify version matches git tag', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        name: '@test/package',
        version: '1.0.0',
      }) as unknown as Buffer);

      vi.mocked(exec)
        .mockResolvedValueOnce({
          code: 0,
          stdout: '',
          stderr: '',
        })
        .mockResolvedValueOnce({
          code: 0,
          stdout: '1.0.0\n',
          stderr: '',
        });

      const result = await syncVersionTags({ packagePath: '/test/package.json' });
      expect(result).toBeDefined();

      expect(exec).toHaveBeenCalledWith('git', ['tag', '--list', '1.0.0'], { throwOnError: false });
      expect(exec).toHaveBeenCalledWith('npm', ['view', '@test/package', 'version'], { throwOnError: false });
    });

    it('should detect version mismatches', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        name: '@test/package',
        version: '1.0.0',
      }) as unknown as Buffer);

      vi.mocked(exec)
        .mockResolvedValueOnce({
          code: 0,
          stdout: '',
          stderr: '',
        })
        .mockResolvedValueOnce({
          code: 0,
          stdout: '2.0.0\n',
          stderr: '',
        });

      const result = await syncVersionTags({ packagePath: '/test/package.json' });

      expect(result).toBeDefined();
    });
  });
});
