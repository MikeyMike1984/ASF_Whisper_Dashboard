/**
 * SwarmPulse SDK Type Definitions
 *
 * All interfaces and types for the SwarmPulse monitoring system.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Agent status indicators
 */
export enum AgentStatus {
  /** Agent is idle and waiting for work */
  Idle = 'Idle',
  /** Agent is actively working on a task */
  Busy = 'Busy',
  /** Agent encountered an error */
  Error = 'Error',
}

/**
 * Task status indicators
 */
export enum TaskStatus {
  /** Task is waiting to be started */
  Pending = 'Pending',
  /** Task is currently being worked on */
  InProgress = 'InProgress',
  /** Task completed successfully */
  Complete = 'Complete',
  /** Task failed */
  Failed = 'Failed',
}

/**
 * Log severity levels
 */
export enum LogLevel {
  /** Informational message */
  Info = 'Info',
  /** Warning message */
  Warn = 'Warn',
  /** Error message */
  Error = 'Error',
}

// ============================================================================
// Database Entity Interfaces
// ============================================================================

/**
 * Agent record in the database
 */
export interface Agent {
  /** Unique agent identifier (format: agent-{pid}-{timestamp}) */
  id: string;
  /** Process ID of the agent */
  pid: number;
  /** Agent role (e.g., 'developer', 'qa', 'architect') */
  role: string;
  /** Current status */
  status: AgentStatus;
  /** ID of the current task being worked on (null if idle) */
  currentTaskId: string | null;
  /** Unix timestamp (ms) of last heartbeat */
  lastSeen: number;
  /** Git worktree path (e.g., 'feature/auth-system') */
  worktreePath: string | null;
  /** Unix timestamp (ms) when agent was created */
  createdAt: number;
  /** Whether the agent is active (soft delete flag) */
  isActive: boolean;
}

/**
 * Task record in the database
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Human-readable task title */
  title: string;
  /** Current status */
  status: TaskStatus;
  /** ID of the agent assigned to this task (null if unassigned) */
  assignedAgentId: string | null;
  /** Completion percentage (0-100) */
  progressPercent: number;
  /** JSON string of dependent task IDs */
  dependencies: string | null;
  /** Unix timestamp (ms) when task was created */
  createdAt: number;
  /** Unix timestamp (ms) when work started (null if not started) */
  startedAt: number | null;
  /** Unix timestamp (ms) when task completed (null if not complete) */
  completedAt: number | null;
}

/**
 * Log entry record in the database
 */
export interface LogEntry {
  /** Auto-incremented ID */
  id: number;
  /** ID of the agent that created this log */
  agentId: string;
  /** Severity level */
  level: LogLevel;
  /** Log message content */
  message: string;
  /** Unix timestamp (ms) when log was created */
  timestamp: number;
}

/**
 * Metric entry record in the database
 */
export interface MetricEntry {
  /** Auto-incremented ID */
  id: number;
  /** ID of the agent that reported this metric */
  agentId: string;
  /** Number of tokens used */
  tokensUsed: number;
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Unix timestamp (ms) when metric was recorded */
  timestamp: number;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * SwarmPulse SDK configuration options
 */
export interface SwarmPulseConfig {
  /** Path to the SQLite database file */
  dbPath: string;
  /** Interval in milliseconds between automatic heartbeats */
  heartbeatInterval: number;
  /** Maximum number of log entries to keep per agent (circular buffer) */
  maxLogEntries: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SwarmPulseConfig = {
  dbPath: '.asf/swarm_state.db',
  heartbeatInterval: 5000,
  maxLogEntries: 1000,
};
