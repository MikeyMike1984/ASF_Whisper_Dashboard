#!/bin/bash
################################################################################
# WORKTREE CLEANUP SCRIPT
# Purpose: Safely remove worktrees and optionally delete branches
# Usage: ./scripts/cleanup-worktree.sh <branch-name> [--delete-branch]
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
BRANCH_NAME="${1:-}"
DELETE_BRANCH=false

if [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}❌ Error: Branch name is required${NC}"
    echo ""
    echo "Usage: $0 <branch-name> [--delete-branch]"
    echo ""
    echo "Examples:"
    echo "  $0 feature/user-auth                    # Remove worktree only"
    echo "  $0 feature/user-auth --delete-branch    # Remove worktree AND delete branch"
    exit 1
fi

# Check for --delete-branch flag
if [ "${2:-}" = "--delete-branch" ]; then
    DELETE_BRANCH=true
fi

# ============================================================================
# ENVIRONMENT DETECTION
# ============================================================================
echo -e "${BLUE}🔍 Detecting repository structure...${NC}"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
WORKTREE_PATH="$REPO_ROOT/$BRANCH_NAME"

if [ ! -d "$REPO_ROOT/.bare" ]; then
    echo -e "${RED}❌ Error: .bare repository not found in $REPO_ROOT${NC}"
    echo -e "${YELLOW}💡 Hint: This script is designed for Fractal Worktree environments${NC}"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Repository root: ${CYAN}$REPO_ROOT${NC}"
echo -e "  ${GREEN}✓${NC} Target worktree: ${CYAN}$WORKTREE_PATH${NC}"

# ============================================================================
# WORKTREE VALIDATION
# ============================================================================
echo ""
echo -e "${BLUE}🔍 Validating worktree...${NC}"

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}❌ Error: Worktree does not exist at $WORKTREE_PATH${NC}"

    # Check if branch exists (might be a dangling reference)
    if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
        echo -e "${YELLOW}ℹ️  Branch '$BRANCH_NAME' exists but has no worktree${NC}"
        read -p "Delete the branch anyway? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D "$BRANCH_NAME"
            echo -e "${GREEN}✅ Branch deleted${NC}"
        fi
    fi

    exit 1
fi

# Check if worktree is registered
if ! git worktree list | grep -q "$WORKTREE_PATH"; then
    echo -e "${YELLOW}⚠️  Worktree exists as directory but not registered with git${NC}"
    echo -e "${YELLOW}💡 This might be a leftover directory. Safe to delete manually.${NC}"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Worktree exists and is registered"

# ============================================================================
# RECITATION VERIFICATION GATE
# ============================================================================
echo ""
echo -e "${BLUE}🧠 Checking Memory Sync status...${NC}"

SYNC_STATE_FILE="$WORKTREE_PATH/.claude/.last_sync.json"
SYNC_TIMEOUT=3600  # 1 hour

if [ -f "$SYNC_STATE_FILE" ]; then
    # Parse timestamp from JSON (works on both Linux and macOS)
    LAST_SYNC=$(grep -o '"timestamp"[[:space:]]*:[[:space:]]*[0-9]*' "$SYNC_STATE_FILE" | grep -o '[0-9]*$' || echo "0")
    CURRENT_TIME=$(date +%s)
    TIME_SINCE_SYNC=$((CURRENT_TIME - LAST_SYNC))

    if [ "$TIME_SINCE_SYNC" -gt "$SYNC_TIMEOUT" ]; then
        MINUTES_AGO=$((TIME_SINCE_SYNC / 60))
        echo ""
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ❌ RECITATION GATE: Memory Sync Required                       ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Last memory sync was ${MINUTES_AGO} minutes ago.${NC}"
        echo -e "${YELLOW}To prevent context loss, sync recent work before cleanup.${NC}"
        echo ""
        echo -e "${GREEN}Run one of these commands first:${NC}"
        echo "  ${CYAN}./scripts/sync-memory.sh $WORKTREE_PATH${NC}"
        echo "  ${CYAN}/memory-update${NC} (from within Claude Code)"
        echo ""
        exit 1
    else
        MINUTES_AGO=$((TIME_SINCE_SYNC / 60))
        echo -e "  ${GREEN}✓${NC} Memory synced ${MINUTES_AGO} minutes ago"
    fi
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ RECITATION GATE: No Memory Sync Detected                    ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}No memory sync has been performed for this worktree.${NC}"
    echo -e "${YELLOW}To prevent context loss, sync your work before cleanup.${NC}"
    echo ""
    echo -e "${GREEN}Run one of these commands first:${NC}"
    echo "  ${CYAN}./scripts/sync-memory.sh $WORKTREE_PATH${NC}"
    echo "  ${CYAN}/memory-update${NC} (from within Claude Code)"
    echo ""
    read -p "Skip Recitation Gate and proceed anyway? (yes to confirm): " SKIP_GATE
    if [ "$SKIP_GATE" != "yes" ]; then
        echo -e "${BLUE}ℹ️  Cleanup cancelled. Run memory sync first.${NC}"
        exit 0
    fi
    echo -e "  ${YELLOW}⚠${NC}  Recitation Gate bypassed by user"
fi

# ============================================================================
# SAFETY CHECKS
# ============================================================================
echo ""
echo -e "${BLUE}🛡️  Running safety checks...${NC}"

# Check for uncommitted changes
cd "$WORKTREE_PATH"

if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  UNCOMMITTED CHANGES DETECTED${NC}"
    echo ""
    git status --short
    echo ""
    echo -e "${RED}Cannot remove worktree with uncommitted changes.${NC}"
    echo ""
    echo "Options:"
    echo "  1. Commit your changes: ${YELLOW}git add . && git commit${NC}"
    echo "  2. Stash your changes: ${YELLOW}git stash${NC}"
    echo "  3. Discard your changes: ${YELLOW}git reset --hard${NC} (⚠️  DESTRUCTIVE)"
    echo ""
    read -p "Would you like to stash changes and proceed? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -m "Auto-stash before worktree cleanup on $(date)"
        echo -e "${GREEN}✅ Changes stashed${NC}"
    else
        echo -e "${BLUE}ℹ️  Cleanup cancelled. Fix uncommitted changes and try again.${NC}"
        exit 0
    fi
fi

# Check if branch has unpushed commits
UNPUSHED_COMMITS=$(git log --oneline @{upstream}.. 2>/dev/null | wc -l || echo "0")

if [ "$UNPUSHED_COMMITS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: $UNPUSHED_COMMITS unpushed commit(s) detected${NC}"
    echo ""
    git log --oneline @{upstream}.. 2>/dev/null || echo "(No upstream branch set)"
    echo ""
    echo -e "${RED}These commits will be LOST if you delete the branch without pushing.${NC}"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Cleanup cancelled. Push your commits first:${NC}"
        echo "  ${YELLOW}git push origin $BRANCH_NAME${NC}"
        exit 0
    fi
fi

echo -e "  ${GREEN}✓${NC} No blocking issues found"

# ============================================================================
# MEMORY SYNC REMINDER
# ============================================================================
echo ""
echo -e "${BLUE}🧠 Memory Sync Check${NC}"

if [ -f ".claude/activeContext.md" ]; then
    echo -e "  ${YELLOW}ℹ${NC}  This worktree has an activeContext.md file"
    read -p "Would you like to sync memory before cleanup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "$REPO_ROOT/scripts/sync-memory.sh" ]; then
            bash "$REPO_ROOT/scripts/sync-memory.sh" "$WORKTREE_PATH"
        else
            echo -e "  ${YELLOW}⚠${NC}  sync-memory.sh not found, skipping"
        fi
    fi
fi

# ============================================================================
# CONFIRMATION
# ============================================================================
echo ""
echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║              ⚠️  CONFIRM DELETION ⚠️                   ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Branch${NC}      : ${YELLOW}$BRANCH_NAME${NC}"
echo -e "  ${CYAN}Worktree${NC}    : ${YELLOW}$WORKTREE_PATH${NC}"
echo -e "  ${CYAN}Delete Branch${NC}: ${YELLOW}$DELETE_BRANCH${NC}"
echo ""

if [ "$DELETE_BRANCH" = true ]; then
    echo -e "${RED}⚠️  This will PERMANENTLY delete:${NC}"
    echo -e "  1. The worktree directory and all files"
    echo -e "  2. The git branch (can only be recovered from remote)"
else
    echo -e "${YELLOW}This will remove:${NC}"
    echo -e "  1. The worktree directory and all files"
    echo -e "  (The branch will be preserved)"
fi

echo ""
read -p "Type 'yes' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    echo -e "${BLUE}ℹ️  Cleanup cancelled${NC}"
    exit 0
fi

# ============================================================================
# WORKTREE REMOVAL
# ============================================================================
echo ""
echo -e "${BLUE}🗑️  Removing worktree...${NC}"

cd "$REPO_ROOT"

# Remove the worktree
git worktree remove "$WORKTREE_PATH" --force

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Worktree removed from git"
else
    echo -e "  ${RED}✗${NC} Failed to remove worktree from git"
    exit 1
fi

# Remove the directory if it still exists (git worktree remove should handle this)
if [ -d "$WORKTREE_PATH" ]; then
    rm -rf "$WORKTREE_PATH"
    echo -e "  ${GREEN}✓${NC} Worktree directory deleted"
fi

# ============================================================================
# BRANCH DELETION (OPTIONAL)
# ============================================================================
if [ "$DELETE_BRANCH" = true ]; then
    echo ""
    echo -e "${BLUE}🗑️  Deleting branch...${NC}"

    # Check if branch is merged
    if git branch --merged | grep -q "$BRANCH_NAME"; then
        git branch -d "$BRANCH_NAME"
        echo -e "  ${GREEN}✓${NC} Branch deleted (was merged)"
    else
        echo -e "${YELLOW}⚠️  Branch is not fully merged${NC}"
        read -p "Force delete anyway? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D "$BRANCH_NAME"
            echo -e "  ${GREEN}✓${NC} Branch force-deleted"
        else
            echo -e "  ${YELLOW}⚠️${NC}  Branch preserved"
        fi
    fi

    # Optionally delete remote branch
    if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
        echo ""
        echo -e "${YELLOW}Branch exists on remote 'origin'${NC}"
        read -p "Delete remote branch too? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push origin --delete "$BRANCH_NAME"
            echo -e "  ${GREEN}✓${NC} Remote branch deleted"
        fi
    fi
fi

# ============================================================================
# COMPLETION
# ============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ WORKTREE CLEANUP COMPLETE ✅               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  ${GREEN}✓${NC} Worktree removed: ${CYAN}$WORKTREE_PATH${NC}"

if [ "$DELETE_BRANCH" = true ]; then
    echo -e "  ${GREEN}✓${NC} Branch deleted: ${CYAN}$BRANCH_NAME${NC}"
else
    echo -e "  ${YELLOW}ℹ${NC}  Branch preserved: ${CYAN}$BRANCH_NAME${NC}"
fi

echo ""
echo -e "${GREEN}Done! 🎉${NC}"
