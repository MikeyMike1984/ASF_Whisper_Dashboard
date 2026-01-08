# Task 002: TypeScript Types & Interfaces

**Category**: Foundation (0-series)
**Estimated Time**: 1 hour
**Dependencies**: Task 001
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Define all TypeScript interfaces and types for SwarmPulse SDK.

## Acceptance Criteria
- [ ] `types.ts` exports all required interfaces
- [ ] `SwarmPulseConfig` interface defined
- [ ] `Agent` interface with all fields from schema
- [ ] `Task` interface with all fields from schema
- [ ] `LogEntry` interface with all fields from schema
- [ ] `MetricEntry` interface with all fields from schema
- [ ] Status enums: `AgentStatus`, `TaskStatus`, `LogLevel`
- [ ] All types compile without errors

## Implementation Steps
1. Create `src/core/monitoring/types.ts`
2. Define enums:
   ```typescript
   export enum AgentStatus { Idle = 'Idle', Busy = 'Busy', Error = 'Error' }
   export enum TaskStatus { Pending = 'Pending', InProgress = 'InProgress', Complete = 'Complete', Failed = 'Failed' }
   export enum LogLevel { Info = 'Info', Warn = 'Warn', Error = 'Error' }
   ```
3. Define interfaces matching DB schema
4. Define `SwarmPulseConfig` interface
5. Export all types

## Test Specification
```typescript
// types.test.ts
describe('Types', () => {
  it('should have AgentStatus enum with correct values', () => {
    expect(AgentStatus.Idle).toBe('Idle');
    expect(AgentStatus.Busy).toBe('Busy');
    expect(AgentStatus.Error).toBe('Error');
  });

  it('should have TaskStatus enum with correct values', () => {
    expect(TaskStatus.Pending).toBe('Pending');
    // ... etc
  });
});
```

---

**Blocked By**: Task 001
**Blocks**: Task 003, 004, 005
