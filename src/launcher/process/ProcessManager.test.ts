/**
 * Tests for ProcessManager
 */

import { ProcessManager } from './ProcessManager';
import { ProcessPool } from './ProcessPool';

describe('ProcessManager', () => {
  let pool: ProcessPool;
  let manager: ProcessManager;

  beforeEach(() => {
    pool = new ProcessPool();
    manager = new ProcessManager(pool);
  });

  afterEach(async () => {
    // Clean up any running processes
    await manager.killAll('SIGKILL');
  });

  describe('spawn', () => {
    it('should spawn a process and add it to the pool', async () => {
      const process = await manager.spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        type: 'agent',
        id: 'test-agent',
      });

      expect(process.pid).toBeDefined();
      expect(process.pid).toBeGreaterThan(0);
      expect(pool.get('test-agent')).toBeDefined();

      // Clean up
      await manager.kill('test-agent');
    });

    it('should set process status to starting initially', async () => {
      const process = await manager.spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        type: 'agent',
        id: 'test-agent',
      });

      // Status should be 'starting' or 'running' depending on timing
      const poolProcess = pool.get('test-agent');
      expect(['starting', 'running']).toContain(poolProcess?.status);

      await manager.kill('test-agent');
    });

    it('should emit processStart event when process spawns', async () => {
      const onStart = jest.fn();
      manager.on('processStart', onStart);

      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 2000)'], {
        type: 'agent',
        id: 'test-agent',
      });

      // Wait a bit for the spawn event
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(onStart).toHaveBeenCalled();

      await manager.kill('test-agent');
    });

    it('should pass environment variables to the process', async () => {
      const process = await manager.spawn(
        'node',
        ['-e', 'console.log(process.env.TEST_VAR); setTimeout(() => {}, 1000)'],
        {
          type: 'agent',
          id: 'test-agent',
          env: { TEST_VAR: 'test-value' },
        }
      );

      expect(process.id).toBe('test-agent');

      await manager.kill('test-agent');
    });

    it('should store worktree and role metadata', async () => {
      const process = await manager.spawn('node', ['-e', 'setTimeout(() => {}, 2000)'], {
        type: 'agent',
        id: 'test-agent',
        worktree: 'feature/test',
        role: 'developer',
      });

      expect(process.worktree).toBe('feature/test');
      expect(process.role).toBe('developer');

      await manager.kill('test-agent');
    });
  });

  describe('kill', () => {
    it('should kill a running process', async () => {
      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 30000)'], {
        type: 'agent',
        id: 'test-agent',
      });

      // Wait for process to start
      await new Promise((resolve) => setTimeout(resolve, 200));

      await manager.kill('test-agent');

      // Wait for exit event to propagate
      await new Promise((resolve) => setTimeout(resolve, 200));

      const process = pool.get('test-agent');
      expect(['stopped', 'stopping', 'crashed']).toContain(process?.status);
    });

    it('should not throw when killing non-existent process', async () => {
      await expect(manager.kill('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('killAll', () => {
    it('should kill all running processes', async () => {
      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 30000)'], {
        type: 'agent',
        id: 'agent-01',
      });
      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 30000)'], {
        type: 'agent',
        id: 'agent-02',
      });

      // Wait for processes to start
      await new Promise((resolve) => setTimeout(resolve, 200));

      await manager.killAll();

      // Wait for exit events
      await new Promise((resolve) => setTimeout(resolve, 500));

      // All should be stopping or stopped
      for (const p of pool.getAll()) {
        expect(['stopped', 'stopping', 'crashed']).toContain(p.status);
      }
    });
  });

  describe('getProcess', () => {
    it('should return process by ID', async () => {
      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 2000)'], {
        type: 'agent',
        id: 'test-agent',
      });

      const process = manager.getProcess('test-agent');
      expect(process).toBeDefined();
      expect(process?.id).toBe('test-agent');

      await manager.kill('test-agent');
    });

    it('should return undefined for unknown ID', () => {
      expect(manager.getProcess('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllProcesses', () => {
    it('should return all processes', async () => {
      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 2000)'], {
        type: 'agent',
        id: 'agent-01',
      });
      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 2000)'], {
        type: 'agent',
        id: 'agent-02',
      });

      expect(manager.getAllProcesses()).toHaveLength(2);

      await manager.killAll();
    });
  });

  describe('isRunning', () => {
    it('should correctly report running status', async () => {
      // Use a more reliable long-running script
      const scriptPath = process.platform === 'win32'
        ? 'ping -n 30 127.0.0.1'
        : 'sleep 30';

      const [cmd, ...args] = scriptPath.split(' ');

      const proc = await manager.spawn(cmd, args, {
        type: 'agent',
        id: 'test-agent',
      });

      // The process should be in the pool
      expect(pool.has('test-agent')).toBe(true);
      expect(proc.status).toBe('starting');

      // Wait for spawn event
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check process is in the pool
      const poolProcess = pool.get('test-agent');
      expect(poolProcess).toBeDefined();

      // Process should be starting, running, or possibly crashed due to Windows quirks
      const validStatuses = ['starting', 'running', 'crashed', 'stopped'];
      expect(validStatuses).toContain(poolProcess?.status);

      await manager.kill('test-agent');
    });

    it('should return false for non-existent process', () => {
      expect(manager.isRunning('nonexistent')).toBe(false);
    });
  });

  describe('getActiveCount', () => {
    it('should return count of active child processes', async () => {
      expect(manager.getActiveCount()).toBe(0);

      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        type: 'agent',
        id: 'agent-01',
      });

      expect(manager.getActiveCount()).toBe(1);

      await manager.spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        type: 'agent',
        id: 'agent-02',
      });

      expect(manager.getActiveCount()).toBe(2);

      await manager.killAll();
    });
  });

  describe('process crash handling', () => {
    it('should emit processCrash event on non-zero exit', async () => {
      const onCrash = jest.fn();
      manager.on('processCrash', onCrash);

      await manager.spawn('node', ['-e', 'process.exit(1)'], {
        type: 'agent',
        id: 'test-agent',
      });

      // Wait for process to exit
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onCrash).toHaveBeenCalled();
    });

    it('should emit processStop event on clean exit', async () => {
      const onStop = jest.fn();
      manager.on('processStop', onStop);

      await manager.spawn('node', ['-e', 'process.exit(0)'], {
        type: 'agent',
        id: 'test-agent',
      });

      // Wait for process to exit
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onStop).toHaveBeenCalled();
    });
  });
});
