# Project Details: ASF "Whisper" Dashboard

---

## Project Name
ASF Whisper Dashboard

## Vision Statement
Build a real-time Terminal User Interface (TUI) dashboard that visualizes 5-15 concurrent ASF agents with near-zero token overhead. By running agents in "Quiet Mode" and polling a local SQLite database, we achieve full observability without consuming API tokens for status updates.

---

## Problem Statement
When running multiple parallel Claude agents in the Autonomous Software Forge, there's no visibility into what each agent is doing, their progress, or system health. Traditional stdout-based monitoring would consume tokens and pollute the context window. Developers need a "war room" view of their agent swarm without sacrificing efficiency.

---

## Core Features (v1)
1. **Agent Status Grid**: 4x4 matrix of agent cards showing real-time status (Busy/Idle/Error/Dead)
2. **Task Queue Viewer**: Scrolling list of pending, in-progress, and completed tasks with progress percentages
3. **Whisper Log Feed**: Internal agent thoughts/logs captured silently to DB, viewable per-agent
4. **Cost Estimator**: Real-time token usage and cost tracking in the header
5. **Heartbeat Monitoring**: Auto-detect dead agents (no heartbeat > 30 seconds)
6. **SwarmPulse SDK**: Lightweight wrapper for agents to report status without stdout

## Out of Scope (v1)
1. Web-based dashboard (TUI only for v1)
2. Historical analytics and reporting
3. Remote agent monitoring (local machine only)
4. Agent control/restart from dashboard (read-only for v1)

---

## Technical Stack

### Frontend (TUI)
- Framework: Node.js standalone process
- Rendering: `neo-blessed` (terminal rendering)
- Widgets: `blessed-contrib` (charts, grids, gauges)
- Polling: 250ms-2000ms configurable refresh rate

### Backend (State Layer)
- Runtime: Node.js with TypeScript
- Database: `better-sqlite3` (synchronous, robust concurrency)
- Concurrency: WAL (Write-Ahead Logging) mode for 15+ simultaneous writers
- Location: `.asf/swarm_state.db`

### Agent Instrumentation
- Component: `src/core/monitoring/SwarmPulse.ts`
- Integration: Lightweight import, zero stdout tokens
- Mode: Agents run with `--quiet` flag

### Infrastructure
- Hosting: Local machine (runs alongside ASF)
- CI/CD: GitHub Actions for testing
- Distribution: npm package or standalone binary

---

## Architecture Pattern
**Event-Driven Polling Architecture**

### Components
1. **State Layer**: SQLite database as single source of truth
2. **Instrumentation Layer**: SwarmPulse SDK injected into agents
3. **Visualization Layer**: TUI dashboard polling the database

### Why this pattern?
- **Decoupled**: Dashboard and agents communicate only through DB, no direct connections
- **Zero Token Overhead**: Agents write to DB instead of stdout, preserving API tokens
- **Concurrency Safe**: SQLite WAL mode handles 15+ concurrent writers
- **Resilient**: Dashboard can restart without affecting agents, and vice versa

---

## Database Schema

### Tables
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
- Language: TypeScript with strict mode
- Naming: camelCase for variables/functions, PascalCase for classes/types
- Testing: Jest, 80% coverage target
- Linting: ESLint + Prettier
- File Structure: Feature-based (`src/core/`, `src/dashboard/`, `src/agents/`)

---

## Success Metrics
1. **Performance**: Dashboard renders at 60fps with 15 active agents
2. **Overhead**: Zero additional API tokens consumed for monitoring
3. **Latency**: Status updates visible within 500ms of agent state change
4. **Reliability**: Dashboard stable for 8+ hour continuous operation

---

## Constraints
- Must integrate with existing ASF worktree architecture
- SQLite only (no external database dependencies)
- Terminal-only UI (must work over SSH)
- Node.js 18+ required

---

## User Personas

### Persona 1: Solo AI Developer (Mike)
- Role: Developer running multiple agents for parallel feature development
- Goal: Monitor all agents from a single terminal while working on other tasks
- Pain Point: Currently has no visibility into what agents are doing or if they're stuck

### Persona 2: Team Lead
- Role: Oversees a team using ASF for sprint work
- Goal: See aggregate progress and catch failing agents quickly
- Pain Point: Can't tell if an agent died or is just thinking

---

## Key User Stories
1. As a developer, I want to see all my agents' status at a glance so that I know which ones are working and which are idle.
2. As a developer, I want to see task progress percentages so that I can estimate time to completion.
3. As a developer, I want to read agent "thoughts" without consuming tokens so that I can debug issues.
4. As a developer, I want to see real-time cost estimates so that I can manage my API budget.
5. As a developer, I want dead agents highlighted in red so that I can restart them quickly.

---

## Implementation Phases

### Phase A: Database Schema & SwarmPulse Wrapper
- Create `.asf/swarm_state.db` with schema
- Build `SwarmPulse.ts` with `heartbeat()`, `capture()`, `progress()` methods
- Unit tests for concurrency handling

### Phase B: Agent Integration
- Update ASF agent implementation to import SwarmPulse
- Add `--quiet` mode support
- Ensure backward compatibility with non-instrumented agents

### Phase C: Dashboard Renderer
- Build `DashboardRenderer` class with neo-blessed
- Implement polling loop (configurable 250ms-2000ms)
- Create visual layout: Agent Grid, Task Queue, Whisper Log, Header

### Phase D: Integration & Launch
- Create launcher script that starts Dashboard + Swarm
- Add graceful shutdown handling
- Documentation and examples

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

## Open Questions
1. Should we support multiple dashboard instances viewing the same swarm?
2. What's the optimal polling interval for balance between responsiveness and CPU usage?
3. Should we add sound alerts for agent errors/deaths?

---

## Notes
- Inspired by "WarGames" aesthetic for the grid layout
- Name "Whisper" reflects the silent, token-free monitoring approach
- Future v2 could add web UI, historical analytics, and remote monitoring
