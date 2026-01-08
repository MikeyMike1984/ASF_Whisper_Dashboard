# Architectural Decision Log (ADR)

## ADR-001: Initialize Autonomous Software Forge

### Date
2026-01-07

### Status
Accepted

### Context
Setting up an AI-native development environment that supports parallel agent execution,
memory persistence, and deterministic safety controls.

### Decision
Adopted the "Fractal Worktree" architecture with:
- Bare Git repository as central nucleus
- Git Worktrees for isolated parallel development
- Tri-layer memory system (Memory Bank + Active Context + Chat)
- Hook-based safety enforcement

### Consequences
**Positive**:
- Enables true parallel agent execution
- Prevents context rot through memory persistence
- Deterministic safety via hooks

**Negative**:
- Additional complexity in repository structure
- Requires understanding of worktree concepts

---

## ADR-002: Event-Driven Polling Architecture for Dashboard

### Date
2026-01-07

### Status
Accepted

### Context
Need to monitor 5-15 concurrent ASF agents without consuming API tokens for status updates.
Traditional approaches (stdout logging, WebSocket connections) would either pollute context
or add complexity.

### Decision
Adopted Event-Driven Polling Architecture with:
- SQLite database as single source of truth
- Agents write to DB via SwarmPulse SDK (zero stdout)
- Dashboard polls DB at configurable intervals (250ms-2000ms)
- WAL mode for concurrent write support

### Alternatives Considered
1. **WebSocket connections**: Rejected - adds complexity, requires maintaining connections
2. **File-based logging**: Rejected - parsing overhead, no query capability
3. **Stdout monitoring**: Rejected - consumes tokens, pollutes agent context

### Consequences
**Positive**:
- Zero token overhead for monitoring
- Decoupled components (dashboard/agents communicate only via DB)
- Resilient to restarts (either component can restart independently)
- Concurrency safe with SQLite WAL mode

**Negative**:
- Polling has inherent latency (mitigated by 250ms minimum interval)
- SQLite may become bottleneck at extreme scale (acceptable for 15 agents)

---

## ADR-003: TUI-Only Dashboard (v1)

### Date
2026-01-07

### Status
Accepted

### Context
Need a visualization layer for the agent monitoring system. Options include web UI,
desktop app, or terminal UI.

### Decision
Build Terminal User Interface (TUI) only for v1 using:
- `neo-blessed` for terminal rendering
- `blessed-contrib` for widgets
- "WarGames" inspired visual aesthetic

### Alternatives Considered
1. **Web UI (React)**: Rejected for v1 - additional infrastructure, browser dependency
2. **Desktop App (Electron)**: Rejected - heavyweight, overkill for the use case
3. **Native CLI output**: Rejected - lacks interactivity and visual appeal

### Consequences
**Positive**:
- Works over SSH (critical for remote development)
- No browser or additional dependencies
- Lightweight, single process
- Matches ASF terminal-centric workflow

**Negative**:
- Limited visual capabilities compared to web
- Terminal compatibility variations
- Deferred web UI to v2

---

## ADR-004: Agent Wrapper Design for SwarmPulse Integration

### Date
2026-01-07

### Status
Accepted

### Context
Phase B requires integrating SwarmPulse SDK into ASF agents while maintaining:
- Zero stdout pollution (--quiet mode)
- Backward compatibility with non-instrumented agents
- Clean lifecycle management

### Decision
Create an `AgentWrapper` class in `src/agents/` that:
1. Wraps SwarmPulse singleton with higher-level API
2. Implements console capture for --quiet mode
3. Registers process exit handlers for graceful cleanup
4. Uses environment variable detection for optional instrumentation

### File Structure
```
src/agents/
├── index.ts                 # Public exports
├── AgentWrapper.ts          # Main wrapper class
├── ConsoleCapture.ts        # --quiet mode implementation
├── ProcessLifecycle.ts      # Exit handlers, cleanup
├── types.ts                 # Agent-specific types
└── __tests__/               # Unit and integration tests
```

### Alternatives Considered
1. **Direct SwarmPulse usage**: Rejected - lacks lifecycle management
2. **Decorator pattern**: Rejected - overly complex for simple wrapping
3. **Mixin pattern**: Rejected - requires class-based agents

### Consequences
**Positive**:
- Simple, imperative API for agents
- Graceful degradation without SwarmPulse
- Consistent cleanup on process exit

**Negative**:
- Additional abstraction layer
- Requires agents to be updated (minimal changes)

### Consulted Agents
- Architect: Approved (2026-01-07)

---

## ADR-005: Process Orchestration Pattern for ASF Swarm

### Date
2026-01-07

### Status
Accepted

### Context
With SwarmPulse SDK, Agent Integration, and Dashboard Renderer complete, developers need
a unified way to launch and manage the entire agent swarm. Manual orchestration of
5-15 parallel processes is error-prone and lacks coordinated shutdown handling.

### Decision
Introduce **ASF Launcher** with Process Orchestration Pattern:
- PID file coordination (`.asf/launcher.pid`) for cross-terminal control
- Sequential startup: Dashboard first (with health check), then agents
- Graceful shutdown via signal propagation (SIGINT/SIGTERM → all children)
- Cross-platform process management via `tree-kill` library
- Configuration file (`asf-swarm.config.json`) for declarative swarm definition

### File Structure
```
src/launcher/
├── index.ts                    # Public exports
├── cli.ts                      # CLI entry point (commander.js)
├── SwarmLauncher.ts            # Main orchestrator class
├── config/                     # Configuration loading/validation
├── process/                    # Process lifecycle management
├── signals/                    # Signal handling (SIGINT/SIGTERM)
└── pid/                        # Cross-terminal coordination
```

### Alternatives Considered
1. **Shell scripts**: Rejected - not cross-platform, poor error handling
2. **systemd/launchd**: Rejected - platform-specific, overkill for dev environment
3. **PM2/forever**: Rejected - external dependency, different mental model
4. **Docker Compose**: Rejected - heavyweight, requires Docker installed

### Consequences
**Positive**:
- Single command to launch entire swarm (`asf-swarm start`)
- Cross-terminal control via PID file (`asf-swarm stop` from any terminal)
- Clean shutdown prevents orphan processes
- Configurable via version-controlled JSON file
- Cross-platform (Windows, macOS, Linux)

**Negative**:
- Additional process layer (launcher is parent of all children)
- Requires Node.js for launcher itself
- Config file adds learning curve

### Platform-Specific Notes
- **Windows**: SIGTERM simulated via `tree-kill`, Ctrl+C sends SIGINT equivalent
- **macOS/Linux**: Native POSIX signal handling

### Consulted Agents
- Architect: Approved (2026-01-07)

---
