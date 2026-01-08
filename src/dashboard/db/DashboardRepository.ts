/**
 * Dashboard Repository
 *
 * Read-only database access layer for the dashboard.
 * Queries the SwarmPulse SQLite database without writing.
 */

import Database from 'better-sqlite3';
import {
  DashboardAgent,
  DashboardAgentStatus,
  AggregatedMetrics,
  Task,
  LogEntry,
} from '../types';
import { TaskStatus, LogLevel, AgentStatus } from '../../core/monitoring';

// ============================================================================
// SQL Queries
// ============================================================================

const SQL = {
  GET_ALL_AGENTS: `
    SELECT id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active
    FROM agents
    WHERE is_active = 1
    ORDER BY created_at ASC
  `,

  GET_AGENT_PROGRESS: `
    SELECT progress_percent FROM tasks WHERE id = ?
  `,

  GET_ALL_TASKS: `
    SELECT id, title, status, assigned_agent_id, progress_percent, dependencies, created_at, started_at, completed_at
    FROM tasks
    ORDER BY
      CASE status
        WHEN 'InProgress' THEN 1
        WHEN 'Pending' THEN 2
        WHEN 'Complete' THEN 3
        WHEN 'Failed' THEN 4
      END,
      created_at DESC
  `,

  GET_LOGS_FOR_AGENT: `
    SELECT id, agent_id, level, message, timestamp
    FROM logs
    WHERE agent_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `,

  GET_AGGREGATED_METRICS: `
    SELECT
      COALESCE(SUM(tokens_used), 0) as total_tokens,
      COALESCE(SUM(estimated_cost), 0.0) as total_cost
    FROM metrics
  `,
};

// ============================================================================
// Repository Class
// ============================================================================

/**
 * Read-only repository for dashboard queries
 */
export class DashboardRepository {
  private db: Database.Database;
  private deadAgentThreshold: number;
  private maxRetries = 3;
  private retryDelay = 50;

  /**
   * Create a new dashboard repository
   *
   * @param dbPath - Path to the SQLite database
   * @param deadAgentThreshold - Threshold in ms for marking agents as dead
   */
  constructor(dbPath: string, deadAgentThreshold: number) {
    this.db = new Database(dbPath, { readonly: true });
    this.db.pragma('journal_mode = WAL');
    this.deadAgentThreshold = deadAgentThreshold;
  }

  /**
   * Execute a query with retry logic for SQLITE_BUSY
   */
  private executeWithRetry<T>(fn: () => T): T {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return fn();
      } catch (error) {
        lastError = error as Error;
        if (lastError.message?.includes('SQLITE_BUSY')) {
          // Synchronous delay for retry
          const start = Date.now();
          while (Date.now() - start < this.retryDelay) {
            // Busy wait
          }
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Get all active agents with computed dead status
   */
  getAgents(): DashboardAgent[] {
    return this.executeWithRetry(() => {
      const now = Date.now();
      const rows = this.db.prepare(SQL.GET_ALL_AGENTS).all() as RawAgent[];

      return rows.map((row) => {
        const timeSinceLastSeen = now - row.last_seen;
        const isDead = timeSinceLastSeen > this.deadAgentThreshold;

        // Compute status
        let status: DashboardAgentStatus;
        if (isDead) {
          status = 'Dead';
        } else {
          status = row.status as AgentStatus;
        }

        // Get progress from current task if exists
        let progress = 0;
        if (row.current_task_id) {
          const taskRow = this.db.prepare(SQL.GET_AGENT_PROGRESS).get(row.current_task_id) as
            | { progress_percent: number }
            | undefined;
          if (taskRow) {
            progress = taskRow.progress_percent;
          }
        }

        return {
          id: row.id,
          pid: row.pid,
          role: row.role,
          status,
          currentTaskId: row.current_task_id,
          lastSeen: row.last_seen,
          worktreePath: row.worktree_path,
          createdAt: row.created_at,
          isActive: row.is_active === 1,
          progress,
        };
      });
    });
  }

  /**
   * Get all tasks ordered by status and progress
   */
  getTasks(): Task[] {
    return this.executeWithRetry(() => {
      const rows = this.db.prepare(SQL.GET_ALL_TASKS).all() as RawTask[];

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as TaskStatus,
        assignedAgentId: row.assigned_agent_id,
        progressPercent: row.progress_percent,
        dependencies: row.dependencies,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
      }));
    });
  }

  /**
   * Get logs for a specific agent
   *
   * @param agentId - Agent ID to get logs for
   * @param limit - Maximum number of logs to return (default 100)
   */
  getLogsForAgent(agentId: string, limit = 100): LogEntry[] {
    return this.executeWithRetry(() => {
      const rows = this.db.prepare(SQL.GET_LOGS_FOR_AGENT).all(agentId, limit) as RawLog[];

      // Reverse to get chronological order (oldest first)
      return rows
        .map((row) => ({
          id: row.id,
          agentId: row.agent_id,
          level: row.level as LogLevel,
          message: row.message,
          timestamp: row.timestamp,
        }))
        .reverse();
    });
  }

  /**
   * Get aggregated metrics for the header widget
   */
  getAggregatedMetrics(): AggregatedMetrics {
    return this.executeWithRetry(() => {
      const metricsRow = this.db.prepare(SQL.GET_AGGREGATED_METRICS).get() as {
        total_tokens: number;
        total_cost: number;
      };

      const agents = this.getAgents();
      const activeAgents = agents.filter((a) => a.status !== 'Dead').length;

      return {
        totalTokens: metricsRow.total_tokens,
        totalCost: metricsRow.total_cost,
        activeAgents,
        totalAgents: agents.length,
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

// ============================================================================
// Raw Row Types (from SQLite)
// ============================================================================

interface RawAgent {
  id: string;
  pid: number;
  role: string;
  status: string;
  current_task_id: string | null;
  last_seen: number;
  worktree_path: string | null;
  created_at: number;
  is_active: number;
}

interface RawTask {
  id: string;
  title: string;
  status: string;
  assigned_agent_id: string | null;
  progress_percent: number;
  dependencies: string | null;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
}

interface RawLog {
  id: number;
  agent_id: string;
  level: string;
  message: string;
  timestamp: number;
}
