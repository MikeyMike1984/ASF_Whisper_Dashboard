---
description: "Decompose a PRD into actionable engineering tasks and worktree plan"
argument-hint: "[feature-name]"
---

# Epic Decomposition Protocol

## Persona
**Engineering Lead** + **Technical Architect**

## Objective
Transform a high-level PRD into atomic, testable engineering tasks that can be executed in parallel across multiple worktrees.

---

## Execution Steps

### 1. PRD Ingestion
**MANDATORY**: Read the following files:
1. `.claude/prds/$ARGUMENTS.md` - The PRD to decompose
2. `memory-bank/systemPatterns.md` - Architecture standards
3. `memory-bank/techContext.md` - Tech stack constraints

### 2. Dependency Graph Analysis
Analyze the PRD to identify:
- **Entry Points**: Where does this feature integrate?
- **Data Flow**: What data moves through the system?
- **Component Boundaries**: What layers are affected?
- **External Dependencies**: New libraries or services needed?

### 3. Task Decomposition Rules
Break the feature into tasks following these principles:

#### Atomic Task Size
- Each task should take **1-4 hours**
- Tasks should be independently testable
- Tasks should have clear acceptance criteria

#### Task Categories
1. **Foundation** (0-series): Setup, dependencies, data models
2. **Core Logic** (1-series): Business logic implementation
3. **Integration** (2-series): API endpoints, UI components
4. **Testing** (3-series): E2E tests, performance optimization
5. **Documentation** (4-series): API docs, user guides

### 4. Task Generation
Create directory: `.claude/epics/$ARGUMENTS/`
Generate task files: `task-<ID>.md`

### 5. Epic Summary Generation
Create `epic-summary.md` with:
- Total task count
- Dependency graph (Mermaid diagram)
- Parallel execution plan (Waves)
- Worktree setup commands

### 6. Finalization
1. Present epic summary to user
2. Highlight parallel execution opportunities
3. Suggest: `./scripts/setup-worktree.sh <branch>` to start

---

## Best Practices
1. **Think in waves, not sequences** - Maximize parallelization
2. **Each task = 1 PR** - Keep merge conflicts minimal
3. **Test-first mindset** - Every task includes test specs
4. **Reference Memory Bank** - Ensure consistency with patterns

---

## Related Commands
- `/prd-new <feature>` - Generate PRD before decomposition
- `/worktree-sync` - Merge completed tasks
- `/memory-update` - Update Memory Bank with decisions
