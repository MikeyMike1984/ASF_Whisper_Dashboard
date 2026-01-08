/**
 * Dashboard Configuration
 *
 * Default configuration values and validation for the dashboard.
 */

import { DashboardConfig } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Minimum allowed poll interval in milliseconds */
export const MIN_POLL_INTERVAL = 250;

/** Maximum allowed poll interval in milliseconds */
export const MAX_POLL_INTERVAL = 2000;

/** Default poll interval in milliseconds */
export const DEFAULT_POLL_INTERVAL = 500;

/** Default threshold for dead agent detection in milliseconds */
export const DEFAULT_DEAD_AGENT_THRESHOLD = 30000;

/** Default number of grid rows */
export const DEFAULT_GRID_ROWS = 2;

/** Default number of grid columns */
export const DEFAULT_GRID_COLS = 4;

/** Default database path */
export const DEFAULT_DB_PATH = '.asf/swarm_state.db';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default dashboard configuration
 */
export const DEFAULT_CONFIG: DashboardConfig = {
  dbPath: DEFAULT_DB_PATH,
  pollInterval: DEFAULT_POLL_INTERVAL,
  deadAgentThreshold: DEFAULT_DEAD_AGENT_THRESHOLD,
  gridRows: DEFAULT_GRID_ROWS,
  gridCols: DEFAULT_GRID_COLS,
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate dashboard configuration
 *
 * @param config - Partial configuration to validate
 * @throws ConfigValidationError if validation fails
 */
export function validateConfig(config: Partial<DashboardConfig>): void {
  if (config.pollInterval !== undefined) {
    if (config.pollInterval < MIN_POLL_INTERVAL) {
      throw new ConfigValidationError(
        `pollInterval must be at least ${MIN_POLL_INTERVAL}ms, got ${config.pollInterval}ms`
      );
    }
    if (config.pollInterval > MAX_POLL_INTERVAL) {
      throw new ConfigValidationError(
        `pollInterval must be at most ${MAX_POLL_INTERVAL}ms, got ${config.pollInterval}ms`
      );
    }
  }

  if (config.deadAgentThreshold !== undefined) {
    if (config.deadAgentThreshold < 1000) {
      throw new ConfigValidationError(
        `deadAgentThreshold must be at least 1000ms, got ${config.deadAgentThreshold}ms`
      );
    }
  }

  if (config.gridRows !== undefined) {
    if (config.gridRows < 1 || config.gridRows > 10) {
      throw new ConfigValidationError(
        `gridRows must be between 1 and 10, got ${config.gridRows}`
      );
    }
  }

  if (config.gridCols !== undefined) {
    if (config.gridCols < 1 || config.gridCols > 10) {
      throw new ConfigValidationError(
        `gridCols must be between 1 and 10, got ${config.gridCols}`
      );
    }
  }
}

/**
 * Create a complete configuration by merging partial config with defaults
 *
 * @param partial - Partial configuration options
 * @returns Complete dashboard configuration
 * @throws ConfigValidationError if validation fails
 */
export function createConfig(partial: Partial<DashboardConfig> = {}): DashboardConfig {
  validateConfig(partial);

  return {
    ...DEFAULT_CONFIG,
    ...partial,
  };
}
