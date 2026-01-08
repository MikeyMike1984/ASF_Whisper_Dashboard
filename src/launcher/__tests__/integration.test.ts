/**
 * Integration tests for the full launcher lifecycle
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SwarmLauncher } from '../SwarmLauncher';
import { PidFileManager } from '../pid/PidFileManager';
import { DEFAULT_CONFIG } from '../config/defaults';
import { LauncherConfig } from '../config/types';
import { ManagedProcess } from '../types';

describe('Launcher Integration', () => {
  let tempDir: string;
  let testConfig: LauncherConfig;
  let launcher: SwarmLauncher | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-integration-'));

    // Clean up any stale PID file from previous test runs
    const pidManager = new PidFileManager();
    if (pidManager.exists()) {
      pidManager.remove();
    }

    testConfig = {
      ...DEFAULT_CONFIG,
      dashboard: {
        enabled: false,
        pollInterval: 500,
        dbPath: path.join(tempDir, 'test.db'),
      },
      agents: {
        ...DEFAULT_CONFIG.agents,
        count: 2,
        autoRestart: false,
      },
      shutdown: {
        gracePeriod: 2000,
        forceAfter: 3000,
      },
    };
  });

  afterEach(async () => {
    if (launcher) {
      try {
        await launcher.stop(true);
      } catch {
        // Ignore
      }
      launcher = null;
    }

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Full Lifecycle', () => {
    it('should complete start-run-stop cycle', async () => {
      launcher = new SwarmLauncher({ config: testConfig });

      const events: string[] = [];
      launcher.on('processStart', (p: ManagedProcess) => events.push(`start:${p.id}`));
      launcher.on('processStop', (p: ManagedProcess) => events.push(`stop:${p.id}`));
      launcher.on('ready', () => events.push('ready'));
      launcher.on('shutdown', () => events.push('shutdown'));

      // Start
      await launcher.start();
      expect(launcher.getStatus().status).toBe('running');

      // Wait for processes to fully start
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(events).toContain('ready');

      // Verify processes
      const processes = launcher.getProcesses();
      expect(processes.filter((p) => p.type === 'agent')).toHaveLength(2);

      // Stop
      await launcher.stop();
      expect(launcher.getStatus().status).toBe('stopped');
      expect(events).toContain('shutdown');
    });

    it('should handle graceful shutdown', async () => {
      launcher = new SwarmLauncher({ config: testConfig });

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stopStart = Date.now();
      await launcher.stop(false); // Graceful
      const stopDuration = Date.now() - stopStart;

      // Should complete within grace period
      expect(stopDuration).toBeLessThan(testConfig.shutdown.forceAfter);
      expect(launcher.getStatus().status).toBe('stopped');
    });

    it('should handle force shutdown', async () => {
      launcher = new SwarmLauncher({ config: testConfig });

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stopStart = Date.now();
      await launcher.stop(true); // Force
      const stopDuration = Date.now() - stopStart;

      // Should complete quickly
      expect(stopDuration).toBeLessThan(2000);
      expect(launcher.getStatus().status).toBe('stopped');
    });
  });

  describe('PID File Management', () => {
    it('should create PID file on start', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      const pidManager = new PidFileManager();

      await launcher.start();

      expect(pidManager.exists()).toBe(true);
      const pidData = pidManager.read();
      expect(pidData?.launcherPid).toBe(process.pid);
    });

    it('should remove PID file on stop', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      const pidManager = new PidFileManager();

      await launcher.start();
      expect(pidManager.exists()).toBe(true);

      await launcher.stop();
      expect(pidManager.exists()).toBe(false);
    });

    it('should clean up stale PID file', async () => {
      const pidManager = new PidFileManager();

      // Create stale PID file (non-existent process)
      pidManager.write(99999999, []);
      expect(pidManager.exists()).toBe(true);
      expect(pidManager.isStale()).toBe(true);

      // Start should clean up stale file
      launcher = new SwarmLauncher({ config: testConfig });
      await launcher.start();

      // Should have new PID
      const pidData = pidManager.read();
      expect(pidData?.launcherPid).toBe(process.pid);
    });

    it('should prevent double launch', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      await launcher.start();

      const launcher2 = new SwarmLauncher({ config: testConfig });
      await expect(launcher2.start()).rejects.toThrow(/already running/);
    });
  });

  describe('Process Management', () => {
    it('should track all spawned processes', async () => {
      launcher = new SwarmLauncher({
        config: {
          ...testConfig,
          agents: { ...testConfig.agents, count: 3 },
        },
      });

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const processes = launcher.getProcesses();

      // Should have 3 agents (no dashboard)
      expect(processes).toHaveLength(3);
      expect(processes.every((p) => p.type === 'agent')).toBe(true);
    });

    it('should start dashboard first when enabled', async () => {
      const configWithDashboard = {
        ...testConfig,
        dashboard: { ...testConfig.dashboard, enabled: true },
        agents: { ...testConfig.agents, count: 1 },
      };

      launcher = new SwarmLauncher({ config: configWithDashboard });

      const startOrder: string[] = [];
      launcher.on('processStart', (p: ManagedProcess) => startOrder.push(p.type));

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Dashboard should be first
      expect(startOrder[0]).toBe('dashboard');
    });
  });

  describe('Configuration Handling', () => {
    it('should respect agent count override', async () => {
      launcher = new SwarmLauncher({
        config: testConfig,
        agentCountOverride: 5,
      });

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const agents = launcher.getProcesses().filter((p) => p.type === 'agent');
      expect(agents).toHaveLength(5);
    });

    it('should respect noDashboard override', async () => {
      const configWithDashboard = {
        ...testConfig,
        dashboard: { ...testConfig.dashboard, enabled: true },
      };

      launcher = new SwarmLauncher({
        config: configWithDashboard,
        noDashboard: true,
      });

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dashboard = launcher.getProcesses().find((p) => p.type === 'dashboard');
      expect(dashboard).toBeUndefined();
    });
  });

  describe('Event Emission', () => {
    it('should emit events in correct order', async () => {
      launcher = new SwarmLauncher({
        config: {
          ...testConfig,
          agents: { ...testConfig.agents, count: 1 },
        },
      });

      const events: string[] = [];
      launcher.on('processStart', () => events.push('processStart'));
      launcher.on('ready', () => events.push('ready'));
      launcher.on('processStop', () => events.push('processStop'));
      launcher.on('shutdown', () => events.push('shutdown'));

      await launcher.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await launcher.stop();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ready event should be in the events
      expect(events).toContain('ready');

      // shutdown should be the last event
      const shutdownIndex = events.indexOf('shutdown');
      expect(shutdownIndex).toBeGreaterThanOrEqual(0);
      expect(events[events.length - 1]).toBe('shutdown');
    });
  });
});
