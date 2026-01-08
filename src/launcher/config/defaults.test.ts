/**
 * Tests for default configuration values
 */

import {
  DEFAULT_CONFIG,
  DEFAULT_PID_PATH,
  DEFAULT_DB_PATH,
  DEFAULT_CONFIG_PATH,
  AGENT_START_DELAY_MS,
  DASHBOARD_READY_DELAY_MS,
  SHUTDOWN_POLL_INTERVAL_MS,
} from './defaults';

describe('Default Configuration', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have version 1.0', () => {
      expect(DEFAULT_CONFIG.version).toBe('1.0');
    });

    it('should have dashboard enabled by default', () => {
      expect(DEFAULT_CONFIG.dashboard.enabled).toBe(true);
    });

    it('should have reasonable poll interval', () => {
      expect(DEFAULT_CONFIG.dashboard.pollInterval).toBeGreaterThanOrEqual(100);
      expect(DEFAULT_CONFIG.dashboard.pollInterval).toBeLessThanOrEqual(5000);
    });

    it('should have 4 agents by default', () => {
      expect(DEFAULT_CONFIG.agents.count).toBe(4);
    });

    it('should have quiet mode enabled', () => {
      expect(DEFAULT_CONFIG.agents.quietMode).toBe(true);
    });

    it('should have auto-restart disabled', () => {
      expect(DEFAULT_CONFIG.agents.autoRestart).toBe(false);
    });

    it('should have reasonable shutdown timeouts', () => {
      expect(DEFAULT_CONFIG.shutdown.gracePeriod).toBeGreaterThanOrEqual(5000);
      expect(DEFAULT_CONFIG.shutdown.forceAfter).toBeGreaterThan(
        DEFAULT_CONFIG.shutdown.gracePeriod
      );
    });

    it('should have empty worktrees array', () => {
      expect(DEFAULT_CONFIG.worktrees).toEqual([]);
    });

    it('should have empty tasks array', () => {
      expect(DEFAULT_CONFIG.tasks).toEqual([]);
    });
  });

  describe('Path constants', () => {
    it('should define PID file path', () => {
      expect(DEFAULT_PID_PATH).toBe('.asf/launcher.pid');
    });

    it('should define DB path', () => {
      expect(DEFAULT_DB_PATH).toBe('.asf/swarm_state.db');
    });

    it('should define config path', () => {
      expect(DEFAULT_CONFIG_PATH).toBe('./asf-swarm.config.json');
    });
  });

  describe('Timing constants', () => {
    it('should have agent start delay', () => {
      expect(AGENT_START_DELAY_MS).toBeGreaterThan(0);
    });

    it('should have dashboard ready delay', () => {
      expect(DASHBOARD_READY_DELAY_MS).toBeGreaterThan(0);
    });

    it('should have shutdown poll interval', () => {
      expect(SHUTDOWN_POLL_INTERVAL_MS).toBeGreaterThan(0);
    });
  });
});
