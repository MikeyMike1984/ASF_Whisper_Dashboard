---
description: "Update Memory Bank files with current project state and decisions"
argument-hint: "[file-to-update]"
---

# Memory Bank Update Protocol

## Persona
**Knowledge Manager** + **Documentation Specialist**

## Objective
Maintain the Memory Bank as the single source of truth by capturing architectural decisions, progress updates, and pattern changes.

---

## Execution Steps

### 1. Current State Analysis
Read ALL Memory Bank files:
- `memory-bank/projectbrief.md`
- `memory-bank/systemPatterns.md`
- `memory-bank/techContext.md`
- `memory-bank/activeContext.md`
- `memory-bank/progress.md`
- `memory-bank/decisionLog.md`

### 2. Detect Changes
Analyze codebase and recent commits:
```bash
git log --oneline -20
git diff HEAD~10 --name-only
git diff HEAD~10 package.json
```

### 3. Interactive Update Menu
Present options:
1. **Progress Tracker** - Mark features completed/in-progress
2. **Decision Log** - Document architectural decision (ADR)
3. **System Patterns** - Update architecture or coding standards
4. **Tech Context** - Add new dependencies or tools
5. **Active Context** - Update roadmap priorities
6. **Project Brief** - Modify requirements (with warning)
7. **Auto-Sync All** - Automatically detect and update everything

### 4. Execute Updates
Based on selection, update the appropriate files.

### 5. Validation & Consistency Check
Cross-check consistency:
- Does `progress.md` match feature branches?
- Are `decisionLog.md` decisions reflected in `systemPatterns.md`?
- Is `techContext.md` in sync with `package.json`?

### 6. Commit Memory Bank Changes
```bash
git add memory-bank/
git commit -m "docs: Update Memory Bank with <summary>"
```

---

## Best Practices
1. **Update frequently** - Don't let Memory Bank drift
2. **Update BEFORE merging** - Document while decisions are fresh
3. **Be specific** - Vague descriptions degrade future context
4. **Link decisions to code** - Reference file paths in ADRs
5. **Timestamp everything** - Track when knowledge was captured

---

## Safety Rules
- **Never delete** old ADRs, mark as "Superseded"
- **Never rewrite history** in decision log
- **Always commit** Memory Bank changes separately from code
- **Ask before** modifying `projectbrief.md`

---

## Related Commands
- `/worktree-sync <branch>` - Merge code and update Memory Bank together
- `/prd-new <feature>` - Create new PRD based on Memory Bank state
