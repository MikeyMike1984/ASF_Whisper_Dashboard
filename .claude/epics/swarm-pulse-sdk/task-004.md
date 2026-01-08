# Task 004: Repository Layer (Data Access)

**Category**: Foundation (0-series)
**Estimated Time**: 2 hours
**Dependencies**: Task 002, Task 003
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Implement the data access layer with prepared statements for all CRUD operations.

## Acceptance Criteria
- [ ] `repository.ts` exports `SwarmRepository` class
- [ ] Agent CRUD: `createAgent`, `updateAgent`, `getAgent`, `deactivateAgent`
- [ ] Task CRUD: `createTask`, `updateTask`, `getTask`
- [ ] Log operations: `insertLog`, `getLogsForAgent`, `pruneOldLogs`
- [ ] Metric operations: `insertMetric`, `getMetricsForAgent`
- [ ] All operations use prepared statements (SQL injection safe)
- [ ] Circular buffer logic for logs (max 1000 per agent)
- [ ] Unit tests for all operations

## Implementation Steps
1. Create `src/core/monitoring/db/repository.ts`
2. Implement `SwarmRepository` class:
   ```typescript
   class SwarmRepository {
     constructor(private db: Database) {}

     // Agents
     createAgent(agent: Omit<Agent, 'id'>): string;
     updateAgent(id: string, updates: Partial<Agent>): void;
     getAgent(id: string): Agent | undefined;
     deactivateAgent(id: string): void;

     // Tasks
     createTask(task: Omit<Task, 'id'>): string;
     updateTask(id: string, updates: Partial<Task>): void;
     getTask(id: string): Task | undefined;

     // Logs
     insertLog(agentId: string, message: string, level: LogLevel): void;
     getLogsForAgent(agentId: string, limit?: number): LogEntry[];
     pruneOldLogs(agentId: string, maxEntries: number): void;

     // Metrics
     insertMetric(agentId: string, tokens: number, cost: number): void;
     getMetricsForAgent(agentId: string): MetricEntry[];
   }
   ```
3. Use prepared statements for all queries
4. Implement log pruning with DELETE + LIMIT
5. Write comprehensive unit tests

## Test Specification
```typescript
// repository.test.ts
describe('SwarmRepository', () => {
  let repo: SwarmRepository;

  describe('Agent Operations', () => {
    it('should create and retrieve an agent', () => {
      const id = repo.createAgent({ pid: 1234, role: 'developer', ... });
      const agent = repo.getAgent(id);
      expect(agent).toBeDefined();
      expect(agent.role).toBe('developer');
    });

    it('should update agent status', () => {
      const id = repo.createAgent({ ... });
      repo.updateAgent(id, { status: AgentStatus.Busy });
      expect(repo.getAgent(id).status).toBe('Busy');
    });
  });

  describe('Log Operations', () => {
    it('should maintain max 1000 logs per agent', () => {
      const agentId = repo.createAgent({ ... });
      for (let i = 0; i < 1100; i++) {
        repo.insertLog(agentId, `Log ${i}`, LogLevel.Info);
      }
      repo.pruneOldLogs(agentId, 1000);
      const logs = repo.getLogsForAgent(agentId);
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });
});
```

---

**Blocked By**: Task 002, Task 003
**Blocks**: Task 005, Task 006, Task 007, Task 008
