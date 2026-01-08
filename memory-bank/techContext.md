# Technical Context

## Technology Stack

### Core Technologies
- **Language**: TypeScript with strict mode
- **Runtime**: Node.js 18+
- **Package Manager**: npm

### Key Dependencies
- `neo-blessed` - Terminal rendering framework
- `blessed-contrib` - Dashboard widgets (charts, grids, gauges)
- `better-sqlite3` - Synchronous SQLite driver with WAL support

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
./scripts/setup-worktree.sh main
cd main
npm install
cp shared-config/.env.template .env
# Edit .env with real values
npm run dev
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
