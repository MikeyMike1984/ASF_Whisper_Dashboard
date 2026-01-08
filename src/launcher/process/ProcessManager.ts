/**
 * Cross-platform process spawning and termination
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const treeKill = require('tree-kill') as (
  pid: number,
  signal?: string,
  callback?: (error?: Error) => void
) => void;
import { ManagedProcess, ProcessStatus } from '../types';
import { ProcessPool } from './ProcessPool';
import { SpawnOptions, TrackedProcess, KillOptions } from './types';

/**
 * Manages process spawning and termination with cross-platform support
 */
export class ProcessManager extends EventEmitter {
  private pool: ProcessPool;
  private childProcesses: Map<string, TrackedProcess> = new Map();

  /**
   * Creates a new ProcessManager
   * @param pool - ProcessPool to track processes in
   */
  constructor(pool: ProcessPool) {
    super();
    this.pool = pool;
  }

  /**
   * Spawns a new process
   * @param command - Command to execute
   * @param args - Arguments for the command
   * @param options - Spawn options
   * @returns The managed process object
   */
  async spawn(command: string, args: string[], options: SpawnOptions): Promise<ManagedProcess> {
    const env = {
      ...process.env,
      ...options.env,
    };

    const childProcess = spawn(command, args, {
      cwd: options.cwd,
      env,
      stdio: 'pipe',
      detached: false,
      shell: process.platform === 'win32',
    });

    const managedProcess: ManagedProcess = {
      id: options.id,
      type: options.type,
      pid: childProcess.pid || 0,
      status: 'starting',
      startedAt: Date.now(),
      restartCount: 0,
      worktree: options.worktree,
      role: options.role,
    };

    const trackedProcess: TrackedProcess = {
      id: options.id,
      childProcess,
      command,
      args,
    };

    this.childProcesses.set(options.id, trackedProcess);
    this.pool.add(managedProcess);

    this.setupProcessHandlers(childProcess, options.id, managedProcess);

    return managedProcess;
  }

  /**
   * Sets up event handlers for a child process
   */
  private setupProcessHandlers(
    childProcess: ChildProcess,
    id: string,
    managedProcess: ManagedProcess
  ): void {
    childProcess.on('spawn', () => {
      this.pool.updateStatus(id, 'running');
      this.emit('processStart', managedProcess);
    });

    childProcess.on('exit', (code, signal) => {
      const status: ProcessStatus = code === 0 || code === null ? 'stopped' : 'crashed';
      this.pool.updateStatus(id, status, code);
      this.childProcesses.delete(id);

      const updatedProcess = this.pool.get(id);
      if (status === 'crashed' && updatedProcess) {
        this.emit('processCrash', updatedProcess, new Error(`Exit code: ${code}, signal: ${signal}`));
      } else if (updatedProcess) {
        this.emit('processStop', updatedProcess);
      }
    });

    childProcess.on('error', (error) => {
      this.pool.updateStatus(id, 'crashed');
      this.childProcesses.delete(id);

      const updatedProcess = this.pool.get(id);
      if (updatedProcess) {
        this.emit('processCrash', updatedProcess, error);
      }
    });

    // Capture stdout/stderr if needed for debugging
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data: Buffer) => {
        this.emit('stdout', id, data.toString());
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data: Buffer) => {
        this.emit('stderr', id, data.toString());
      });
    }
  }

  /**
   * Kills a process by ID
   * @param id - Process ID to kill
   * @param options - Kill options (signal, timeout)
   */
  async kill(id: string, options: KillOptions = {}): Promise<void> {
    const signal = options.signal || 'SIGTERM';
    const trackedProcess = this.childProcesses.get(id);
    const managedProcess = this.pool.get(id);

    if (!trackedProcess || !managedProcess) {
      return;
    }

    this.pool.updateStatus(id, 'stopping');

    return new Promise((resolve, reject) => {
      const pid = managedProcess.pid;

      // Use tree-kill for cross-platform process tree killing
      treeKill(pid, signal, (err?: Error) => {
        if (err) {
          // Process might already be dead, which is fine
          if (err.message?.includes('not found') || err.message?.includes('No such process')) {
            resolve();
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Kills all running processes
   * @param signal - Signal to send (default: SIGTERM)
   */
  async killAll(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const processes = this.pool.getAll();
    const killPromises = processes
      .filter((p) => p.status === 'running' || p.status === 'starting')
      .map((p) => this.kill(p.id, { signal }).catch(() => {
        // Ignore errors for individual process kills
      }));

    await Promise.allSettled(killPromises);
  }

  /**
   * Gets a managed process by ID
   * @param id - Process ID
   * @returns Managed process or undefined
   */
  getProcess(id: string): ManagedProcess | undefined {
    return this.pool.get(id);
  }

  /**
   * Gets all managed processes
   * @returns Array of all managed processes
   */
  getAllProcesses(): ManagedProcess[] {
    return this.pool.getAll();
  }

  /**
   * Gets the raw child process by ID
   * @param id - Process ID
   * @returns ChildProcess or undefined
   */
  getChildProcess(id: string): ChildProcess | undefined {
    return this.childProcesses.get(id)?.childProcess;
  }

  /**
   * Checks if a process is running
   * @param id - Process ID
   * @returns True if process is running
   */
  isRunning(id: string): boolean {
    const process = this.pool.get(id);
    return process?.status === 'running' || process?.status === 'starting';
  }

  /**
   * Gets the count of active child processes
   * @returns Number of active processes
   */
  getActiveCount(): number {
    return this.childProcesses.size;
  }
}
