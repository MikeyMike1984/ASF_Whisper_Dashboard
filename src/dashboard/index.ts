/**
 * Dashboard Renderer Module
 *
 * Public exports for the TUI dashboard.
 */

// Main class
export { DashboardRenderer } from './DashboardRenderer';

// Configuration
export {
  createConfig,
  validateConfig,
  DEFAULT_CONFIG,
  ConfigValidationError,
  MIN_POLL_INTERVAL,
  MAX_POLL_INTERVAL,
} from './config';

// Types
export {
  DashboardConfig,
  DashboardState,
  DashboardAgent,
  DashboardAgentStatus,
  AggregatedMetrics,
  STATUS_COLORS,
  TASK_STATUS_COLORS,
  LOG_LEVEL_COLORS,
} from './types';

// Re-export core types
export { Agent, Task, LogEntry, AgentStatus, TaskStatus, LogLevel } from './types';

// Components (for advanced use)
export { DashboardRepository } from './db/DashboardRepository';
export { StateStore } from './polling/StateStore';
export { PollingEngine, PollingEngineOptions } from './polling/PollingEngine';

// Widgets (for advanced use)
export { BaseWidget, WidgetOptions } from './widgets/BaseWidget';
export { HeaderWidget } from './widgets/HeaderWidget';
export { AgentGridWidget, AgentGridOptions } from './widgets/AgentGridWidget';
export { TaskQueueWidget } from './widgets/TaskQueueWidget';
export { WhisperLogWidget } from './widgets/WhisperLogWidget';

/**
 * Dashboard Renderer version
 */
export const VERSION = '0.1.0';
