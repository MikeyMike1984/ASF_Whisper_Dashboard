/**
 * Core type definitions for the ASF Launcher
 */

/** Process type identifier */
export type ProcessType = 'dashboard' | 'agent';

/** Process lifecycle status */
export type ProcessStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';

/** Overall swarm status */
export type SwarmStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

/**
 * Represents a managed child process
 */
export interface ManagedProcess {
  /** Unique identifier for this process */
  id: string;
  /** Type of process (dashboard or agent) */
  type: ProcessType;
  /** Operating system process ID */
  pid: number;
  /** Current lifecycle status */
  status: ProcessStatus;
  /** Unix timestamp when process was started */
  startedAt: number;
  /** Number of times this process has been restarted */
  restartCount: number;
  /** Optional worktree path for agent processes */
  worktree?: string;
  /** Optional role for agent processes */
  role?: string;
  /** Exit code if process has exited */
  exitCode?: number | null;
}

/**
 * Current state of the entire swarm
 */
export interface SwarmState {
  /** Overall swarm status */
  status: SwarmStatus;
  /** All managed processes */
  processes: ManagedProcess[];
  /** Unix timestamp when swarm was started */
  startedAt?: number;
  /** Unix timestamp when swarm was stopped */
  stoppedAt?: number;
}

/**
 * Event handlers for launcher lifecycle events
 */
export interface LauncherEvents {
  /** Fired when a process starts */
  processStart: (process: ManagedProcess) => void;
  /** Fired when a process stops cleanly */
  processStop: (process: ManagedProcess) => void;
  /** Fired when a process crashes */
  processCrash: (process: ManagedProcess, error: Error) => void;
  /** Fired on any error */
  error: (error: Error) => void;
  /** Fired when swarm is fully started and ready */
  ready: () => void;
  /** Fired when swarm shutdown is complete */
  shutdown: () => void;
}

/**
 * Type-safe event emitter interface for launcher events
 */
export interface TypedEventEmitter<T extends Record<string, (...args: unknown[]) => void>> {
  on<K extends keyof T>(event: K, listener: T[K]): this;
  off<K extends keyof T>(event: K, listener: T[K]): this;
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean;
}
