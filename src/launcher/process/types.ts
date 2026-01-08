/**
 * Process management type definitions
 */

import { ProcessType } from '../types';
import { ChildProcess } from 'child_process';

/**
 * Options for spawning a new process
 */
export interface SpawnOptions {
  /** Unique identifier for the process */
  id: string;
  /** Type of process to spawn */
  type: ProcessType;
  /** Optional working directory */
  cwd?: string;
  /** Optional environment variables to inject */
  env?: Record<string, string>;
  /** Optional worktree path (for agents) */
  worktree?: string;
  /** Optional role (for agents) */
  role?: string;
}

/**
 * Result of a spawn operation
 */
export interface SpawnResult {
  /** Whether spawn was successful */
  success: boolean;
  /** Process ID if successful */
  pid?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Internal tracked process with Node.js ChildProcess reference
 */
export interface TrackedProcess {
  /** Unique identifier */
  id: string;
  /** Node.js ChildProcess instance */
  childProcess: ChildProcess;
  /** Command that was executed */
  command: string;
  /** Arguments passed to command */
  args: string[];
}

/**
 * Options for killing a process
 */
export interface KillOptions {
  /** Signal to send (default: SIGTERM) */
  signal?: NodeJS.Signals;
  /** Timeout in ms before force-killing */
  timeout?: number;
}

/**
 * Events emitted by ProcessManager
 */
export interface ProcessManagerEvents {
  /** Process started successfully */
  spawn: (id: string, pid: number) => void;
  /** Process exited */
  exit: (id: string, code: number | null, signal: NodeJS.Signals | null) => void;
  /** Process error occurred */
  error: (id: string, error: Error) => void;
}
