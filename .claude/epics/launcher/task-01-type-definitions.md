# Task 01: Launcher Type Definitions

## Category
Foundation

## Objective
Define all TypeScript interfaces and types for the launcher module.

## Dependencies
- task-00 (Project Setup)

## Deliverables
1. `src/launcher/types.ts` - Core launcher types
2. `src/launcher/process/types.ts` - Process-related types
3. `src/launcher/config/types.ts` - Configuration types

## Type Definitions

### Core Types (src/launcher/types.ts)
```typescript
export type ProcessType = 'dashboard' | 'agent';
export type ProcessStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
export type SwarmStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped';

export interface ManagedProcess {
  id: string;
  type: ProcessType;
  pid: number;
  status: ProcessStatus;
  startedAt: number;
  restartCount: number;
  worktree?: string;
  role?: string;
  exitCode?: number | null;
}

export interface SwarmState {
  status: SwarmStatus;
  processes: ManagedProcess[];
  startedAt?: number;
  stoppedAt?: number;
}

export interface LauncherEvents {
  processStart: (process: ManagedProcess) => void;
  processStop: (process: ManagedProcess) => void;
  processCrash: (process: ManagedProcess, error: Error) => void;
  error: (error: Error) => void;
  ready: () => void;
  shutdown: () => void;
}
```

### Configuration Types (src/launcher/config/types.ts)
```typescript
export interface DashboardConfig {
  enabled: boolean;
  pollInterval: number;
  dbPath: string;
}

export interface AgentConfig {
  count: number;
  defaultRole: string;
  quietMode: boolean;
  autoRestart: boolean;
  restartDelay: number;
  maxRestarts: number;
}

export interface WorktreeConfig {
  path: string;
  agents: number;
  role: string;
}

export interface TaskConfig {
  id: string;
  title: string;
  assignTo: string;
}

export interface ShutdownConfig {
  gracePeriod: number;
  forceAfter: number;
}

export interface LauncherConfig {
  version: string;
  dashboard: DashboardConfig;
  agents: AgentConfig;
  worktrees: WorktreeConfig[];
  tasks: TaskConfig[];
  shutdown: ShutdownConfig;
}
```

## Acceptance Criteria
- [ ] All types defined and exported
- [ ] Types match PRD specifications exactly
- [ ] No `any` types used
- [ ] All types are documented with JSDoc comments

## Test Specification
```typescript
describe('Type Definitions', () => {
  it('should compile without errors', () => {
    // TypeScript compilation test
    const config: LauncherConfig = {
      version: '1.0',
      dashboard: { enabled: true, pollInterval: 500, dbPath: '.asf/swarm_state.db' },
      agents: { count: 8, defaultRole: 'developer', quietMode: true, autoRestart: false, restartDelay: 5000, maxRestarts: 3 },
      worktrees: [],
      tasks: [],
      shutdown: { gracePeriod: 10000, forceAfter: 15000 }
    };
    expect(config).toBeDefined();
  });
});
```

## Estimated Effort
1 hour

## Notes
- Types should be strict and avoid optional properties where possible
- Use discriminated unions for status enums
