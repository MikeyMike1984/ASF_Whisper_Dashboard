/**
 * Tests for ProcessPool
 */

import { ProcessPool } from './ProcessPool';
import { ManagedProcess, ProcessType } from '../types';

describe('ProcessPool', () => {
  let pool: ProcessPool;

  beforeEach(() => {
    pool = new ProcessPool();
  });

  const createMockProcess = (
    id: string,
    type: ProcessType,
    status: 'running' | 'stopped' | 'crashed' = 'running'
  ): ManagedProcess => ({
    id,
    type,
    pid: Math.floor(Math.random() * 100000),
    status,
    startedAt: Date.now(),
    restartCount: 0,
  });

  describe('add', () => {
    it('should add a process to the pool', () => {
      const process = createMockProcess('agent-01', 'agent');
      pool.add(process);

      expect(pool.get('agent-01')).toBe(process);
    });

    it('should emit "added" event when adding a process', () => {
      const onAdded = jest.fn();
      pool.on('added', onAdded);

      const process = createMockProcess('agent-01', 'agent');
      pool.add(process);

      expect(onAdded).toHaveBeenCalledWith(process);
    });
  });

  describe('remove', () => {
    it('should remove a process from the pool', () => {
      const process = createMockProcess('agent-01', 'agent');
      pool.add(process);

      const result = pool.remove('agent-01');

      expect(result).toBe(true);
      expect(pool.get('agent-01')).toBeUndefined();
    });

    it('should return false when process does not exist', () => {
      expect(pool.remove('nonexistent')).toBe(false);
    });

    it('should emit "removed" event when removing a process', () => {
      const onRemoved = jest.fn();
      pool.on('removed', onRemoved);

      const process = createMockProcess('agent-01', 'agent');
      pool.add(process);
      pool.remove('agent-01');

      expect(onRemoved).toHaveBeenCalledWith(process);
    });
  });

  describe('get', () => {
    it('should return process by ID', () => {
      const process = createMockProcess('agent-01', 'agent');
      pool.add(process);

      expect(pool.get('agent-01')).toBe(process);
    });

    it('should return undefined for unknown ID', () => {
      expect(pool.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getByPid', () => {
    it('should return process by PID', () => {
      const process = createMockProcess('agent-01', 'agent');
      pool.add(process);

      expect(pool.getByPid(process.pid)).toBe(process);
    });

    it('should return undefined for unknown PID', () => {
      expect(pool.getByPid(99999999)).toBeUndefined();
    });
  });

  describe('getByType', () => {
    it('should return all processes of a specific type', () => {
      pool.add(createMockProcess('dashboard', 'dashboard'));
      pool.add(createMockProcess('agent-01', 'agent'));
      pool.add(createMockProcess('agent-02', 'agent'));

      const agents = pool.getByType('agent');

      expect(agents).toHaveLength(2);
      expect(agents.every((p) => p.type === 'agent')).toBe(true);
    });

    it('should return empty array when no processes of type exist', () => {
      pool.add(createMockProcess('agent-01', 'agent'));

      expect(pool.getByType('dashboard')).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all processes', () => {
      pool.add(createMockProcess('dashboard', 'dashboard'));
      pool.add(createMockProcess('agent-01', 'agent'));
      pool.add(createMockProcess('agent-02', 'agent'));

      expect(pool.getAll()).toHaveLength(3);
    });

    it('should return empty array when pool is empty', () => {
      expect(pool.getAll()).toHaveLength(0);
    });
  });

  describe('getDashboard', () => {
    it('should return the dashboard process', () => {
      const dashboard = createMockProcess('dashboard', 'dashboard');
      pool.add(dashboard);
      pool.add(createMockProcess('agent-01', 'agent'));

      expect(pool.getDashboard()).toBe(dashboard);
    });

    it('should return undefined when no dashboard exists', () => {
      pool.add(createMockProcess('agent-01', 'agent'));

      expect(pool.getDashboard()).toBeUndefined();
    });
  });

  describe('getAgents', () => {
    it('should return all agent processes', () => {
      pool.add(createMockProcess('dashboard', 'dashboard'));
      pool.add(createMockProcess('agent-01', 'agent'));
      pool.add(createMockProcess('agent-02', 'agent'));

      const agents = pool.getAgents();

      expect(agents).toHaveLength(2);
    });
  });

  describe('updateStatus', () => {
    it('should update process status', () => {
      pool.add(createMockProcess('agent-01', 'agent'));
      pool.updateStatus('agent-01', 'stopped');

      expect(pool.get('agent-01')?.status).toBe('stopped');
    });

    it('should update exit code when provided', () => {
      pool.add(createMockProcess('agent-01', 'agent'));
      pool.updateStatus('agent-01', 'crashed', 1);

      expect(pool.get('agent-01')?.exitCode).toBe(1);
    });

    it('should emit "statusChanged" event', () => {
      const onStatusChanged = jest.fn();
      pool.on('statusChanged', onStatusChanged);

      pool.add(createMockProcess('agent-01', 'agent'));
      pool.updateStatus('agent-01', 'stopped');

      expect(onStatusChanged).toHaveBeenCalled();
    });

    it('should do nothing for unknown process', () => {
      expect(() => pool.updateStatus('nonexistent', 'stopped')).not.toThrow();
    });
  });

  describe('incrementRestartCount', () => {
    it('should increment restart count', () => {
      pool.add(createMockProcess('agent-01', 'agent'));

      expect(pool.incrementRestartCount('agent-01')).toBe(1);
      expect(pool.incrementRestartCount('agent-01')).toBe(2);
      expect(pool.incrementRestartCount('agent-01')).toBe(3);
    });

    it('should return 0 for unknown process', () => {
      expect(pool.incrementRestartCount('nonexistent')).toBe(0);
    });
  });

  describe('size', () => {
    it('should return the number of processes', () => {
      expect(pool.size()).toBe(0);

      pool.add(createMockProcess('agent-01', 'agent'));
      expect(pool.size()).toBe(1);

      pool.add(createMockProcess('agent-02', 'agent'));
      expect(pool.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all processes', () => {
      pool.add(createMockProcess('agent-01', 'agent'));
      pool.add(createMockProcess('agent-02', 'agent'));

      pool.clear();

      expect(pool.size()).toBe(0);
    });

    it('should emit "cleared" event', () => {
      const onCleared = jest.fn();
      pool.on('cleared', onCleared);

      pool.clear();

      expect(onCleared).toHaveBeenCalled();
    });
  });

  describe('getRunningCount', () => {
    it('should count only running processes', () => {
      pool.add(createMockProcess('agent-01', 'agent', 'running'));
      pool.add(createMockProcess('agent-02', 'agent', 'stopped'));
      pool.add(createMockProcess('agent-03', 'agent', 'running'));

      expect(pool.getRunningCount()).toBe(2);
    });
  });

  describe('allStopped', () => {
    it('should return true when all processes are stopped', () => {
      pool.add(createMockProcess('agent-01', 'agent', 'stopped'));
      pool.add(createMockProcess('agent-02', 'agent', 'crashed'));

      expect(pool.allStopped()).toBe(true);
    });

    it('should return false when some processes are running', () => {
      pool.add(createMockProcess('agent-01', 'agent', 'running'));
      pool.add(createMockProcess('agent-02', 'agent', 'stopped'));

      expect(pool.allStopped()).toBe(false);
    });

    it('should return true when pool is empty', () => {
      expect(pool.allStopped()).toBe(true);
    });
  });

  describe('getByStatus', () => {
    it('should return processes with specific status', () => {
      pool.add(createMockProcess('agent-01', 'agent', 'running'));
      pool.add(createMockProcess('agent-02', 'agent', 'stopped'));
      pool.add(createMockProcess('agent-03', 'agent', 'running'));

      const running = pool.getByStatus('running');

      expect(running).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true if process exists', () => {
      pool.add(createMockProcess('agent-01', 'agent'));

      expect(pool.has('agent-01')).toBe(true);
    });

    it('should return false if process does not exist', () => {
      expect(pool.has('nonexistent')).toBe(false);
    });
  });
});
