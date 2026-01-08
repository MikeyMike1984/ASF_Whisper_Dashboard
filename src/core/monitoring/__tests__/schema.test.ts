import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase, SCHEMA } from '../db/schema';

describe('Database Schema', () => {
  const testDir = '.asf-test-schema';
  const testDbPath = path.join(testDir, 'test_swarm_state.db');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initializeDatabase', () => {
    it('should create the database directory if it does not exist', () => {
      // Ensure directory doesn't exist
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }

      const db = initializeDatabase(testDbPath);
      expect(fs.existsSync(testDir)).toBe(true);
      db.close();
    });

    it('should create the database file', () => {
      const db = initializeDatabase(testDbPath);
      expect(fs.existsSync(testDbPath)).toBe(true);
      db.close();
    });

    it('should enable WAL mode', () => {
      const db = initializeDatabase(testDbPath);
      const result = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
      expect(result.journal_mode).toBe('wal');
      db.close();
    });

    it('should create agents table with correct columns', () => {
      const db = initializeDatabase(testDbPath);
      const columns = db.prepare('PRAGMA table_info(agents)').all() as Array<{ name: string }>;
      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('pid');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('current_task_id');
      expect(columnNames).toContain('last_seen');
      expect(columnNames).toContain('worktree_path');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('is_active');
      db.close();
    });

    it('should create tasks table with correct columns', () => {
      const db = initializeDatabase(testDbPath);
      const columns = db.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('assigned_agent_id');
      expect(columnNames).toContain('progress_percent');
      expect(columnNames).toContain('dependencies');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('started_at');
      expect(columnNames).toContain('completed_at');
      db.close();
    });

    it('should create logs table with correct columns', () => {
      const db = initializeDatabase(testDbPath);
      const columns = db.prepare('PRAGMA table_info(logs)').all() as Array<{ name: string }>;
      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('agent_id');
      expect(columnNames).toContain('level');
      expect(columnNames).toContain('message');
      expect(columnNames).toContain('timestamp');
      db.close();
    });

    it('should create metrics table with correct columns', () => {
      const db = initializeDatabase(testDbPath);
      const columns = db.prepare('PRAGMA table_info(metrics)').all() as Array<{ name: string }>;
      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('agent_id');
      expect(columnNames).toContain('tokens_used');
      expect(columnNames).toContain('estimated_cost');
      expect(columnNames).toContain('timestamp');
      db.close();
    });

    it('should create indexes for query performance', () => {
      const db = initializeDatabase(testDbPath);
      const indexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>;
      const indexNames = indexes.map((i) => i.name);

      expect(indexNames).toContain('idx_agents_status');
      expect(indexNames).toContain('idx_agents_last_seen');
      expect(indexNames).toContain('idx_tasks_status');
      expect(indexNames).toContain('idx_logs_agent_id');
      expect(indexNames).toContain('idx_metrics_agent_id');
      db.close();
    });

    it('should be idempotent (safe to run multiple times)', () => {
      const db1 = initializeDatabase(testDbPath);
      db1.close();

      // Should not throw when called again
      const db2 = initializeDatabase(testDbPath);
      expect(db2).toBeDefined();
      db2.close();
    });

    it('should return a working database instance', () => {
      const db = initializeDatabase(testDbPath);

      // Should be able to insert data
      db.prepare(
        `INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run('test-agent', 1234, 'developer', 'Idle', Date.now(), Date.now(), 1);

      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get('test-agent');
      expect(agent).toBeDefined();
      db.close();
    });
  });

  describe('SCHEMA', () => {
    it('should export SQL statements for all tables', () => {
      expect(SCHEMA.AGENTS_TABLE).toBeDefined();
      expect(SCHEMA.TASKS_TABLE).toBeDefined();
      expect(SCHEMA.LOGS_TABLE).toBeDefined();
      expect(SCHEMA.METRICS_TABLE).toBeDefined();
    });

    it('should export SQL statements for all indexes', () => {
      expect(SCHEMA.INDEXES).toBeDefined();
      expect(SCHEMA.INDEXES.length).toBeGreaterThan(0);
    });
  });
});
