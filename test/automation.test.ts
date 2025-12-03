import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBulkRepoTask, validateEnv, detectDrift } from '../src/automation/index';

// Mock utils
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
}));

const { exec } = await import('../src/utils/index.js');

describe('Automation Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runBulkRepoTask', () => {
    it('should run command across multiple targets', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'Success',
        stderr: '',
      });

      const results = await runBulkRepoTask({
        command: 'npm test',
        targets: ['/repo1', '/repo2'],
      });

      expect(results).toHaveLength(2);
      expect(results[0].exitCode).toBe(0);
      expect(results[1].exitCode).toBe(0);
    });

    it('should respect concurrency limits', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      vi.mocked(exec).mockImplementation(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrent--;
        return { code: 0, stdout: '', stderr: '' };
      });

      await runBulkRepoTask({
        command: 'npm test',
        targets: Array(10).fill('/repo'),
        concurrency: 2,
      });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should continue on error by default', async () => {
      vi.mocked(exec)
        .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'Error' })
        .mockResolvedValueOnce({ code: 0, stdout: 'Success', stderr: '' });

      const results = await runBulkRepoTask({
        command: 'npm test',
        targets: ['/repo1', '/repo2'],
      });

      expect(results).toHaveLength(2);
      expect(results[0].exitCode).toBe(1);
      expect(results[1].exitCode).toBe(0);
    });

    it('should stop on error when configured', async () => {
      vi.mocked(exec)
        .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'Error' })
        .mockResolvedValueOnce({ code: 0, stdout: 'Success', stderr: '' });

      const results = await runBulkRepoTask({
        command: 'npm test',
        targets: ['/repo1', '/repo2'],
        stopOnError: true,
        concurrency: 1,
      });

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(1);
    });
  });

  describe('validateEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate required environment variables', async () => {
      process.env.API_KEY = 'test-key';
      process.env.DATABASE_URL = 'postgres://localhost';

      const result = await validateEnv({ requiredEnv: ['API_KEY', 'DATABASE_URL'] });
      expect(result.missingEnv).toHaveLength(0);
      expect(result.failedCommands).toHaveLength(0);
    });

    it('should throw on missing environment variables', async () => {
      delete process.env.API_KEY;

      const result = await validateEnv({ requiredEnv: ['API_KEY'] });
      expect(result.missingEnv).toContain('API_KEY');
    });

    it('should validate required commands', async () => {
      vi.mocked(exec).mockClear();
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'v10.0.0',
        stderr: '',
      });

      const result = await validateEnv({
        requiredCommands: [{ cmd: 'pnpm' }],
      });

      expect(exec).toHaveBeenCalledWith('pnpm', ['--version'], { throwOnError: false });
      expect(result.failedCommands).toHaveLength(0);
    });

    it('should fail on version mismatch', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'v8.0.0',
        stderr: '',
      });

      const result = await validateEnv({
        requiredCommands: [{ cmd: 'pnpm', minVersion: '9.0.0' }],
      });

      expect(result.failedCommands.length).toBeGreaterThan(0);
      expect(result.failedCommands[0]).toContain('version');
    });
  });

  describe('detectDrift', () => {
    it('should detect modified files', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: 'M  src/file.ts\n',
        stderr: '',
      });

      const drift = await detectDrift({ paths: ['src'] });

      expect(drift.dirtyFiles.length).toBeGreaterThan(0);
      expect(drift.dirtyFiles[0]).toContain('src/file.ts');
    });

    it('should detect untracked files when enabled', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '?? new-file.ts\n',
        stderr: '',
      });

      const drift = await detectDrift({
        paths: ['.'],
        includeUntracked: true,
      });

      expect(drift.dirtyFiles.length).toBeGreaterThan(0);
    });

    it('should return empty arrays when no drift', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      const drift = await detectDrift({ paths: ['src'] });

      expect(drift.dirtyFiles).toEqual([]);
    });
  });
});
