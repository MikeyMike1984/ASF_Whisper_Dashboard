#!/bin/bash
################################################################################
# WORKTREE AUTOMATION SCRIPT
# Purpose: Spawn isolated agent environments with unique ports and configs
# Usage: ./scripts/setup-worktree.sh <branch-name> [base-branch]
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
BASE_BRANCH="${2:-main}"

if [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}❌ Error: Branch name is required${NC}"
    echo ""
    echo "Usage: $0 <branch-name> [base-branch]"
    echo ""
    echo "Examples:"
    echo "  $0 feature/user-auth"
    echo "  $0 feature/user-auth develop"
    echo "  $0 bugfix/login-validation main"
    exit 1
fi

# ============================================================================
# ENVIRONMENT DETECTION
# ============================================================================
echo -e "${BLUE}🔍 Detecting repository structure...${NC}"

# Find the repository root (where .bare exists)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Check if .bare exists
if [ ! -d "$REPO_ROOT/.bare" ]; then
    echo -e "${RED}❌ Error: .bare repository not found in $REPO_ROOT${NC}"
    echo -e "${YELLOW}💡 Hint: Run init_forge.sh first to initialize the Forge environment${NC}"
    exit 1
fi

# Determine worktree path (sibling to repo root)
WORKTREE_PATH="$REPO_ROOT/$BRANCH_NAME"

echo -e "  ${GREEN}✓${NC} Repository root: ${CYAN}$REPO_ROOT${NC}"
echo -e "  ${GREEN}✓${NC} Target worktree: ${CYAN}$WORKTREE_PATH${NC}"

# ============================================================================
# GIT WORKTREE CREATION
# ============================================================================
echo ""
echo -e "${BLUE}🔨 Forging new worktree: ${YELLOW}$BRANCH_NAME${NC}"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Worktree already exists at $WORKTREE_PATH${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  Removing existing worktree...${NC}"
        git worktree remove "$WORKTREE_PATH" --force || true
        rm -rf "$WORKTREE_PATH"
    else
        echo -e "${BLUE}ℹ️  Using existing worktree${NC}"
        cd "$WORKTREE_PATH"
        exit 0
    fi
fi

# Check if branch exists locally or remotely
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    # Branch exists locally
    echo -e "  ${GREEN}✓${NC} Branch ${YELLOW}$BRANCH_NAME${NC} exists locally"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
elif git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
    # Branch exists remotely
    echo -e "  ${GREEN}✓${NC} Branch ${YELLOW}$BRANCH_NAME${NC} exists on remote"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
    # Create new branch
    echo -e "  ${BLUE}ℹ️${NC} Creating new branch ${YELLOW}$BRANCH_NAME${NC} from ${YELLOW}$BASE_BRANCH${NC}"
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"
fi

echo -e "${GREEN}✅ Worktree created successfully${NC}"

# ============================================================================
# ENVIRONMENT HYDRATION
# ============================================================================
echo ""
echo -e "${BLUE}⚙️  Hydrating environment...${NC}"

cd "$WORKTREE_PATH" || exit 1

# --- Symlink Memory Bank (Shared Truth) ---
# CRITICAL: Memory Bank MUST be a symlink/junction to maintain Semantic Continuity
# A copy would cause "Semantic Drift" between parallel agents
if [ ! -L "memory-bank" ] && [ ! -d "memory-bank" ]; then
    echo -e "  ${CYAN}→${NC} Linking Memory Bank (Shared Truth)..."

    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows: Try junction first (works without admin), then directory symlink
        WIN_REPO_ROOT=$(echo "$REPO_ROOT" | sed 's|/|\\|g')
        WIN_TARGET="${WIN_REPO_ROOT}\\memory-bank"

        if cmd //c "mklink /J memory-bank \"$WIN_TARGET\"" 2>/dev/null; then
            echo -e "    ${GREEN}✓${NC} memory-bank/ → ${CYAN}$REPO_ROOT/memory-bank${NC} (junction)"
        elif cmd //c "mklink /D memory-bank \"$WIN_TARGET\"" 2>/dev/null; then
            echo -e "    ${GREEN}✓${NC} memory-bank/ → ${CYAN}$REPO_ROOT/memory-bank${NC} (symlink)"
        else
            # HARD FAIL - Do not silently copy as it breaks Semantic Continuity
            echo ""
            echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${RED}║  ❌ CRITICAL: MEMORY BANK SYMLINK FAILED                       ║${NC}"
            echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${YELLOW}The Autonomous Software Forge requires symlinks/junctions to maintain${NC}"
            echo -e "${YELLOW}Semantic Continuity across parallel worktrees.${NC}"
            echo ""
            echo -e "${BLUE}Without symlinks, each worktree would have a COPY of the Memory Bank,${NC}"
            echo -e "${BLUE}causing 'Semantic Drift' where agents' knowledge diverges.${NC}"
            echo ""
            echo -e "${GREEN}To fix this, choose ONE of the following options:${NC}"
            echo ""
            echo "  ${YELLOW}Option 1: Enable Developer Mode (Recommended)${NC}"
            echo "    1. Open Windows Settings"
            echo "    2. Go to: Privacy & Security → For Developers"
            echo "    3. Enable 'Developer Mode'"
            echo "    4. Re-run this script"
            echo ""
            echo "  ${YELLOW}Option 2: Run as Administrator${NC}"
            echo "    1. Right-click Git Bash → 'Run as Administrator'"
            echo "    2. Re-run this script"
            echo ""
            echo "  ${YELLOW}Option 3: Use WSL (Windows Subsystem for Linux)${NC}"
            echo "    1. Install WSL: wsl --install"
            echo "    2. Run this script from within WSL"
            echo ""
            echo -e "${RED}Worktree creation aborted to prevent Semantic Drift.${NC}"
            echo ""

            # Clean up the partially created worktree
            cd "$REPO_ROOT"
            git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
            rm -rf "$WORKTREE_PATH" 2>/dev/null || true

            exit 1
        fi
    else
        # Unix/Mac: Standard symlink
        ln -s "$REPO_ROOT/memory-bank" ./memory-bank
        echo -e "    ${GREEN}✓${NC} memory-bank/ → ${CYAN}$REPO_ROOT/memory-bank${NC}"
    fi
elif [ -L "memory-bank" ]; then
    echo -e "  ${GREEN}✓${NC} Memory Bank symlink already exists"
elif [ -d "memory-bank" ]; then
    # Check if it's a real directory (copy) vs junction - warn about potential drift
    echo -e "  ${YELLOW}⚠${NC}  Memory Bank exists as directory (not symlink)"
    echo -e "  ${YELLOW}⚠${NC}  WARNING: This may cause Semantic Drift if it's a copy"
    echo -e "  ${YELLOW}💡${NC} Consider removing and re-running setup to create proper symlink"
fi

# --- Copy Shared Configs ---
echo -e "  ${CYAN}→${NC} Copying shared configurations..."

configs=(
    ".editorconfig"
    ".clinerules"
    ".prettierrc"
    ".eslintrc.json"
)

for config in "${configs[@]}"; do
    if [ -f "$REPO_ROOT/shared-config/$config" ]; then
        cp "$REPO_ROOT/shared-config/$config" "./$config"
        echo -e "    ${GREEN}✓${NC} $config"
    fi
done

# --- Generate .env with Unique Ports ---
echo -e "  ${CYAN}→${NC} Generating .env with unique ports..."

# Calculate port offset using hash of branch name
WT_HASH=$(echo -n "$BRANCH_NAME" | cksum | cut -d ' ' -f 1)
PORT_OFFSET=$((WT_HASH % 1000))

# Function to check if a port is available
is_port_available() {
    local port=$1

    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows (Git Bash) - use netstat
        if command -v netstat &> /dev/null; then
            if netstat -an 2>/dev/null | grep -q ":$port "; then
                return 1  # Port in use
            fi
        fi
    elif command -v lsof &> /dev/null; then
        # Unix/Mac - use lsof
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 1  # Port in use
        fi
    elif command -v ss &> /dev/null; then
        # Linux alternative - use ss
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            return 1  # Port in use
        fi
    fi

    return 0  # Port available (or unable to check)
}

# Function to find an available port starting from base
find_available_port() {
    local base_port=$1
    local max_attempts=100
    local port=$base_port

    for ((i=0; i<max_attempts; i++)); do
        if is_port_available $port; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done

    # Fallback to original calculated port if no available port found
    echo $base_port
    return 1
}

# Calculate base ports
BASE_APP_PORT=$((3000 + PORT_OFFSET))
BASE_DB_PORT=$((5432 + PORT_OFFSET))
BASE_REDIS_PORT=$((6379 + PORT_OFFSET))

# Find available ports (with fallback)
APP_PORT=$(find_available_port $BASE_APP_PORT)
DB_PORT=$(find_available_port $BASE_DB_PORT)
REDIS_PORT=$(find_available_port $BASE_REDIS_PORT)

# Copy template and replace placeholders
if [ -f "$REPO_ROOT/shared-config/.env.template" ]; then
    cp "$REPO_ROOT/shared-config/.env.template" ./.env

    # Use sed to replace port numbers
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed requires empty string after -i
        sed -i '' "s/PORT=3000/PORT=$APP_PORT/" .env
        sed -i '' "s/DB_PORT=5432/DB_PORT=$DB_PORT/" .env
        sed -i '' "s/REDIS_PORT=6379/REDIS_PORT=$REDIS_PORT/" .env
    else
        # Linux/Windows sed
        sed -i "s/PORT=3000/PORT=$APP_PORT/" .env
        sed -i "s/DB_PORT=5432/DB_PORT=$DB_PORT/" .env
        sed -i "s/REDIS_PORT=6379/REDIS_PORT=$REDIS_PORT/" .env
    fi

    echo -e "    ${GREEN}✓${NC} APP_PORT=${YELLOW}$APP_PORT${NC}"
    echo -e "    ${GREEN}✓${NC} DB_PORT=${YELLOW}$DB_PORT${NC}"
    echo -e "    ${GREEN}✓${NC} REDIS_PORT=${YELLOW}$REDIS_PORT${NC}"
else
    echo -e "    ${YELLOW}⚠️${NC}  .env.template not found, skipping .env generation"
fi

# --- Initialize Local Recitation Memory ---
echo -e "  ${CYAN}→${NC} Initializing local context memory..."

mkdir -p .claude

cat > .claude/activeContext.md <<EOF
# Active Context for \`$BRANCH_NAME\`

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")

---

## Current Objective
[Describe the purpose of this worktree/branch]

---

## Infrastructure Configuration
- **Branch**: \`$BRANCH_NAME\`
- **Base Branch**: \`$BASE_BRANCH\`
- **App Port**: \`$APP_PORT\`
- **DB Port**: \`$DB_PORT\`
- **Redis Port**: \`$REDIS_PORT\`

---

## Operational Recitation (The "Todo.md" Loop)

### Phase 1: Analysis
- [ ] Read relevant Memory Bank files
  - [ ] \`memory-bank/projectbrief.md\`
  - [ ] \`memory-bank/systemPatterns.md\`
- [ ] Map dependency graph of affected files
- [ ] Identify integration points

### Phase 2: Planning
- [ ] Create detailed implementation plan
- [ ] Review plan against \`systemPatterns.md\`
- [ ] Identify potential risks
- [ ] Get user approval (if needed)

### Phase 3: Execution (TDD Loop)
- [ ] Write failing test
- [ ] Implement minimal code to pass test
- [ ] Refactor while keeping tests green
- [ ] Run full test suite

### Phase 4: Verification
- [ ] Lint check (\`npm run lint\`)
- [ ] Type check (\`npm run type-check\`)
- [ ] Build check (\`npm run build\`)
- [ ] Manual testing

### Phase 5: Integration
- [ ] Update Memory Bank if architecture changed
- [ ] Commit with conventional commit message
- [ ] Push to remote
- [ ] Create PR (if required)

---

## Open Questions / Blockers
1. [Question 1?]
2. [Question 2?]

---

## Notes
- [Any important context or decisions made during this session]

---

**Last Updated**: $(date +"%Y-%m-%d %H:%M:%S")
EOF

echo -e "    ${GREEN}✓${NC} .claude/activeContext.md created"

# --- Create basic source structure if needed ---
if [ ! -d "src" ]; then
    echo -e "  ${CYAN}→${NC} Creating source directory structure..."
    mkdir -p src
    echo -e "    ${GREEN}✓${NC} src/"
fi

if [ ! -d "tests" ]; then
    mkdir -p tests
    echo -e "    ${GREEN}✓${NC} tests/"
fi

# ============================================================================
# COMPLETION
# ============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ WORKTREE READY FOR DEPLOYMENT ✅           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ${CYAN}Branch${NC}      : ${YELLOW}$BRANCH_NAME${NC}"
echo -e "  ${CYAN}Location${NC}    : ${YELLOW}$WORKTREE_PATH${NC}"
echo -e "  ${CYAN}App Port${NC}    : ${YELLOW}$APP_PORT${NC}"
echo -e "  ${CYAN}DB Port${NC}     : ${YELLOW}$DB_PORT${NC}"
echo -e "  ${CYAN}Redis Port${NC}  : ${YELLOW}$REDIS_PORT${NC}"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "  1. Navigate to worktree:"
echo "     ${YELLOW}cd $WORKTREE_PATH${NC}"
echo ""
echo "  2. Install dependencies (if needed):"
echo "     ${YELLOW}npm install${NC}"
echo ""
echo "  3. Start Claude agent:"
echo "     ${YELLOW}claude${NC}"
echo ""
echo "  4. Begin with memory ingestion:"
echo "     Read ${YELLOW}memory-bank/projectbrief.md${NC} and ${YELLOW}memory-bank/systemPatterns.md${NC}"
echo ""
echo "  5. Update your active context:"
echo "     Edit ${YELLOW}.claude/activeContext.md${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
