/**
 * Integration Tests for SwarmPulse SDK
 * Task 010
 *
 * Verifies end-to-end usage of the SDK through the public API.
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { SwarmPulse, AgentStatus, TaskStatus, LogLevel, DEFAULT_CONFIG, VERSION } from '../index';

describe('Integration', () => {
  const testDir = '.asf-test-integration';
  let testDbCounter = 0;

  function getTestDbPath(): string {
    testDbCounter++;
    return path.join(testDir, `test_integration_${testDbCounter}.db`);
  }

  beforeAll(() => {
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }
  });

  beforeEach(() => {
    SwarmPulse.resetInstance();
  });

  afterEach(() => {
    try {
      SwarmPulse.resetInstance();
    } catch {
      // Ignore
    }
  });

  afterAll(() => {
    // Clean up with delay for Windows file handles
    setTimeout(() => {
      if (fs.existsSync(testDir)) {
        try {
          fs.rmSync(testDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }, 100);
  });

  describe('Public API Exports', () => {
    it('should export SwarmPulse class', () => {
      expect(SwarmPulse).toBeDefined();
      expect(typeof SwarmPulse.getInstance).toBe('function');
      expect(typeof SwarmPulse.resetInstance).toBe('function');
    });

    it('should export AgentStatus enum', () => {
      expect(AgentStatus).toBeDefined();
      expect(AgentStatus.Idle).toBe('Idle');
      expect(AgentStatus.Busy).toBe('Busy');
      expect(AgentStatus.Error).toBe('Error');
    });

    it('should export TaskStatus enum', () => {
      expect(TaskStatus).toBeDefined();
      expect(TaskStatus.Pending).toBe('Pending');
      expect(TaskStatus.InProgress).toBe('InProgress');
      expect(TaskStatus.Complete).toBe('Complete');
      expect(TaskStatus.Failed).toBe('Failed');
    });

    it('should export LogLevel enum', () => {
      expect(LogLevel).toBeDefined();
      expect(LogLevel.Info).toBe('Info');
      expect(LogLevel.Warn).toBe('Warn');
      expect(LogLevel.Error).toBe('Error');
    });

    it('should export DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.dbPath).toBe('.asf/swarm_state.db');
      expect(DEFAULT_CONFIG.heartbeatInterval).toBe(5000);
      expect(DEFAULT_CONFIG.maxLogEntries).toBe(1000);
    });

    it('should export VERSION constant', () => {
      expect(VERSION).toBe('0.1.0');
    });
  });

  describe('Complete Agent Lifecycle', () => {
    it('should support full agent workflow from registration to cleanup', () => {
      const testDbPath = getTestDbPath();

      // Initialize
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });

      // Register
      const agentId = pulse.registerAgent('developer', 'feature/auth');
      expect(agentId).toBeDefined();
      expect(agentId).toMatch(/^agent-\d+-\d+$/);

      // Work simulation - set status
      pulse.setStatus(AgentStatus.Busy);

      // Capture initial log
      pulse.capture('Starting task', LogLevel.Info);

      // Track progress through a task
      pulse.progress('implement-login', 0, 'Implement login');
      pulse.progress('implement-login', 25);
      pulse.capture('Working on authentication', LogLevel.Info);
      pulse.progress('implement-login', 50);
      pulse.capture('Halfway done');
      pulse.progress('implement-login', 75);
      pulse.progress('implement-login', 100);
      pulse.capture('Task complete', LogLevel.Info);

      // Report metrics
      pulse.reportTokens(500);
      pulse.reportCost(0.02);

      // Return to idle
      pulse.setStatus(AgentStatus.Idle);

      // Cleanup
      pulse.deregisterAgent();
      pulse.shutdown();
      SwarmPulse.resetInstance();

      // Verify final state by directly querying database
      const db = new Database(testDbPath);

      // Check agent was deactivated
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as {
        is_active: number;
        status: string;
      };
      expect(agent.is_active).toBe(0);
      expect(agent.status).toBe('Idle');

      // Check task was completed
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('implement-login') as {
        status: string;
        progress_percent: number;
        completed_at: number | null;
      };
      expect(task.status).toBe('Complete');
      expect(task.progress_percent).toBe(100);
      expect(task.completed_at).not.toBeNull();

      // Check logs were recorded (4 capture calls)
      const logCount = db.prepare('SELECT COUNT(*) as count FROM logs WHERE agent_id = ?').get(
        agentId
      ) as { count: number };
      expect(logCount.count).toBe(4);

      // Check metrics were recorded
      const metrics = db.prepare('SELECT * FROM metrics WHERE agent_id = ?').all(agentId) as Array<{
        tokens_used: number;
        estimated_cost: number;
      }>;
      expect(metrics.length).toBe(2);

      db.close();
    });

    it('should handle error status reporting', () => {
      const testDbPath = getTestDbPath();
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('qa-tester');

      pulse.setStatus(AgentStatus.Busy);
      pulse.capture('Starting tests', LogLevel.Info);
      pulse.capture('Test failed!', LogLevel.Error);
      pulse.setStatus(AgentStatus.Error);
      pulse.capture('Shutting down due to error', LogLevel.Warn);

      // Verify error state
      const db = new Database(testDbPath);
      const agent = db.prepare('SELECT status FROM agents WHERE id = ?').get(agentId) as {
        status: string;
      };
      expect(agent.status).toBe('Error');

      const logs = db.prepare('SELECT level FROM logs WHERE agent_id = ?').all(agentId) as Array<{
        level: string;
      }>;
      expect(logs.map((l) => l.level)).toContain('Error');
      expect(logs.map((l) => l.level)).toContain('Warn');

      db.close();
      pulse.shutdown();
    });

    it('should work with multiple sequential tasks', () => {
      const testDbPath = getTestDbPath();
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      // Task 1
      pulse.setStatus(AgentStatus.Busy);
      pulse.progress('task-1', 0, 'First task');
      pulse.progress('task-1', 100);

      // Task 2
      pulse.progress('task-2', 0, 'Second task');
      pulse.progress('task-2', 50);
      pulse.progress('task-2', 100);

      // Task 3
      pulse.progress('task-3', 0, 'Third task');
      pulse.progress('task-3', 100);

      pulse.setStatus(AgentStatus.Idle);

      // Verify all tasks
      const db = new Database(testDbPath);
      const tasks = db
        .prepare("SELECT id, status, progress_percent FROM tasks WHERE status = 'Complete'")
        .all() as Array<{
        id: string;
        status: string;
        progress_percent: number;
      }>;

      expect(tasks.length).toBe(3);
      tasks.forEach((task) => {
        expect(task.status).toBe('Complete');
        expect(task.progress_percent).toBe(100);
      });

      db.close();
      pulse.shutdown();
    });
  });

  describe('Zero Stdout Guarantee', () => {
    it('should not emit any stdout during full lifecycle', () => {
      const testDbPath = getTestDbPath();
      const spy = jest.spyOn(process.stdout, 'write');

      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('silent-worker');

      pulse.setStatus(AgentStatus.Busy);
      pulse.capture('This should not appear in stdout', LogLevel.Info);
      pulse.capture('Neither should this error', LogLevel.Error);
      pulse.progress('quiet-task', 0, 'Silent progress');
      pulse.progress('quiet-task', 50);
      pulse.progress('quiet-task', 100);
      pulse.reportTokens(1000);
      pulse.reportCost(0.03);
      pulse.setStatus(AgentStatus.Idle);
      pulse.deregisterAgent();
      pulse.shutdown();

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Import Patterns', () => {
    it('should support destructured imports', () => {
      const testDbPath = getTestDbPath();
      // This test verifies the import pattern works (import statement at top of file)
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(pulse).toBeDefined();

      pulse.registerAgent('import-test');
      pulse.setStatus(AgentStatus.Busy);
      pulse.capture('Testing imports', LogLevel.Info);

      pulse.shutdown();
    });

    it('should support dynamic require', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sdk = require('../index');

      expect(sdk.SwarmPulse).toBeDefined();
      expect(sdk.AgentStatus).toBeDefined();
      expect(sdk.TaskStatus).toBeDefined();
      expect(sdk.LogLevel).toBeDefined();
      expect(sdk.DEFAULT_CONFIG).toBeDefined();
      expect(sdk.VERSION).toBe('0.1.0');
    });
  });
});
