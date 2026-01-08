# System Patterns & Architecture

## Architecture Style

### Pattern
**Event-Driven Polling Architecture**

### Justification
- **Decoupled**: Dashboard and agents communicate only through DB, no direct connections
- **Zero Token Overhead**: Agents write to DB instead of stdout, preserving API tokens
- **Concurrency Safe**: SQLite WAL mode handles 15+ concurrent writers
- **Resilient**: Dashboard can restart without affecting agents, and vice versa

---

## Core Components

### Frontend (TUI)
- **Framework**: Node.js standalone process
- **Rendering**: `neo-blessed` (terminal rendering)
- **Widgets**: `blessed-contrib` (charts, grids, gauges)
- **Polling**: 250ms-2000ms configurable refresh rate

### Backend (State Layer)
- **Runtime**: Node.js with TypeScript
- **Database**: `better-sqlite3` (synchronous, robust concurrency)
- **Concurrency**: WAL (Write-Ahead Logging) mode for 15+ simultaneous writers
- **Location**: `.asf/swarm_state.db`

### Agent Instrumentation
- **Component**: `src/core/monitoring/SwarmPulse.ts`
- **Integration**: Lightweight import, zero stdout tokens
- **Mode**: Agents run with `--quiet` flag

### Infrastructure
- **Hosting**: Local machine (runs alongside ASF)
- **CI/CD**: GitHub Actions for testing
- **Distribution**: npm package or standalone binary

---

## Database Schema

```sql
-- Active agents and their current state
agents (
  id, pid, role, status [Idle|Busy|Error],
  current_task_id, last_seen, worktree_path
)

-- Task queue and progress tracking
tasks (
  id, title, status [Pending|InProgress|Complete|Failed],
  assigned_agent_id, progress_percent, dependencies,
  created_at, started_at, completed_at
)

-- Circular buffer of system events
logs (
  id, agent_id, level [Info|Warn|Error],
  message, timestamp
) -- Limited to last 1000 entries

-- Time-series metrics for cost tracking
metrics (
  id, agent_id, tokens_used, estimated_cost,
  timestamp
)
```

---

## Code Conventions

### Naming Conventions
- **Variables**: `camelCase`
- **Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: Feature-based structure

### File Structure
```
src/
├── core/           # Core business logic
│   └── monitoring/ # SwarmPulse SDK
├── dashboard/      # TUI rendering components
└── agents/         # Agent integration utilities
```

### Testing Strategy
- **Framework**: Jest
- **Coverage Target**: 80% minimum
- **Unit Tests**: Co-located with source files

### Linting & Formatting
- **Linting**: ESLint
- **Formatting**: Prettier
- **TypeScript**: Strict mode enabled

---

## Design Patterns

### Preferred Patterns
1. **Polling Pattern**: Dashboard polls DB at configurable intervals
2. **Repository Pattern**: Abstraction layer over SQLite access
3. **Observer Pattern**: For event-driven UI updates

### Anti-Patterns to Avoid
- ❌ **Stdout Pollution**: Never log to stdout (consumes tokens)
- ❌ **Direct Connections**: Agents and dashboard must only communicate via DB
- ❌ **Blocking I/O**: Use synchronous SQLite but keep operations fast

---

## Visual Layout (Wargames Grid)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ASF Whisper Dashboard    Agents: 8/15    Cost: $2.34    Tokens: 125.4k │
├───────────────────────────────────┬─────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │  WHISPER LOG [Agent-03]             │
│  │ A01 │ │ A02 │ │ A03 │ │ A04 │ │  ─────────────────────────────────  │
│  │BUSY │ │IDLE │ │BUSY │ │ ERR │ │  [14:23:01] Reading systemPatterns  │
│  │ 45% │ │  -  │ │ 78% │ │  !  │ │  [14:23:03] Planning auth module    │
│  └─────┘ └─────┘ └─────┘ └─────┘ │  [14:23:15] Writing failing test    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │  [14:23:22] Implementing handler    │
│  │ A05 │ │ A06 │ │ A07 │ │ A08 │ │  [14:23:45] Running npm test        │
│  │BUSY │ │BUSY │ │IDLE │ │DEAD │ │  [14:23:58] Tests passing           │
│  │ 12% │ │ 91% │ │  -  │ │  X  │ │                                     │
│  └─────┘ └─────┘ └─────┘ └─────┘ │                                     │
├───────────────────────────────────┤                                     │
│  TASK QUEUE                       │                                     │
│  ─────────────────────────────────│                                     │
│  [##########] 100% auth-login     │                                     │
│  [#######   ]  78% auth-register  │                                     │
│  [####      ]  45% user-model     │                                     │
│  [          ]   0% api-docs       │                                     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## Revision History
- **2026-01-07**: Initial architecture definition

**Last Updated**: 2026-01-07
