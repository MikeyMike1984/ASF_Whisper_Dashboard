/**
 * State Store
 *
 * In-memory state cache for the dashboard with change detection.
 */

import { EventEmitter } from 'events';
import { DashboardState, DashboardAgent, Task, AggregatedMetrics } from '../types';

// ============================================================================
// Default State
// ============================================================================

/**
 * Create an empty initial state
 */
function createEmptyState(): DashboardState {
  return {
    agents: [],
    tasks: [],
    logs: new Map(),
    metrics: {
      totalTokens: 0,
      totalCost: 0,
      activeAgents: 0,
      totalAgents: 0,
    },
    selectedAgentId: null,
    lastPollTime: 0,
  };
}

// ============================================================================
// State Store Class
// ============================================================================

/**
 * In-memory state store with change detection and event emission
 */
export class StateStore extends EventEmitter {
  private state: DashboardState;

  constructor() {
    super();
    this.state = createEmptyState();
  }

  /**
   * Get the current state (returns a shallow copy)
   */
  getState(): DashboardState {
    return { ...this.state };
  }

  /**
   * Update state with partial state object
   * Creates a new state object (immutable update)
   * Emits 'change' event if state changed
   */
  setState(partial: Partial<DashboardState>): void {
    const hasChanged = this.hasChanged(partial);

    this.state = {
      ...this.state,
      ...partial,
      // Handle Map specially - create new Map if logs provided
      logs: partial.logs !== undefined ? new Map(partial.logs) : this.state.logs,
    };

    if (hasChanged) {
      this.emit('change', this.state);
    }
  }

  /**
   * Check if the new state differs from current state
   */
  hasChanged(newState: Partial<DashboardState>): boolean {
    if (newState.agents !== undefined) {
      if (!this.areAgentsEqual(this.state.agents, newState.agents)) {
        return true;
      }
    }

    if (newState.tasks !== undefined) {
      if (!this.areTasksEqual(this.state.tasks, newState.tasks)) {
        return true;
      }
    }

    if (newState.metrics !== undefined) {
      if (!this.areMetricsEqual(this.state.metrics, newState.metrics)) {
        return true;
      }
    }

    if (newState.selectedAgentId !== undefined) {
      if (this.state.selectedAgentId !== newState.selectedAgentId) {
        return true;
      }
    }

    if (newState.logs !== undefined) {
      // For logs, we consider any update as a change
      // (more efficient than deep comparison)
      return true;
    }

    return false;
  }

  /**
   * Get agent by ID
   */
  getAgentById(id: string): DashboardAgent | undefined {
    return this.state.agents.find((a) => a.id === id);
  }

  /**
   * Select an agent
   */
  selectAgent(id: string | null): void {
    if (this.state.selectedAgentId !== id) {
      this.state = {
        ...this.state,
        selectedAgentId: id,
      };
      this.emit('change', this.state);
    }
  }

  /**
   * Clear agent selection
   */
  clearSelection(): void {
    this.selectAgent(null);
  }

  /**
   * Get the currently selected agent
   */
  getSelectedAgent(): DashboardAgent | undefined {
    if (!this.state.selectedAgentId) return undefined;
    return this.getAgentById(this.state.selectedAgentId);
  }

  /**
   * Reset state to initial empty state
   */
  reset(): void {
    this.state = createEmptyState();
    this.emit('change', this.state);
  }

  // ============================================================================
  // Private Comparison Methods
  // ============================================================================

  private areAgentsEqual(a: DashboardAgent[], b: DashboardAgent[]): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (
        a[i].id !== b[i].id ||
        a[i].status !== b[i].status ||
        a[i].progress !== b[i].progress ||
        a[i].lastSeen !== b[i].lastSeen
      ) {
        return false;
      }
    }

    return true;
  }

  private areTasksEqual(a: Task[], b: Task[]): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (
        a[i].id !== b[i].id ||
        a[i].status !== b[i].status ||
        a[i].progressPercent !== b[i].progressPercent
      ) {
        return false;
      }
    }

    return true;
  }

  private areMetricsEqual(a: AggregatedMetrics, b: AggregatedMetrics): boolean {
    return (
      a.totalTokens === b.totalTokens &&
      a.totalCost === b.totalCost &&
      a.activeAgents === b.activeAgents &&
      a.totalAgents === b.totalAgents
    );
  }
}
