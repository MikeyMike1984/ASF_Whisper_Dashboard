# Task 010: PollingEngine

**Category**: Core (1-series)
**Dependencies**: Task 003, Task 004
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create the polling engine that periodically queries the database and updates the state store, with configurable intervals and error handling.

## Acceptance Criteria
- [ ] `PollingEngine` class with start/stop lifecycle
- [ ] Configurable poll interval (250-2000ms)
- [ ] Queries DashboardRepository for all data
- [ ] Updates StateStore with merged state
- [ ] Emits 'update' event when state changes
- [ ] Emits 'error' event on DB errors (doesn't crash)
- [ ] Graceful stop with interval cleanup
- [ ] Force poll capability for immediate refresh
- [ ] Unit tests with mocked dependencies

## Implementation Steps
1. Create `src/dashboard/polling/PollingEngine.ts`
2. Implement interval-based polling loop
3. Connect to DashboardRepository and StateStore
4. Add change detection (only emit when changed)
5. Implement error handling with retry
6. Write comprehensive tests

## Test Specification
```typescript
// src/dashboard/polling/__tests__/PollingEngine.test.ts
import { PollingEngine } from '../PollingEngine';
import { DashboardRepository } from '../../db/DashboardRepository';
import { StateStore } from '../StateStore';

// Mock dependencies
jest.mock('../../db/DashboardRepository');

describe('PollingEngine', () => {
  let engine: PollingEngine;
  let mockRepo: jest.Mocked<DashboardRepository>;
  let store: StateStore;

  beforeEach(() => {
    mockRepo = new DashboardRepository('') as jest.Mocked<DashboardRepository>;
    mockRepo.getAgents.mockReturnValue([]);
    mockRepo.getTasks.mockReturnValue([]);
    mockRepo.getLogsForAgent.mockReturnValue([]);
    mockRepo.getAggregatedMetrics.mockReturnValue({
      totalTokens: 0,
      totalCost: 0,
      activeAgents: 0,
      totalAgents: 0,
    });

    store = new StateStore();
    engine = new PollingEngine(mockRepo, store, { interval: 100 });
  });

  afterEach(() => {
    engine.stop();
  });

  it('polls repository at configured interval', async () => {
    engine.start();

    await sleep(250); // Allow 2-3 polls

    expect(mockRepo.getAgents).toHaveBeenCalled();
    expect(mockRepo.getAgents.mock.calls.length).toBeGreaterThan(1);
  });

  it('updates state store with polled data', async () => {
    mockRepo.getAgents.mockReturnValue([
      { id: 'A01', status: 'Busy', progress: 50 }
    ]);

    engine.start();
    await sleep(150);

    const state = store.getState();
    expect(state.agents).toHaveLength(1);
    expect(state.agents[0].id).toBe('A01');
  });

  it('emits update event on state change', async () => {
    const listener = jest.fn();
    engine.on('update', listener);

    mockRepo.getAgents.mockReturnValue([{ id: 'A01', status: 'Busy' }]);

    engine.start();
    await sleep(150);

    expect(listener).toHaveBeenCalled();
  });

  it('does not emit update when state unchanged', async () => {
    const listener = jest.fn();
    engine.on('update', listener);

    // Same empty state every time
    mockRepo.getAgents.mockReturnValue([]);

    engine.start();
    await sleep(250);

    // Should only emit once on first poll
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('emits error event on repository failure', async () => {
    const errorListener = jest.fn();
    engine.on('error', errorListener);

    mockRepo.getAgents.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    engine.start();
    await sleep(150);

    expect(errorListener).toHaveBeenCalled();
  });

  it('continues polling after error', async () => {
    let callCount = 0;
    mockRepo.getAgents.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('First call fails');
      return [{ id: 'A01', status: 'Idle' }];
    });

    engine.start();
    await sleep(250);

    // Should have recovered and updated state
    const state = store.getState();
    expect(state.agents).toHaveLength(1);
  });

  it('stops polling cleanly', async () => {
    engine.start();
    await sleep(100);

    const callsBefore = mockRepo.getAgents.mock.calls.length;
    engine.stop();

    await sleep(200);

    // No additional calls after stop
    expect(mockRepo.getAgents.mock.calls.length).toBe(callsBefore);
  });

  it('force poll triggers immediate update', async () => {
    mockRepo.getAgents.mockReturnValue([{ id: 'A01', status: 'Idle' }]);

    // Don't start automatic polling
    await engine.forcePoll();

    expect(mockRepo.getAgents).toHaveBeenCalledTimes(1);
    expect(store.getState().agents).toHaveLength(1);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Class Interface
```typescript
import { EventEmitter } from 'events';
import { DashboardRepository } from '../db/DashboardRepository';
import { StateStore } from './StateStore';

export interface PollingEngineOptions {
  interval: number;  // 250-2000ms
}

export class PollingEngine extends EventEmitter {
  constructor(
    repository: DashboardRepository,
    store: StateStore,
    options: PollingEngineOptions
  );

  start(): void;
  stop(): void;
  forcePoll(): Promise<void>;

  isRunning(): boolean;
  getInterval(): number;
  setInterval(ms: number): void;
}
```

---

**Blocked By**: Task 003, Task 004
**Blocks**: Task 011
