# Task 004: StateStore (In-Memory Cache)

**Category**: Foundation (0-series)
**Dependencies**: Task 002
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create an in-memory state store that caches the latest dashboard state and enables efficient state diffing for optimized re-renders.

## Acceptance Criteria
- [ ] `StateStore` class with `getState()` and `setState()` methods
- [ ] Immutable state updates (new object on each update)
- [ ] `hasChanged()` method for detecting state changes
- [ ] `getAgentById(id)` helper for quick lookups
- [ ] `selectAgent(id)` and `clearSelection()` for UI state
- [ ] Event emitter for state change notifications
- [ ] Unit tests for all state operations

## Implementation Steps
1. Create `src/dashboard/polling/StateStore.ts`
2. Implement state container with EventEmitter
3. Add immutable update methods
4. Implement shallow comparison for change detection
5. Add agent lookup helpers
6. Write comprehensive tests

## Test Specification
```typescript
// src/dashboard/polling/__tests__/StateStore.test.ts
import { StateStore } from '../StateStore';

describe('StateStore', () => {
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore();
  });

  it('initializes with empty state', () => {
    const state = store.getState();
    expect(state.agents).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.selectedAgentId).toBeNull();
  });

  it('emits change event on state update', () => {
    const listener = jest.fn();
    store.on('change', listener);

    store.setState({ agents: [{ id: 'a1', status: 'Idle' }] });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('detects state changes correctly', () => {
    store.setState({ agents: [{ id: 'a1' }] });

    expect(store.hasChanged({ agents: [{ id: 'a1' }] })).toBe(false);
    expect(store.hasChanged({ agents: [{ id: 'a2' }] })).toBe(true);
  });

  it('looks up agents by id', () => {
    store.setState({
      agents: [
        { id: 'a1', status: 'Busy' },
        { id: 'a2', status: 'Idle' }
      ]
    });

    expect(store.getAgentById('a1')?.status).toBe('Busy');
    expect(store.getAgentById('nonexistent')).toBeUndefined();
  });

  it('manages agent selection', () => {
    store.selectAgent('a1');
    expect(store.getState().selectedAgentId).toBe('a1');

    store.clearSelection();
    expect(store.getState().selectedAgentId).toBeNull();
  });

  it('creates immutable state on updates', () => {
    const state1 = store.getState();
    store.setState({ agents: [{ id: 'a1' }] });
    const state2 = store.getState();

    expect(state1).not.toBe(state2);
  });
});
```

## Class Interface
```typescript
import { EventEmitter } from 'events';
import { DashboardState, Agent } from '../types';

export class StateStore extends EventEmitter {
  private state: DashboardState;

  constructor();

  getState(): DashboardState;
  setState(partial: Partial<DashboardState>): void;
  hasChanged(newState: Partial<DashboardState>): boolean;

  getAgentById(id: string): Agent | undefined;
  selectAgent(id: string): void;
  clearSelection(): void;
}
```

---

**Blocked By**: Task 002
**Blocks**: Task 010
