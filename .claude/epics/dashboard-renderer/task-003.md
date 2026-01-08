# Task 003: DashboardRepository (DB Reader)

**Category**: Foundation (0-series)
**Dependencies**: Task 001, Task 002
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create a read-only repository class that queries the SwarmPulse SQLite database for agents, tasks, logs, and metrics.

## Acceptance Criteria
- [ ] `DashboardRepository` class with constructor accepting dbPath
- [ ] Read-only connection with WAL mode
- [ ] `getAgents()` returns all agents with computed dead status
- [ ] `getTasks()` returns all tasks ordered by status/progress
- [ ] `getLogsForAgent(agentId)` returns last N logs for specific agent
- [ ] `getAggregatedMetrics()` returns summary metrics
- [ ] Retry logic for SQLITE_BUSY (3 retries)
- [ ] All methods have unit tests with mock database

## Implementation Steps
1. Create `src/dashboard/db/DashboardRepository.ts`
2. Open DB connection with `readonly: true` and WAL mode
3. Implement query methods with parameterized SQL
4. Add dead agent detection logic (heartbeat > threshold)
5. Implement retry wrapper for busy database
6. Write comprehensive unit tests

## Test Specification
```typescript
// src/dashboard/db/__tests__/DashboardRepository.test.ts
import { DashboardRepository } from '../DashboardRepository';
import Database from 'better-sqlite3';
import { resolve } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('DashboardRepository', () => {
  let tempDir: string;
  let dbPath: string;
  let repo: DashboardRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'dashboard-test-'));
    dbPath = resolve(tempDir, 'test.db');
    // Create and seed test database
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE agents (id TEXT PRIMARY KEY, pid INTEGER, role TEXT,
        status TEXT, current_task_id TEXT, last_seen INTEGER, worktree_path TEXT);
      CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT, status TEXT,
        assigned_agent_id TEXT, progress_percent INTEGER, created_at INTEGER);
      CREATE TABLE logs (id INTEGER PRIMARY KEY, agent_id TEXT, level TEXT,
        message TEXT, timestamp INTEGER);
      CREATE TABLE metrics (id INTEGER PRIMARY KEY, agent_id TEXT,
        tokens_used INTEGER, estimated_cost REAL, timestamp INTEGER);
    `);
    db.close();
    repo = new DashboardRepository(dbPath, 30000);
  });

  afterEach(() => {
    repo.close();
    rmSync(tempDir, { recursive: true });
  });

  it('returns empty array when no agents', () => {
    const agents = repo.getAgents();
    expect(agents).toEqual([]);
  });

  it('marks agents as dead when heartbeat exceeds threshold', () => {
    // Insert agent with old heartbeat
    const db = new Database(dbPath);
    const oldTime = Date.now() - 60000; // 60 seconds ago
    db.exec(`INSERT INTO agents VALUES ('a1', 123, 'worker', 'Busy', NULL, ${oldTime}, '/path')`);
    db.close();

    const agents = repo.getAgents();
    expect(agents[0].status).toBe('Dead');
  });

  it('retrieves tasks ordered by status', () => {
    const db = new Database(dbPath);
    db.exec(`INSERT INTO tasks VALUES ('t1', 'Task 1', 'Complete', NULL, 100, 0)`);
    db.exec(`INSERT INTO tasks VALUES ('t2', 'Task 2', 'InProgress', 'a1', 50, 0)`);
    db.exec(`INSERT INTO tasks VALUES ('t3', 'Task 3', 'Pending', NULL, 0, 0)`);
    db.close();

    const tasks = repo.getTasks();
    expect(tasks[0].status).toBe('InProgress');
    expect(tasks[1].status).toBe('Pending');
  });

  it('aggregates metrics correctly', () => {
    const db = new Database(dbPath);
    db.exec(`INSERT INTO metrics VALUES (1, 'a1', 1000, 0.05, 0)`);
    db.exec(`INSERT INTO metrics VALUES (2, 'a1', 2000, 0.10, 0)`);
    db.close();

    const metrics = repo.getAggregatedMetrics();
    expect(metrics.totalTokens).toBe(3000);
    expect(metrics.totalCost).toBeCloseTo(0.15);
  });
});
```

## Class Interface
```typescript
export class DashboardRepository {
  constructor(dbPath: string, deadAgentThreshold: number);

  getAgents(): Agent[];
  getTasks(): Task[];
  getLogsForAgent(agentId: string, limit?: number): LogEntry[];
  getAggregatedMetrics(): AggregatedMetrics;
  close(): void;
}
```

---

**Blocked By**: Task 001, Task 002
**Blocks**: Task 010
