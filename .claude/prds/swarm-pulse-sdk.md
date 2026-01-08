# PRD: SwarmPulse SDK

**Feature Name**: SwarmPulse SDK
**Author**: Claude (Product Manager + System Architect)
**Date**: 2026-01-07
**Status**: Draft - Pending Approval

---

## Problem Statement

When running multiple parallel Claude agents in the Autonomous Software Forge, agents have no standardized way to report their status, progress, or internal thoughts without consuming API tokens via stdout. Developers need a lightweight instrumentation layer that allows agents to silently write state to a shared database, enabling the Whisper Dashboard to visualize swarm activity in real-time.

---

## Proposed Solution

Build **SwarmPulse SDK** - a lightweight TypeScript library that agents import to report status to a local SQLite database. The SDK provides:

1. **Singleton Pattern**: Auto-initializes with agent context from environment
2. **Zero Stdout Output**: All communication via database writes
3. **Auto-DB Initialization**: Creates `.asf/swarm_state.db` and tables on first use
4. **Heartbeat System**: Periodic liveness signals for dead agent detection

---

## User Stories

1. **As an** agent, **I want to** register myself when starting **so that** the dashboard knows I exist.
2. **As an** agent, **I want to** send heartbeats automatically **so that** the dashboard can detect if I die.
3. **As an** agent, **I want to** report my current task progress **so that** developers can track completion.
4. **As an** agent, **I want to** capture internal thoughts/logs **so that** developers can debug without consuming tokens.
5. **As an** agent, **I want to** report token usage **so that** the dashboard can show cost estimates.
6. **As an** agent, **I want to** deregister gracefully on exit **so that** the dashboard shows accurate agent counts.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | `SwarmPulse.getInstance()` returns singleton, auto-initializes DB | Must Have |
| FR-2 | `registerAgent(role, worktreePath)` creates agent record | Must Have |
| FR-3 | `deregisterAgent()` marks agent as inactive | Must Have |
| FR-4 | `heartbeat()` updates `last_seen` timestamp | Must Have |
| FR-5 | `progress(taskId, percent, title?)` updates task progress | Must Have |
| FR-6 | `capture(message, level?)` writes to logs table | Must Have |
| FR-7 | `reportTokens(count)` records token usage | Should Have |
| FR-8 | `reportCost(amount)` records estimated cost | Should Have |
| FR-9 | Auto-heartbeat interval (configurable, default 5s) | Should Have |
| FR-10 | Logs table circular buffer (max 1000 entries per agent) | Should Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Zero stdout output | 0 bytes |
| NFR-2 | DB write latency | <10ms |
| NFR-3 | Memory footprint | <5MB |
| NFR-4 | Concurrent writers support | 15+ agents |
| NFR-5 | Graceful degradation if DB locked | No crashes |

---

## Technical Design (High-Level)

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Agent 1       │     │   Agent 2        │     │   Agent N       │
│  ┌───────────┐  │     │  ┌───────────┐   │     │  ┌───────────┐  │
│  │SwarmPulse │  │     │  │SwarmPulse │   │     │  │SwarmPulse │  │
│  │ Singleton │  │     │  │ Singleton │   │     │  │ Singleton │  │
│  └─────┬─────┘  │     │  └─────┬─────┘   │     │  └─────┬─────┘  │
└────────┼────────┘     └────────┼─────────┘     └────────┼────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  .asf/swarm_state.db   │
                    │  (SQLite + WAL mode)   │
                    ├────────────────────────┤
                    │  - agents              │
                    │  - tasks               │
                    │  - logs                │
                    │  - metrics             │
                    └────────────────────────┘
                                 ▲
                                 │ (polling)
                    ┌────────────────────────┐
                    │   Whisper Dashboard    │
                    │   (separate process)   │
                    └────────────────────────┘
```

### File Structure

```
src/
├── core/
│   └── monitoring/
│       ├── SwarmPulse.ts        # Main SDK class (singleton)
│       ├── SwarmPulse.test.ts   # Unit tests
│       ├── db/
│       │   ├── schema.ts        # Table definitions
│       │   ├── migrations.ts    # Auto-migration logic
│       │   └── repository.ts    # Data access layer
│       └── types.ts             # TypeScript interfaces
```

### Database Schema (Detailed)

```sql
-- Enable WAL mode for concurrent writes
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,           -- UUID or "agent-{pid}"
  pid INTEGER NOT NULL,          -- Process ID
  role TEXT NOT NULL,            -- e.g., "developer", "qa", "architect"
  status TEXT DEFAULT 'Idle',    -- Idle | Busy | Error
  current_task_id TEXT,          -- FK to tasks.id (nullable)
  last_seen INTEGER NOT NULL,    -- Unix timestamp (ms)
  worktree_path TEXT,            -- e.g., "feature/auth-system"
  created_at INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1    -- Soft delete flag
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,           -- UUID
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Pending', -- Pending | InProgress | Complete | Failed
  assigned_agent_id TEXT,        -- FK to agents.id
  progress_percent INTEGER DEFAULT 0,
  dependencies TEXT,             -- JSON array of task IDs
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,        -- FK to agents.id
  level TEXT DEFAULT 'Info',     -- Info | Warn | Error
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,        -- FK to agents.id
  tokens_used INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0.0,
  timestamp INTEGER NOT NULL
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_metrics_agent_id ON metrics(agent_id);
```

### SDK Interface

```typescript
interface SwarmPulseConfig {
  dbPath?: string;              // Default: '.asf/swarm_state.db'
  heartbeatInterval?: number;   // Default: 5000ms
  maxLogEntries?: number;       // Default: 1000 per agent
}

class SwarmPulse {
  static getInstance(config?: SwarmPulseConfig): SwarmPulse;

  // Agent lifecycle
  registerAgent(role: string, worktreePath?: string): string; // Returns agent ID
  deregisterAgent(): void;

  // Status updates
  heartbeat(): void;
  setStatus(status: 'Idle' | 'Busy' | 'Error'): void;

  // Task tracking
  progress(taskId: string, percent: number, title?: string): void;

  // Logging (whisper)
  capture(message: string, level?: 'Info' | 'Warn' | 'Error'): void;

  // Metrics
  reportTokens(count: number): void;
  reportCost(amount: number): void;

  // Cleanup
  shutdown(): void;
}
```

---

## Out of Scope (v1)

1. Remote database support (SQLite only)
2. Agent-to-agent communication
3. Task assignment/scheduling (agents report only)
4. WebSocket-based real-time updates
5. Historical data retention beyond session

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Zero stdout pollution | 0 bytes | Code review + runtime verification |
| DB write latency | <10ms p99 | Jest performance tests |
| Concurrent writer support | 15+ agents | Load test with parallel writes |
| Memory footprint | <5MB | Process memory profiling |
| Test coverage | >80% | Jest coverage report |

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SQLite lock contention | Medium | High | Use WAL mode, retry logic |
| Agent crash without deregister | High | Medium | Heartbeat timeout detection |
| Large log accumulation | Medium | Low | Circular buffer with max entries |
| Cross-platform path issues | Low | Medium | Use path.join(), normalize paths |

---

## Open Questions

1. **Q**: Should we support custom agent IDs or always auto-generate?
   **Recommendation**: Auto-generate from PID + timestamp for uniqueness

2. **Q**: How long should heartbeat timeout be for "dead" detection?
   **Recommendation**: 30 seconds (configurable by dashboard)

3. **Q**: Should metrics be cumulative or per-interval?
   **Recommendation**: Per-interval, dashboard aggregates

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `better-sqlite3` | ^9.0.0 | SQLite driver with WAL support |
| `uuid` | ^9.0.0 | Generate unique IDs |

---

## Acceptance Criteria

- [ ] `SwarmPulse.getInstance()` returns same instance on multiple calls
- [ ] Database auto-creates in `.asf/` directory if missing
- [ ] All 4 tables created with correct schema
- [ ] `registerAgent()` creates record and returns unique ID
- [ ] `heartbeat()` updates `last_seen` within 10ms
- [ ] `capture()` writes to logs table without stdout
- [ ] `progress()` creates/updates task record
- [ ] `reportTokens()` and `reportCost()` create metrics entries
- [ ] Logs table maintains max 1000 entries per agent (FIFO)
- [ ] 15 concurrent agents can write without deadlock
- [ ] All tests pass with >80% coverage

---

**Next Step**: `/epic-decompose swarm-pulse-sdk`
