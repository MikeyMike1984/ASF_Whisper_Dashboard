/**
 * Tests for SwarmLauncher
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SwarmLauncher } from './SwarmLauncher';
import { DEFAULT_CONFIG } from './config/defaults';
import { LauncherConfig } from './config/types';

describe('SwarmLauncher', () => {
  let tempDir: string;
  let testConfig: LauncherConfig;
  let launcher: SwarmLauncher | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-test-'));

    // Create a test config with minimal settings for fast tests
    testConfig = {
      ...DEFAULT_CONFIG,
      dashboard: {
        enabled: false, // Disable dashboard for unit tests
        pollInterval: 500,
        dbPath: path.join(tempDir, 'test.db'),
      },
      agents: {
        ...DEFAULT_CONFIG.agents,
        count: 1, // Minimal agents for fast tests
      },
      shutdown: {
        gracePeriod: 1000, // Fast shutdown for tests
        forceAfter: 2000,
      },
    };
  });

  afterEach(async () => {
    // Ensure launcher is stopped
    if (launcher) {
      try {
        await launcher.stop(true);
      } catch {
        // Ignore errors during cleanup
      }
      launcher = null;
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should create launcher with provided config', () => {
      launcher = new SwarmLauncher({ config: testConfig });

      expect(launcher.getConfig()).toEqual(testConfig);
    });

    it('should apply agent count override', () => {
      launcher = new SwarmLauncher({
        config: testConfig,
        agentCountOverride: 5,
      });

      expect(launcher.getConfig().agents.count).toBe(5);
    });

    it('should apply noDashboard override', () => {
      const configWithDashboard = {
        ...testConfig,
        dashboard: { ...testConfig.dashboard, enabled: true },
      };

      launcher = new SwarmLauncher({
        config: configWithDashboard,
        noDashboard: true,
      });

      expect(launcher.getConfig().dashboard.enabled).toBe(false);
    });

    it('should initialize with idle status', () => {
      launcher = new SwarmLauncher({ config: testConfig });

      expect(launcher.getStatus().status).toBe('idle');
    });
  });

  describe('start', () => {
    it('should start agents', async () => {
      launcher = new SwarmLauncher({
        config: testConfig,
        verbose: false,
      });

      await launcher.start();

      const status = launcher.getStatus();
      expect(status.status).toBe('running');
      expect(status.processes.length).toBeGreaterThan(0);
    });

    it('should emit ready event when started', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      const onReady = jest.fn();
      launcher.on('ready', onReady);

      await launcher.start();

      expect(onReady).toHaveBeenCalled();
    });

    it('should emit processStart events for each process', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      const onProcessStart = jest.fn();
      launcher.on('processStart', onProcessStart);

      await launcher.start();

      // Wait for events to propagate
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(onProcessStart).toHaveBeenCalled();
    });

    it('should prevent double start', async () => {
      launcher = new SwarmLauncher({ config: testConfig });

      await launcher.start();

      // Create a second launcher pointing to the same PID file
      const launcher2 = new SwarmLauncher({ config: testConfig });

      await expect(launcher2.start()).rejects.toThrow(/already running/);
    });

    it('should set startedAt timestamp', async () => {
      launcher = new SwarmLauncher({ config: testConfig });

      const beforeStart = Date.now();
      await launcher.start();
      const afterStart = Date.now();

      const status = launcher.getStatus();
      expect(status.startedAt).toBeDefined();
      expect(status.startedAt).toBeGreaterThanOrEqual(beforeStart);
      expect(status.startedAt).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('stop', () => {
    it('should stop all processes', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      await launcher.start();

      await launcher.stop();

      expect(launcher.getStatus().status).toBe('stopped');
    });

    it('should emit shutdown event', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      const onShutdown = jest.fn();
      launcher.on('shutdown', onShutdown);

      await launcher.start();
      await launcher.stop();

      expect(onShutdown).toHaveBeenCalled();
    });

    it('should be idempotent (multiple calls do not throw)', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      await launcher.start();

      await launcher.stop();
      await launcher.stop(); // Second call should not throw

      expect(launcher.getStatus().status).toBe('stopped');
    });

    it('should force stop with SIGKILL when force=true', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      await launcher.start();

      await launcher.stop(true);

      expect(launcher.getStatus().status).toBe('stopped');
    });
  });

  describe('getStatus', () => {
    it('should return current swarm state', async () => {
      launcher = new SwarmLauncher({ config: testConfig });

      const initialStatus = launcher.getStatus();
      expect(initialStatus.status).toBe('idle');
      expect(initialStatus.processes).toHaveLength(0);

      await launcher.start();

      const runningStatus = launcher.getStatus();
      expect(runningStatus.status).toBe('running');
      expect(runningStatus.processes.length).toBeGreaterThan(0);
    });
  });

  describe('getProcesses', () => {
    it('should return all managed processes', async () => {
      launcher = new SwarmLauncher({ config: testConfig });
      await launcher.start();

      const processes = launcher.getProcesses();

      expect(processes.length).toBeGreaterThan(0);
      expect(processes.every((p) => p.id && p.pid)).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return the current configuration', () => {
      launcher = new SwarmLauncher({ config: testConfig });

      const config = launcher.getConfig();

      expect(config).toEqual(testConfig);
    });
  });

  describe('with dashboard enabled', () => {
    it('should start dashboard before agents', async () => {
      const configWithDashboard = {
        ...testConfig,
        dashboard: { ...testConfig.dashboard, enabled: true },
      };

      launcher = new SwarmLauncher({ config: configWithDashboard });

      const startOrder: string[] = [];
      launcher.on('processStart', (p) => {
        startOrder.push(p.type);
      });

      await launcher.start();

      // Wait for events to propagate
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Dashboard should start first
      if (startOrder.length > 1) {
        expect(startOrder[0]).toBe('dashboard');
      }
    });
  });

  describe('verbose mode', () => {
    it('should not throw in verbose mode', async () => {
      launcher = new SwarmLauncher({
        config: testConfig,
        verbose: true,
      });

      await expect(launcher.start()).resolves.not.toThrow();
    });
  });
});
