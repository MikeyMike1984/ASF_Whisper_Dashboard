---
description: "Initialize session with Memory Bank context (MUST run at session start)"
---

# Session Initialization Protocol

## MANDATORY FIRST ACTION
This command MUST be executed at the start of every new session or after context compaction.

## Execution Steps

### 1. Read Core Memory Bank Files
```
READ: memory-bank/projectbrief.md
READ: memory-bank/systemPatterns.md
READ: memory-bank/activeContext.md
READ: memory-bank/decisionLog.md (last 10 entries)
```

### 2. Summarize Understanding
After reading, provide a brief summary:
- Current project phase
- Active worktree and branch
- Last completed tasks
- Current objectives
- Any blockers or open questions

### 3. Confirm Initialization
Output: "Session initialized. Memory Bank loaded. Ready to proceed."

### 4. Update Session Tracker
Mark session as initialized in `.claude/.session_state.json`

---

## Enforcement
If this command has not been run and agent attempts to:
- Write code
- Make architectural decisions
- Commit changes

The pre_tool_use hook will inject a blocking reminder.

---

## Usage
This is automatically triggered by the `user_prompt_submit.sh` hook on session start.
Can also be manually invoked with `/session-init`
