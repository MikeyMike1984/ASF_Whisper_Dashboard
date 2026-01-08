/**
 * Tests for SwarmPulse methods: heartbeat, status, progress, capture, metrics
 * Tasks 006, 007, 008
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { SwarmPulse } from '../SwarmPulse';
import { AgentStatus, LogLevel } from '../types';

describe('SwarmPulse Methods', () => {
  const testDir = '.asf-test-methods';
  const testDbPath = path.join(testDir, 'test_methods.db');

  beforeEach(() => {
    SwarmPulse.resetInstance();

    // Clean up files
    for (const file of [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`]) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  });

  afterEach(() => {
    try {
      SwarmPulse.getInstance({ dbPath: testDbPath }).shutdown();
    } catch {
      // Ignore
    }
    SwarmPulse.resetInstance();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper to read directly from DB
  function getDb(): Database.Database {
    return new Database(testDbPath);
  }

  // ============================================================================
  // Task 006: Heartbeat & Status Tests
  // ============================================================================

  describe('Heartbeat (Task 006)', () => {
    it('should update last_seen timestamp on heartbeat', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      const beforeHeartbeat = Date.now();
      pulse.heartbeat();
      const afterHeartbeat = Date.now();

      const db = getDb();
      const agent = db.prepare('SELECT last_seen FROM agents WHERE id = ?').get(agentId) as {
        last_seen: number;
      };
      db.close();

      expect(agent.last_seen).toBeGreaterThanOrEqual(beforeHeartbeat);
      expect(agent.last_seen).toBeLessThanOrEqual(afterHeartbeat);
    });

    it('should not throw if heartbeat called without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.heartbeat()).not.toThrow();
    });

    it('should complete heartbeat within 10ms', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      const start = performance.now();
      pulse.heartbeat();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should auto-heartbeat at configured interval', async () => {
      const pulse = SwarmPulse.getInstance({
        dbPath: testDbPath,
        heartbeatInterval: 50, // 50ms for testing
      });
      const agentId = pulse.registerAgent('developer');

      // Wait for 2+ heartbeats
      await new Promise((resolve) => setTimeout(resolve, 150));

      const db = getDb();
      const agent = db.prepare('SELECT last_seen FROM agents WHERE id = ?').get(agentId) as {
        last_seen: number;
      };
      db.close();

      // Last seen should be recent (within 100ms)
      const now = Date.now();
      expect(now - agent.last_seen).toBeLessThan(100);
    });
  });

  describe('Status (Task 006)', () => {
    it('should update agent status to Busy', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.setStatus(AgentStatus.Busy);

      const db = getDb();
      const agent = db.prepare('SELECT status FROM agents WHERE id = ?').get(agentId) as {
        status: string;
      };
      db.close();

      expect(agent.status).toBe('Busy');
    });

    it('should update agent status to Error', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.setStatus(AgentStatus.Error);

      const db = getDb();
      const agent = db.prepare('SELECT status FROM agents WHERE id = ?').get(agentId) as {
        status: string;
      };
      db.close();

      expect(agent.status).toBe('Error');
    });

    it('should throw if setStatus called without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.setStatus(AgentStatus.Busy)).toThrow('No agent registered');
    });
  });

  // ============================================================================
  // Task 007: Progress & Task Tracking Tests
  // ============================================================================

  describe('Progress (Task 007)', () => {
    it('should create a new task on first progress call', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      pulse.progress('task-001', 0, 'Implement feature');

      const db = getDb();
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('task-001') as {
        title: string;
        status: string;
        progress_percent: number;
      };
      db.close();

      expect(task).toBeDefined();
      expect(task.title).toBe('Implement feature');
      expect(task.status).toBe('InProgress');
      expect(task.progress_percent).toBe(0);
    });

    it('should update progress on existing task', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      pulse.progress('task-002', 25, 'Write tests');
      pulse.progress('task-002', 50);
      pulse.progress('task-002', 75);

      const db = getDb();
      const task = db.prepare('SELECT progress_percent FROM tasks WHERE id = ?').get(
        'task-002'
      ) as { progress_percent: number };
      db.close();

      expect(task.progress_percent).toBe(75);
    });

    it('should mark task complete at 100%', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      pulse.progress('task-003', 100, 'Finish');

      const db = getDb();
      const task = db.prepare('SELECT status, completed_at FROM tasks WHERE id = ?').get(
        'task-003'
      ) as { status: string; completed_at: number | null };
      db.close();

      expect(task.status).toBe('Complete');
      expect(task.completed_at).not.toBeNull();
    });

    it('should update agent current_task_id', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.progress('task-004', 50);

      const db = getDb();
      const agent = db.prepare('SELECT current_task_id FROM agents WHERE id = ?').get(agentId) as {
        current_task_id: string;
      };
      db.close();

      expect(agent.current_task_id).toBe('task-004');
    });

    it('should throw if progress called without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.progress('task-005', 50)).toThrow('No agent registered');
    });
  });

  // ============================================================================
  // Task 008: Capture & Metrics Tests
  // ============================================================================

  describe('Capture (Task 008)', () => {
    it('should write log entry to database', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.capture('Test message');

      const db = getDb();
      const log = db.prepare('SELECT * FROM logs WHERE agent_id = ?').get(agentId) as {
        message: string;
        level: string;
      };
      db.close();

      expect(log.message).toBe('Test message');
      expect(log.level).toBe('Info');
    });

    it('should support different log levels', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.capture('Info message', LogLevel.Info);
      pulse.capture('Warning message', LogLevel.Warn);
      pulse.capture('Error message', LogLevel.Error);

      const db = getDb();
      const logs = db.prepare('SELECT level FROM logs WHERE agent_id = ? ORDER BY id').all(
        agentId
      ) as Array<{ level: string }>;
      db.close();

      expect(logs[0].level).toBe('Info');
      expect(logs[1].level).toBe('Warn');
      expect(logs[2].level).toBe('Error');
    });

    it('should maintain circular buffer (max log entries)', () => {
      const pulse = SwarmPulse.getInstance({
        dbPath: testDbPath,
        maxLogEntries: 10,
      });
      const agentId = pulse.registerAgent('developer');

      // Insert 20 logs
      for (let i = 0; i < 20; i++) {
        pulse.capture(`Log ${i}`);
      }

      const db = getDb();
      const count = db.prepare('SELECT COUNT(*) as count FROM logs WHERE agent_id = ?').get(
        agentId
      ) as { count: number };
      db.close();

      expect(count.count).toBeLessThanOrEqual(10);
    });

    it('should throw if capture called without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.capture('Test')).toThrow('No agent registered');
    });
  });

  describe('Metrics (Task 008)', () => {
    it('should record token usage', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.reportTokens(1500);

      const db = getDb();
      const metric = db.prepare('SELECT tokens_used FROM metrics WHERE agent_id = ?').get(
        agentId
      ) as { tokens_used: number };
      db.close();

      expect(metric.tokens_used).toBe(1500);
    });

    it('should record cost estimate', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const agentId = pulse.registerAgent('developer');

      pulse.reportCost(0.05);

      const db = getDb();
      const metric = db.prepare('SELECT estimated_cost FROM metrics WHERE agent_id = ?').get(
        agentId
      ) as { estimated_cost: number };
      db.close();

      expect(metric.estimated_cost).toBe(0.05);
    });

    it('should throw if reportTokens called without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.reportTokens(100)).toThrow('No agent registered');
    });

    it('should throw if reportCost called without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.reportCost(0.01)).toThrow('No agent registered');
    });
  });
});
