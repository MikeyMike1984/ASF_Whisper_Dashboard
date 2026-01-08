# Task 009: Concurrency & Load Testing

**Category**: Testing (3-series)
**Estimated Time**: 2 hours
**Dependencies**: Task 006, Task 007, Task 008
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Verify SwarmPulse SDK handles concurrent writes from multiple agents.

## Acceptance Criteria
- [ ] 15 concurrent "agents" can write without deadlock
- [ ] No data corruption under concurrent writes
- [ ] All operations complete within acceptable latency
- [ ] WAL mode properly handles contention
- [ ] Test simulates real-world usage pattern

## Implementation Steps
1. Create `src/core/monitoring/__tests__/concurrency.test.ts`
2. Implement concurrent agent simulation:
   ```typescript
   async function simulateAgent(id: number): Promise<void> {
     // Each "agent" runs in same process but uses unique ID
     const pulse = new SwarmPulse({
       dbPath: '.asf/test_concurrent.db'
     });
     const agentId = pulse.registerAgent(`agent-${id}`, `worktree-${id}`);

     // Simulate work
     for (let i = 0; i <= 100; i += 10) {
       pulse.progress(`task-${id}`, i);
       pulse.capture(`Agent ${id} at ${i}%`);
       pulse.heartbeat();
       await sleep(10);
     }

     pulse.reportTokens(1000 + id * 100);
     pulse.reportCost(0.01 * id);
     pulse.deregisterAgent();
   }
   ```
3. Run 15 agents in parallel using `Promise.all()`
4. Verify all data written correctly
5. Measure and assert latency bounds

## Test Specification
```typescript
// concurrency.test.ts
describe('Concurrency', () => {
  const testDbPath = '.asf/test_concurrent.db';

  afterAll(() => {
    fs.unlinkSync(testDbPath);
  });

  it('should handle 15 concurrent agents without deadlock', async () => {
    const agents = Array.from({ length: 15 }, (_, i) => simulateAgent(i));
    await expect(Promise.all(agents)).resolves.not.toThrow();
  }, 30000); // 30s timeout

  it('should write all data without corruption', async () => {
    await Promise.all(Array.from({ length: 15 }, (_, i) => simulateAgent(i)));

    // Verify all 15 agents recorded
    const db = new Database(testDbPath);
    const agents = db.prepare('SELECT COUNT(*) as count FROM agents').get();
    expect(agents.count).toBe(15);

    // Verify all tasks completed
    const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get('Complete');
    expect(tasks.count).toBe(15);

    // Verify logs written
    const logs = db.prepare('SELECT COUNT(*) as count FROM logs').get();
    expect(logs.count).toBeGreaterThan(0);

    db.close();
  }, 30000);

  it('should maintain acceptable latency under load', async () => {
    const latencies: number[] = [];

    // Measure heartbeat latency during concurrent operations
    const measureLatency = async () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('latency-test');
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        pulse.heartbeat();
        latencies.push(performance.now() - start);
      }
      pulse.shutdown();
    };

    await measureLatency();

    const p99 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];
    expect(p99).toBeLessThan(50); // p99 < 50ms under load
  });
});
```

---

**Blocked By**: Task 006, Task 007, Task 008
**Blocks**: Task 010
