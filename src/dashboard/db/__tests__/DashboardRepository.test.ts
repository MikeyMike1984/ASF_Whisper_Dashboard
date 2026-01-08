/**
 * Dashboard Repository Tests
 */

import { DashboardRepository } from '../DashboardRepository';
import { initializeDatabase } from '../../../core/monitoring/db/schema';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

describe('DashboardRepository', () => {
  let tempDir: string;
  let dbPath: string;
  let repo: DashboardRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'dashboard-repo-test-'));
    dbPath = resolve(tempDir, 'test.db');
    // Initialize database with schema
    const db = initializeDatabase(dbPath);
    db.close();
    repo = new DashboardRepository(dbPath, 30000);
  });

  afterEach(() => {
    repo.close();
    rmSync(tempDir, { recursive: true });
  });

  describe('getAgents', () => {
    it('returns empty array when no agents', () => {
      const agents = repo.getAgents();
      expect(agents).toEqual([]);
    });

    it('returns active agents', () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO agents (id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active)
        VALUES ('a1', 123, 'worker', 'Busy', NULL, ${now}, '/path', ${now}, 1)
      `);
      db.close();

      const agents = repo.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('a1');
      expect(agents[0].status).toBe('Busy');
    });

    it('excludes inactive agents', () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO agents (id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active)
        VALUES ('a1', 123, 'worker', 'Busy', NULL, ${now}, '/path', ${now}, 0)
      `);
      db.close();

      const agents = repo.getAgents();
      expect(agents).toHaveLength(0);
    });

    it('marks agents as dead when heartbeat exceeds threshold', () => {
      const db = new Database(dbPath);
      const oldTime = Date.now() - 60000; // 60 seconds ago
      db.exec(`
        INSERT INTO agents (id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active)
        VALUES ('a1', 123, 'worker', 'Busy', NULL, ${oldTime}, '/path', ${oldTime}, 1)
      `);
      db.close();

      const agents = repo.getAgents();
      expect(agents[0].status).toBe('Dead');
    });

    it('computes progress from current task', () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO tasks (id, title, status, assigned_agent_id, progress_percent, created_at)
        VALUES ('t1', 'Test Task', 'InProgress', 'a1', 75, ${now})
      `);
      db.exec(`
        INSERT INTO agents (id, pid, role, status, current_task_id, last_seen, worktree_path, created_at, is_active)
        VALUES ('a1', 123, 'worker', 'Busy', 't1', ${now}, '/path', ${now}, 1)
      `);
      db.close();

      const agents = repo.getAgents();
      expect(agents[0].progress).toBe(75);
    });
  });

  describe('getTasks', () => {
    it('returns empty array when no tasks', () => {
      const tasks = repo.getTasks();
      expect(tasks).toEqual([]);
    });

    it('returns tasks ordered by status', () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`INSERT INTO tasks (id, title, status, progress_percent, created_at) VALUES ('t1', 'Task 1', 'Complete', 100, ${now})`);
      db.exec(`INSERT INTO tasks (id, title, status, progress_percent, created_at) VALUES ('t2', 'Task 2', 'InProgress', 50, ${now})`);
      db.exec(`INSERT INTO tasks (id, title, status, progress_percent, created_at) VALUES ('t3', 'Task 3', 'Pending', 0, ${now})`);
      db.close();

      const tasks = repo.getTasks();
      expect(tasks[0].status).toBe('InProgress');
      expect(tasks[1].status).toBe('Pending');
      expect(tasks[2].status).toBe('Complete');
    });

    it('maps all task fields correctly', () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO tasks (id, title, status, assigned_agent_id, progress_percent, dependencies, created_at, started_at, completed_at)
        VALUES ('t1', 'Test Task', 'InProgress', 'a1', 50, '["dep1"]', ${now}, ${now + 100}, NULL)
      `);
      db.close();

      const tasks = repo.getTasks();
      expect(tasks[0]).toEqual({
        id: 't1',
        title: 'Test Task',
        status: 'InProgress',
        assignedAgentId: 'a1',
        progressPercent: 50,
        dependencies: '["dep1"]',
        createdAt: now,
        startedAt: now + 100,
        completedAt: null,
      });
    });
  });

  describe('getLogsForAgent', () => {
    it('returns empty array when no logs', () => {
      const logs = repo.getLogsForAgent('nonexistent');
      expect(logs).toEqual([]);
    });

    it('returns logs for specific agent in chronological order', () => {
      const db = new Database(dbPath);
      db.exec(`INSERT INTO logs (agent_id, level, message, timestamp) VALUES ('a1', 'Info', 'First', 1000)`);
      db.exec(`INSERT INTO logs (agent_id, level, message, timestamp) VALUES ('a1', 'Info', 'Second', 2000)`);
      db.exec(`INSERT INTO logs (agent_id, level, message, timestamp) VALUES ('a2', 'Info', 'Other agent', 1500)`);
      db.close();

      const logs = repo.getLogsForAgent('a1');
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('First');
      expect(logs[1].message).toBe('Second');
    });

    it('respects limit parameter', () => {
      const db = new Database(dbPath);
      for (let i = 0; i < 10; i++) {
        db.exec(`INSERT INTO logs (agent_id, level, message, timestamp) VALUES ('a1', 'Info', 'Log ${i}', ${i * 1000})`);
      }
      db.close();

      const logs = repo.getLogsForAgent('a1', 5);
      expect(logs).toHaveLength(5);
    });

    it('maps log levels correctly', () => {
      const db = new Database(dbPath);
      db.exec(`INSERT INTO logs (agent_id, level, message, timestamp) VALUES ('a1', 'Warn', 'Warning', 1000)`);
      db.close();

      const logs = repo.getLogsForAgent('a1');
      expect(logs[0].level).toBe('Warn');
    });
  });

  describe('getAggregatedMetrics', () => {
    it('returns zeros when no metrics', () => {
      const metrics = repo.getAggregatedMetrics();
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.totalCost).toBe(0);
      expect(metrics.activeAgents).toBe(0);
      expect(metrics.totalAgents).toBe(0);
    });

    it('aggregates metrics correctly', () => {
      const db = new Database(dbPath);
      db.exec(`INSERT INTO metrics (agent_id, tokens_used, estimated_cost, timestamp) VALUES ('a1', 1000, 0.05, 0)`);
      db.exec(`INSERT INTO metrics (agent_id, tokens_used, estimated_cost, timestamp) VALUES ('a1', 2000, 0.10, 0)`);
      db.exec(`INSERT INTO metrics (agent_id, tokens_used, estimated_cost, timestamp) VALUES ('a2', 500, 0.025, 0)`);
      db.close();

      const metrics = repo.getAggregatedMetrics();
      expect(metrics.totalTokens).toBe(3500);
      expect(metrics.totalCost).toBeCloseTo(0.175);
    });

    it('counts active vs total agents', () => {
      const db = new Database(dbPath);
      const now = Date.now();
      const oldTime = now - 60000; // 60 seconds ago (dead)
      db.exec(`INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active) VALUES ('a1', 1, 'w', 'Busy', ${now}, ${now}, 1)`);
      db.exec(`INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active) VALUES ('a2', 2, 'w', 'Idle', ${now}, ${now}, 1)`);
      db.exec(`INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active) VALUES ('a3', 3, 'w', 'Busy', ${oldTime}, ${oldTime}, 1)`);
      db.close();

      const metrics = repo.getAggregatedMetrics();
      expect(metrics.totalAgents).toBe(3);
      expect(metrics.activeAgents).toBe(2); // a3 is dead
    });
  });

  describe('close', () => {
    it('closes database connection', () => {
      repo.close();
      // Creating a new repo should work (database not locked)
      const newRepo = new DashboardRepository(dbPath, 30000);
      expect(newRepo.getAgents()).toEqual([]);
      newRepo.close();
    });
  });
});
