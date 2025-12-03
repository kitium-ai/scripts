import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanSecrets } from '../src/security/index';

// Mock utils
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  findFiles: vi.fn(),
  readJson: vi.fn(),
}));

vi.mock('../src/deps/index.js', () => ({
  findPackageJson: vi.fn(),
  getPackageManager: vi.fn(() => 'pnpm'),
}));

const { exec } = await import('../src/utils/index.js');

describe('Security Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scanSecrets', () => {
    it('should run gitleaks scan by default', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      const result = await scanSecrets();
      
      expect(result.scanner).toBe('gitleaks');
      expect(exec).toHaveBeenCalledWith(
        'gitleaks',
        expect.arrayContaining(['detect']),
        expect.any(Object)
      );
    });

    it('should use custom config path when provided', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      await scanSecrets({ configPath: '/custom/gitleaks.toml' });
      
      expect(exec).toHaveBeenCalledWith(
        'gitleaks',
        expect.arrayContaining(['--config', '/custom/gitleaks.toml']),
        expect.any(Object)
      );
    });

    it('should parse findings from JSON output', async () => {
      const mockFindings = [
        { rule: 'AWS Key', file: 'config.js', line: 10 },
        { rule: 'GitHub Token', file: 'auth.js', line: 25 },
      ];

      vi.mocked(exec).mockResolvedValue({
        code: 1,
        stdout: mockFindings.map(f => JSON.stringify(f)).join('\n'),
        stderr: '',
      });

      const result = await scanSecrets({ failOnFinding: false });

      expect(result.findings.length).toBe(2);
      expect(result.exitCode).toBe(1);
    });

    it('should support trufflehog scanner', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
      });

      const result = await scanSecrets({ scanner: 'trufflehog' });
      
      expect(result.scanner).toBe('trufflehog');
      expect(exec).toHaveBeenCalledWith(
        'trufflehog',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('should handle scan failures gracefully', async () => {
      vi.mocked(exec).mockResolvedValue({
        code: 1,
        stdout: '',
        stderr: 'Error scanning',
      });

      const result = await scanSecrets({ failOnFinding: false });
      
      expect(result.exitCode).toBe(1);
      expect(result.findings).toEqual([]);
    });
  });
});
