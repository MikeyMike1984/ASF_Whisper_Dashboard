/**
 * SwarmPulse Repository - Data Access Layer
 *
 * Provides CRUD operations for all SwarmPulse entities using prepared statements.
 */

import Database from 'better-sqlite3';
import {
  Agent,
  Task,
  LogEntry,
  MetricEntry,
  AgentStatus,
  TaskStatus,
  LogLevel,
} from '../types';

/**
 * Repository for SwarmPulse database operations
 *
 * All methods use prepared statements for security and performance.
 */
export class SwarmRepository {
  private db: Database.Database;

  // Prepared statements (initialized in prepareStatements)
  private stmtInsertAgent!: Database.Statement;
  private stmtGetAgent!: Database.Statement;
  private stmtUpdateAgent!: Database.Statement;
  private stmtDeactivateAgent!: Database.Statement;

  private stmtInsertTask!: Database.Statement;
  private stmtGetTask!: Database.Statement;
  private stmtUpdateTask!: Database.Statement;

  private stmtInsertLog!: Database.Statement;
  private stmtGetLogs!: Database.Statement;
  private stmtDeleteOldLogs!: Database.Statement;

  private stmtInsertMetric!: Database.Statement;
  private stmtGetMetrics!: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  /**
   * Prepare all SQL statements for reuse
   */
  private prepareStatements(): void {
    // Agent statements
    this.stmtInsertAgent = this.db.prepare(`
      INSERT INTO agents (id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active)
      VALUES (@id, @pid, @role, @status, @currentTaskId, @lastSeen, @worktreePath, @createdAt, @isActive)
    `);

    this.stmtGetAgent = this.db.prepare(`
      SELECT id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active
      FROM agents WHERE id = ?
    `);

    this.stmtUpdateAgent = this.db.prepare(`
      UPDATE agents SET
        status = COALESCE(@status, status),
        current_task_id = COALESCE(@currentTaskId, current_task_id),
        last_seen = COALESCE(@lastSeen, last_seen),
        worktree_path = COALESCE(@worktreePath, worktree_path),
        is_active = COALESCE(@isActive, is_active)
      WHERE id = @id
    `);

    this.stmtDeactivateAgent = this.db.prepare(`
      UPDATE agents SET is_active = 0 WHERE id = ?
    `);

    // Task statements
    this.stmtInsertTask = this.db.prepare(`
      INSERT INTO tasks (id, title, status, assigned_agent_id, progress_percent, dependencies, created_at, started_at, completed_at)
      VALUES (@id, @title, @status, @assignedAgentId, @progressPercent, @dependencies, @createdAt, @startedAt, @completedAt)
    `);

    this.stmtGetTask = this.db.prepare(`
      SELECT id, title, status, assigned_agent_id, progress_percent, dependencies, created_at, started_at, completed_at
      FROM tasks WHERE id = ?
    `);

    this.stmtUpdateTask = this.db.prepare(`
      UPDATE tasks SET
        title = COALESCE(@title, title),
        status = COALESCE(@status, status),
        assigned_agent_id = COALESCE(@assignedAgentId, assigned_agent_id),
        progress_percent = COALESCE(@progressPercent, progress_percent),
        dependencies = COALESCE(@dependencies, dependencies),
        started_at = COALESCE(@startedAt, started_at),
        completed_at = COALESCE(@completedAt, completed_at)
      WHERE id = @id
    `);

    // Log statements
    this.stmtInsertLog = this.db.prepare(`
      INSERT INTO logs (agent_id, level, message, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    this.stmtGetLogs = this.db.prepare(`
      SELECT id, agent_id, level, message, timestamp
      FROM logs WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?
    `);

    this.stmtDeleteOldLogs = this.db.prepare(`
      DELETE FROM logs WHERE agent_id = ? AND id NOT IN (
        SELECT id FROM logs WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?
      )
    `);

    // Metric statements
    this.stmtInsertMetric = this.db.prepare(`
      INSERT INTO metrics (agent_id, tokens_used, estimated_cost, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    this.stmtGetMetrics = this.db.prepare(`
      SELECT id, agent_id, tokens_used, estimated_cost, timestamp
      FROM metrics WHERE agent_id = ? ORDER BY timestamp DESC
    `);
  }

  // ============================================================================
  // Agent Operations
  // ============================================================================

  /**
   * Create a new agent record
   */
  createAgent(agent: Agent): string {
    this.stmtInsertAgent.run({
      id: agent.id,
      pid: agent.pid,
      role: agent.role,
      status: agent.status,
      currentTaskId: agent.currentTaskId,
      lastSeen: agent.lastSeen,
      worktreePath: agent.worktreePath,
      createdAt: agent.createdAt,
      isActive: agent.isActive ? 1 : 0,
    });
    return agent.id;
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent | undefined {
    const row = this.stmtGetAgent.get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    return {
      id: row.id as string,
      pid: row.pid as number,
      role: row.role as string,
      status: row.status as AgentStatus,
      currentTaskId: row.current_task_id as string | null,
      lastSeen: row.last_seen as number,
      worktreePath: row.worktree_path as string | null,
      createdAt: row.created_at as number,
      isActive: (row.is_active as number) === 1,
    };
  }

  /**
   * Update agent fields
   */
  updateAgent(id: string, updates: Partial<Agent>): void {
    this.stmtUpdateAgent.run({
      id,
      status: updates.status ?? null,
      currentTaskId: updates.currentTaskId ?? null,
      lastSeen: updates.lastSeen ?? null,
      worktreePath: updates.worktreePath ?? null,
      isActive: updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
    });
  }

  /**
   * Deactivate an agent (soft delete)
   */
  deactivateAgent(id: string): void {
    this.stmtDeactivateAgent.run(id);
  }

  // ============================================================================
  // Task Operations
  // ============================================================================

  /**
   * Create a new task record
   */
  createTask(task: Task): string {
    this.stmtInsertTask.run({
      id: task.id,
      title: task.title,
      status: task.status,
      assignedAgentId: task.assignedAgentId,
      progressPercent: task.progressPercent,
      dependencies: task.dependencies,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    });
    return task.id;
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | undefined {
    const row = this.stmtGetTask.get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    return {
      id: row.id as string,
      title: row.title as string,
      status: row.status as TaskStatus,
      assignedAgentId: row.assigned_agent_id as string | null,
      progressPercent: row.progress_percent as number,
      dependencies: row.dependencies as string | null,
      createdAt: row.created_at as number,
      startedAt: row.started_at as number | null,
      completedAt: row.completed_at as number | null,
    };
  }

  /**
   * Update task fields
   */
  updateTask(id: string, updates: Partial<Task>): void {
    this.stmtUpdateTask.run({
      id,
      title: updates.title ?? null,
      status: updates.status ?? null,
      assignedAgentId: updates.assignedAgentId ?? null,
      progressPercent: updates.progressPercent ?? null,
      dependencies: updates.dependencies ?? null,
      startedAt: updates.startedAt ?? null,
      completedAt: updates.completedAt ?? null,
    });
  }

  // ============================================================================
  // Log Operations
  // ============================================================================

  /**
   * Insert a log entry
   */
  insertLog(agentId: string, message: string, level: LogLevel): void {
    this.stmtInsertLog.run(agentId, level, message, Date.now());
  }

  /**
   * Get logs for an agent (most recent first)
   */
  getLogsForAgent(agentId: string, limit: number = 100): LogEntry[] {
    const rows = this.stmtGetLogs.all(agentId, limit) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as number,
      agentId: row.agent_id as string,
      level: row.level as LogLevel,
      message: row.message as string,
      timestamp: row.timestamp as number,
    }));
  }

  /**
   * Prune old logs to maintain circular buffer
   */
  pruneOldLogs(agentId: string, maxEntries: number): void {
    this.stmtDeleteOldLogs.run(agentId, agentId, maxEntries);
  }

  // ============================================================================
  // Metric Operations
  // ============================================================================

  /**
   * Insert a metric entry
   */
  insertMetric(agentId: string, tokensUsed: number, estimatedCost: number): void {
    this.stmtInsertMetric.run(agentId, tokensUsed, estimatedCost, Date.now());
  }

  /**
   * Get metrics for an agent (most recent first)
   */
  getMetricsForAgent(agentId: string): MetricEntry[] {
    const rows = this.stmtGetMetrics.all(agentId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as number,
      agentId: row.agent_id as string,
      tokensUsed: row.tokens_used as number,
      estimatedCost: row.estimated_cost as number,
      timestamp: row.timestamp as number,
    }));
  }

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
