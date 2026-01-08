# Technical Context

## Technology Stack

### Core Technologies
- **Language**: TypeScript 5.9+ with strict mode
- **Runtime**: Node.js 18+
- **Package Manager**: npm

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `better-sqlite3` | ^12.5.0 | Synchronous SQLite driver with WAL support |
| `neo-blessed` | ^0.2.0 | Terminal UI rendering framework |
| `blessed-contrib` | ^4.11.0 | Dashboard widgets (grids, gauges, charts) |
| `commander` | ^12.1.0 | CLI argument parsing |
| `ajv` | ^8.17.1 | JSON Schema validation for config files |
| `tree-kill` | ^1.2.2 | Cross-platform process tree termination |
| `uuid` | ^13.0.0 | Unique identifier generation |
| `chalk` | ^5.3.0 | Terminal string styling |
| `ora` | ^8.1.1 | Terminal spinners for CLI feedback |

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.3 | TypeScript compiler |
| `jest` | ^30.2.0 | Testing framework |
| `ts-jest` | ^29.4.6 | TypeScript support for Jest |
| `eslint` | ^9.39.2 | Code linting |
| `prettier` | ^3.7.4 | Code formatting |
| `@types/*` | Various | TypeScript type definitions |

---

## Development Environment

### Required Tools
- Node.js >= 18
- Git >= 2.40
- npm (bundled with Node.js)

### Setup Instructions
```bash
# Clone and setup
git clone <repo>
cd <repo>

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests (501 tests, >80% coverage)
npm test

# Run demo (creates test data)
node demo.js

# Start dashboard
node start-dashboard.js

# Or use Launcher CLI
node dist/bin/asf-swarm.js start
```

---

## Database Configuration

### Location
`.asf/swarm_state.db`

### SQLite Settings
- **Mode**: WAL (Write-Ahead Logging)
- **Concurrency**: Supports 15+ simultaneous writers
- **Driver**: `better-sqlite3` (synchronous API)

---

## Component Architecture

### State Layer (SQLite)
- Single source of truth for all agent state
- Four main tables: `agents`, `tasks`, `logs`, `metrics`
- Logs table limited to 1000 entries (circular buffer)

### Instrumentation Layer (SwarmPulse SDK)
- Location: `src/core/monitoring/SwarmPulse.ts`
- Methods: `heartbeat()`, `capture()`, `progress()`
- Zero stdout output to preserve API tokens

### Visualization Layer (Dashboard)
- Polling interval: 250ms-2000ms (configurable)
- Layout: Agent Grid + Task Queue + Whisper Log + Header
- Keyboard controls: arrows, +/-, q, r, Enter, Esc

### Launcher Layer (CLI)
- Location: `src/launcher/`
- Binary: `dist/bin/asf-swarm.js`
- Commands: start, stop, status, logs
- Features:
  - ProcessManager: spawn/kill with tree-kill
  - ProcessPool: track running processes
  - SignalHandler: SIGINT/SIGTERM graceful shutdown
  - PidFileManager: cross-terminal process control
  - ConfigLoader: JSON Schema validation with AJV

---

## Known Constraints

### Technical Requirements
- Must integrate with existing ASF worktree architecture
- SQLite only (no external database dependencies)
- Terminal-only UI (must work over SSH)
- Node.js 18+ required

### Future Considerations (v2+)
- Web-based dashboard
- Historical analytics and reporting
- Remote agent monitoring
- Agent control/restart from dashboard

---

**Last Updated**: 2026-01-07
