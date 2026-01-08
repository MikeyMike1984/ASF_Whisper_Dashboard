/**
 * Polling Engine
 *
 * Periodically polls the database and updates the state store.
 */

import { EventEmitter } from 'events';
import { DashboardRepository } from '../db/DashboardRepository';
import { StateStore } from './StateStore';
import { LogEntry } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PollingEngineOptions {
  /** Poll interval in milliseconds */
  interval: number;
}

// ============================================================================
// Polling Engine Class
// ============================================================================

/**
 * Engine that polls the database at regular intervals
 */
export class PollingEngine extends EventEmitter {
  private repository: DashboardRepository;
  private store: StateStore;
  private interval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    repository: DashboardRepository,
    store: StateStore,
    options: PollingEngineOptions
  ) {
    super();
    this.repository = repository;
    this.store = store;
    this.interval = options.interval;
  }

  /**
   * Start the polling engine
   */
  start(): void {
    if (this.running) return;

    this.running = true;

    // Do an initial poll immediately
    this.poll().catch((error) => this.emit('error', error));

    // Set up interval for subsequent polls
    this.timer = setInterval(() => {
      this.poll().catch((error) => this.emit('error', error));
    }, this.interval);
  }

  /**
   * Stop the polling engine
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Check if engine is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current poll interval
   */
  getInterval(): number {
    return this.interval;
  }

  /**
   * Set poll interval (takes effect on next interval)
   */
  setInterval(ms: number): void {
    this.interval = ms;

    // Restart timer if running
    if (this.running && this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.poll().catch((error) => this.emit('error', error));
      }, this.interval);
    }
  }

  /**
   * Force an immediate poll
   */
  async forcePoll(): Promise<void> {
    await this.poll();
  }

  /**
   * Perform a single poll cycle
   */
  private async poll(): Promise<void> {
    try {
      // Query database
      const agents = this.repository.getAgents();
      const tasks = this.repository.getTasks();
      const metrics = this.repository.getAggregatedMetrics();

      // Get logs for selected agent (if any)
      const selectedAgentId = this.store.getState().selectedAgentId;
      const logs = new Map<string, LogEntry[]>();

      if (selectedAgentId) {
        const agentLogs = this.repository.getLogsForAgent(selectedAgentId);
        logs.set(selectedAgentId, agentLogs);
      }

      // Prepare new state
      const newState = {
        agents,
        tasks,
        metrics,
        logs,
        lastPollTime: Date.now(),
      };

      // Check if state changed
      const hasChanged = this.store.hasChanged(newState);

      // Update store
      this.store.setState(newState);

      // Emit update event if changed
      if (hasChanged) {
        this.emit('update', this.store.getState());
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
}
