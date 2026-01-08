# Task 14: Process Manager

## Category
Core Logic

## Objective
Implement cross-platform process spawning and termination using execa and tree-kill.

## Dependencies
- task-01 (Type Definitions)
- task-13 (ProcessPool)

## Deliverables
1. `src/launcher/process/ProcessManager.ts` - Process spawn/kill logic
2. `src/launcher/process/ProcessManager.test.ts` - Unit tests

## Implementation

### ProcessManager.ts
```typescript
import { execa, ExecaChildProcess, Options as ExecaOptions } from 'execa';
import treeKill from 'tree-kill';
import { ManagedProcess, ProcessType, ProcessStatus } from '../types';
import { ProcessPool } from './ProcessPool';
import { EventEmitter } from 'events';

export interface SpawnOptions {
  type: ProcessType;
  id: string;
  worktree?: string;
  role?: string;
  env?: Record<string, string>;
  cwd?: string;
}

export class ProcessManager extends EventEmitter {
  private pool: ProcessPool;
  private childProcesses: Map<string, ExecaChildProcess> = new Map();

  constructor(pool: ProcessPool) {
    super();
    this.pool = pool;
  }

  async spawn(command: string, args: string[], options: SpawnOptions): Promise<ManagedProcess> {
    const execaOptions: ExecaOptions = {
      detached: false,
      stdio: 'pipe',
      env: { ...process.env, ...options.env },
      cwd: options.cwd
    };

    const childProcess = execa(command, args, execaOptions);

    const managedProcess: ManagedProcess = {
      id: options.id,
      type: options.type,
      pid: childProcess.pid!,
      status: 'starting',
      startedAt: Date.now(),
      restartCount: 0,
      worktree: options.worktree,
      role: options.role
    };

    this.childProcesses.set(options.id, childProcess);
    this.pool.add(managedProcess);

    // Handle process events
    childProcess.on('spawn', () => {
      this.pool.updateStatus(options.id, 'running');
      this.emit('processStart', managedProcess);
    });

    childProcess.on('exit', (code, signal) => {
      const status: ProcessStatus = code === 0 ? 'stopped' : 'crashed';
      this.pool.updateStatus(options.id, status, code);
      this.childProcesses.delete(options.id);

      if (status === 'crashed') {
        this.emit('processCrash', managedProcess, new Error(`Exit code: ${code}, signal: ${signal}`));
      } else {
        this.emit('processStop', managedProcess);
      }
    });

    childProcess.on('error', (error) => {
      this.pool.updateStatus(options.id, 'crashed');
      this.emit('processCrash', managedProcess, error);
    });

    return managedProcess;
  }

  async kill(id: string, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const childProcess = this.childProcesses.get(id);
    const managedProcess = this.pool.get(id);

    if (!childProcess || !managedProcess) {
      return;
    }

    this.pool.updateStatus(id, 'stopping');

    return new Promise((resolve, reject) => {
      treeKill(managedProcess.pid, signal, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async killAll(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const processes = this.pool.getAll();
    const killPromises = processes
      .filter(p => p.status === 'running' || p.status === 'starting')
      .map(p => this.kill(p.id, signal));

    await Promise.allSettled(killPromises);
  }

  getProcess(id: string): ManagedProcess | undefined {
    return this.pool.get(id);
  }

  getAllProcesses(): ManagedProcess[] {
    return this.pool.getAll();
  }

  getChildProcess(id: string): ExecaChildProcess | undefined {
    return this.childProcesses.get(id);
  }
}
```

## Acceptance Criteria
- [ ] Spawns processes with execa
- [ ] Tracks spawned processes in ProcessPool
- [ ] Kills processes using tree-kill (Windows compatible)
- [ ] Handles process exit events correctly
- [ ] Distinguishes between clean exit and crash
- [ ] Supports environment variable injection
- [ ] 100% test coverage

## Test Specification
```typescript
describe('ProcessManager', () => {
  let manager: ProcessManager;
  let pool: ProcessPool;

  beforeEach(() => {
    pool = new ProcessPool();
    manager = new ProcessManager(pool);
  });

  it('should spawn a process', async () => {
    const process = await manager.spawn('node', ['-e', 'setTimeout(() => {}, 1000)'], {
      type: 'agent',
      id: 'test-agent'
    });

    expect(process.pid).toBeDefined();
    expect(pool.get('test-agent')).toBeDefined();

    await manager.kill('test-agent');
  });

  it('should kill a process', async () => {
    await manager.spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], {
      type: 'agent',
      id: 'test-agent'
    });

    await manager.kill('test-agent');

    // Wait for exit event
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(pool.get('test-agent')?.status).toBe('stopped');
  });

  it('should emit events on process lifecycle', async () => {
    const onStart = jest.fn();
    const onStop = jest.fn();

    manager.on('processStart', onStart);
    manager.on('processStop', onStop);

    await manager.spawn('node', ['-e', 'process.exit(0)'], {
      type: 'agent',
      id: 'test-agent'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    expect(onStart).toHaveBeenCalled();
    expect(onStop).toHaveBeenCalled();
  });
});
```

## Estimated Effort
3-4 hours

## Notes
- tree-kill is essential for Windows where SIGTERM doesn't exist
- execa v8+ is ESM-only, ensure proper import handling
- Process stdio should be piped for log capture if needed
