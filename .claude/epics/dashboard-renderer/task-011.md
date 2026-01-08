# Task 011: DashboardRenderer Orchestrator

**Category**: Integration (2-series)
**Dependencies**: Task 006, 007, 008, 009, 010
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create the main orchestrator class that initializes all components, manages the blessed screen, coordinates widget rendering, and provides the public API for starting/stopping the dashboard.

## Acceptance Criteria
- [ ] `DashboardRenderer` class with start/stop lifecycle
- [ ] Creates and manages blessed screen
- [ ] Instantiates all widgets with correct layout
- [ ] Connects PollingEngine to widgets via StateStore
- [ ] Handles terminal resize events
- [ ] Graceful shutdown restores terminal state
- [ ] Public events: 'stateChange', 'error', 'exit'
- [ ] Configuration passed to all sub-components
- [ ] Integration tests verify full rendering pipeline

## Implementation Steps
1. Create `src/dashboard/DashboardRenderer.ts`
2. Initialize blessed screen with correct settings
3. Create and position all widgets in layout
4. Wire up StateStore -> Widget render pipeline
5. Handle resize and cleanup
6. Write integration tests

## Test Specification
```typescript
// src/dashboard/__tests__/DashboardRenderer.test.ts
import { DashboardRenderer } from '../DashboardRenderer';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

describe('DashboardRenderer', () => {
  let tempDir: string;
  let dbPath: string;
  let renderer: DashboardRenderer;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'dashboard-renderer-test-'));
    dbPath = resolve(tempDir, 'test.db');

    // Create test database with schema
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
  });

  afterEach(async () => {
    if (renderer) {
      await renderer.stop();
    }
    rmSync(tempDir, { recursive: true });
  });

  it('constructs with default config', () => {
    renderer = new DashboardRenderer({ dbPath });
    expect(renderer).toBeDefined();
  });

  it('starts and creates screen', async () => {
    renderer = new DashboardRenderer({ dbPath });
    await renderer.start();

    expect(renderer.isRunning()).toBe(true);
  });

  it('stops and cleans up screen', async () => {
    renderer = new DashboardRenderer({ dbPath });
    await renderer.start();
    await renderer.stop();

    expect(renderer.isRunning()).toBe(false);
  });

  it('emits stateChange on poll update', async () => {
    renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
    const listener = jest.fn();
    renderer.on('stateChange', listener);

    await renderer.start();
    await sleep(150);

    expect(listener).toHaveBeenCalled();
  });

  it('emits error on DB access failure', async () => {
    renderer = new DashboardRenderer({
      dbPath: '/nonexistent/path/db.sqlite',
      pollInterval: 100
    });
    const errorListener = jest.fn();
    renderer.on('error', errorListener);

    // Start should fail or emit error
    try {
      await renderer.start();
      await sleep(150);
    } catch (e) {
      // Expected
    }

    expect(errorListener).toHaveBeenCalled();
  });

  it('provides current state via getState()', async () => {
    // Seed database with test data
    const db = new Database(dbPath);
    db.exec(`INSERT INTO agents VALUES ('A01', 123, 'worker', 'Busy', NULL, ${Date.now()}, '/path')`);
    db.close();

    renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
    await renderer.start();
    await sleep(150);

    const state = renderer.getState();
    expect(state.agents).toHaveLength(1);
    expect(state.agents[0].id).toBe('A01');
  });

  it('handles configuration options', () => {
    renderer = new DashboardRenderer({
      dbPath,
      pollInterval: 1000,
      deadAgentThreshold: 60000,
      gridRows: 3,
      gridCols: 5,
    });

    const config = renderer.getConfig();
    expect(config.pollInterval).toBe(1000);
    expect(config.deadAgentThreshold).toBe(60000);
    expect(config.gridRows).toBe(3);
    expect(config.gridCols).toBe(5);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Visual Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ HeaderWidget (height: 3, width: 100%)                                  │
├───────────────────────────────────┬────────────────────────────────────┤
│ AgentGridWidget                   │ WhisperLogWidget                   │
│ (width: 50%, height: 50%)         │ (width: 50%, height: 70%)          │
│                                   │                                    │
├───────────────────────────────────┤                                    │
│ TaskQueueWidget                   │                                    │
│ (width: 50%, height: 50%)         │                                    │
│                                   │                                    │
└───────────────────────────────────┴────────────────────────────────────┘
```

## Class Interface
```typescript
import { EventEmitter } from 'events';
import { DashboardConfig, DashboardState } from './types';

export class DashboardRenderer extends EventEmitter {
  constructor(config: Partial<DashboardConfig>);

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;

  // State access
  getState(): DashboardState;
  getConfig(): DashboardConfig;

  // Manual control
  forcePoll(): Promise<void>;
  selectAgent(id: string): void;
  clearSelection(): void;

  // Events: 'stateChange', 'error', 'exit'
}
```

---

**Blocked By**: Task 006, 007, 008, 009, 010
**Blocks**: Task 012
