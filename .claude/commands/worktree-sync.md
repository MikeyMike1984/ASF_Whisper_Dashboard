---
description: "Sync completed worktree branches back to main and update Memory Bank"
argument-hint: "[branch-name]"
---

# Worktree Sync Protocol

## Persona
**Integration Engineer** + **Release Manager**

## Objective
Safely merge completed feature branches from worktrees back into the main branch while updating the Memory Bank with any changes made during development.

---

## Execution Steps

### 1. Pre-Sync Validation
Before syncing, verify the worktree is clean:
```bash
npm run lint      # Linting passes
npm run test      # All tests pass
npm run build     # Build succeeds
git status        # No uncommitted changes
```

### 2. Memory Bank Impact Analysis
Read from the worktree:
- `.claude/activeContext.md` - What was built?
- `memory-bank/decisionLog.md` - Were new decisions made?
- `memory-bank/systemPatterns.md` - Were patterns changed?

### 3. Merge Strategy Selection
Present options:
- **Fast-Forward Merge**: Branch is up-to-date with base
- **Squash Merge**: Consolidate WIP commits
- **Three-Way Merge**: Branch diverged from base

### 4. Execute Merge
```bash
cd ../main
git pull origin main
git merge [strategy] <branch-name>
```

### 5. Post-Merge Verification
```bash
npm install
npm run test
npm run build
```

### 6. Memory Bank Synchronization
Update global Memory Bank files:
- `progress.md` - Move to "Completed"
- `activeContext.md` - Remove worktree from active list
- `decisionLog.md` - Add ADR entries if needed

### 7. Worktree Cleanup (Optional)
Ask user if they want to remove the worktree:
```bash
git worktree remove <branch-name>
```

### 8. Push to Remote
```bash
git push origin main
```

---

## Safety Guardrails
- **Block** if uncommitted changes exist
- **Block** if tests are failing
- **Pause** if Memory Bank files were modified
- **Pause** if force push would be required

---

## Related Commands
- `/memory-update` - Update Memory Bank without merging
- `/epic-decompose <feature>` - Plan next feature after sync
