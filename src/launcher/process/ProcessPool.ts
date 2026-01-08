/**
 * Process collection management for tracking spawned processes
 */

import { EventEmitter } from 'events';
import { ManagedProcess, ProcessStatus, ProcessType } from '../types';

/**
 * Events emitted by ProcessPool
 */
export interface ProcessPoolEvents {
  /** Process was added to pool */
  added: (process: ManagedProcess) => void;
  /** Process was removed from pool */
  removed: (process: ManagedProcess) => void;
  /** Process status changed */
  statusChanged: (process: ManagedProcess) => void;
  /** Pool was cleared */
  cleared: () => void;
}

/**
 * Manages a collection of tracked processes
 */
export class ProcessPool extends EventEmitter {
  private processes: Map<string, ManagedProcess> = new Map();

  /**
   * Adds a process to the pool
   * @param process - Process to add
   */
  add(process: ManagedProcess): void {
    this.processes.set(process.id, process);
    this.emit('added', process);
  }

  /**
   * Removes a process from the pool
   * @param id - ID of process to remove
   * @returns True if process was removed
   */
  remove(id: string): boolean {
    const process = this.processes.get(id);
    if (process) {
      this.processes.delete(id);
      this.emit('removed', process);
      return true;
    }
    return false;
  }

  /**
   * Gets a process by ID
   * @param id - Process ID
   * @returns Process or undefined if not found
   */
  get(id: string): ManagedProcess | undefined {
    return this.processes.get(id);
  }

  /**
   * Gets a process by PID
   * @param pid - Operating system process ID
   * @returns Process or undefined if not found
   */
  getByPid(pid: number): ManagedProcess | undefined {
    return Array.from(this.processes.values()).find((p) => p.pid === pid);
  }

  /**
   * Gets all processes of a specific type
   * @param type - Process type to filter by
   * @returns Array of matching processes
   */
  getByType(type: ProcessType): ManagedProcess[] {
    return Array.from(this.processes.values()).filter((p) => p.type === type);
  }

  /**
   * Gets all processes
   * @returns Array of all processes
   */
  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Gets the dashboard process
   * @returns Dashboard process or undefined
   */
  getDashboard(): ManagedProcess | undefined {
    return this.getByType('dashboard')[0];
  }

  /**
   * Gets all agent processes
   * @returns Array of agent processes
   */
  getAgents(): ManagedProcess[] {
    return this.getByType('agent');
  }

  /**
   * Updates the status of a process
   * @param id - Process ID
   * @param status - New status
   * @param exitCode - Optional exit code
   */
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

  /**
   * Increments the restart count for a process
   * @param id - Process ID
   * @returns New restart count, or 0 if process not found
   */
  incrementRestartCount(id: string): number {
    const process = this.processes.get(id);
    if (process) {
      process.restartCount++;
      return process.restartCount;
    }
    return 0;
  }

  /**
   * Gets the number of processes in the pool
   * @returns Process count
   */
  size(): number {
    return this.processes.size;
  }

  /**
   * Clears all processes from the pool
   */
  clear(): void {
    this.processes.clear();
    this.emit('cleared');
  }

  /**
   * Gets the count of currently running processes
   * @returns Number of running processes
   */
  getRunningCount(): number {
    return Array.from(this.processes.values()).filter((p) => p.status === 'running').length;
  }

  /**
   * Checks if all processes have stopped
   * @returns True if all processes are stopped or crashed
   */
  allStopped(): boolean {
    if (this.processes.size === 0) {
      return true;
    }
    return Array.from(this.processes.values()).every(
      (p) => p.status === 'stopped' || p.status === 'crashed'
    );
  }

  /**
   * Gets processes by status
   * @param status - Status to filter by
   * @returns Array of matching processes
   */
  getByStatus(status: ProcessStatus): ManagedProcess[] {
    return Array.from(this.processes.values()).filter((p) => p.status === status);
  }

  /**
   * Checks if a process with the given ID exists
   * @param id - Process ID to check
   * @returns True if process exists
   */
  has(id: string): boolean {
    return this.processes.has(id);
  }
}
