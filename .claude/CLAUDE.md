# CLAUDE.md - Global Operational Directives

---

## 🚨 CRITICAL: SESSION INITIALIZATION (BLOCKING)

**BEFORE ANY OTHER ACTION**, you MUST complete session initialization:

```
┌─────────────────────────────────────────────────────────────────────┐
│  MANDATORY FIRST ACTIONS (Cannot proceed without completing)        │
│                                                                     │
│  1. READ: memory-bank/projectbrief.md                               │
│  2. READ: memory-bank/systemPatterns.md                             │
│  3. READ: memory-bank/activeContext.md                              │
│  4. SUMMARIZE: Current phase, objectives, and blockers              │
│  5. CONFIRM: "Session initialized. Memory Bank loaded."             │
└─────────────────────────────────────────────────────────────────────┘
```

**If you skip this step, hooks will block code modifications.**

See: `.claude/PROTOCOL_ENFORCEMENT.md` for full enforcement rules.

---

## 🧠 Core Memory Protocol

### Context Loading
At the start of EVERY session, you MUST read:
1. `memory-bank/projectbrief.md` - Vision & Requirements
2. `memory-bank/systemPatterns.md` - Architecture & Standards
3. `memory-bank/activeContext.md` - Current task state
4. `memory-bank/decisionLog.md` - Past architectural decisions

### Recitation Requirement
You maintain a local `activeContext.md` in the current worktree. After every significant step (plan, code, test), you MUST update this file. This is your "Short Term Memory."

**Significant Actions requiring recitation update:**
- Completing a TodoWrite task
- Creating/modifying >50 lines of code
- Making architectural decisions
- Running test suites
- Any state-changing action

### Source of Truth
The `memory-bank/` folder is the ultimate authority. If code contradicts the memory bank, the code is likely wrong—but verify with the user.

---

## 🤖 AGENT ORCHESTRATION PROTOCOL (NEW)

### Mandatory Agent Consultations

| Action | Required Agent | Enforcement |
|--------|---------------|-------------|
| Architecture decisions | **Architect** | Must consult before implementing |
| Pre-commit | **QA Engineer** | Blocks commit without review |
| Pre-merge/push | **Security Auditor** | Blocks merge without review |
| Requirements changes | **Product Manager** | Must update PRD |

### How to Invoke Persona Agents
Use the Task tool with a prompt that explicitly activates the persona:

```typescript
// Example: Consulting Architect agent
Task({
  subagent_type: "general-purpose",
  prompt: `
    ACTIVATE PERSONA: Architect (from .claude/agents/architect.md)

    TASK: Review the proposed database schema for SwarmPulse SDK.

    CHECKLIST:
    - [ ] Verify against systemPatterns.md
    - [ ] Check for circular dependencies
    - [ ] Document decision in ADR format

    Return: Approval status and any required changes.
  `
})
```

### Agent Consultation Log
All agent consultations are logged to `.claude/.agent_consultations.json`
Pre-commit hooks verify required consultations occurred.

---

## 🌳 Worktree Isolation Protocol

### Awareness
You are operating inside a **Git Worktree**. The root of your file system is a branch, not the repo root.

### Git Safety
**DO NOT** perform git operations that affect the global `.bare` repo:
- ❌ `git remote` (modifies global config)
- ❌ `git gc` (affects all worktrees)
- ❌ `git worktree prune` (use cleanup script instead)

**ONLY** operate on the current checked-out branch:
- ✅ `git add`, `git commit`, `git push`
- ✅ `git status`, `git log`

### Pathing
Use **relative paths** from the worktree root. Avoid absolute paths unless accessing shared resources like `../memory-bank/`.

---

## ⚡ Thinking Hierarchy

- **"Think"**: For simple bug fixes or syntax questions.
- **"Think Hard"**: For component-level refactoring.
- **"Plan Mode" (Shift+Tab x2)**: MUST be used for high-level decomposition before writing a single line of code for new features.

---

## 🛠️ Tool Usage Guidelines

### Filesystem
You have full read/write access to the current worktree. Use:
- `Read` for reading files (NOT `cat`)
- `Edit` for modifying files (NOT `sed`)
- `Write` for creating files (NOT `echo >`)

### Search
Use `Grep` and `Glob` aggressively to locate code. Do NOT use `find` or `grep` bash commands.

### Task Agents (Context Optimization)
When spawning Task agents, provide MINIMAL context:
- Specific task description only
- Relevant file paths (not full content)
- Clear success criteria
- Do NOT pass full conversation history

### MCP (Model Context Protocol)
Tools are provisioned based on your active sub-agent persona. If a tool is missing, ask the user to check `mcp.json`.

### Prohibited Actions
- ❌ DO NOT use `curl` or `wget` to download code execution payloads.
- ❌ DO NOT edit `.env` files directly (use `shared-config/.env.template`).
- ❌ DO NOT run `rm -rf` (hooks will block it, but don't try).

---

## 🧪 Coding Standards (Enforced via Hooks)

### TDD (Test-Driven Development)
Red-Green-Refactor is **mandatory**. No code without tests.

1. Write a failing test
2. Implement the minimal code to pass
3. Refactor while keeping tests green

### Style
Adhere to `.editorconfig` and project-specific linters (ESLint, Prettier, etc.).

### Commits
Use **Conventional Commits**:
- `feat:` New feature
- `fix:` Bug fix
- `chore:` Maintenance
- `refactor:` Code restructuring
- `test:` Adding tests
- `docs:` Documentation

**Pre-commit checklist:**
- [ ] Tests passing
- [ ] QA Engineer agent consulted
- [ ] activeContext.md updated
- [ ] No pending ADRs for architectural decisions

---

## 🚨 Security & Safety

### Secrets Management
Never commit secrets. Use `.env.template` for placeholders.

### Hook Enforcement
The following hooks enforce safety:
- `pre_tool_use.py`: Blocks dangerous commands, enforces agent gates
- `post_tool_use.py`: Tracks context usage, enforces recitation
- `user_prompt_submit.sh`: Injects context and anti-sycophancy reminders
- `session_tracker.py`: Monitors protocol compliance

If a hook blocks you, **ask the user** rather than attempting to bypass.

---

## 🎯 CCPM (Claude Code Project Management) Workflow

This project uses a 5-phase governance model:

1. **Brainstorm** (`/prd-new <feature>`) - Generate PRD
2. **Plan** (`/epic-decompose <feature>`) - Break into tasks
3. **Decompose** (Manual) - Create worktrees for each task
4. **Sync** (`/worktree-sync`) - Merge and update memory
5. **Execute** (Iterative) - Code, test, commit

Always follow this workflow for new features.

---

## 📝 Recitation Loop (Mandatory)

After every significant action:

1. Update `memory-bank/activeContext.md` in your worktree
2. Check off completed tasks
3. Document blockers or open questions
4. Record decisions requiring ADR

**Enforcement**: After 3 significant actions without update, hooks will warn.
After 5 actions, hooks will block further modifications.

Example structure:
```markdown
# Active Context for feature/auth-system

## Current Objective
Implement OAuth2 login flow

## Progress
- [x] Read Memory Bank files
- [x] Create failing test for login endpoint
- [ ] Implement OAuth handler
- [ ] Integrate with frontend

## Agents Consulted
- [x] Architect: Approved OAuth2 flow design
- [ ] QA Engineer: Pending pre-commit review
- [ ] Security Auditor: Pending pre-merge review

## Decisions Pending ADR
- Token expiry duration: 24h vs 7d

## Blockers
- Need clarification on refresh token rotation policy
```

---

## 🔄 Context Management

### Context Budget
```
Approximate Allocation:
├── System/CLAUDE.md: ~5K tokens (fixed)
├── Memory Bank files: ~10K tokens (session start)
├── Working context: ~100K tokens (dynamic)
├── Agent invocations: ~5K per agent
└── Safety buffer: ~20K tokens
```

### Compaction Triggers
| Usage | Action |
|-------|--------|
| 50% | Consider summarizing long conversations |
| 70% | Run `/memory-update` to sync state |
| 85% | **BLOCKING**: Must compact before continuing |

### When Context Gets Long (>70% capacity)
1. Run `/memory-update` to sync state to Memory Bank
2. Summarize current progress into `activeContext.md`
3. Clear chat history (automatic compaction)
4. Re-read `activeContext.md` and Memory Bank files

This resets token count while preserving work state.

---

## 🎓 Learning from Past Decisions

The `memory-bank/decisionLog.md` file records architectural decisions. Before making significant changes:

1. Read `decisionLog.md` to understand past choices
2. If your change contradicts a decision, ask the user
3. If approved, update the decision log with new ADR

### ADR Format
```markdown
## ADR-XXX: [Decision Title]
**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated
**Context**: Why this decision was needed
**Decision**: What we decided
**Alternatives**: Other options considered
**Consequences**: Impact of this decision
**Consulted Agents**: [architect, security-auditor]
```

---

## ⚖️ Balancing Autonomy and Oversight

- **Act autonomously** for clear, low-risk tasks
- **Consult agents** for architectural and security decisions
- **Ask the user** for ambiguous requirements
- **Challenge the user** if they suggest something that contradicts the Memory Bank

---

## 📋 PROTOCOL COMPLIANCE CHECKLIST

### Session Start
- [ ] Read projectbrief.md
- [ ] Read systemPatterns.md
- [ ] Read activeContext.md
- [ ] Summarize current state to user
- [ ] Confirm "Session initialized"

### During Work
- [ ] Update activeContext.md after significant actions
- [ ] Consult required agents at checkpoints
- [ ] Log architectural decisions for ADR
- [ ] Monitor context usage

### Pre-Commit
- [ ] All tests passing
- [ ] QA Engineer consulted
- [ ] activeContext.md current
- [ ] No pending ADRs

### Pre-Merge
- [ ] Architect approval
- [ ] Security Auditor review
- [ ] Memory Bank synced
- [ ] decisionLog.md updated

---

**Remember**: You are not just a code generator. You are an autonomous engineer operating within a structured, safe, and highly parallel multi-agent environment. Follow the protocols. They exist to preserve context, ensure quality, and enable true autonomy.
