# Task 006: Heartbeat & Status Methods

**Category**: Core Logic (1-series)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 005
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Implement heartbeat mechanism and status update methods.

## Acceptance Criteria
- [ ] `heartbeat()` updates `last_seen` timestamp in DB
- [ ] Auto-heartbeat starts on `registerAgent()` with configurable interval
- [ ] Auto-heartbeat stops on `deregisterAgent()` or `shutdown()`
- [ ] `setStatus(status)` updates agent status in DB
- [ ] Heartbeat interval default: 5000ms
- [ ] Heartbeat completes within 10ms (performance test)
- [ ] No memory leaks from timer (verified via test)

## Implementation Steps
1. Add to `SwarmPulse.ts`:
   ```typescript
   private startHeartbeat(): void {
     this.heartbeatTimer = setInterval(() => {
       this.heartbeat();
     }, this.config.heartbeatInterval);
   }

   private stopHeartbeat(): void {
     if (this.heartbeatTimer) {
       clearInterval(this.heartbeatTimer);
       this.heartbeatTimer = null;
     }
   }

   heartbeat(): void {
     if (!this.agentId) return;
     this.repo.updateAgent(this.agentId, { lastSeen: Date.now() });
   }

   setStatus(status: AgentStatus): void {
     if (!this.agentId) throw new Error('Agent not registered');
     this.repo.updateAgent(this.agentId, { status });
   }
   ```
2. Modify `registerAgent()` to call `startHeartbeat()`
3. Modify `deregisterAgent()` and `shutdown()` to call `stopHeartbeat()`
4. Write unit tests including performance test

## Test Specification
```typescript
// heartbeat.test.ts
describe('Heartbeat', () => {
  it('should update last_seen on heartbeat()', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    const before = Date.now();
    pulse.heartbeat();
    // Query DB and verify last_seen >= before
  });

  it('should auto-heartbeat at configured interval', async () => {
    const pulse = SwarmPulse.getInstance({ heartbeatInterval: 100 });
    pulse.registerAgent('developer');
    await sleep(250);
    // Verify at least 2 heartbeats occurred
    pulse.shutdown();
  });

  it('should complete heartbeat within 10ms', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    const start = performance.now();
    pulse.heartbeat();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10);
  });
});

describe('Status', () => {
  it('should update agent status', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.setStatus(AgentStatus.Busy);
    // Verify status in DB
  });

  it('should throw if agent not registered', () => {
    const pulse = SwarmPulse.getInstance();
    expect(() => pulse.setStatus(AgentStatus.Busy)).toThrow();
  });
});
```

---

**Blocked By**: Task 005
**Blocks**: Task 009
