# PRD: Dashboard Renderer

**Feature Name**: Dashboard Renderer (TUI)
**Author**: Claude (Product Manager + System Architect)
**Date**: 2026-01-07
**Status**: Draft - Pending Approval

---

## Problem Statement

After implementing SwarmPulse SDK (Phase A) and Agent Integration (Phase B), there is no way to visualize the agent swarm state stored in `.asf/swarm_state.db`. Developers running 5-15 parallel ASF agents need a real-time "war room" view showing agent status, task progress, and internal logs - all without consuming API tokens or leaving the terminal.

---

## Proposed Solution

Build **Dashboard Renderer** - a Terminal User Interface (TUI) application using `neo-blessed` that polls the SwarmPulse SQLite database and renders a "WarGames"-inspired visualization. The dashboard runs as a separate process, completely decoupled from agents, and provides:

1. **Agent Grid**: 4x4 matrix showing real-time agent status (Idle/Busy/Error/Dead)
2. **Task Queue**: Scrolling list with progress bars for all tasks
3. **Whisper Log**: Per-agent log viewer showing captured internal thoughts
4. **Header Bar**: System metrics including agent count, cost, and token usage
5. **Polling Engine**: Configurable refresh rate (250ms-2000ms) for DB queries

---

## User Stories

1. **As a** developer, **I want to** see all active agents in a grid **so that** I know which agents are working and which are idle.
2. **As a** developer, **I want to** see task progress percentages **so that** I can estimate completion time.
3. **As a** developer, **I want to** read agent whisper logs **so that** I can debug without consuming tokens.
4. **As a** developer, **I want to** see dead agents highlighted **so that** I can restart failed processes.
5. **As a** developer, **I want to** see real-time cost estimates **so that** I can monitor API spend.
6. **As a** developer, **I want to** resize the terminal **so that** the dashboard adapts to my screen size.
7. **As a** developer, **I want to** select an agent **so that** I can view its specific whisper log.
8. **As a** developer, **I want to** quit gracefully with 'q' **so that** the terminal is restored properly.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | `DashboardRenderer` class with start/stop lifecycle | Must Have |
| FR-2 | Agent Grid widget showing 2x4 matrix of agent cards (configurable) | Must Have |
| FR-3 | Agent cards display: ID, status (color-coded), progress % | Must Have |
| FR-4 | Task Queue widget showing all tasks with progress bars | Must Have |
| FR-5 | Whisper Log widget showing logs for selected agent | Must Have |
| FR-6 | Header widget with: Title, Active Agent Count, Cost, Tokens | Must Have |
| FR-7 | Polling engine with configurable interval (250ms-2000ms) | Must Have |
| FR-8 | Keyboard navigation: arrows to select agent, 'q' to quit | Must Have |
| FR-9 | Dead agent detection: no heartbeat > 30s shows as "DEAD" | Must Have |
| FR-10 | Color scheme: Idle=cyan, Busy=green, Error=yellow, Dead=red | Should Have |
| FR-11 | Auto-scroll whisper log with pause on scroll-up | Should Have |
| FR-12 | Responsive layout adapts to terminal resize | Should Have |
| FR-13 | Status bar showing last DB poll timestamp | Could Have |
| FR-14 | Filter tasks by status (All/Pending/InProgress/Complete) | Could Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Render performance | 60fps with 15 agents |
| NFR-2 | Update latency | <500ms from DB change to visual update |
| NFR-3 | Memory footprint | <50MB |
| NFR-4 | Startup time | <2 seconds |
| NFR-5 | CPU usage at idle | <5% |
| NFR-6 | Stable operation | 8+ hours without memory leak |
| NFR-7 | Terminal compatibility | Works in xterm, iTerm2, Windows Terminal |
| NFR-8 | DB connection resilience | Readonly WAL mode, 3 retries on SQLITE_BUSY |

---

## Technical Design (High-Level)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Dashboard Renderer Process                       │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐  │
│  │   Polling   │───▶│    State    │───▶│     Render Engine           │  │
│  │   Engine    │    │    Store    │    │   (neo-blessed + contrib)   │  │
│  └──────┬──────┘    └─────────────┘    └──────────────────────────────┘  │
│         │                                             │                   │
│         │ SQL Queries                                 │ Terminal Output   │
│         ▼                                             ▼                   │
│  ┌─────────────┐                              ┌─────────────┐            │
│  │  Database   │                              │   Screen    │            │
│  │  Reader     │                              │   Buffer    │            │
│  │  (readonly) │                              │             │            │
│  └──────┬──────┘                              └─────────────┘            │
└─────────┼────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│  .asf/swarm_state.db    │
│  (read-only access)     │
└─────────────────────────┘
```

### Component Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│ DashboardRenderer                                                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ HeaderWidget                                                      │  │
│  │ "ASF Whisper Dashboard    Agents: 8/15    Cost: $2.34    125.4k" │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ AgentGridWidget              │  │ WhisperLogWidget               │  │
│  │                              │  │                                │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐│  │  [14:23:01] Reading patterns   │  │
│  │  │ A1 │ │ A2 │ │ A3 │ │ A4 ││  │  [14:23:03] Planning module    │  │
│  │  │BUSY│ │IDLE│ │BUSY│ │ERR ││  │  [14:23:15] Writing test       │  │
│  │  └────┘ └────┘ └────┘ └────┘│  │  [14:23:22] Implementing...    │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐│  │  [14:23:45] Running npm test   │  │
│  │  │ A5 │ │ A6 │ │ A7 │ │ A8 ││  │  [14:23:58] Tests passing      │  │
│  │  │BUSY│ │BUSY│ │IDLE│ │DEAD││  │                                │  │
│  │  └────┘ └────┘ └────┘ └────┘│  │                                │  │
│  ├──────────────────────────────┤  │                                │  │
│  │ TaskQueueWidget              │  │                                │  │
│  │                              │  │                                │  │
│  │ [##########] 100% auth-login │  │                                │  │
│  │ [#######   ]  78% register   │  │                                │  │
│  │ [####      ]  45% user-model │  │                                │  │
│  └──────────────────────────────┘  └────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── dashboard/
│   ├── index.ts                    # Public exports
│   ├── DashboardRenderer.ts        # Main orchestrator class
│   ├── DashboardRenderer.test.ts   # Integration tests
│   ├── config.ts                   # Configuration types & defaults
│   ├── polling/
│   │   ├── PollingEngine.ts        # DB polling with configurable interval
│   │   ├── PollingEngine.test.ts
│   │   ├── StateStore.ts           # In-memory state cache
│   │   └── StateStore.test.ts
│   ├── widgets/
│   │   ├── HeaderWidget.ts         # Title bar with metrics
│   │   ├── HeaderWidget.test.ts
│   │   ├── AgentGridWidget.ts      # 4x4 agent matrix
│   │   ├── AgentGridWidget.test.ts
│   │   ├── TaskQueueWidget.ts      # Task list with progress
│   │   ├── TaskQueueWidget.test.ts
│   │   ├── WhisperLogWidget.ts     # Per-agent log viewer
│   │   ├── WhisperLogWidget.test.ts
│   │   └── BaseWidget.ts           # Abstract base class
│   ├── db/
│   │   ├── DashboardRepository.ts  # Read-only DB queries
│   │   └── DashboardRepository.test.ts
│   └── types.ts                    # Dashboard-specific types (imports from SwarmPulse SDK)
```

### Class Interfaces

```typescript
interface DashboardConfig {
  dbPath?: string;              // Default: '.asf/swarm_state.db'
  pollInterval?: number;        // Default: 500ms (250-2000 range)
  deadAgentThreshold?: number;  // Default: 30000ms
  gridRows?: number;            // Default: 2
  gridCols?: number;            // Default: 4
}

interface DashboardState {
  agents: Agent[];
  tasks: Task[];
  logs: Map<string, LogEntry[]>;  // agentId -> logs
  metrics: AggregatedMetrics;
  selectedAgentId: string | null;
  lastPollTime: number;
}

class DashboardRenderer {
  constructor(config?: DashboardConfig);

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // State access (for testing)
  getState(): DashboardState;

  // Events
  on(event: 'stateChange' | 'error' | 'exit', handler: Function): void;
}

class PollingEngine {
  constructor(repository: DashboardRepository, interval: number);

  start(): void;
  stop(): void;
  poll(): Promise<DashboardState>;

  on(event: 'update' | 'error', handler: Function): void;
}

abstract class BaseWidget {
  abstract render(state: DashboardState): void;
  abstract destroy(): void;
}
```

### Color Scheme & Visual Design

| Status | Color | Character | Example |
|--------|-------|-----------|---------|
| Idle | Cyan (#00FFFF) | `-` | `[IDLE -]` |
| Busy | Green (#00FF00) | Progress % | `[BUSY 45%]` |
| Error | Yellow (#FFFF00) | `!` | `[ERR !]` |
| Dead | Red (#FF0000) | `X` | `[DEAD X]` |
| Selected | White border | Box drawing | `┌─A03─┐` |

### Keyboard Controls

| Key | Action |
|-----|--------|
| `q` | Quit dashboard (graceful cleanup) |
| `←` `→` `↑` `↓` | Navigate agent grid selection |
| `Enter` | Focus on selected agent's whisper log |
| `Esc` | Clear selection / unfocus |
| `Tab` | Cycle between widgets |
| `r` | Force refresh (immediate poll) |
| `+` `-` | Increase/decrease poll interval |

---

## Out of Scope (v1)

1. Agent control (restart, kill) - read-only dashboard
2. Historical data graphs/charts
3. Multi-database support (remote DBs)
4. Custom themes/color schemes
5. Mouse interaction
6. Export/save logs to file
7. Alert notifications (sound, desktop)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Render FPS | 60fps with 15 agents | Performance profiling |
| Update latency | <500ms | Timestamp comparison |
| Memory stability | No leak over 8 hours | Heap snapshot analysis |
| Test coverage | >80% | Jest coverage report |
| Terminal compatibility | 3+ terminals | Manual testing |

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| neo-blessed API complexity | Medium | High | Prototype early, fallback to blessed |
| Terminal compatibility issues | Medium | Medium | Test on xterm, iTerm2, Windows Terminal |
| Performance bottleneck in rendering | Low | High | Virtual scrolling, render diffing |
| Memory leak in long sessions | Medium | High | Periodic state cleanup, heap monitoring |
| DB locked by agents during read | Low | Low | Read-only connection, retry logic |

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `neo-blessed` | ^0.1.0 | Terminal UI framework (blessed fork) |
| `blessed-contrib` | ^4.10.1 | Pre-built widgets (grid, gauge) |
| `better-sqlite3` | ^9.0.0 | SQLite read-only connection |
| `chalk` | ^5.0.0 | Color helpers for terminal output |

---

## Acceptance Criteria

- [ ] `DashboardRenderer` class instantiates without errors
- [ ] Dashboard starts and displays header with correct title
- [ ] Agent grid shows up to 8 agents in 2x4 layout
- [ ] Agent cards show ID, status, and progress percentage
- [ ] Dead agents (no heartbeat >30s) display red "DEAD" status
- [ ] Task queue shows all tasks with progress bars
- [ ] Whisper log displays logs for selected agent
- [ ] Arrow keys navigate agent grid selection
- [ ] 'q' key exits dashboard and restores terminal
- [ ] Polling engine queries DB at configured interval
- [ ] Dashboard stable for 1+ hour continuous operation
- [ ] All unit tests pass with >80% coverage
- [ ] Renders at 60fps with 15 simulated agents

---

## Open Questions

1. **Q**: Should we support custom grid sizes beyond 4x4?
   **Recommendation**: Start with configurable rows/cols, default 2x4

2. **Q**: How to handle more than 16 agents?
   **Recommendation**: Pagination or scrollable grid (defer to v2)

3. **Q**: Should whisper logs persist across dashboard restarts?
   **Recommendation**: No, read from DB fresh on each start

4. **Q**: Support for Unicode box-drawing vs ASCII fallback?
   **Recommendation**: Detect terminal capability, auto-fallback

---

**Next Step**: `/epic-decompose dashboard-renderer`
