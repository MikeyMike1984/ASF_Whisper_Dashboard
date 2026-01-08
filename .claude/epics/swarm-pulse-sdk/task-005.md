# Task 005: SwarmPulse Singleton & Lifecycle Methods

**Category**: Core Logic (1-series)
**Estimated Time**: 2 hours
**Dependencies**: Task 003, Task 004
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Implement the SwarmPulse singleton class with agent lifecycle methods.

## Acceptance Criteria
- [ ] `SwarmPulse.ts` exports singleton class
- [ ] `getInstance(config?)` returns same instance on multiple calls
- [ ] Config defaults: `dbPath='.asf/swarm_state.db'`, `heartbeatInterval=5000`
- [ ] `registerAgent(role, worktreePath?)` creates agent record, returns ID
- [ ] `deregisterAgent()` marks agent inactive
- [ ] `shutdown()` stops heartbeat timer, deregisters agent, closes DB
- [ ] Auto-generates agent ID from `process.pid` + timestamp
- [ ] Zero stdout output (verified in tests)

## Implementation Steps
1. Create `src/core/monitoring/SwarmPulse.ts`
2. Implement singleton pattern:
   ```typescript
   class SwarmPulse {
     private static instance: SwarmPulse | null = null;
     private db: Database;
     private repo: SwarmRepository;
     private agentId: string | null = null;
     private heartbeatTimer: NodeJS.Timer | null = null;

     private constructor(config: SwarmPulseConfig) {
       this.db = initializeDatabase(config.dbPath);
       this.repo = new SwarmRepository(this.db);
     }

     static getInstance(config?: Partial<SwarmPulseConfig>): SwarmPulse {
       if (!SwarmPulse.instance) {
         SwarmPulse.instance = new SwarmPulse({ ...DEFAULT_CONFIG, ...config });
       }
       return SwarmPulse.instance;
     }

     registerAgent(role: string, worktreePath?: string): string {
       this.agentId = `agent-${process.pid}-${Date.now()}`;
       this.repo.createAgent({
         id: this.agentId,
         pid: process.pid,
         role,
         status: AgentStatus.Idle,
         worktreePath,
         lastSeen: Date.now(),
         createdAt: Date.now(),
         isActive: true
       });
       return this.agentId;
     }
   }
   ```
3. Implement `deregisterAgent()` and `shutdown()`
4. Add static `resetInstance()` for testing
5. Write unit tests

## Test Specification
```typescript
// SwarmPulse.test.ts
describe('SwarmPulse', () => {
  beforeEach(() => SwarmPulse.resetInstance());

  describe('Singleton', () => {
    it('should return same instance on multiple calls', () => {
      const a = SwarmPulse.getInstance();
      const b = SwarmPulse.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('Agent Lifecycle', () => {
    it('should register agent and return ID', () => {
      const pulse = SwarmPulse.getInstance();
      const id = pulse.registerAgent('developer', 'feature/auth');
      expect(id).toMatch(/^agent-\d+-\d+$/);
    });

    it('should deregister agent', () => {
      const pulse = SwarmPulse.getInstance();
      pulse.registerAgent('developer');
      pulse.deregisterAgent();
      // Verify agent marked inactive in DB
    });
  });

  describe('Zero Stdout', () => {
    it('should not write to stdout during operations', () => {
      const spy = jest.spyOn(process.stdout, 'write');
      const pulse = SwarmPulse.getInstance();
      pulse.registerAgent('developer');
      pulse.shutdown();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
```

---

**Blocked By**: Task 003, Task 004
**Blocks**: Task 006, Task 007, Task 008
