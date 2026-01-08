/**
 * Configuration type definitions for the ASF Launcher
 */

/**
 * Dashboard configuration options
 */
export interface DashboardConfig {
  /** Whether to start the dashboard */
  enabled: boolean;
  /** Polling interval in milliseconds (100-5000) */
  pollInterval: number;
  /** Path to the SQLite database */
  dbPath: string;
}

/**
 * Agent configuration options
 */
export interface AgentConfig {
  /** Number of agents to spawn */
  count: number;
  /** Default role for agents */
  defaultRole: string;
  /** Whether to run agents in quiet mode (no stdout) */
  quietMode: boolean;
  /** Whether to automatically restart crashed agents */
  autoRestart: boolean;
  /** Delay in ms before restarting a crashed agent */
  restartDelay: number;
  /** Maximum number of restarts per agent */
  maxRestarts: number;
}

/**
 * Worktree-specific agent configuration
 */
export interface WorktreeConfig {
  /** Path to the git worktree */
  path: string;
  /** Number of agents to assign to this worktree */
  agents: number;
  /** Role for agents in this worktree */
  role: string;
}

/**
 * Task assignment configuration
 */
export interface TaskConfig {
  /** Unique task identifier */
  id: string;
  /** Human-readable task title */
  title: string;
  /** Assignment target (e.g., "worktree:feature/auth") */
  assignTo: string;
}

/**
 * Shutdown behavior configuration
 */
export interface ShutdownConfig {
  /** Grace period in ms before force-killing processes */
  gracePeriod: number;
  /** Time in ms after which to force-kill regardless */
  forceAfter: number;
}

/**
 * Complete launcher configuration
 */
export interface LauncherConfig {
  /** Configuration version string */
  version: string;
  /** Dashboard settings */
  dashboard: DashboardConfig;
  /** Agent settings */
  agents: AgentConfig;
  /** Worktree-specific configurations */
  worktrees: WorktreeConfig[];
  /** Task assignments */
  tasks: TaskConfig[];
  /** Shutdown behavior */
  shutdown: ShutdownConfig;
}

/**
 * CLI options passed from command line
 */
export interface CLIOptions {
  /** Override agent count from config */
  agents?: number;
  /** Path to configuration file */
  config?: string;
  /** Disable dashboard */
  noDashboard?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Force operation (e.g., force stop) */
  force?: boolean;
}
