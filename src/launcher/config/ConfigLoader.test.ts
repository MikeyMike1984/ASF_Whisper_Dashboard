/**
 * Tests for ConfigLoader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigLoader, ConfigurationError } from './ConfigLoader';
import { DEFAULT_CONFIG } from './defaults';
import { LauncherConfig } from './types';

describe('ConfigLoader', () => {
  let tempDir: string;
  let testConfigPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-test-'));
    testConfigPath = path.join(tempDir, 'test-config.json');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('load', () => {
    it('should return defaults when config file does not exist', () => {
      const loader = new ConfigLoader(path.join(tempDir, 'nonexistent.json'));
      const config = loader.load();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load and parse a valid config file', () => {
      const customConfig = {
        version: '1.0',
        dashboard: {
          enabled: false,
          pollInterval: 1000,
          dbPath: '.custom/db.sqlite',
        },
        agents: {
          count: 8,
          defaultRole: 'tester',
          quietMode: true,
          autoRestart: true,
          restartDelay: 2000,
          maxRestarts: 5,
        },
        worktrees: [],
        tasks: [],
        shutdown: {
          gracePeriod: 8000,
          forceAfter: 12000,
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(customConfig));

      const loader = new ConfigLoader(testConfigPath);
      const config = loader.load();

      expect(config.dashboard.enabled).toBe(false);
      expect(config.agents.count).toBe(8);
      expect(config.agents.autoRestart).toBe(true);
    });

    it('should merge partial config with defaults', () => {
      const partialConfig = {
        version: '1.0',
        dashboard: {
          enabled: true,
          pollInterval: 500,
          dbPath: '.asf/swarm_state.db',
        },
        agents: {
          count: 6,
          defaultRole: 'developer',
          quietMode: true,
          autoRestart: false,
          restartDelay: 5000,
          maxRestarts: 3,
        },
        worktrees: [],
        tasks: [],
        shutdown: {
          gracePeriod: 10000,
          forceAfter: 15000,
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(partialConfig));

      const loader = new ConfigLoader(testConfigPath);
      const config = loader.load();

      // Custom value
      expect(config.agents.count).toBe(6);
      // Default values preserved
      expect(config.shutdown.gracePeriod).toBe(10000);
    });

    it('should throw ConfigurationError for invalid JSON', () => {
      fs.writeFileSync(testConfigPath, '{ invalid json }');

      const loader = new ConfigLoader(testConfigPath);

      expect(() => loader.load()).toThrow(ConfigurationError);
      expect(() => loader.load()).toThrow(/Invalid JSON/);
    });

    it('should throw ConfigurationError for invalid config values', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        agents: {
          ...DEFAULT_CONFIG.agents,
          count: 100, // Too high
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      const loader = new ConfigLoader(testConfigPath);

      expect(() => loader.load()).toThrow(ConfigurationError);
    });

    it('should use default config path when not specified', () => {
      const loader = new ConfigLoader();

      // Should not throw, should return defaults
      const config = loader.load();
      expect(config).toBeDefined();
    });
  });

  describe('exists', () => {
    it('should return true when config file exists', () => {
      fs.writeFileSync(testConfigPath, '{}');
      expect(ConfigLoader.exists(testConfigPath)).toBe(true);
    });

    it('should return false when config file does not exist', () => {
      expect(ConfigLoader.exists(path.join(tempDir, 'nonexistent.json'))).toBe(false);
    });
  });

  describe('getConfigPath', () => {
    it('should return absolute path', () => {
      const loader = new ConfigLoader('./relative/path.json');
      const configPath = loader.getConfigPath();

      expect(path.isAbsolute(configPath)).toBe(true);
    });
  });
});
