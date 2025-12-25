import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseConfig, loadConfig, validateConfig, setFs } from '../src/config/loader';
import { defaultConfig } from '../src/config/default-config';

describe('Config Loader', () => {
  beforeEach(() => {
    setFs(null); // Reset fs override
  });

  describe('parseConfig', () => {
    it('should parse valid YAML and merge with default config', () => {
      const yaml = `
        rules:
          dead_ends:
            enabled: false
      `;
      const config = parseConfig(yaml);
      expect(config.rules.dead_ends.enabled).toBe(false);
      expect(config.rules.secrets.enabled).toBe(true);
    });

    it('should handle empty config', () => {
      const config = parseConfig('');
      expect(config).toEqual(defaultConfig);
    });

    it('should handle invalid YAML by returning default (or partial) config', () => {
      const config = parseConfig('foo: bar');
      expect(config).toEqual(expect.objectContaining(defaultConfig));
    });
  });

  describe('loadConfig', () => {
    it('should load config from specific path if provided', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('rules:\n  dead_ends:\n    enabled: false'),
      };
      setFs(mockFs);

      const config = loadConfig('./custom.yml');
      expect(config.rules.dead_ends.enabled).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalledWith('./custom.yml');
    });

    it('should return default config if specific path does not exist', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
      };
      setFs(mockFs);

      const config = loadConfig('./missing.yml');
      expect(config).toEqual(defaultConfig);
    });

    it('should search for default config files in CWD if no path provided', () => {
      const mockFs = {
        existsSync: vi.fn().mockImplementation((path: string) => path.endsWith('.flowlint.yaml')),
        readFileSync: vi.fn().mockReturnValue('rules:\n  dead_ends:\n    enabled: false'),
      };
      setFs(mockFs);

      const config = loadConfig();
      expect(config.rules.dead_ends.enabled).toBe(false);
    });

    it('should return default config if no config file found in CWD', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
      };
      setFs(mockFs);

      const config = loadConfig();
      expect(config).toEqual(defaultConfig);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      expect(validateConfig(defaultConfig)).toBe(true);
    });

    it('should validate partial config that matches structure', () => {
      const config = { ...defaultConfig, rules: {} }; 
      expect(validateConfig(config)).toBe(true);
    });

    it('should reject invalid config', () => {
      expect(validateConfig(null)).toBe(false);
      expect(validateConfig({})).toBe(false);
      expect(validateConfig({ files: {} })).toBe(false);
    });
  });
});