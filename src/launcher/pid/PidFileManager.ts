/**
 * PID file management for cross-terminal swarm control
 */

import * as fs from 'fs';
import * as path from 'path';
import { ManagedProcess } from '../types';
import { DEFAULT_PID_PATH } from '../config/defaults';

/**
 * Structure of the PID file
 */
export interface PidFileData {
  /** PID of the launcher process itself */
  launcherPid: number;
  /** Unix timestamp when the launcher started */
  startedAt: number;
  /** Array of managed processes */
  processes: ManagedProcess[];
}

/**
 * Manages the launcher PID file for cross-terminal control
 */
export class PidFileManager {
  private pidPath: string;

  /**
   * Creates a new PidFileManager
   * @param pidPath - Path to PID file (defaults to .asf/launcher.pid)
   */
  constructor(pidPath?: string) {
    this.pidPath = pidPath || DEFAULT_PID_PATH;
  }

  /**
   * Writes process information to the PID file
   * @param launcherPid - PID of the launcher process
   * @param processes - Array of managed processes
   */
  write(launcherPid: number, processes: ManagedProcess[]): void {
    const dir = path.dirname(this.pidPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: PidFileData = {
      launcherPid,
      startedAt: Date.now(),
      processes,
    };

    fs.writeFileSync(this.pidPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Reads process information from the PID file
   * @returns PID file data or null if file doesn't exist
   */
  read(): PidFileData | null {
    if (!fs.existsSync(this.pidPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.pidPath, 'utf-8');
      return JSON.parse(content) as PidFileData;
    } catch {
      // Invalid JSON or read error - treat as missing
      return null;
    }
  }

  /**
   * Removes the PID file
   */
  remove(): void {
    if (fs.existsSync(this.pidPath)) {
      fs.unlinkSync(this.pidPath);
    }
  }

  /**
   * Checks if PID file exists
   * @returns True if PID file exists
   */
  exists(): boolean {
    return fs.existsSync(this.pidPath);
  }

  /**
   * Checks if the PID file is stale (launcher process no longer running)
   * @returns True if PID file exists but launcher process is not running
   */
  isStale(): boolean {
    const data = this.read();
    if (!data) {
      return false;
    }

    // Check if launcher process is still running
    try {
      // Sending signal 0 doesn't kill the process, just checks if it exists
      process.kill(data.launcherPid, 0);
      return false; // Process exists, not stale
    } catch {
      return true; // Process doesn't exist, PID file is stale
    }
  }

  /**
   * Gets the path to the PID file
   * @returns Absolute path to PID file
   */
  getPath(): string {
    return path.resolve(this.pidPath);
  }

  /**
   * Updates the processes list in an existing PID file
   * @param processes - Updated array of managed processes
   */
  updateProcesses(processes: ManagedProcess[]): void {
    const data = this.read();
    if (data) {
      data.processes = processes;
      fs.writeFileSync(this.pidPath, JSON.stringify(data, null, 2), 'utf-8');
    }
  }
}
