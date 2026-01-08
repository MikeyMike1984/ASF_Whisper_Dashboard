/**
 * Tests for ConfigSchema validation
 */

import { validateConfig, formatValidationErrors, ValidationResult } from './ConfigSchema';
import { DEFAULT_CONFIG } from './defaults';
import { LauncherConfig } from './types';

describe('ConfigSchema', () => {
  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const result = validateConfig(DEFAULT_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a complete custom configuration', () => {
      const config: LauncherConfig = {
        version: '1.0',
        dashboard: {
          enabled: true,
          pollInterval: 1000,
          dbPath: '.custom/db.sqlite',
        },
        agents: {
          count: 8,
          defaultRole: 'tester',
          quietMode: false,
          autoRestart: true,
          restartDelay: 3000,
          maxRestarts: 5,
        },
        worktrees: [
          { path: 'feature/test', agents: 2, role: 'developer' },
        ],
        tasks: [
          { id: 'task-1', title: 'Test task', assignTo: 'worktree:feature/test' },
        ],
        shutdown: {
          gracePeriod: 5000,
          forceAfter: 8000,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject missing required fields', () => {
      const result = validateConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid poll interval (too low)', () => {
      const config = {
        ...DEFAULT_CONFIG,
        dashboard: {
          ...DEFAULT_CONFIG.dashboard,
          pollInterval: 50,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('pollInterval'))).toBe(true);
    });

    it('should reject invalid poll interval (too high)', () => {
      const config = {
        ...DEFAULT_CONFIG,
        dashboard: {
          ...DEFAULT_CONFIG.dashboard,
          pollInterval: 10000,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('pollInterval'))).toBe(true);
    });

    it('should reject agent count greater than 50', () => {
      const config = {
        ...DEFAULT_CONFIG,
        agents: {
          ...DEFAULT_CONFIG.agents,
          count: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('count'))).toBe(true);
    });

    it('should reject agent count less than 1', () => {
      const config = {
        ...DEFAULT_CONFIG,
        agents: {
          ...DEFAULT_CONFIG.agents,
          count: 0,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject forceAfter <= gracePeriod', () => {
      const config = {
        ...DEFAULT_CONFIG,
        shutdown: {
          gracePeriod: 10000,
          forceAfter: 10000,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('forceAfter'))).toBe(true);
    });

    it('should reject empty dbPath', () => {
      const config = {
        ...DEFAULT_CONFIG,
        dashboard: {
          ...DEFAULT_CONFIG.dashboard,
          dbPath: '',
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject restart delay less than 1000ms', () => {
      const config = {
        ...DEFAULT_CONFIG,
        agents: {
          ...DEFAULT_CONFIG.agents,
          restartDelay: 500,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject maxRestarts greater than 10', () => {
      const config = {
        ...DEFAULT_CONFIG,
        agents: {
          ...DEFAULT_CONFIG.agents,
          maxRestarts: 20,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should validate worktree configurations', () => {
      const config = {
        ...DEFAULT_CONFIG,
        worktrees: [
          { path: '', agents: 1, role: 'dev' }, // Empty path should fail
        ],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should return empty string for valid config', () => {
      const result: ValidationResult = { valid: true, errors: [] };
      expect(formatValidationErrors(result)).toBe('');
    });

    it('should format errors as bullet points', () => {
      const result: ValidationResult = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
      };

      const formatted = formatValidationErrors(result);
      expect(formatted).toContain('Configuration validation failed');
      expect(formatted).toContain('- Error 1');
      expect(formatted).toContain('- Error 2');
    });
  });
});
