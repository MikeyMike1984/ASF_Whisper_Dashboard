# Project Brief: ASF Whisper Dashboard

## Vision
Build a real-time Terminal User Interface (TUI) dashboard that visualizes 5-15 concurrent ASF agents with near-zero token overhead. By running agents in "Quiet Mode" and polling a local SQLite database, we achieve full observability without consuming API tokens for status updates.

---

## Problem Statement
When running multiple parallel Claude agents in the Autonomous Software Forge, there's no visibility into what each agent is doing, their progress, or system health. Traditional stdout-based monitoring would consume tokens and pollute the context window. Developers need a "war room" view of their agent swarm without sacrificing efficiency.

---

## Core Requirements

### Functional Requirements
1. **Agent Status Grid**: 4x4 matrix of agent cards showing real-time status (Busy/Idle/Error/Dead)
2. **Task Queue Viewer**: Scrolling list of pending, in-progress, and completed tasks with progress percentages
3. **Whisper Log Feed**: Internal agent thoughts/logs captured silently to DB, viewable per-agent
4. **Cost Estimator**: Real-time token usage and cost tracking in the header
5. **Heartbeat Monitoring**: Auto-detect dead agents (no heartbeat > 30 seconds)
6. **SwarmPulse SDK**: Lightweight wrapper for agents to report status without stdout

### Non-Functional Requirements
- **Performance**: Dashboard renders at 60fps with 15 active agents
- **Latency**: Status updates visible within 500ms of agent state change
- **Overhead**: Zero additional API tokens consumed for monitoring
- **Reliability**: Dashboard stable for 8+ hour continuous operation

---

## Success Metrics

### Key Performance Indicators (KPIs)
1. **Render Performance**: 60fps with 15 active agents
2. **Token Overhead**: 0 additional tokens for monitoring
3. **Update Latency**: <500ms from agent state change to visual update
4. **Uptime**: 8+ hours continuous stable operation

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
