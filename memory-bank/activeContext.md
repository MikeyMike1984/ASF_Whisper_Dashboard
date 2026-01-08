# Active Context (Global Roadmap)

## Current Phase
**Phase A: Database Schema & SwarmPulse Wrapper**

## CCPM Status
- [x] PRD Generated: `.claude/prds/swarm-pulse-sdk.md`
- [x] Epic Decomposed: `.claude/epics/swarm-pulse-sdk/` (10 tasks)
- [ ] Implementation Started

## Current Sprint Goals
1. Create `.asf/swarm_state.db` with schema
2. Build `SwarmPulse.ts` with singleton pattern
3. Implement: `registerAgent()`, `deregisterAgent()`, `heartbeat()`, `setStatus()`
4. Implement: `progress()`, `capture()`, `reportTokens()`, `reportCost()`
5. Unit tests for concurrency handling (80% coverage target)

## Active Worktrees
- `main/` - Production codebase

## Priority Queue
1. **High**: Database schema implementation (agents, tasks, logs, metrics tables)
2. **High**: SwarmPulse SDK core methods
3. **Medium**: Concurrency testing with WAL mode
4. **Low**: Documentation and examples

---

## Implementation Phases Overview

### Phase A: Database Schema & SwarmPulse Wrapper (Current)
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

**Last Updated**: 2026-01-07
