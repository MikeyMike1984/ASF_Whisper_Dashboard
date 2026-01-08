/**
 * SwarmPulse SDK - Main Class
 *
 * Singleton SDK for ASF agents to report status to SQLite without stdout.
 * Zero token overhead monitoring for agent swarms.
 */

import { initializeDatabase } from './db/schema';
import { SwarmRepository } from './db/repository';
import {
  SwarmPulseConfig,
  DEFAULT_CONFIG,
  AgentStatus,
  TaskStatus,
  LogLevel,
} from './types';

/**
 * SwarmPulse SDK singleton class
 *
 * @example
 * ```typescript
 * const pulse = SwarmPulse.getInstance();
 * const agentId = pulse.registerAgent('developer', 'feature/auth');
 * pulse.setStatus(AgentStatus.Busy);
 * pulse.progress('task-123', 50, 'Working on feature');
 * pulse.capture('Processing auth module');
 * pulse.shutdown();
 * ```
 */
export class SwarmPulse {
  private static instance: SwarmPulse | null = null;

  private config: SwarmPulseConfig;
  private repo: SwarmRepository;
  private agentId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isShutdown = false;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor(config: SwarmPulseConfig) {
    this.config = config;
    const db = initializeDatabase(config.dbPath);
    this.repo = new SwarmRepository(db);
  }

  /**
   * Get the singleton instance of SwarmPulse
   *
   * @param config - Configuration options (only applied on first call)
   * @returns The SwarmPulse singleton instance
   */
  static getInstance(config?: Partial<SwarmPulseConfig>): SwarmPulse {
    if (!SwarmPulse.instance) {
      const fullConfig: SwarmPulseConfig = {
        ...DEFAULT_CONFIG,
        ...config,
      };
      SwarmPulse.instance = new SwarmPulse(fullConfig);
    }
    return SwarmPulse.instance;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  static resetInstance(): void {
    if (SwarmPulse.instance) {
      SwarmPulse.instance.shutdown();
      SwarmPulse.instance = null;
    }
  }

  // ============================================================================
  // Agent Lifecycle
  // ============================================================================

  /**
   * Register a new agent
   *
   * @param role - Agent role (e.g., 'developer', 'qa', 'architect')
   * @param worktreePath - Optional git worktree path
   * @returns The unique agent ID
   * @throws Error if agent already registered
   */
  registerAgent(role: string, worktreePath?: string): string {
    if (this.agentId) {
      throw new Error('Agent already registered. Call deregisterAgent() first.');
    }

    // Generate unique ID: agent-{pid}-{timestamp}
    this.agentId = `agent-${process.pid}-${Date.now()}`;
    const now = Date.now();

    this.repo.createAgent({
      id: this.agentId,
      pid: process.pid,
      role,
      status: AgentStatus.Idle,
      currentTaskId: null,
      lastSeen: now,
      worktreePath: worktreePath ?? null,
      createdAt: now,
      isActive: true,
    });

    // Start automatic heartbeat
    this.startHeartbeat();

    return this.agentId;
  }

  /**
   * Deregister the current agent
   *
   * @throws Error if no agent registered
   */
  deregisterAgent(): void {
    if (!this.agentId) {
      throw new Error('No agent registered');
    }

    this.stopHeartbeat();
    this.repo.deactivateAgent(this.agentId);
    this.agentId = null;
  }

  /**
   * Get the current agent ID
   *
   * @returns The agent ID or null if not registered
   */
  getAgentId(): string | null {
    return this.agentId;
  }

  // ============================================================================
  // Status Updates
  // ============================================================================

  /**
   * Send a heartbeat to update last_seen timestamp
   */
  heartbeat(): void {
    if (!this.agentId) return;
    this.repo.updateAgent(this.agentId, { lastSeen: Date.now() });
  }

  /**
   * Set the agent's current status
   *
   * @param status - New status (Idle, Busy, Error)
   * @throws Error if no agent registered
   */
  setStatus(status: AgentStatus): void {
    if (!this.agentId) {
      throw new Error('No agent registered');
    }
    this.repo.updateAgent(this.agentId, { status });
  }

  // ============================================================================
  // Task Tracking
  // ============================================================================

  /**
   * Report progress on a task
   *
   * Creates the task if it doesn't exist, updates progress if it does.
   *
   * @param taskId - Unique task identifier
   * @param percent - Completion percentage (0-100)
   * @param title - Optional task title (used on creation)
   * @throws Error if no agent registered
   */
  progress(taskId: string, percent: number, title?: string): void {
    if (!this.agentId) {
      throw new Error('No agent registered');
    }

    const now = Date.now();
    let task = this.repo.getTask(taskId);

    if (!task) {
      // Create new task
      this.repo.createTask({
        id: taskId,
        title: title ?? taskId,
        status: percent === 100 ? TaskStatus.Complete : TaskStatus.InProgress,
        assignedAgentId: this.agentId,
        progressPercent: percent,
        dependencies: null,
        createdAt: now,
        startedAt: now,
        completedAt: percent === 100 ? now : null,
      });
    } else {
      // Update existing task
      this.repo.updateTask(taskId, {
        progressPercent: percent,
        status: percent === 100 ? TaskStatus.Complete : TaskStatus.InProgress,
        startedAt: task.startedAt ?? now,
        completedAt: percent === 100 ? now : null,
      });
    }

    // Update agent's current task
    this.repo.updateAgent(this.agentId, { currentTaskId: taskId });
  }

  // ============================================================================
  // Logging (Whisper)
  // ============================================================================

  /**
   * Capture a whisper log message
   *
   * Messages are written to the database, not stdout.
   *
   * @param message - Log message
   * @param level - Log level (default: Info)
   * @throws Error if no agent registered
   */
  capture(message: string, level: LogLevel = LogLevel.Info): void {
    if (!this.agentId) {
      throw new Error('No agent registered');
    }

    this.repo.insertLog(this.agentId, message, level);
    this.repo.pruneOldLogs(this.agentId, this.config.maxLogEntries);
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Report token usage
   *
   * @param count - Number of tokens used
   * @throws Error if no agent registered
   */
  reportTokens(count: number): void {
    if (!this.agentId) {
      throw new Error('No agent registered');
    }
    this.repo.insertMetric(this.agentId, count, 0);
  }

  /**
   * Report estimated cost
   *
   * @param amount - Cost in USD
   * @throws Error if no agent registered
   */
  reportCost(amount: number): void {
    if (!this.agentId) {
      throw new Error('No agent registered');
    }
    this.repo.insertMetric(this.agentId, 0, amount);
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Gracefully shutdown the SDK
   *
   * Stops heartbeat, deregisters agent if active, and closes database.
   */
  shutdown(): void {
    if (this.isShutdown) return;
    this.isShutdown = true;

    this.stopHeartbeat();

    if (this.agentId) {
      try {
        this.repo.deactivateAgent(this.agentId);
      } catch {
        // Ignore errors during shutdown
      }
      this.agentId = null;
    }

    try {
      this.repo.close();
    } catch {
      // Ignore errors during shutdown
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Start the automatic heartbeat timer
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, this.config.heartbeatInterval);

    // Don't keep Node.js alive just for heartbeat
    this.heartbeatTimer.unref();
  }

  /**
   * Stop the automatic heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
