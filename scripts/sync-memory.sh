#!/bin/bash
################################################################################
# SYNC-MEMORY SCRIPT
# Purpose: Sync worktree activeContext to global Memory Bank before deletion
# Usage: ./scripts/sync-memory.sh [worktree-path]
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# ARGUMENT PARSING
# ============================================================================
WORKTREE_PATH="${1:-$(pwd)}"

# Resolve to absolute path
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    WORKTREE_PATH=$(cd "$WORKTREE_PATH" 2>/dev/null && pwd -W 2>/dev/null || pwd)
else
    WORKTREE_PATH=$(cd "$WORKTREE_PATH" 2>/dev/null && pwd)
fi

echo -e "${BLUE}🧠 Memory Sync Protocol${NC}"
echo -e "  ${CYAN}Worktree${NC}: $WORKTREE_PATH"

# ============================================================================
# ENVIRONMENT DETECTION
# ============================================================================

# Find repository root (where .bare lives)
SEARCH_PATH="$WORKTREE_PATH"
REPO_ROOT=""
while [[ "$SEARCH_PATH" != "/" ]] && [[ "$SEARCH_PATH" != "" ]]; do
    if [[ -d "$SEARCH_PATH/.bare" ]]; then
        REPO_ROOT="$SEARCH_PATH"
        break
    fi
    SEARCH_PATH=$(dirname "$SEARCH_PATH")
done

if [[ -z "$REPO_ROOT" ]] || [[ ! -d "$REPO_ROOT/.bare" ]]; then
    echo -e "${RED}❌ Error: Could not find Forge repository root (.bare directory)${NC}"
    exit 1
fi

echo -e "  ${CYAN}Repo Root${NC}: $REPO_ROOT"

# ============================================================================
# FILE PATHS
# ============================================================================
ACTIVE_CONTEXT="$WORKTREE_PATH/.claude/activeContext.md"
MEMORY_BANK="$REPO_ROOT/memory-bank"
DECISION_LOG="$MEMORY_BANK/decisionLog.md"
PROGRESS_FILE="$MEMORY_BANK/progress.md"
ACTIVE_CONTEXT_GLOBAL="$MEMORY_BANK/activeContext.md"

# Get branch name - use git to get actual branch name (handles nested branches like feature/user-auth)
# Fallback to basename if git command fails (e.g., not in git worktree)
if git -C "$WORKTREE_PATH" rev-parse --is-inside-work-tree &>/dev/null; then
    BRANCH_NAME=$(git -C "$WORKTREE_PATH" branch --show-current 2>/dev/null)
    # If branch name is empty (detached HEAD), fall back to basename
    if [[ -z "$BRANCH_NAME" ]]; then
        BRANCH_NAME=$(basename "$WORKTREE_PATH")
        echo -e "  ${YELLOW}⚠${NC} Detached HEAD detected, using folder name: ${CYAN}$BRANCH_NAME${NC}"
    fi
else
    BRANCH_NAME=$(basename "$WORKTREE_PATH")
fi

echo -e "  ${CYAN}Branch${NC}: $BRANCH_NAME"

# ============================================================================
# VALIDATION
# ============================================================================
echo ""
echo -e "${BLUE}🔍 Validating worktree state...${NC}"

if [[ ! -f "$ACTIVE_CONTEXT" ]]; then
    echo -e "${YELLOW}⚠️  No activeContext.md found in worktree${NC}"
    echo -e "  Creating empty sync record..."

    {
        echo ""
        echo "---"
        echo ""
        echo "## Sync Record: $BRANCH_NAME"
        echo "**Date**: $(date +"%Y-%m-%d %H:%M:%S")"
        echo "**Status**: No active context found"
        echo ""
    } >> "$DECISION_LOG"

    echo -e "${GREEN}✅ Sync record created (empty worktree)${NC}"
    exit 0
fi

echo -e "  ${GREEN}✓${NC} Found activeContext.md"

# ============================================================================
# EXTRACT COMPLETED TASKS
# ============================================================================
echo ""
echo -e "${BLUE}📋 Extracting completed tasks...${NC}"

COMPLETED_TASKS=$(grep -E "^\s*-\s*\[x\]" "$ACTIVE_CONTEXT" 2>/dev/null || echo "")

if [[ -n "$COMPLETED_TASKS" ]]; then
    TASK_COUNT=$(echo "$COMPLETED_TASKS" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Found $TASK_COUNT completed task(s)"
else
    echo -e "  ${YELLOW}ℹ${NC}  No completed tasks found"
fi

# ============================================================================
# EXTRACT DECISIONS/NOTES
# ============================================================================
echo ""
echo -e "${BLUE}📝 Extracting decisions and notes...${NC}"

NOTES=""
if grep -q "## Notes" "$ACTIVE_CONTEXT" 2>/dev/null; then
    NOTES=$(sed -n '/^## Notes/,/^## /p' "$ACTIVE_CONTEXT" | grep -v "^## " | grep -v "^\s*$" || echo "")
fi

BLOCKERS=""
if grep -q "## Blockers\|## Open Questions" "$ACTIVE_CONTEXT" 2>/dev/null; then
    BLOCKERS=$(sed -n '/^## \(Blockers\|Open Questions\)/,/^## /p' "$ACTIVE_CONTEXT" | grep -v "^## " | grep -v "^\s*$" || echo "")
fi

if [[ -n "$NOTES" ]]; then
    echo -e "  ${GREEN}✓${NC} Found notes to sync"
else
    echo -e "  ${YELLOW}ℹ${NC}  No notes found"
fi

# ============================================================================
# EXTRACT OBJECTIVE
# ============================================================================
OBJECTIVE=""
if grep -q "## Current Objective\|## Objective" "$ACTIVE_CONTEXT" 2>/dev/null; then
    OBJECTIVE=$(sed -n '/^## \(Current \)\?Objective/,/^## /p' "$ACTIVE_CONTEXT" | grep -v "^## " | head -5 || echo "")
fi

# ============================================================================
# UPDATE DECISION LOG
# ============================================================================
echo ""
echo -e "${BLUE}📚 Updating Decision Log...${NC}"

SYNC_ENTRY="
---

## Session Sync: $BRANCH_NAME

**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Worktree**: \`$WORKTREE_PATH\`
**Status**: Synced to Memory Bank

### Objective
$OBJECTIVE

### Completed Tasks
$COMPLETED_TASKS

### Notes & Decisions
$NOTES

### Open Questions/Blockers
$BLOCKERS
"

echo "$SYNC_ENTRY" >> "$DECISION_LOG"
echo -e "  ${GREEN}✓${NC} Appended sync record to decisionLog.md"

# ============================================================================
# UPDATE PROGRESS FILE
# ============================================================================
echo ""
echo -e "${BLUE}📊 Updating Progress Tracker...${NC}"

if grep -q "$BRANCH_NAME" "$PROGRESS_FILE" 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/- \[ \] .*$BRANCH_NAME.*/- [x] $BRANCH_NAME - Synced $(date +%Y-%m-%d)/" "$PROGRESS_FILE" 2>/dev/null || true
    else
        sed -i "s/- \[ \] .*$BRANCH_NAME.*/- [x] $BRANCH_NAME - Synced $(date +%Y-%m-%d)/" "$PROGRESS_FILE" 2>/dev/null || true
    fi
    echo -e "  ${GREEN}✓${NC} Updated $BRANCH_NAME status in progress.md"
else
    if grep -q "## Completed Features\|## Completed" "$PROGRESS_FILE" 2>/dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "/## Completed/a\\
- [x] $BRANCH_NAME - Synced $(date +%Y-%m-%d)
" "$PROGRESS_FILE" 2>/dev/null || true
        else
            sed -i "/## Completed/a - [x] $BRANCH_NAME - Synced $(date +%Y-%m-%d)" "$PROGRESS_FILE" 2>/dev/null || true
        fi
        echo -e "  ${GREEN}✓${NC} Added $BRANCH_NAME to completed features"
    else
        echo -e "  ${YELLOW}⚠${NC}  Could not find Completed section in progress.md"
    fi
fi

# ============================================================================
# UPDATE GLOBAL ACTIVE CONTEXT
# ============================================================================
echo ""
echo -e "${BLUE}🌐 Updating Global Active Context...${NC}"

if grep -q "$BRANCH_NAME" "$ACTIVE_CONTEXT_GLOBAL" 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "/$BRANCH_NAME/d" "$ACTIVE_CONTEXT_GLOBAL" 2>/dev/null || true
    else
        sed -i "/$BRANCH_NAME/d" "$ACTIVE_CONTEXT_GLOBAL" 2>/dev/null || true
    fi
    echo -e "  ${GREEN}✓${NC} Removed $BRANCH_NAME from active worktrees"
else
    echo -e "  ${YELLOW}ℹ${NC}  $BRANCH_NAME not listed in global activeContext.md"
fi

# ============================================================================
# AUTO-COMMIT MEMORY BANK
# ============================================================================
echo ""
echo -e "${BLUE}📦 Committing Memory Bank changes...${NC}"

cd "$REPO_ROOT"

# Check if there are changes to commit
if git diff --quiet memory-bank/ && git diff --cached --quiet memory-bank/; then
    echo -e "  ${YELLOW}ℹ${NC}  No changes to commit in Memory Bank"
else
    # Stage memory-bank changes
    git add memory-bank/

    # Create commit with descriptive message
    COMMIT_MSG="docs(memory-bank): Sync session from $BRANCH_NAME

- Updated decisionLog.md with session record
- Updated progress.md with completion status
- Synced activeContext.md

Worktree: $WORKTREE_PATH
Timestamp: $(date +"%Y-%m-%d %H:%M:%S")"

    if git commit -m "$COMMIT_MSG" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Memory Bank committed to repository"
    else
        echo -e "  ${YELLOW}⚠${NC}  Commit skipped (pre-commit hook or no changes)"
    fi
fi

# ============================================================================
# COMPLETION
# ============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ MEMORY SYNC COMPLETE ✅                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  ${GREEN}✓${NC} Decision Log updated: ${CYAN}memory-bank/decisionLog.md${NC}"
echo -e "  ${GREEN}✓${NC} Progress updated: ${CYAN}memory-bank/progress.md${NC}"
echo -e "  ${GREEN}✓${NC} Active Context updated: ${CYAN}memory-bank/activeContext.md${NC}"
echo -e "  ${GREEN}✓${NC} Changes committed to repository"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review the sync in: ${YELLOW}memory-bank/decisionLog.md${NC}"
echo "  2. Push changes: ${YELLOW}git push origin main${NC} (if desired)"
echo "  3. Clean up worktree: ${YELLOW}./scripts/cleanup-worktree.sh $BRANCH_NAME${NC}"
echo ""
