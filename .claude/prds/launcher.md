# PRD: ASF Launcher

**Feature Name**: ASF Launcher (Orchestration Layer)
**Author**: Claude (Product Manager + System Architect)
**Date**: 2026-01-07
**Status**: Draft - Pending Approval

---

## Problem Statement

With SwarmPulse SDK (Phase A), Agent Integration (Phase B), and Dashboard Renderer (Phase C) complete, developers still need to manually:
1. Start the Whisper Dashboard process
2. Launch individual ASF agents in separate terminals
3. Ensure all agents have `--quiet` mode enabled
4. Handle graceful shutdown of the entire swarm

This manual orchestration is error-prone, especially when managing 5-15 parallel agents. Developers need a single command to launch the entire ASF swarm with the dashboard, and a clean way to shut everything down.

---

## Proposed Solution

Build **ASF Launcher** - a CLI orchestration tool that:

1. **Single Command Launch**: `asf-swarm start` launches dashboard + N agents
2. **Configuration File**: `asf-swarm.config.json` defines agent roles, worktrees, tasks
3. **Process Management**: Tracks all spawned processes for coordinated shutdown
4. **Graceful Shutdown**: SIGINT/SIGTERM propagation to all child processes
5. **Health Monitoring**: Auto-restart crashed agents (optional)
6. **CLI Interface**: Commands for start, stop, status, logs

---

## User Stories

1. **As a** developer, **I want to** run `asf-swarm start` **so that** the dashboard and all agents launch automatically.
2. **As a** developer, **I want to** define agents in a config file **so that** I can version control my swarm setup.
3. **As a** developer, **I want to** press Ctrl+C once **so that** all processes shut down gracefully.
4. **As a** developer, **I want to** run `asf-swarm status` **so that** I can see which processes are running.
5. **As a** developer, **I want to** run `asf-swarm stop` **so that** I can stop the swarm from another terminal.
6. **As a** developer, **I want to** see aggregated logs **so that** I can debug startup issues.
7. **As a** developer, **I want to** specify agent count **so that** I can scale up/down easily.
8. **As a** developer, **I want to** auto-restart crashed agents **so that** the swarm self-heals.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | `asf-swarm start` command launches dashboard + agents | Must Have |
| FR-2 | `asf-swarm stop` command gracefully terminates all processes | Must Have |
| FR-3 | `asf-swarm status` command shows running processes | Must Have |
| FR-4 | Read configuration from `asf-swarm.config.json` | Must Have |
| FR-5 | Support `--agents N` flag to override agent count | Must Have |
| FR-6 | Support `--no-dashboard` flag to launch agents only | Should Have |
| FR-7 | Support `--config <path>` to specify alternate config | Should Have |
| FR-8 | PID file storage in `.asf/launcher.pid` for cross-terminal control | Must Have |
| FR-9 | SIGINT (Ctrl+C) triggers graceful shutdown of all processes | Must Have |
| FR-10 | SIGTERM triggers graceful shutdown of all processes | Must Have |
| FR-11 | Dashboard starts first, agents start after DB is ready | Must Have |
| FR-12 | Automatic agent restart on crash (configurable) | Could Have |
| FR-13 | `asf-swarm logs` shows aggregated launcher logs | Could Have |
| FR-14 | Exit code reflects success/failure of swarm operation | Should Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Startup time | <5 seconds for dashboard + 8 agents |
| NFR-2 | Shutdown time | <10 seconds graceful, <2 seconds forced |
| NFR-3 | Memory overhead | <20MB for launcher process |
| NFR-4 | Cross-platform | Windows, macOS, Linux |
| NFR-5 | No orphan processes | All children terminate on launcher exit |
| NFR-6 | Windows signal compat | SIGTERM simulated via tree-kill, Ctrl+C → SIGINT equivalent |

---

## Technical Design (High-Level)

### Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           ASF Launcher                                  │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │
│  │    CLI      │───▶│   Config    │───▶│    Process Manager          │ │
│  │   Parser    │    │   Loader    │    │                             │ │
│  └─────────────┘    └─────────────┘    │  ┌───────────────────────┐  │ │
│                                        │  │  Process Pool          │  │ │
│  ┌─────────────┐                       │  │  - Dashboard (1)       │  │ │
│  │   Signal    │──────────────────────▶│  │  - Agent 1..N          │  │ │
│  │   Handler   │                       │  └───────────────────────┘  │ │
│  └─────────────┘                       └─────────────────────────────┘ │
│                                                     │                   │
│  ┌─────────────┐                                    │                   │
│  │  PID File   │◀───────────────────────────────────┘                   │
│  │  Manager    │                                                        │
│  └─────────────┘                                                        │
└────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────┐              ┌─────────────────────────────┐
│    Dashboard    │              │       Agent Processes        │
│    Renderer     │              │                              │
│   (1 process)   │              │  Agent 1  Agent 2  Agent N   │
│                 │              │    │         │        │      │
└────────┬────────┘              └────┼─────────┼────────┼──────┘
         │                            │         │        │
         │                            │         │        │
         ▼                            ▼         ▼        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    .asf/swarm_state.db                          │
└─────────────────────────────────────────────────────────────────┘
```

### CLI Interface

```bash
# Start the swarm (dashboard + agents from config)
asf-swarm start

# Start with specific agent count
asf-swarm start --agents 8

# Start agents only (no dashboard)
asf-swarm start --no-dashboard

# Start with custom config
asf-swarm start --config ./my-config.json

# Check status of running swarm
asf-swarm status

# Stop all processes gracefully
asf-swarm stop

# Force stop (SIGKILL)
asf-swarm stop --force

# View launcher logs
asf-swarm logs

# View specific agent logs
asf-swarm logs agent-01

# Version and help
asf-swarm --version
asf-swarm --help
```

### Configuration File Schema

```json
{
  "$schema": "./asf-swarm.schema.json",
  "version": "1.0",

  "dashboard": {
    "enabled": true,
    "pollInterval": 500,
    "dbPath": ".asf/swarm_state.db"
  },

  "agents": {
    "count": 8,
    "defaultRole": "developer",
    "quietMode": true,
    "autoRestart": false,
    "restartDelay": 5000,
    "maxRestarts": 3
  },

  "worktrees": [
    {
      "path": "feature/auth-system",
      "agents": 2,
      "role": "developer"
    },
    {
      "path": "feature/api-routes",
      "agents": 1,
      "role": "developer"
    }
  ],

  "tasks": [
    {
      "id": "task-001",
      "title": "Implement login endpoint",
      "assignTo": "worktree:feature/auth-system"
    }
  ],

  "shutdown": {
    "gracePeriod": 10000,
    "forceAfter": 15000
  }
}
```

### File Structure

```
src/
├── launcher/
│   ├── index.ts                    # Public exports
│   ├── cli.ts                      # CLI entry point (commander.js)
│   ├── cli.test.ts                 # CLI integration tests
│   ├── SwarmLauncher.ts            # Main orchestrator class
│   ├── SwarmLauncher.test.ts       # Unit tests
│   ├── config/
│   │   ├── ConfigLoader.ts         # JSON config parser
│   │   ├── ConfigLoader.test.ts
│   │   ├── ConfigSchema.ts         # JSON Schema validation
│   │   └── defaults.ts             # Default configuration values
│   ├── process/
│   │   ├── ProcessManager.ts       # Spawn/track child processes
│   │   ├── ProcessManager.test.ts
│   │   ├── ProcessPool.ts          # Process collection management
│   │   ├── ProcessPool.test.ts
│   │   └── types.ts                # Process-related types
│   ├── signals/
│   │   ├── SignalHandler.ts        # SIGINT/SIGTERM handling
│   │   └── SignalHandler.test.ts
│   ├── pid/
│   │   ├── PidFileManager.ts       # .asf/launcher.pid management
│   │   └── PidFileManager.test.ts
│   └── types.ts                    # Launcher-specific types
├── bin/
│   └── asf-swarm.ts                # Binary entry point
```

### Class Interfaces

```typescript
interface LauncherConfig {
  dashboard: {
    enabled: boolean;
    pollInterval: number;
    dbPath: string;
  };
  agents: {
    count: number;
    defaultRole: string;
    quietMode: boolean;
    autoRestart: boolean;
    restartDelay: number;
    maxRestarts: number;
  };
  worktrees: WorktreeConfig[];
  tasks: TaskConfig[];
  shutdown: {
    gracePeriod: number;
    forceAfter: number;
  };
}

interface ManagedProcess {
  id: string;
  type: 'dashboard' | 'agent';
  pid: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
  startedAt: number;
  restartCount: number;
  worktree?: string;
  role?: string;
}

class SwarmLauncher {
  constructor(config: LauncherConfig);

  // Lifecycle
  start(): Promise<void>;
  stop(force?: boolean): Promise<void>;

  // Status
  getStatus(): SwarmStatus;
  getProcesses(): ManagedProcess[];

  // Events
  on(event: 'processStart' | 'processStop' | 'processCrash' | 'error', handler: Function): void;
}

class ProcessManager {
  spawn(command: string, args: string[], options: SpawnOptions): ManagedProcess;
  kill(id: string, signal?: NodeJS.Signals): Promise<void>;
  killAll(signal?: NodeJS.Signals): Promise<void>;
  getProcess(id: string): ManagedProcess | undefined;
  getAllProcesses(): ManagedProcess[];
}

class SignalHandler {
  register(launcher: SwarmLauncher): void;
  unregister(): void;
}

class PidFileManager {
  write(processes: ManagedProcess[]): void;
  read(): ManagedProcess[] | null;
  remove(): void;
  isStale(): boolean;
}
```

### Startup Sequence

```
1. Parse CLI arguments
2. Load configuration file (or use defaults)
3. Validate configuration schema
4. Check for existing PID file (prevent double-launch)
5. Verify SwarmPulse DB exists and is accessible
   - If missing: Initialize DB with schema (graceful degradation)
   - If locked: Retry 3 times with exponential backoff
6. If dashboard enabled:
   a. Start Dashboard Renderer process
   b. Wait for dashboard to be ready (health check)
7. If --no-dashboard mode:
   a. Verify DB is writable (agents need write access)
   b. Skip dashboard process entirely
8. Start Agent processes (parallel spawn with staggered 100ms delay)
9. Write PID file with all process info
10. Enter monitoring loop
11. Handle signals for graceful shutdown
```

### Dependency Graceful Degradation

| Missing Component | Behavior |
|-------------------|----------|
| SwarmPulse DB | Auto-initialize schema on first launch |
| Dashboard binary | Clear error: "Dashboard not found. Run `npm run build` first" |
| Agent wrapper | Warning: "AgentWrapper not detected, metrics may be unavailable" |
| Config file | Use sensible defaults, log warning |

### Shutdown Sequence

```
1. Receive SIGINT/SIGTERM (or stop command)
2. Set shutdown flag (prevent new spawns)
3. Send SIGTERM to all agent processes
4. Wait for agents to deregister from DB (grace period)
5. Send SIGTERM to dashboard process
6. Wait for dashboard to exit cleanly
7. If grace period exceeded, send SIGKILL
8. Remove PID file
9. Exit with appropriate code
```

---

## Out of Scope (v1)

1. Remote agent spawning (SSH/containers)
2. Web-based launcher UI
3. Task scheduling/assignment (agents self-select)
4. Load balancing across worktrees
5. Metrics collection from launcher itself
6. Integration with systemd/launchd
7. Docker/container orchestration

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Launch time | <5s for 8 agents | Timer from command to ready |
| Shutdown time | <10s graceful | Timer from signal to exit |
| No orphans | 100% child cleanup | Process tree verification |
| Config validation | All errors caught | Invalid config test suite |
| Cross-platform | 3 platforms | CI matrix testing |
| Test coverage | >80% | Jest coverage report |

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Orphan processes on crash | Medium | High | PID file cleanup script, process group IDs |
| Config schema drift | Low | Medium | JSON Schema validation, version field |
| Platform-specific spawn issues | Medium | Medium | Cross-platform testing, execa library |
| Signal handling edge cases | Medium | Medium | Comprehensive signal test suite |
| Race condition in startup | Low | High | Sequential startup with health checks |

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `commander` | ^11.0.0 | CLI argument parsing |
| `execa` | ^8.0.0 | Cross-platform process spawning |
| `ajv` | ^8.0.0 | JSON Schema validation |
| `tree-kill` | ^1.2.2 | Kill process trees (Windows compat) |
| `chalk` | ^5.0.0 | CLI colorized output |
| `ora` | ^7.0.0 | Spinner for async operations |

---

## Acceptance Criteria

- [ ] `asf-swarm start` launches dashboard and agents from config
- [ ] `asf-swarm stop` terminates all processes gracefully
- [ ] `asf-swarm status` shows accurate process information
- [ ] Ctrl+C triggers graceful shutdown of entire swarm
- [ ] No orphan processes after normal or forced shutdown
- [ ] PID file created on start, removed on stop
- [ ] `--agents N` flag overrides config agent count
- [ ] `--no-dashboard` flag starts agents only
- [ ] Invalid config produces clear error messages
- [ ] Startup sequence waits for dashboard before agents
- [ ] Exit codes reflect operation success/failure
- [ ] Works on Windows, macOS, and Linux
- [ ] All unit tests pass with >80% coverage

---

## Open Questions

1. **Q**: Should we support hot-reload of config file?
   **Recommendation**: No for v1, requires process diff logic

2. **Q**: How to handle agent binary location?
   **Recommendation**: Use `npx` or configurable `agentCommand`

3. **Q**: Should PID file be JSON or plain text?
   **Recommendation**: JSON for structured process metadata

4. **Q**: Support for environment variable injection?
   **Recommendation**: Yes, via config `env` block per agent

---

## CLI Help Output (Reference)

```
ASF Swarm Launcher v1.0.0

Usage: asf-swarm <command> [options]

Commands:
  start               Launch dashboard and agent swarm
  stop                Stop all running processes
  status              Show swarm status
  logs [agent-id]     View launcher/agent logs

Options:
  --agents, -a <n>    Number of agents to launch (default: from config)
  --config, -c <path> Path to config file (default: ./asf-swarm.config.json)
  --no-dashboard      Launch agents without dashboard
  --force             Force kill processes (with stop command)
  --verbose, -v       Enable verbose logging
  --help, -h          Show this help message
  --version           Show version number

Examples:
  $ asf-swarm start                    # Start with config defaults
  $ asf-swarm start --agents 4         # Start with 4 agents
  $ asf-swarm start --no-dashboard     # Agents only, no TUI
  $ asf-swarm stop                     # Graceful shutdown
  $ asf-swarm stop --force             # Force kill all
  $ asf-swarm status                   # Show running processes
```

---

**Next Step**: `/epic-decompose launcher`
