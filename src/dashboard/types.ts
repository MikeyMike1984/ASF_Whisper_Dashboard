/**
 * Dashboard Renderer Type Definitions
 *
 * Types and interfaces for the TUI dashboard component.
 * Imports base types from SwarmPulse SDK where applicable.
 */

import { Agent, Task, LogEntry, AgentStatus } from '../core/monitoring';

// ============================================================================
// Re-exports from SwarmPulse SDK
// ============================================================================

export { Agent, Task, LogEntry, AgentStatus };
export { TaskStatus, LogLevel } from '../core/monitoring';

// ============================================================================
// Dashboard-Specific Types
// ============================================================================

/**
 * Extended agent status including 'Dead' for unresponsive agents
 */
export type DashboardAgentStatus = AgentStatus | 'Dead';

/**
 * Agent with computed dashboard-specific fields
 */
export interface DashboardAgent extends Omit<Agent, 'status'> {
  /** Status including Dead detection */
  status: DashboardAgentStatus;
  /** Current progress percentage (from task) */
  progress: number;
}

/**
 * Aggregated metrics for the header widget
 */
export interface AggregatedMetrics {
  /** Total tokens used across all agents */
  totalTokens: number;
  /** Total estimated cost in USD */
  totalCost: number;
  /** Number of currently active (non-dead) agents */
  activeAgents: number;
  /** Total registered agents */
  totalAgents: number;
}

/**
 * Complete dashboard state at a point in time
 */
export interface DashboardState {
  /** All agents with computed status */
  agents: DashboardAgent[];
  /** All tasks */
  tasks: Task[];
  /** Logs indexed by agent ID */
  logs: Map<string, LogEntry[]>;
  /** Aggregated metrics for header */
  metrics: AggregatedMetrics;
  /** Currently selected agent ID (null if none) */
  selectedAgentId: string | null;
  /** Unix timestamp of last successful poll */
  lastPollTime: number;
}

/**
 * Dashboard configuration options
 */
export interface DashboardConfig {
  /** Path to the SQLite database file */
  dbPath: string;
  /** Poll interval in milliseconds (250-2000) */
  pollInterval: number;
  /** Threshold in ms for marking agent as dead */
  deadAgentThreshold: number;
  /** Number of rows in the agent grid */
  gridRows: number;
  /** Number of columns in the agent grid */
  gridCols: number;
}

/**
 * Status color mappings for TUI rendering
 */
export const STATUS_COLORS: Record<DashboardAgentStatus, string> = {
  Idle: 'cyan',
  Busy: 'green',
  Error: 'yellow',
  Dead: 'red',
} as const;

/**
 * Task status color mappings
 */
export const TASK_STATUS_COLORS = {
  Pending: 'yellow',
  InProgress: 'green',
  Complete: 'cyan',
  Failed: 'red',
} as const;

/**
 * Log level color mappings
 */
export const LOG_LEVEL_COLORS = {
  Info: 'white',
  Warn: 'yellow',
  Error: 'red',
} as const;
