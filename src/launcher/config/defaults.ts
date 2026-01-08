/**
 * Default configuration values for the ASF Launcher
 */

import { LauncherConfig } from './types';

/** Default path to the launcher PID file */
export const DEFAULT_PID_PATH = '.asf/launcher.pid';

/** Default path to the SwarmPulse database */
export const DEFAULT_DB_PATH = '.asf/swarm_state.db';

/** Default path to the configuration file */
export const DEFAULT_CONFIG_PATH = './asf-swarm.config.json';

/**
 * Default launcher configuration
 * Used when no config file is found or to merge with partial configs
 */
export const DEFAULT_CONFIG: LauncherConfig = {
  version: '1.0',

  dashboard: {
    enabled: true,
    pollInterval: 500,
    dbPath: DEFAULT_DB_PATH,
  },

  agents: {
    count: 4,
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

/**
 * Staggered start delay between agents in milliseconds
 */
export const AGENT_START_DELAY_MS = 100;

/**
 * Time to wait for dashboard to be ready before starting agents
 */
export const DASHBOARD_READY_DELAY_MS = 1000;

/**
 * Poll interval when waiting for processes to stop
 */
export const SHUTDOWN_POLL_INTERVAL_MS = 100;
