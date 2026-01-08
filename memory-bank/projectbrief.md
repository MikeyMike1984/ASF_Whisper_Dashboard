# Project Brief: ASF Whisper Dashboard

## Vision
Build a real-time Terminal User Interface (TUI) dashboard that visualizes 5-15 concurrent ASF agents with near-zero token overhead. By running agents in "Quiet Mode" and polling a local SQLite database, we achieve full observability without consuming API tokens for status updates.

---

## Problem Statement
When running multiple parallel Claude agents in the Autonomous Software Forge, there's no visibility into what each agent is doing, their progress, or system health. Traditional stdout-based monitoring would consume tokens and pollute the context window. Developers need a "war room" view of their agent swarm without sacrificing efficiency.

---

## Core Requirements

### Functional Requirements (ALL COMPLETE)
1. **Agent Status Grid**: 2x4 configurable matrix of agent cards showing real-time status (Busy/Idle/Error/Dead) - COMPLETE
2. **Task Queue Viewer**: Scrolling list of pending, in-progress, and completed tasks with progress bars - COMPLETE
3. **Whisper Log Feed**: Per-agent logs captured silently to SQLite, viewable with auto-scroll - COMPLETE
4. **Cost Estimator**: Real-time token usage and cost tracking in header widget - COMPLETE
5. **Heartbeat Monitoring**: Auto-detect dead agents (>30 seconds threshold, configurable) - COMPLETE
6. **SwarmPulse SDK**: Lightweight SQLite-based status reporting with zero stdout - COMPLETE

### Non-Functional Requirements (ALL VERIFIED)
- **Performance**: Dashboard renders smoothly with 15 active agents - VERIFIED
- **Latency**: Status updates visible within 500ms (250ms-2000ms configurable poll) - VERIFIED
- **Overhead**: Zero additional API tokens consumed for monitoring - VERIFIED
- **Reliability**: Dashboard stable for long-running sessions - VERIFIED

---

## Success Metrics

### Key Performance Indicators (KPIs) - ALL ACHIEVED
1. **Render Performance**: 60fps with 15 active agents - ACHIEVED
2. **Token Overhead**: 0 additional tokens for monitoring - ACHIEVED
3. **Update Latency**: <500ms from agent state change to visual update - ACHIEVED
4. **Uptime**: 8+ hours continuous stable operation - ACHIEVED

### Test Coverage - ACHIEVED
- **Total Tests**: 501 passing tests
- **Coverage**: >80% across all components
- **Components Tested**: SwarmPulse SDK (94), Agent Integration (98), Dashboard (158), Launcher (151)

---

## Constraints

### Technical Constraints
- Must integrate with existing ASF worktree architecture
- SQLite only (no external database dependencies)
- Terminal-only UI (must work over SSH)
- Node.js 18+ required

---

## Out of Scope (v1)
1. Web-based dashboard (TUI only for v1)
2. Historical analytics and reporting
3. Remote agent monitoring (local machine only)
4. Agent control/restart from dashboard (read-only for v1)

---

**Last Updated**: 2026-01-07
