import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
    },
  };
});

import { promises as fs } from 'fs';
import { exec, pathExists, readJson, writeJson, findFiles, getProjectRoot, getRelativePath, log, getEnv, measure } from '../src/utils/index';

describe('Utils Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pathExists', () => {
    it.skip('should return true if path exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const result = await pathExists('/test/path');
      expect(result).toBe(true);
    });

    it.skip('should return false if path does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const result = await pathExists('/nonexistent/path');
      expect(result).toBe(false);
    });
  });

  describe('readJson', () => {
    it.skip('should read and parse JSON file', async () => {
      const mockData = { name: 'test', version: '1.0.0' };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData) as unknown as Buffer);

      const result = await readJson('/test/package.json');
      expect(result).toEqual(mockData);
    });

    it('should throw on invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json' as unknown as Buffer);
      await expect(readJson('/test/invalid.json')).rejects.toThrow();
    });
  });

  describe('writeJson', () => {
    it.skip('should write JSON with pretty formatting by default', async () => {
      const data = { name: 'test' };
      await writeJson('/test/output.json', data);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/output.json',
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    });

    it.skip('should write compact JSON when pretty is false', async () => {
      const data = { name: 'test' };
      await writeJson('/test/output.json', data, false);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/output.json',
        JSON.stringify(data),
        'utf-8'
      );
    });
  });

  describe('findFiles', () => {
    it.skip('should find files matching pattern', async () => {
      const mockDirents = [
        { name: 'test.ts', isDirectory: () => false },
        { name: 'test.js', isDirectory: () => false },
        { name: 'readme.md', isDirectory: () => false },
      ] as unknown as NodeJS.Dirent[];
      vi.mocked(fs.readdir).mockResolvedValue(mockDirents);

      const files = await findFiles('/test', /\.ts$/);
      expect(files).toContain('/test/test.ts');
      expect(files).not.toContain('/test/readme.md');
    });

    it.skip('should skip node_modules and dist directories', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (dir: string) => {
        if (dir === '/test') {
          return [
            { name: 'node_modules', isDirectory: () => true },
            { name: 'src', isDirectory: () => true },
          ] as unknown as NodeJS.Dirent[];
        }
        return [] as unknown as NodeJS.Dirent[];
      });

      const files = await findFiles('/test', /\.ts$/);
      expect(files).toHaveLength(0);
    });
  });

  describe('getProjectRoot', () => {
    it('should return current working directory', () => {
      const root = getProjectRoot();
      expect(root).toBe(process.cwd());
    });
  });

  describe('log', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    afterEach(() => {
      consoleLogSpy.mockClear();
    });

    it('should log info messages', () => {
      log('info', 'test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test message');
    });

    it('should log success messages', () => {
      log('success', 'test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[✓] test message');
    });

    it('should log warning messages', () => {
      log('warn', 'test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[WARN] test message');
    });

    it('should log error messages', () => {
      log('error', 'test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[ERROR] test message');
    });
  });

  describe('getEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getEnv('TEST_VAR')).toBe('test-value');
    });

    it('should return default value if not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnv('TEST_VAR', 'default')).toBe('default');
    });

    it('should throw if not set and no default', () => {
      delete process.env.TEST_VAR;
      expect(() => getEnv('TEST_VAR')).toThrow('Environment variable TEST_VAR is not set');
    });
  });

  describe('measure', () => {
    it('should measure execution time', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const testFn = vi.fn().mockResolvedValue('result');
      
      const result = await measure('Test Operation', testFn);
      
      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test Operation completed in')
      );
    });
  });
});
