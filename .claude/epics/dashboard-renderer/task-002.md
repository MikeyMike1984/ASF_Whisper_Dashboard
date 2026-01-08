# Task 002: Dashboard Types & Configuration

**Category**: Foundation (0-series)
**Dependencies**: Task 001
**Branch**: `feature/dashboard-renderer`

---

## Objective
Define TypeScript interfaces and configuration types for the dashboard, importing base types from SwarmPulse SDK.

## Acceptance Criteria
- [ ] `DashboardConfig` interface defined with all config options
- [ ] `DashboardState` interface defined for runtime state
- [ ] `WidgetPosition` and `WidgetSize` types for layout
- [ ] Color constants defined for status colors
- [ ] Default configuration exported with sensible defaults
- [ ] Types are imported/re-exported from SwarmPulse SDK where applicable
- [ ] Unit tests verify config defaults and validation

## Implementation Steps
1. Create `src/dashboard/types.ts` with interfaces
2. Create `src/dashboard/config.ts` with defaults and validation
3. Import `Agent`, `Task`, `LogEntry` from SwarmPulse SDK
4. Define color constants matching PRD spec
5. Write tests for configuration validation

## Test Specification
```typescript
// src/dashboard/__tests__/config.test.ts
import { createConfig, DEFAULT_CONFIG, validateConfig } from '../config';

describe('Dashboard Configuration', () => {
  it('provides sensible defaults', () => {
    expect(DEFAULT_CONFIG.pollInterval).toBe(500);
    expect(DEFAULT_CONFIG.deadAgentThreshold).toBe(30000);
    expect(DEFAULT_CONFIG.gridRows).toBe(2);
    expect(DEFAULT_CONFIG.gridCols).toBe(4);
  });

  it('validates poll interval range', () => {
    expect(() => validateConfig({ pollInterval: 100 })).toThrow();
    expect(() => validateConfig({ pollInterval: 3000 })).toThrow();
    expect(() => validateConfig({ pollInterval: 500 })).not.toThrow();
  });

  it('merges partial config with defaults', () => {
    const config = createConfig({ pollInterval: 1000 });
    expect(config.pollInterval).toBe(1000);
    expect(config.gridRows).toBe(2); // default
  });
});
```

## Type Definitions
```typescript
// src/dashboard/types.ts
import { Agent, Task, LogEntry, Metric } from '../core/monitoring';

export interface DashboardConfig {
  dbPath: string;              // Default: '.asf/swarm_state.db'
  pollInterval: number;        // Default: 500ms (250-2000 range)
  deadAgentThreshold: number;  // Default: 30000ms
  gridRows: number;            // Default: 2
  gridCols: number;            // Default: 4
}

export interface DashboardState {
  agents: Agent[];
  tasks: Task[];
  logs: Map<string, LogEntry[]>;
  metrics: AggregatedMetrics;
  selectedAgentId: string | null;
  lastPollTime: number;
}

export interface AggregatedMetrics {
  totalTokens: number;
  totalCost: number;
  activeAgents: number;
  totalAgents: number;
}

export const STATUS_COLORS = {
  Idle: 'cyan',
  Busy: 'green',
  Error: 'yellow',
  Dead: 'red',
} as const;
```

---

**Blocked By**: Task 001
**Blocks**: Task 003, 004, 005
