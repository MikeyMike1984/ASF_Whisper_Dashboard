/**
 * Dashboard Configuration Tests
 */

import {
  DEFAULT_CONFIG,
  validateConfig,
  createConfig,
  ConfigValidationError,
  MIN_POLL_INTERVAL,
  MAX_POLL_INTERVAL,
} from '../config';

describe('Dashboard Configuration', () => {
  describe('DEFAULT_CONFIG', () => {
    it('provides sensible defaults', () => {
      expect(DEFAULT_CONFIG.pollInterval).toBe(500);
      expect(DEFAULT_CONFIG.deadAgentThreshold).toBe(30000);
      expect(DEFAULT_CONFIG.gridRows).toBe(2);
      expect(DEFAULT_CONFIG.gridCols).toBe(4);
      expect(DEFAULT_CONFIG.dbPath).toBe('.asf/swarm_state.db');
    });
  });

  describe('validateConfig', () => {
    it('accepts valid poll interval', () => {
      expect(() => validateConfig({ pollInterval: 500 })).not.toThrow();
      expect(() => validateConfig({ pollInterval: MIN_POLL_INTERVAL })).not.toThrow();
      expect(() => validateConfig({ pollInterval: MAX_POLL_INTERVAL })).not.toThrow();
    });

    it('rejects poll interval below minimum', () => {
      expect(() => validateConfig({ pollInterval: 100 })).toThrow(ConfigValidationError);
      expect(() => validateConfig({ pollInterval: 100 })).toThrow(/at least 250ms/);
    });

    it('rejects poll interval above maximum', () => {
      expect(() => validateConfig({ pollInterval: 3000 })).toThrow(ConfigValidationError);
      expect(() => validateConfig({ pollInterval: 3000 })).toThrow(/at most 2000ms/);
    });

    it('accepts valid dead agent threshold', () => {
      expect(() => validateConfig({ deadAgentThreshold: 1000 })).not.toThrow();
      expect(() => validateConfig({ deadAgentThreshold: 60000 })).not.toThrow();
    });

    it('rejects dead agent threshold below minimum', () => {
      expect(() => validateConfig({ deadAgentThreshold: 500 })).toThrow(ConfigValidationError);
      expect(() => validateConfig({ deadAgentThreshold: 500 })).toThrow(/at least 1000ms/);
    });

    it('accepts valid grid dimensions', () => {
      expect(() => validateConfig({ gridRows: 1 })).not.toThrow();
      expect(() => validateConfig({ gridRows: 10 })).not.toThrow();
      expect(() => validateConfig({ gridCols: 1 })).not.toThrow();
      expect(() => validateConfig({ gridCols: 10 })).not.toThrow();
    });

    it('rejects invalid grid rows', () => {
      expect(() => validateConfig({ gridRows: 0 })).toThrow(ConfigValidationError);
      expect(() => validateConfig({ gridRows: 11 })).toThrow(ConfigValidationError);
    });

    it('rejects invalid grid cols', () => {
      expect(() => validateConfig({ gridCols: 0 })).toThrow(ConfigValidationError);
      expect(() => validateConfig({ gridCols: 11 })).toThrow(ConfigValidationError);
    });

    it('passes validation for empty config', () => {
      expect(() => validateConfig({})).not.toThrow();
    });
  });

  describe('createConfig', () => {
    it('returns defaults when no options provided', () => {
      const config = createConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('merges partial config with defaults', () => {
      const config = createConfig({ pollInterval: 1000 });
      expect(config.pollInterval).toBe(1000);
      expect(config.gridRows).toBe(2); // default
      expect(config.gridCols).toBe(4); // default
      expect(config.dbPath).toBe('.asf/swarm_state.db'); // default
    });

    it('allows overriding all options', () => {
      const custom = {
        dbPath: '/custom/path.db',
        pollInterval: 1000,
        deadAgentThreshold: 60000,
        gridRows: 3,
        gridCols: 5,
      };
      const config = createConfig(custom);
      expect(config).toEqual(custom);
    });

    it('throws on invalid config', () => {
      expect(() => createConfig({ pollInterval: 100 })).toThrow(ConfigValidationError);
    });

    it('creates immutable config', () => {
      const config = createConfig();
      const config2 = createConfig();
      expect(config).not.toBe(config2);
      expect(config).toEqual(config2);
    });
  });
});
