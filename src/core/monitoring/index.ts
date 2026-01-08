/**
 * SwarmPulse SDK - Agent Telemetry for ASF
 *
 * A lightweight TypeScript library that enables ASF agents to report their
 * status, progress, and metrics to a shared SQLite database without emitting
 * any stdout.
 *
 * @example
 * ```typescript
 * import { SwarmPulse, AgentStatus, LogLevel } from '@asf/swarm-pulse-sdk';
 *
 * // Initialize (once per process)
 * const pulse = SwarmPulse.getInstance({
 *   dbPath: '.asf/swarm_state.db',
 *   heartbeatInterval: 5000,
 * });
 *
 * // Register this agent
 * const agentId = pulse.registerAgent('developer', 'feature/auth');
 *
 * // Report status changes
 * pulse.setStatus(AgentStatus.Busy);
 *
 * // Track task progress
 * pulse.progress('implement-login', 0, 'Implement user login');
 * pulse.progress('implement-login', 50);
 * pulse.progress('implement-login', 100);
 *
 * // Capture logs (silent - no stdout)
 * pulse.capture('Task completed successfully', LogLevel.Info);
 *
 * // Report usage metrics
 * pulse.reportTokens(1500);
 * pulse.reportCost(0.05);
 *
 * // Cleanup on exit
 * pulse.deregisterAgent();
 * pulse.shutdown();
 * ```
 *
 * @packageDocumentation
 */

// Main SDK class
export { SwarmPulse } from './SwarmPulse';

// Enums for type-safe status values
export { AgentStatus, TaskStatus, LogLevel } from './types';

// Configuration type
export type { SwarmPulseConfig } from './types';

// Re-export types for consumers who need to work with raw data
export type { Agent, Task, LogEntry, MetricEntry } from './types';

// Default configuration (useful for reference)
export { DEFAULT_CONFIG } from './types';

// SDK version
export const VERSION = '0.1.0';
