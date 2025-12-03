import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDeprecatedDeps, findPackageJson, getPackageManager } from '../src/deps/index';

// Mock utils and fs
vi.mock('../src/utils/index.js', () => ({
  exec: vi.fn(),
  log: vi.fn(),
  readJson: vi.fn(),
  writeJson: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const { readJson } = await import('../src/utils/index.js');
const { existsSync } = await import('fs');
const { execSync } = await import('child_process');

describe('Deps Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPackageManager', () => {
    it('should detect pnpm from pnpm-lock.yaml', () => {
      vi.mocked(existsSync).mockImplementation((path: string) => {
        return path.includes('pnpm-lock.yaml');
      });

      const pm = getPackageManager('/test/package.json');
      expect(pm).toBe('pnpm');
    });

    it('should detect yarn from yarn.lock', () => {
      vi.mocked(existsSync).mockImplementation((path: string) => {
        return path.includes('yarn.lock');
      });

      const pm = getPackageManager('/test/package.json');
      expect(pm).toBe('yarn');
    });

    it('should default to npm if no lock file found', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const pm = getPackageManager('/test/package.json');
      expect(pm).toBe('npm');
    });
  });

  describe('findPackageJson', () => {
    it('should find package.json in current directory', () => {
      vi.mocked(existsSync).mockImplementation((path: string) => {
        return path.includes('package.json');
      });

      const result = findPackageJson('/test/project');
      expect(result).toContain('package.json');
    });

    it('should return null if not found', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = findPackageJson('/test/project');
      expect(result).toBeNull();
    });
  });

  describe('checkDeprecatedDeps', () => {
    it('should detect deprecated packages', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('audit')) {
          return JSON.stringify({
            vulnerabilities: {
              'lodash.get': {
                deprecated: 'This package is deprecated',
                range: '4.4.2',
              },
            },
          });
        }
        return '';
      });

      const deprecated = await checkDeprecatedDeps('/test/package.json');
      expect(deprecated.length).toBeGreaterThan(0);
      expect(deprecated.some(d => d.name === 'lodash.get')).toBe(true);
    });

    it('should handle no deprecated packages', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('audit')) {
          return JSON.stringify({
            vulnerabilities: {},
          });
        }
        return '';
      });

      const deprecated = await checkDeprecatedDeps('/test/package.json');
      expect(deprecated).toEqual([]);
    });

    it('should handle exec errors gracefully', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const deprecated = await checkDeprecatedDeps('/test/package.json');
      expect(Array.isArray(deprecated)).toBe(true);
    });
  });
});
