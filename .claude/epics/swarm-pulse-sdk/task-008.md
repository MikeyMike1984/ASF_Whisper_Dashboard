# Task 008: Capture (Whisper Log) & Metrics Methods

**Category**: Core Logic (1-series)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 005
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Implement whisper logging and metrics reporting methods.

## Acceptance Criteria
- [ ] `capture(message, level?)` writes to logs table
- [ ] Default log level is `Info`
- [ ] Logs include timestamp automatically
- [ ] Circular buffer maintained (max 1000 logs per agent)
- [ ] `reportTokens(count)` creates metrics entry
- [ ] `reportCost(amount)` creates metrics entry
- [ ] Metrics include timestamp automatically
- [ ] All operations complete without stdout output

## Implementation Steps
1. Add to `SwarmPulse.ts`:
   ```typescript
   capture(message: string, level: LogLevel = LogLevel.Info): void {
     if (!this.agentId) throw new Error('Agent not registered');
     this.repo.insertLog(this.agentId, message, level);
     this.repo.pruneOldLogs(this.agentId, this.config.maxLogEntries);
   }

   reportTokens(count: number): void {
     if (!this.agentId) throw new Error('Agent not registered');
     this.repo.insertMetric(this.agentId, count, 0);
   }

   reportCost(amount: number): void {
     if (!this.agentId) throw new Error('Agent not registered');
     this.repo.insertMetric(this.agentId, 0, amount);
   }
   ```
2. Update `SwarmPulseConfig` to include `maxLogEntries` (default 1000)
3. Write unit tests

## Test Specification
```typescript
// capture.test.ts
describe('Capture (Whisper Logging)', () => {
  it('should write log entry to database', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.capture('Starting task analysis');
    // Verify log entry in DB
  });

  it('should default to Info level', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.capture('Test message');
    // Verify level = 'Info'
  });

  it('should support different log levels', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.capture('Warning!', LogLevel.Warn);
    pulse.capture('Error!', LogLevel.Error);
    // Verify correct levels
  });

  it('should maintain max 1000 logs per agent', () => {
    const pulse = SwarmPulse.getInstance({ maxLogEntries: 100 });
    pulse.registerAgent('developer');
    for (let i = 0; i < 150; i++) {
      pulse.capture(`Log ${i}`);
    }
    // Verify <= 100 logs in DB for this agent
  });
});

describe('Metrics', () => {
  it('should record token usage', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.reportTokens(1500);
    // Verify metric entry with tokens_used = 1500
  });

  it('should record cost estimate', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.reportCost(0.05);
    // Verify metric entry with estimated_cost = 0.05
  });
});
```

---

**Blocked By**: Task 005
**Blocks**: Task 009
