/**
 * ASF Launcher - Public API
 *
 * @packageDocumentation
 */

// Core types
export {
  ProcessType,
  ProcessStatus,
  SwarmStatus,
  ManagedProcess,
  SwarmState,
  LauncherEvents,
} from './types';

// Configuration types
export {
  LauncherConfig,
  DashboardConfig,
  AgentConfig,
  WorktreeConfig,
  TaskConfig,
  ShutdownConfig,
  CLIOptions,
} from './config/types';

// Configuration utilities
export { ConfigLoader, ConfigurationError } from './config/ConfigLoader';
export { validateConfig, ValidationResult, formatValidationErrors } from './config/ConfigSchema';
export {
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_PATH,
  DEFAULT_PID_PATH,
  DEFAULT_DB_PATH,
} from './config/defaults';

// Process management
export { ProcessPool } from './process/ProcessPool';
export { ProcessManager } from './process/ProcessManager';
export { SpawnOptions, SpawnResult, KillOptions } from './process/types';

// PID file management
export { PidFileManager, PidFileData } from './pid/PidFileManager';

// Signal handling
export { SignalHandler, SignalHandlerOptions, SignalType } from './signals/SignalHandler';

// Main launcher
export { SwarmLauncher, SwarmLauncherOptions } from './SwarmLauncher';

// CLI
export { createCLI, runCLI } from './cli';
