# Task 13: Process Pool

## Category
Core Logic

## Objective
Implement a process collection manager for tracking spawned processes.

## Dependencies
- task-01 (Type Definitions)

## Deliverables
1. `src/launcher/process/ProcessPool.ts` - Process collection management
2. `src/launcher/process/ProcessPool.test.ts` - Unit tests

## Implementation

### ProcessPool.ts
```typescript
import { ManagedProcess, ProcessStatus, ProcessType } from '../types';
import { EventEmitter } from 'events';

export class ProcessPool extends EventEmitter {
  private processes: Map<string, ManagedProcess> = new Map();

  add(process: ManagedProcess): void {
    this.processes.set(process.id, process);
    this.emit('added', process);
  }

  remove(id: string): boolean {
    const process = this.processes.get(id);
    if (process) {
      this.processes.delete(id);
      this.emit('removed', process);
      return true;
    }
    return false;
  }

  get(id: string): ManagedProcess | undefined {
    return this.processes.get(id);
  }

  getByPid(pid: number): ManagedProcess | undefined {
    return Array.from(this.processes.values()).find(p => p.pid === pid);
  }

  getByType(type: ProcessType): ManagedProcess[] {
    return Array.from(this.processes.values()).filter(p => p.type === type);
  }

  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  getDashboard(): ManagedProcess | undefined {
    return this.getByType('dashboard')[0];
  }

  getAgents(): ManagedProcess[] {
    return this.getByType('agent');
  }

  updateStatus(id: string, status: ProcessStatus, exitCode?: number | null): void {
    const process = this.processes.get(id);
    if (process) {
      process.status = status;
      if (exitCode !== undefined) {
        process.exitCode = exitCode;
      }
      this.emit('statusChanged', process);
    }
  }

  incrementRestartCount(id: string): number {
    const process = this.processes.get(id);
    if (process) {
      process.restartCount++;
      return process.restartCount;
    }
    return 0;
  }

  size(): number {
    return this.processes.size;
  }

  clear(): void {
    this.processes.clear();
    this.emit('cleared');
  }

  getRunningCount(): number {
    return Array.from(this.processes.values())
      .filter(p => p.status === 'running').length;
  }

  allStopped(): boolean {
    return Array.from(this.processes.values())
      .every(p => p.status === 'stopped' || p.status === 'crashed');
  }
}
```

## Acceptance Criteria
- [ ] Add/remove processes from pool
- [ ] Query by ID, PID, or type
- [ ] Update process status
- [ ] Track restart counts
- [ ] Emit events on state changes
- [ ] Helper methods for dashboard/agents
- [ ] 100% test coverage

## Test Specification
```typescript
describe('ProcessPool', () => {
  let pool: ProcessPool;

  beforeEach(() => {
    pool = new ProcessPool();
  });

  it('should add and retrieve processes', () => {
    const process = createMockProcess('agent-01', 'agent');
    pool.add(process);
    expect(pool.get('agent-01')).toBe(process);
  });

  it('should filter by type', () => {
    pool.add(createMockProcess('dashboard', 'dashboard'));
    pool.add(createMockProcess('agent-01', 'agent'));
    pool.add(createMockProcess('agent-02', 'agent'));

    expect(pool.getAgents()).toHaveLength(2);
    expect(pool.getDashboard()).toBeDefined();
  });

  it('should emit events on add/remove', () => {
    const onAdded = jest.fn();
    pool.on('added', onAdded);
    pool.add(createMockProcess('test', 'agent'));
    expect(onAdded).toHaveBeenCalled();
  });

  it('should track restart counts', () => {
    pool.add(createMockProcess('agent-01', 'agent'));
    expect(pool.incrementRestartCount('agent-01')).toBe(1);
    expect(pool.incrementRestartCount('agent-01')).toBe(2);
  });
});
```

## Estimated Effort
1-2 hours

## Notes
- EventEmitter allows other components to react to pool changes
- Restart count tracking is essential for auto-restart limiting
