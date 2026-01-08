/**
 * Main SwarmLauncher orchestrator class
 */

import { EventEmitter } from 'events';
import {
  ManagedProcess,
  SwarmStatus,
  SwarmState,
} from './types';
import { LauncherConfig } from './config/types';
import { ConfigLoader } from './config/ConfigLoader';
import { ProcessManager } from './process/ProcessManager';
import { ProcessPool } from './process/ProcessPool';
import { PidFileManager } from './pid/PidFileManager';
import { SignalHandler } from './signals/SignalHandler';
import {
  AGENT_START_DELAY_MS,
  DASHBOARD_READY_DELAY_MS,
  SHUTDOWN_POLL_INTERVAL_MS,
} from './config/defaults';

/**
 * Options for SwarmLauncher initialization
 */
export interface SwarmLauncherOptions {
  /** Pre-loaded configuration (bypasses file loading) */
  config?: LauncherConfig;
  /** Path to configuration file */
  configPath?: string;
  /** Override agent count from config */
  agentCountOverride?: number;
  /** Disable dashboard regardless of config */
  noDashboard?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Main orchestrator for launching and managing the ASF swarm
 */
export class SwarmLauncher extends EventEmitter {
  private config: LauncherConfig;
  private pool: ProcessPool;
  private processManager: ProcessManager;
  private pidManager: PidFileManager;
  private signalHandler: SignalHandler;
  private status: SwarmStatus = 'idle';
  private startedAt?: number;
  private verbose: boolean;

  /**
   * Creates a new SwarmLauncher
   * @param options - Launcher options
   */
  constructor(options: SwarmLauncherOptions = {}) {
    super();

    this.verbose = options.verbose || false;

    // Load configuration
    if (options.config) {
      this.config = options.config;
    } else {
      const loader = new ConfigLoader(options.configPath);
      this.config = loader.load();
    }

    // Apply CLI overrides
    if (options.agentCountOverride !== undefined) {
      this.config.agents.count = options.agentCountOverride;
    }
    if (options.noDashboard) {
      this.config.dashboard.enabled = false;
    }

    // Initialize components
    this.pool = new ProcessPool();
    this.processManager = new ProcessManager(this.pool);
    this.pidManager = new PidFileManager();
    this.signalHandler = new SignalHandler({
      onShutdown: () => this.stop(),
    });

    // Forward process manager events
    this.processManager.on('processStart', (p: ManagedProcess) => {
      this.emit('processStart', p);
    });
    this.processManager.on('processStop', (p: ManagedProcess) => {
      this.emit('processStop', p);
    });
    this.processManager.on('processCrash', (p: ManagedProcess, e: Error) => {
      void this.handleProcessCrash(p, e);
    });

    if (this.verbose) {
      this.processManager.on('stdout', (id: string, data: string) => {
        console.log(`[${id}] ${data.trim()}`);
      });
      this.processManager.on('stderr', (id: string, data: string) => {
        console.error(`[${id}] ${data.trim()}`);
      });
    }
  }

  /**
   * Starts the swarm (dashboard + agents)
   */
  async start(): Promise<void> {
    // Check for existing instance
    if (this.pidManager.exists() && !this.pidManager.isStale()) {
      throw new Error('Swarm is already running. Use "asf-swarm stop" first.');
    }

    // Clean up stale PID file
    if (this.pidManager.isStale()) {
      this.log('Cleaning up stale PID file...');
      this.pidManager.remove();
    }

    this.status = 'starting';
    this.startedAt = Date.now();
    this.signalHandler.register();

    try {
      // Start dashboard first if enabled
      if (this.config.dashboard.enabled) {
        this.log('Starting dashboard...');
        await this.startDashboard();
        await this.waitForDashboardReady();
        this.log('Dashboard ready');
      }

      // Start agents with staggered delay
      this.log(`Starting ${this.config.agents.count} agents...`);
      await this.startAgents();

      // Write PID file
      this.pidManager.write(process.pid, this.pool.getAll());

      this.status = 'running';
      this.emit('ready');
      this.log('Swarm is running');
    } catch (error) {
      this.status = 'error';
      await this.stop(true);
      throw error;
    }
  }

  /**
   * Stops the swarm gracefully
   * @param force - Force kill processes immediately
   */
  async stop(force: boolean = false): Promise<void> {
    if (this.status === 'stopping' || this.status === 'stopped') {
      return;
    }

    this.status = 'stopping';
    this.log(force ? 'Force stopping swarm...' : 'Gracefully stopping swarm...');

    const signal = force ? 'SIGKILL' : 'SIGTERM';

    // Stop agents first
    const agents = this.pool.getAgents();
    this.log(`Stopping ${agents.length} agents...`);
    await Promise.all(
      agents
        .filter((a) => a.status === 'running' || a.status === 'starting')
        .map((a) => this.processManager.kill(a.id, { signal }).catch(() => {}))
    );

    // Then stop dashboard
    const dashboard = this.pool.getDashboard();
    if (dashboard && (dashboard.status === 'running' || dashboard.status === 'starting')) {
      this.log('Stopping dashboard...');
      await this.processManager.kill(dashboard.id, { signal }).catch(() => {});
    }

    // Wait for graceful shutdown or force after timeout
    if (!force) {
      await this.waitForShutdown();
    }

    // Cleanup
    this.pidManager.remove();
    this.signalHandler.unregister();
    this.status = 'stopped';
    this.emit('shutdown');
    this.log('Swarm stopped');
  }

  /**
   * Starts the dashboard process
   */
  private async startDashboard(): Promise<void> {
    // In a real implementation, this would start the actual dashboard binary
    // For now, we'll use a placeholder that can be configured
    await this.processManager.spawn('node', ['-e', 'setInterval(() => {}, 1000)'], {
      type: 'dashboard',
      id: 'dashboard',
      env: {
        ASF_DB_PATH: this.config.dashboard.dbPath,
        ASF_POLL_INTERVAL: String(this.config.dashboard.pollInterval),
      },
    });
  }

  /**
   * Waits for dashboard to be ready
   */
  private async waitForDashboardReady(): Promise<void> {
    // In a real implementation, this could check a health endpoint or DB state
    await this.delay(DASHBOARD_READY_DELAY_MS);
  }

  /**
   * Starts all agent processes
   */
  private async startAgents(): Promise<void> {
    const agentCount = this.config.agents.count;

    for (let i = 0; i < agentCount; i++) {
      const agentId = `agent-${String(i + 1).padStart(2, '0')}`;

      // In a real implementation, this would start actual agent processes
      await this.processManager.spawn('node', ['-e', 'setInterval(() => {}, 1000)'], {
        type: 'agent',
        id: agentId,
        role: this.config.agents.defaultRole,
        env: {
          ASF_AGENT_ID: agentId,
          ASF_QUIET_MODE: String(this.config.agents.quietMode),
          ASF_DB_PATH: this.config.dashboard.dbPath,
        },
      });

      // Staggered start to avoid overwhelming the system
      if (i < agentCount - 1) {
        await this.delay(AGENT_START_DELAY_MS);
      }
    }
  }

  /**
   * Waits for all processes to stop or timeout
   */
  private async waitForShutdown(): Promise<void> {
    const startTime = Date.now();
    const gracePeriod = this.config.shutdown.gracePeriod;

    while (!this.pool.allStopped()) {
      if (Date.now() - startTime > gracePeriod) {
        this.log('Grace period exceeded, force killing remaining processes...');
        await this.processManager.killAll('SIGKILL');
        break;
      }
      await this.delay(SHUTDOWN_POLL_INTERVAL_MS);
    }
  }

  /**
   * Handles a crashed process
   */
  private async handleProcessCrash(process: ManagedProcess, error: Error): Promise<void> {
    this.log(`Process ${process.id} crashed: ${error.message}`);
    this.emit('processCrash', process, error);

    // Auto-restart agents if enabled
    if (
      this.config.agents.autoRestart &&
      process.type === 'agent' &&
      this.status === 'running'
    ) {
      const restartCount = this.pool.incrementRestartCount(process.id);

      if (restartCount <= this.config.agents.maxRestarts) {
        this.log(`Restarting ${process.id} (attempt ${restartCount}/${this.config.agents.maxRestarts})...`);

        await this.delay(this.config.agents.restartDelay);

        await this.processManager.spawn('node', ['-e', 'setInterval(() => {}, 1000)'], {
          type: 'agent',
          id: process.id,
          role: process.role,
          env: {
            ASF_AGENT_ID: process.id,
            ASF_QUIET_MODE: String(this.config.agents.quietMode),
            ASF_DB_PATH: this.config.dashboard.dbPath,
          },
        });
      } else {
        this.log(`${process.id} exceeded max restarts (${this.config.agents.maxRestarts})`);
      }
    }
  }

  /**
   * Gets the current swarm state
   * @returns Current swarm state
   */
  getStatus(): SwarmState {
    return {
      status: this.status,
      processes: this.pool.getAll(),
      startedAt: this.startedAt,
    };
  }

  /**
   * Gets all managed processes
   * @returns Array of managed processes
   */
  getProcesses(): ManagedProcess[] {
    return this.pool.getAll();
  }

  /**
   * Gets the current configuration
   * @returns Current configuration
   */
  getConfig(): LauncherConfig {
    return this.config;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logs a message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[SwarmLauncher] ${message}`);
    }
  }
}
