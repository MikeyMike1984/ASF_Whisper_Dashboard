/**
 * Dashboard Renderer
 *
 * Main orchestrator class that manages the TUI dashboard.
 */

import { EventEmitter } from 'events';
import blessed from 'neo-blessed';
import { DashboardConfig, DashboardState } from './types';
import { createConfig, MIN_POLL_INTERVAL, MAX_POLL_INTERVAL } from './config';
import { DashboardRepository } from './db/DashboardRepository';
import { StateStore } from './polling/StateStore';
import { PollingEngine } from './polling/PollingEngine';
import { HeaderWidget } from './widgets/HeaderWidget';
import { AgentGridWidget } from './widgets/AgentGridWidget';
import { TaskQueueWidget } from './widgets/TaskQueueWidget';
import { WhisperLogWidget } from './widgets/WhisperLogWidget';

// ============================================================================
// Dashboard Renderer Class
// ============================================================================

/**
 * Main dashboard renderer orchestrator
 */
export class DashboardRenderer extends EventEmitter {
  private config: DashboardConfig;
  private screen: blessed.Widgets.Screen | null = null;
  private repository: DashboardRepository | null = null;
  private store: StateStore;
  private pollingEngine: PollingEngine | null = null;

  // Widgets
  private headerWidget: HeaderWidget | null = null;
  private agentGridWidget: AgentGridWidget | null = null;
  private taskQueueWidget: TaskQueueWidget | null = null;
  private whisperLogWidget: WhisperLogWidget | null = null;

  private running = false;

  constructor(config: Partial<DashboardConfig> = {}) {
    super();
    this.config = createConfig(config);
    this.store = new StateStore();
  }

  /**
   * Start the dashboard
   */
  async start(): Promise<void> {
    if (this.running) return;

    try {
      // Initialize repository
      this.repository = new DashboardRepository(this.config.dbPath, this.config.deadAgentThreshold);

      // Initialize screen
      this.screen = blessed.screen({
        smartCSR: true,
        title: 'ASF Whisper Dashboard',
        fullUnicode: true,
        dockBorders: true,
        autoPadding: true,
      });

      // Create widgets
      this.createWidgets();

      // Setup keyboard handlers
      this.setupKeyboardHandlers();

      // Setup polling engine
      this.pollingEngine = new PollingEngine(this.repository, this.store, {
        interval: this.config.pollInterval,
      });

      // Listen for polling events
      this.pollingEngine.on('update', (state: DashboardState) => {
        this.renderWidgets(state);
        this.emit('stateChange', state);
      });

      this.pollingEngine.on('error', (error: Error) => {
        this.emit('error', error);
      });

      // Start polling
      this.pollingEngine.start();

      this.running = true;

      // Initial render
      this.screen.render();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the dashboard
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    // Stop polling
    if (this.pollingEngine) {
      this.pollingEngine.stop();
      this.pollingEngine = null;
    }

    // Close repository
    if (this.repository) {
      this.repository.close();
      this.repository = null;
    }

    // Destroy widgets
    this.destroyWidgets();

    // Destroy screen
    if (this.screen) {
      this.screen.destroy();
      this.screen = null;
    }
  }

  /**
   * Check if dashboard is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current state
   */
  getState(): DashboardState {
    return this.store.getState();
  }

  /**
   * Get current config
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Force an immediate poll
   */
  async forcePoll(): Promise<void> {
    if (this.pollingEngine) {
      await this.pollingEngine.forcePoll();
    }
  }

  /**
   * Select an agent
   */
  selectAgent(id: string): void {
    this.store.selectAgent(id);
    this.renderWidgets(this.store.getState());
    if (this.screen) this.screen.render();
  }

  /**
   * Clear agent selection
   */
  clearSelection(): void {
    this.store.clearSelection();
    if (this.agentGridWidget) {
      this.agentGridWidget.clearSelection();
    }
    this.renderWidgets(this.store.getState());
    if (this.screen) this.screen.render();
  }

  /**
   * Simulate a keypress (for testing)
   */
  simulateKeypress(key: string): void {
    if (!this.screen) return;

    // Emit key event directly
    (this.screen as any).emit('keypress', null, { name: key, full: key });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createWidgets(): void {
    if (!this.screen) return;

    // Header: full width, 1 line at top
    this.headerWidget = new HeaderWidget(this.screen);
    this.headerWidget.setPosition(0, 0, '100%', 1);

    // Agent Grid: left side, below header
    this.agentGridWidget = new AgentGridWidget(this.screen, {
      rows: this.config.gridRows,
      cols: this.config.gridCols,
    });
    this.agentGridWidget.setPosition(0, 1, '50%', '50%');

    // Task Queue: left side, bottom
    this.taskQueueWidget = new TaskQueueWidget(this.screen);
    this.taskQueueWidget.setPosition(0, '50%+1', '50%', '50%-1');

    // Whisper Log: right side
    this.whisperLogWidget = new WhisperLogWidget(this.screen);
    this.whisperLogWidget.setPosition('50%', 1, '50%', '100%-1');
  }

  private destroyWidgets(): void {
    this.headerWidget?.destroy();
    this.headerWidget = null;

    this.agentGridWidget?.destroy();
    this.agentGridWidget = null;

    this.taskQueueWidget?.destroy();
    this.taskQueueWidget = null;

    this.whisperLogWidget?.destroy();
    this.whisperLogWidget = null;
  }

  private renderWidgets(state: DashboardState): void {
    this.headerWidget?.render(state);
    this.agentGridWidget?.render(state);
    this.taskQueueWidget?.render(state);
    this.whisperLogWidget?.render(state);
  }

  private setupKeyboardHandlers(): void {
    if (!this.screen) return;

    // Quit
    this.screen.key(['q', 'Q', 'C-c'], () => {
      this.emit('exit');
      this.stop();
    });

    // Navigation
    this.screen.key(['left'], () => {
      if (this.agentGridWidget) {
        this.agentGridWidget.selectPrev();
        this.updateSelectionFromGrid();
      }
    });

    this.screen.key(['right'], () => {
      if (this.agentGridWidget) {
        this.agentGridWidget.selectNext();
        this.updateSelectionFromGrid();
      }
    });

    this.screen.key(['up'], () => {
      if (this.agentGridWidget) {
        this.agentGridWidget.selectUp();
        this.updateSelectionFromGrid();
      }
    });

    this.screen.key(['down'], () => {
      if (this.agentGridWidget) {
        this.agentGridWidget.selectDown();
        this.updateSelectionFromGrid();
      }
    });

    // Enter to focus whisper log
    this.screen.key(['enter'], () => {
      if (this.whisperLogWidget) {
        this.whisperLogWidget.focus();
      }
    });

    // Escape to clear selection
    this.screen.key(['escape'], () => {
      this.clearSelection();
    });

    // Refresh
    this.screen.key(['r', 'R'], async () => {
      await this.forcePoll();
    });

    // Adjust poll interval
    this.screen.key(['+', '='], () => {
      this.adjustPollInterval(250);
    });

    this.screen.key(['-', '_'], () => {
      this.adjustPollInterval(-250);
    });

    // Handle resize
    this.screen.on('resize', () => {
      this.renderWidgets(this.store.getState());
      this.screen?.render();
    });
  }

  private updateSelectionFromGrid(): void {
    if (!this.agentGridWidget) return;

    const agentId = this.agentGridWidget.getSelectedAgentId();
    if (agentId) {
      this.store.selectAgent(agentId);
    } else {
      this.store.clearSelection();
    }

    this.renderWidgets(this.store.getState());
    this.screen?.render();
  }

  private adjustPollInterval(delta: number): void {
    const newInterval = Math.max(MIN_POLL_INTERVAL, Math.min(MAX_POLL_INTERVAL, this.config.pollInterval + delta));
    this.config.pollInterval = newInterval;

    if (this.pollingEngine) {
      this.pollingEngine.setInterval(newInterval);
    }
  }
}
