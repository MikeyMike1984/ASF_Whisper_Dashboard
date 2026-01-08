# Product Context

## User Personas

### Persona 1: Solo AI Developer (Mike)
- **Role**: Developer running multiple agents for parallel feature development
- **Goals**: Monitor all agents from a single terminal while working on other tasks
- **Pain Points**: Currently has no visibility into what agents are doing or if they're stuck
- **Tech Savviness**: Expert

### Persona 2: Team Lead
- **Role**: Oversees a team using ASF for sprint work
- **Goals**: See aggregate progress and catch failing agents quickly
- **Pain Points**: Can't tell if an agent died or is just thinking
- **Tech Savviness**: Intermediate to Expert

---

## User Stories

### Epic: Agent Monitoring
1. **As a** developer, **I want to** see all my agents' status at a glance **so that** I know which ones are working and which are idle.
2. **As a** developer, **I want to** see task progress percentages **so that** I can estimate time to completion.
3. **As a** developer, **I want to** read agent "thoughts" without consuming tokens **so that** I can debug issues.
4. **As a** developer, **I want to** see real-time cost estimates **so that** I can manage my API budget.
5. **As a** developer, **I want to** dead agents highlighted in red **so that** I can restart them quickly.

---

## UX Goals
- **Simplicity**: Single terminal view shows all critical information
- **Accessibility**: Works over SSH, terminal-only UI
- **Performance**: 60fps rendering, <500ms update latency
- **Aesthetic**: "WarGames" inspired grid layout

---

## Open Questions
1. Should we support multiple dashboard instances viewing the same swarm?
2. What's the optimal polling interval for balance between responsiveness and CPU usage?
3. Should we add sound alerts for agent errors/deaths?

---

**Last Updated**: 2026-01-07
