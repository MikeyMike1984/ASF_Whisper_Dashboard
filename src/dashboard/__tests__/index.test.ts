/**
 * Index Module Tests
 *
 * Tests that all exports from the dashboard module are available.
 */

import * as Dashboard from '../index';

describe('Dashboard Module Exports', () => {
  it('exports DashboardRenderer', () => {
    expect(Dashboard.DashboardRenderer).toBeDefined();
  });

  it('exports configuration functions', () => {
    expect(Dashboard.createConfig).toBeDefined();
    expect(Dashboard.validateConfig).toBeDefined();
    expect(Dashboard.DEFAULT_CONFIG).toBeDefined();
    expect(Dashboard.ConfigValidationError).toBeDefined();
    expect(Dashboard.MIN_POLL_INTERVAL).toBeDefined();
    expect(Dashboard.MAX_POLL_INTERVAL).toBeDefined();
  });

  it('exports type constants', () => {
    expect(Dashboard.STATUS_COLORS).toBeDefined();
    expect(Dashboard.TASK_STATUS_COLORS).toBeDefined();
    expect(Dashboard.LOG_LEVEL_COLORS).toBeDefined();
  });

  it('exports core components', () => {
    expect(Dashboard.DashboardRepository).toBeDefined();
    expect(Dashboard.StateStore).toBeDefined();
    expect(Dashboard.PollingEngine).toBeDefined();
  });

  it('exports widgets', () => {
    expect(Dashboard.BaseWidget).toBeDefined();
    expect(Dashboard.HeaderWidget).toBeDefined();
    expect(Dashboard.AgentGridWidget).toBeDefined();
    expect(Dashboard.TaskQueueWidget).toBeDefined();
    expect(Dashboard.WhisperLogWidget).toBeDefined();
  });

  it('exports VERSION', () => {
    expect(Dashboard.VERSION).toBe('0.1.0');
  });
});
