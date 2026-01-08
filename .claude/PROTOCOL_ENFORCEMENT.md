# ASF Protocol Enforcement Framework

## Purpose
Ensure all ASF protocols are strictly followed from project start through completion.
This document defines enforcement mechanisms, checkpoints, and context management rules.

---

## 1. SESSION INITIALIZATION PROTOCOL (Mandatory)

### Checkpoint: Session Start
**Trigger**: First prompt in any new session or after context compaction

**Required Actions (BLOCKING)**:
```
1. [ ] Read memory-bank/projectbrief.md
2. [ ] Read memory-bank/systemPatterns.md
3. [ ] Read memory-bank/activeContext.md (worktree-specific)
4. [ ] Read memory-bank/decisionLog.md (last 10 entries)
5. [ ] Acknowledge reading with summary to user
```

**Enforcement**: Add to `user_prompt_submit.sh`:
- Inject `<session-init-required>` tag on first prompt
- Agent MUST respond with file read confirmations before proceeding

### Proposed Hook Enhancement:
```bash
# In user_prompt_submit.sh - detect new session
if [ ! -f ".claude/.session_initialized" ]; then
    inject_tag="<session-init-required>
    BLOCKING: Before responding, you MUST:
    1. Read and summarize memory-bank/projectbrief.md
    2. Read and summarize memory-bank/systemPatterns.md
    3. Read memory-bank/activeContext.md
    4. Confirm initialization complete
    </session-init-required>"
fi
```

---

## 2. RECITATION LOOP PROTOCOL (Continuous)

### Checkpoint: After Every Significant Action
**Significant Actions Defined**:
- Completing a task from TodoWrite
- Creating/modifying >50 lines of code
- Making architectural decisions
- Running test suites
- Any action that changes project state

**Required Actions**:
```
1. [ ] Update .claude/activeContext.md OR memory-bank/activeContext.md
2. [ ] Check off completed items
3. [ ] Document blockers or open questions
4. [ ] Record decisions in decisionLog.md if architectural
```

**Enforcement**: Add to `post_tool_use.py`:
- Track significant actions
- After 3 significant actions without activeContext update, inject warning
- After 5, block further tool calls until update

---

## 3. AGENT ORCHESTRATION PROTOCOL

### Mandatory Agent Checkpoints:

| Phase | Required Agent | Checkpoint |
|-------|---------------|------------|
| PRD Creation | Product Manager | Before finalizing requirements |
| Architecture Design | Architect | Before writing implementation code |
| Implementation | Primary Agent | During coding |
| Pre-Commit | QA Engineer | Before any git commit |
| Security Review | Security Auditor | Before merging to main |

### Agent Invocation Rules:
```
1. Architect Agent MUST be consulted for:
   - New patterns not in systemPatterns.md
   - Database schema changes
   - API contract changes
   - Dependency additions

2. QA Engineer Agent MUST be consulted for:
   - Test coverage assessment (target: 80%)
   - Edge case identification
   - Integration test planning

3. Security Auditor Agent MUST be consulted for:
   - Any code handling user input
   - Database queries (SQL injection review)
   - Authentication/authorization changes
   - File system operations
```

### Enforcement: Agent Gate in pre_tool_use.py
```python
# Before git commit, check agent consultation log
REQUIRED_AGENTS_FOR_COMMIT = ['qa-engineer']
REQUIRED_AGENTS_FOR_MERGE = ['architect', 'security-auditor']

def check_agent_gates(command):
    if 'git commit' in command:
        if not agent_consulted('qa-engineer'):
            return block("QA Engineer review required before commit")
    if 'git merge' in command or 'git push' in command:
        if not all_agents_consulted(REQUIRED_AGENTS_FOR_MERGE):
            return block("Architect and Security review required before merge")
```

---

## 4. CONTEXT MANAGEMENT PROTOCOL

### Context Budget Allocation:
```
Total Context Window: 200K tokens (example)

Reserved Allocations:
├── System Prompt & CLAUDE.md: ~5K tokens (fixed)
├── Memory Bank Core Files: ~10K tokens (loaded at start)
├── Active Working Context: ~100K tokens (dynamic)
├── Agent Persona Context: ~5K per agent invoked
└── Safety Buffer: ~20K tokens (for tool outputs)

Available for Code/Conversation: ~60K tokens
```

### Compaction Triggers:
| Trigger | Action |
|---------|--------|
| Context > 50% capacity | Warning: Consider summarizing |
| Context > 70% capacity | Mandatory: Run /memory-update |
| Context > 85% capacity | BLOCKING: Compact before continuing |

### Compaction Procedure:
```
1. Run /memory-update to sync state to Memory Bank
2. Summarize current progress into activeContext.md
3. Create session checkpoint in .claude/.session_checkpoint.json
4. Clear conversation history (automatic)
5. Re-initialize with Memory Bank files
6. Continue from activeContext.md state
```

### Enforcement: Context Monitor Hook
```python
# In post_tool_use.py
def monitor_context_usage():
    # Estimate current context size
    context_size = estimate_context_tokens()
    capacity = 200000  # Adjust based on model

    usage_percent = context_size / capacity * 100

    if usage_percent > 85:
        return block_action(
            "CONTEXT LIMIT: Must run /memory-update and compact before continuing"
        )
    elif usage_percent > 70:
        return warn_action(
            f"Context at {usage_percent:.0f}%. Run /memory-update soon."
        )
```

---

## 5. TASK AGENT CONTEXT ISOLATION

### Principle: Minimal Context per Agent
Each spawned Task agent should receive ONLY:
1. Specific task description
2. Relevant file paths (not full content)
3. Necessary type definitions
4. Success criteria

### Anti-Pattern (DON'T DO):
```typescript
// BAD: Spawning agent with full conversation context
Task.spawn({
  prompt: "Fix the bug",
  context: entireConversationHistory  // WASTEFUL
})
```

### Correct Pattern (DO):
```typescript
// GOOD: Spawning agent with minimal targeted context
Task.spawn({
  subagent_type: "Explore",
  prompt: `
    Find all files that handle authentication.
    Return: file paths and line numbers of auth functions.
    Do not read file contents unless necessary.
  `,
  // No extra context passed - agent works independently
})
```

### Agent Communication Protocol:
```
Primary Agent                    Sub-Agent
     │                               │
     │──── Minimal Task Spec ───────>│
     │     (5-10 lines max)          │
     │                               │
     │<─── Structured Result ────────│
     │     (Summary + file refs)     │
     │                               │
     │  Primary integrates result    │
     │  into main context            │
```

---

## 6. DECISION LOGGING PROTOCOL

### When to Log (MANDATORY):
- Any choice between 2+ valid approaches
- Technology/library selection
- Pattern adoption or deviation
- Performance vs. simplicity tradeoffs
- Security-related decisions

### ADR Format (in decisionLog.md):
```markdown
## ADR-XXX: [Decision Title]
**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated
**Context**: Why this decision was needed
**Decision**: What we decided
**Alternatives Considered**: Other options evaluated
**Consequences**: Impact of this decision
**Consulted Agents**: [architect, security-auditor, etc.]
```

### Enforcement:
- Architect agent MUST approve ADRs before implementation
- Pre-commit hook checks for ADR reference in commit message for architectural changes

---

## 7. CCPM (Claude Code Project Management) GOVERNANCE

### 5-Phase Workflow Enforcement:

| Phase | Command | Requirement | Enforcement |
|-------|---------|-------------|-------------|
| 1. Brainstorm | `/prd-new <feature>` | PRD document | Warn on code edit without PRD |
| 2. Plan | `/epic-decompose <feature>` | Epic with tasks | Warn on implementation without epic |
| 3. Decompose | Manual worktrees | Feature worktrees | Track in CCPM state |
| 4. Sync | `/worktree-sync` | Memory sync | Block worktree deletion without sync |
| 5. Execute | Code, test, commit | Follow TDD | Agent gates enforced |

### CCPM State Tracking:
The hook maintains `.claude/.ccpm_state.json` with:
```json
{
  "features": {
    "feature-name": {
      "phase": "execute",
      "started": 1234567890,
      "prd_exists": true,
      "epic_exists": true
    }
  },
  "current_feature": "feature-name"
}
```

### PRD Existence Check:
- Triggered when editing implementation files in `feature/*` directories
- Checks `.claude/prds/<feature-name>.md` for existence
- Warns if missing, suggests running `/prd-new`

### Epic Decomposition Check:
- Triggered on implementation file edits
- Checks `.claude/epics/<feature-name>/` for task files
- Warns if missing, suggests running `/epic-decompose`

### Commit-Time CCPM Verification:
- Before git commit, checks current feature's CCPM compliance
- Warns if PRD or Epic is missing
- Combined with Agent Gates for full governance

### Enforcement Code (in pre_tool_use.py):
```python
def check_ccpm_phase_compliance(feature_name, action_type):
    """
    CCPM requires:
    1. PRD must exist before implementation
    2. Epic must be decomposed before coding
    3. Product Manager consulted for requirements changes
    """
    prd_path = get_prd_for_feature(feature_name)
    epic_path = get_epic_for_feature(feature_name)

    if not prd_path:
        return warn("No PRD found - run /prd-new first")

    if not epic_path and action_type == 'implementation':
        return warn("No epic decomposition - run /epic-decompose")

    return allow()
```

---

## 8. ENFORCEMENT SUMMARY

| Protocol | Enforcement Point | Mechanism |
|----------|------------------|-----------|
| Session Init | user_prompt_submit.sh | Inject blocking tag |
| Recitation Loop | post_tool_use.py | Track & warn/block |
| Agent Gates | pre_tool_use.py | Block commits/merges |
| Context Management | post_tool_use.py | Monitor & block at threshold |
| Decision Logging | pre_tool_use.py | Require ADR for architectural commits |
| **CCPM Governance** | **pre_tool_use.py** | **Track phase, warn on violations** |

---

## 9. COMPLIANCE CHECKLIST (Per Phase)

### Phase Start:
- [ ] Session initialized with Memory Bank
- [ ] activeContext.md reviewed
- [ ] PRD exists and approved
- [ ] Epic decomposed into tasks
- [ ] Architect consulted on approach

### During Phase:
- [ ] activeContext.md updated after each task
- [ ] Tests written before implementation (TDD)
- [ ] Context usage monitored
- [ ] Decisions logged in decisionLog.md

### Phase End:
- [ ] All tests passing
- [ ] QA Engineer review complete
- [ ] Security Auditor review complete (if applicable)
- [ ] activeContext.md reflects completion
- [ ] Memory Bank synced via /memory-update
- [ ] Commit includes phase summary

---

**Document Version**: 1.1
**Created**: 2026-01-07
**Updated**: 2026-01-07
**Changes**: Added CCPM 5-phase governance enforcement (Section 7)
**Purpose**: Strict enforcement of ASF protocols including CCPM workflow
