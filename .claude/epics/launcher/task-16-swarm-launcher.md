# Task 16: SwarmLauncher Main Class

## Category
Core Logic

## Objective
Implement the main SwarmLauncher orchestrator class that coordinates all launcher components.

## Dependencies
- task-10 (ConfigLoader)
- task-12 (PidFileManager)
- task-13 (ProcessPool)
- task-14 (ProcessManager)
- task-15 (SignalHandler)

## Deliverables
1. `src/launcher/SwarmLauncher.ts` - Main orchestrator class
2. `src/launcher/SwarmLauncher.test.ts` - Unit tests

## Implementation

### SwarmLauncher.ts
```typescript
import { EventEmitter } from 'events';
import { LauncherConfig, ManagedProcess, SwarmStatus, SwarmState, LauncherEvents } from './types';
import { ConfigLoader } from './config/ConfigLoader';
import { ProcessManager } from './process/ProcessManager';
import { ProcessPool } from './process/ProcessPool';
import { PidFileManager } from './pid/PidFileManager';
import { SignalHandler } from './signals/SignalHandler';

export interface SwarmLauncherOptions {
  config?: LauncherConfig;
  configPath?: string;
  agentCountOverride?: number;
  noDashboard?: boolean;
}

export class SwarmLauncher extends EventEmitter {
  private config: LauncherConfig;
  private pool: ProcessPool;
  private processManager: ProcessManager;
  private pidManager: PidFileManager;
  private signalHandler: SignalHandler;
  private status: SwarmStatus = 'idle';
  private startedAt?: number;

  constructor(options: SwarmLauncherOptions = {}) {
    super();

    // Load configuration
    if (options.config) {
      this.config = options.config;
    } else {
      const loader = new ConfigLoader(options.configPath);
      this.config = loader.load();
    }

    // Apply overrides
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
      onShutdown: () => this.stop()
    });

    // Forward events
    this.processManager.on('processStart', (p) => this.emit('processStart', p));
    this.processManager.on('processStop', (p) => this.emit('processStop', p));
    this.processManager.on('processCrash', (p, e) => this.handleProcessCrash(p, e));
  }

  async start(): Promise<void> {
    // Check for existing instance
    if (this.pidManager.exists() && !this.pidManager.isStale()) {
      throw new Error('Swarm is already running. Use "asf-swarm stop" first.');
    }

    // Clean up stale PID file
    if (this.pidManager.isStale()) {
      this.pidManager.remove();
    }

    this.status = 'starting';
    this.startedAt = Date.now();
    this.signalHandler.register();

    try {
      // Start dashboard first if enabled
      if (this.config.dashboard.enabled) {
        await this.startDashboard();
        await this.waitForDashboardReady();
      }

      // Start agents with staggered delay
      await this.startAgents();

      // Write PID file
      this.pidManager.write(process.pid, this.pool.getAll());

      this.status = 'running';
      this.emit('ready');
    } catch (error) {
      this.status = 'stopped';
      await this.stop(true);
      throw error;
    }
  }

  async stop(force: boolean = false): Promise<void> {
    if (this.status === 'stopping' || this.status === 'stopped') {
      return;
    }

    this.status = 'stopping';
    const signal = force ? 'SIGKILL' : 'SIGTERM';

    // Stop agents first
    const agents = this.pool.getAgents();
    await Promise.all(agents.map(a => this.processManager.kill(a.id, signal)));

    // Then stop dashboard
    const dashboard = this.pool.getDashboard();
    if (dashboard) {
      await this.processManager.kill(dashboard.id, signal);
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
  }

  private async startDashboard(): Promise<void> {
    await this.processManager.spawn('node', ['dist/dashboard/index.js'], {
      type: 'dashboard',
      id: 'dashboard',
      env: {
        ASF_DB_PATH: this.config.dashboard.dbPath,
        ASF_POLL_INTERVAL: String(this.config.dashboard.pollInterval)
      }
    });
  }

  private async waitForDashboardReady(): Promise<void> {
    // Wait for dashboard to initialize (could check DB or health endpoint)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async startAgents(): Promise<void> {
    const agentCount = this.config.agents.count;

    for (let i = 0; i < agentCount; i++) {
      const agentId = `agent-${String(i + 1).padStart(2, '0')}`;

      await this.processManager.spawn('node', ['dist/agents/index.js'], {
        type: 'agent',
        id: agentId,
        role: this.config.agents.defaultRole,
        env: {
          ASF_AGENT_ID: agentId,
          ASF_QUIET_MODE: String(this.config.agents.quietMode),
          ASF_DB_PATH: this.config.dashboard.dbPath
        }
      });

      // Staggered start (100ms between agents)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async waitForShutdown(): Promise<void> {
    const startTime = Date.now();
    const gracePeriod = this.config.shutdown.gracePeriod;

    while (!this.pool.allStopped()) {
      if (Date.now() - startTime > gracePeriod) {
        // Force kill remaining processes
        await this.processManager.killAll('SIGKILL');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async handleProcessCrash(process: ManagedProcess, error: Error): Promise<void> {
    this.emit('processCrash', process, error);

    if (this.config.agents.autoRestart && process.type === 'agent') {
      const restartCount = this.pool.incrementRestartCount(process.id);

      if (restartCount <= this.config.agents.maxRestarts) {
        await new Promise(resolve =>
          setTimeout(resolve, this.config.agents.restartDelay)
        );

        await this.processManager.spawn('node', ['dist/agents/index.js'], {
          type: 'agent',
          id: process.id,
          role: process.role,
          env: {
            ASF_AGENT_ID: process.id,
            ASF_QUIET_MODE: String(this.config.agents.quietMode)
          }
        });
      }
    }
  }

  getStatus(): SwarmState {
    return {
      status: this.status,
      processes: this.pool.getAll(),
      startedAt: this.startedAt
    };
  }

  getProcesses(): ManagedProcess[] {
    return this.pool.getAll();
  }

  getConfig(): LauncherConfig {
    return this.config;
  }
}
```

## Acceptance Criteria
- [ ] Orchestrates dashboard + agent startup
- [ ] Enforces startup sequence (dashboard first)
- [ ] Handles graceful shutdown with timeout
- [ ] Supports agent count override
- [ ] Supports --no-dashboard mode
- [ ] Auto-restarts crashed agents (if enabled)
- [ ] Emits lifecycle events
- [ ] Prevents double-launch via PID file
- [ ] 100% test coverage

## Test Specification
```typescript
describe('SwarmLauncher', () => {
  it('should start dashboard before agents', async () => {
    const launcher = new SwarmLauncher({ config: testConfig });
    const events: string[] = [];

    launcher.on('processStart', (p) => events.push(p.id));
    await launcher.start();

    expect(events[0]).toBe('dashboard');
    expect(events[1]).toMatch(/^agent-/);

    await launcher.stop();
  });

  it('should skip dashboard in no-dashboard mode', async () => {
    const launcher = new SwarmLauncher({ config: testConfig, noDashboard: true });
    await launcher.start();

    expect(launcher.getProcesses().find(p => p.type === 'dashboard')).toBeUndefined();

    await launcher.stop();
  });

  it('should prevent double-launch', async () => {
    const launcher1 = new SwarmLauncher({ config: testConfig });
    const launcher2 = new SwarmLauncher({ config: testConfig });

    await launcher1.start();
    await expect(launcher2.start()).rejects.toThrow(/already running/);

    await launcher1.stop();
  });
});
```

## Estimated Effort
4-5 hours

## Notes
- This is the most complex component, integrating all others
- Startup sequence is critical for dashboard → agent order
- Auto-restart logic should respect maxRestarts limit
- Consider health checks for dashboard readiness
