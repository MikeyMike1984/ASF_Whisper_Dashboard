# Task 010: Export & Integration Testing

**Category**: Integration (2-series)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 009
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Create clean public exports and verify end-to-end integration.

## Acceptance Criteria
- [ ] `src/core/monitoring/index.ts` exports public API
- [ ] Only necessary types/classes exported (encapsulation)
- [ ] Integration test simulates real agent usage
- [ ] Example usage documented in code comments
- [ ] Package can be imported cleanly: `import { SwarmPulse } from './core/monitoring'`

## Implementation Steps
1. Create `src/core/monitoring/index.ts`:
   ```typescript
   export { SwarmPulse } from './SwarmPulse';
   export {
     AgentStatus,
     TaskStatus,
     LogLevel,
     SwarmPulseConfig
   } from './types';

   // Re-export types for consumers
   export type { Agent, Task, LogEntry, MetricEntry } from './types';
   ```
2. Create integration test simulating real agent workflow
3. Add JSDoc comments with usage examples
4. Verify build output

## Test Specification
```typescript
// integration.test.ts
describe('Integration', () => {
  it('should support complete agent lifecycle', () => {
    // Import from public API
    const { SwarmPulse, AgentStatus, LogLevel } = require('../index');

    // Initialize
    const pulse = SwarmPulse.getInstance({
      dbPath: '.asf/test_integration.db'
    });

    // Register
    const agentId = pulse.registerAgent('developer', 'feature/auth');
    expect(agentId).toBeDefined();

    // Work simulation
    pulse.setStatus(AgentStatus.Busy);
    pulse.capture('Starting task', LogLevel.Info);
    pulse.progress('implement-login', 0, 'Implement login');
    pulse.progress('implement-login', 50);
    pulse.capture('Halfway done');
    pulse.reportTokens(500);
    pulse.progress('implement-login', 100);
    pulse.capture('Task complete');
    pulse.reportCost(0.02);
    pulse.setStatus(AgentStatus.Idle);

    // Cleanup
    pulse.deregisterAgent();
    pulse.shutdown();

    // Verify final state
    const db = new Database('.asf/test_integration.db');
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    expect(agent.is_active).toBe(0);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('implement-login');
    expect(task.status).toBe('Complete');
    expect(task.progress_percent).toBe(100);

    db.close();
  });

  it('should export all required types', () => {
    const exports = require('../index');
    expect(exports.SwarmPulse).toBeDefined();
    expect(exports.AgentStatus).toBeDefined();
    expect(exports.TaskStatus).toBeDefined();
    expect(exports.LogLevel).toBeDefined();
  });
});
```

---

**Blocked By**: Task 009
**Blocks**: None (Final task)
