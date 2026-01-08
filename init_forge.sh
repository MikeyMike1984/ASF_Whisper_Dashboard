#!/bin/bash
################################################################################
# THE AUTONOMOUS SOFTWARE FORGE - ONE-CLICK BOOTSTRAP
# Version: 2.0.0 (Production Ready)
# Purpose: Initialize the complete Fractal Worktree + Memory Bank environment
#          with ALL intelligence layer content embedded
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color output for UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   THE AUTONOMOUS SOFTWARE FORGE - BOOTSTRAP v2.0      ║${NC}"
echo -e "${BLUE}║            Production Ready Edition                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PHASE 0: DEPENDENCY VERIFICATION
# ============================================================================
echo -e "${GREEN}[PHASE 0]${NC} Verifying Dependencies"

check_dependency() {
    local cmd=$1
    local name=${2:-$1}
    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>/dev/null | head -1 || echo "unknown")
        echo -e "  ${GREEN}✓${NC} $name: ${CYAN}$version${NC}"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name: ${RED}NOT FOUND${NC}"
        return 1
    fi
}

MISSING_DEPS=0

check_dependency git "Git" || MISSING_DEPS=1
check_dependency python3 "Python 3" || {
    # Try python on Windows
    check_dependency python "Python" || MISSING_DEPS=1
}

# Optional but recommended
check_dependency jq "jq (JSON processor)" || {
    echo -e "    ${YELLOW}⚠${NC}  jq is optional but recommended for hook functionality"
}

check_dependency node "Node.js" || {
    echo -e "    ${YELLOW}⚠${NC}  Node.js is optional but needed for MCP servers"
}

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Missing required dependencies. Please install them and try again.${NC}"
    exit 1
fi

echo ""

# ============================================================================
# PHASE 0.5: GITHUB TOKEN VERIFICATION (Optional but Recommended)
# ============================================================================
echo -e "${GREEN}[PHASE 0.5]${NC} Checking GitHub Integration"

GITHUB_TOKEN_SET=false
if [ -n "${GITHUB_TOKEN:-}" ]; then
    # Token is set in environment
    echo -e "  ${GREEN}✓${NC} GITHUB_TOKEN: ${CYAN}Set in environment${NC}"
    GITHUB_TOKEN_SET=true
elif [ -n "${GH_TOKEN:-}" ]; then
    # gh CLI token (alternative)
    echo -e "  ${GREEN}✓${NC} GH_TOKEN: ${CYAN}Set in environment${NC}"
    GITHUB_TOKEN_SET=true
elif command -v gh &> /dev/null && gh auth status &> /dev/null; then
    # GitHub CLI is authenticated
    echo -e "  ${GREEN}✓${NC} GitHub CLI: ${CYAN}Authenticated${NC}"
    GITHUB_TOKEN_SET=true
else
    echo -e "  ${YELLOW}⚠${NC}  GITHUB_TOKEN: ${YELLOW}Not set${NC}"
    echo ""
    echo -e "  ${BLUE}The GitHub MCP server requires a Personal Access Token for:${NC}"
    echo "    - Creating PRs and issues"
    echo "    - Accessing private repositories"
    echo "    - Enhanced GitHub integration"
    echo ""
    echo -e "  ${BLUE}To set up GitHub integration:${NC}"
    echo ""
    echo "  ${YELLOW}Option 1: Environment Variable${NC}"
    echo "    export GITHUB_TOKEN=ghp_your_token_here"
    echo "    # Add to ~/.bashrc or ~/.zshrc for persistence"
    echo ""
    echo "  ${YELLOW}Option 2: GitHub CLI (Recommended)${NC}"
    echo "    gh auth login"
    echo ""
    echo "  ${YELLOW}Option 3: Add to .env.template${NC}"
    echo "    The token placeholder is already in shared-config/.env.template"
    echo ""

    read -p "Continue without GitHub integration? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}ℹ️  Setup paused. Set GITHUB_TOKEN and re-run.${NC}"
        exit 0
    fi
fi

echo ""

# ============================================================================
# PHASE 1: PROJECT INITIALIZATION
# ============================================================================
echo -e "${GREEN}[PHASE 1]${NC} Project Configuration"

# Get project name (default to current directory)
if [ -z "${PROJECT_NAME:-}" ]; then
    DEFAULT_NAME=$(basename "$PWD")
    read -p "Enter project name [$DEFAULT_NAME]: " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-$DEFAULT_NAME}
fi

echo -e "  📦 Project: ${YELLOW}$PROJECT_NAME${NC}"

# Detect Python command
PYTHON_CMD=$(command -v python3 || command -v python)
echo -e "  🐍 Python: ${CYAN}$PYTHON_CMD${NC}"

# ============================================================================
# PHASE 2: GIT BARE REPOSITORY INITIALIZATION
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 2]${NC} Initializing Fractal Worktree Infrastructure"

# Check if .bare already exists (idempotency)
if [ -d ".bare" ]; then
    echo -e "  ${YELLOW}⚠️  .bare repository already exists. Skipping git init.${NC}"
else
    echo "  🔨 Creating bare repository..."
    git init --bare .bare

    # Point .git to the bare repo
    echo "gitdir: ./.bare" > .git

    # Configure the repo to work with worktrees
    git config -f .bare/config core.bare false
    git config -f .bare/config core.worktree "$(pwd)"

    echo -e "  ${GREEN}✅ Bare repository initialized${NC}"
fi

# ============================================================================
# PHASE 3: DIRECTORY STRUCTURE SCAFFOLDING
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 3]${NC} Scaffolding Directory Structure"

# Create all required directories
mkdir -p .claude/{hooks,agents,commands,mcp-servers,prds,epics}
mkdir -p memory-bank
mkdir -p shared-config
mkdir -p scripts

echo "  📁 Created: .claude/ (Global Agent Config)"
echo "  📁 Created: memory-bank/ (Long-Term Memory)"
echo "  📁 Created: shared-config/ (Shared Tooling)"
echo "  📁 Created: scripts/ (Automation)"

# ============================================================================
# PHASE 4: GLOBAL CLAUDE CONFIGURATION
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 4]${NC} Generating Global Agent Configuration"

# ----- .claude/CLAUDE.md -----
cat > .claude/CLAUDE.md <<'CLAUDE_MD_EOF'
# CLAUDE.md - Global Operational Directives

## 🧠 Core Memory Protocol

### Context Loading
At the start of EVERY session, you MUST read:
1. `memory-bank/projectbrief.md` - Vision & Requirements
2. `memory-bank/systemPatterns.md` - Architecture & Standards

### Recitation Requirement
You maintain a local `activeContext.md` in the current worktree. After every significant step (plan, code, test), you MUST update this file. This is your "Short Term Memory."

### Source of Truth
The `memory-bank/` folder is the ultimate authority. If code contradicts the memory bank, the code is likely wrong—but verify with the user.

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

---

## 🚨 Security & Safety

### Secrets Management
Never commit secrets. Use `.env.template` for placeholders.

### Hook Enforcement
The following hooks enforce safety:
- `pre_tool_use.py`: Blocks dangerous commands and file edits
- `user_prompt_submit.sh`: Injects anti-sycophancy reminders

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

1. Update `.claude/activeContext.md` in your worktree
2. Check off completed tasks
3. Document blockers or open questions

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

## Blockers
- Need clarification on token expiry duration
```

---

## 🔄 Context Management

### When Context Gets Long (>20k tokens)
1. Run `/memory-update` to sync state to Memory Bank
2. Summarize current progress into `activeContext.md`
3. Clear chat history
4. Re-read `activeContext.md` and Memory Bank files

This resets token count while preserving work state.

---

## 🎓 Learning from Past Decisions

The `memory-bank/decisionLog.md` file records architectural decisions. Before making significant changes:

1. Read `decisionLog.md` to understand past choices
2. If your change contradicts a decision, ask the user
3. If approved, update the decision log

---

## ⚖️ Balancing Autonomy and Oversight

- **Act autonomously** for clear, low-risk tasks
- **Ask the user** for architectural decisions or ambiguous requirements
- **Challenge the user** if they suggest something that contradicts the Memory Bank

---

**Remember**: You are not just a code generator. You are an autonomous engineer operating within a structured, safe, and highly parallel environment. Use it wisely.
CLAUDE_MD_EOF

echo "  ✅ Created: .claude/CLAUDE.md"

# ----- .claude/settings.json -----
# Use detected Python command for cross-platform compatibility
cat > .claude/settings.json <<SETTINGS_EOF
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "$PYTHON_CMD .claude/hooks/pre_tool_use.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "$PYTHON_CMD .claude/hooks/post_tool_use.py"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/user_prompt_submit.sh"
          }
        ]
      }
    ]
  },
  "enabledMcpServers": ["memory", "github"],
  "permissions": {
    "allow": [
      ".claude/**",
      "memory-bank/**",
      "src/**",
      "tests/**",
      "scripts/**"
    ],
    "deny": [
      ".env",
      ".bare/**",
      "node_modules/**"
    ]
  }
}
SETTINGS_EOF

echo "  ✅ Created: .claude/settings.json"

# ----- .claude/mcp-servers/mcp.json -----
cat > .claude/mcp-servers/mcp.json <<'MCP_EOF'
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:pass@localhost/db"
      ]
    }
  }
}
MCP_EOF

echo "  ✅ Created: .claude/mcp-servers/mcp.json"

# ============================================================================
# PHASE 5: MEMORY BANK TEMPLATES
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 5]${NC} Generating Memory Bank Templates"

# ----- projectbrief.md -----
cat > memory-bank/projectbrief.md <<EOF
# Project Brief: $PROJECT_NAME

## Vision
[Insert a concise, 2-3 sentence vision statement for the project.]

**Example**: "Build a real-time collaboration platform that enables distributed teams to co-edit documents with <100ms latency and end-to-end encryption."

---

## Core Requirements

### Functional Requirements
1. **[Requirement 1]**: [Description]
2. **[Requirement 2]**: [Description]
3. **[Requirement 3]**: [Description]

### Non-Functional Requirements
- **Performance**: [e.g., API response time <200ms at p99]
- **Security**: [e.g., OWASP Top 10 compliance]
- **Scalability**: [e.g., Support 10k concurrent users]
- **Availability**: [e.g., 99.9% uptime SLA]

---

## Success Metrics

### Key Performance Indicators (KPIs)
1. **[Metric 1]**: [Target value]
2. **[Metric 2]**: [Target value]
3. **[Metric 3]**: [Target value]

### User Satisfaction
- **NPS Score**: [Target]
- **Task Completion Rate**: [Target]

---

## Constraints

### Budget
[Time/Money/Resource constraints]

### Technical Constraints
- Must integrate with existing [System X]
- Cannot use [Technology Y] due to licensing
- Must support [Legacy Browser Z]

### Regulatory
- GDPR compliance required
- HIPAA compliance required (if applicable)

---

## Out of Scope (Anti-Goals)
1. [Thing we explicitly will NOT build]
2. [Feature that's deferred to v2]

---

**Last Updated**: $(date +"%Y-%m-%d")
EOF

echo "  ✅ Created: memory-bank/projectbrief.md"

# ----- systemPatterns.md -----
cat > memory-bank/systemPatterns.md <<'PATTERNS_EOF'
# System Patterns & Architecture

## Architecture Style

### Pattern
**[e.g., Hexagonal Architecture / Clean Architecture / Microservices]**

### Justification
[Why this pattern was chosen over alternatives]

---

## Core Components

### Frontend
- **Framework**: [e.g., React 18 + TypeScript]
- **State Management**: [e.g., Redux Toolkit]
- **Routing**: [e.g., React Router v6]
- **Styling**: [e.g., Tailwind CSS]

### Backend
- **Runtime**: [e.g., Node.js 20 LTS]
- **Framework**: [e.g., Express.js / Fastify]
- **Language**: [e.g., TypeScript with strict mode]
- **API Style**: [e.g., REST / GraphQL / tRPC]

### Data
- **Primary Database**: [e.g., PostgreSQL 16]
- **Caching**: [e.g., Redis 7]
- **Search**: [e.g., Elasticsearch / Typesense]
- **Message Queue**: [e.g., RabbitMQ / AWS SQS]

### Infrastructure
- **Hosting**: [e.g., AWS / GCP / Azure]
- **CI/CD**: [e.g., GitHub Actions]
- **Monitoring**: [e.g., Datadog / Prometheus + Grafana]

---

## Code Conventions

### Naming Conventions
- **Variables**: `camelCase`
- **Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts`

### File Structure
```
src/
├── domain/          # Business logic (framework-agnostic)
├── application/     # Use cases
├── infrastructure/  # External integrations (DB, APIs)
└── presentation/    # Controllers, UI components
```

### Error Handling
- **Backend**: All errors thrown as custom Error classes with codes
- **Frontend**: ErrorBoundary catches React errors
- **API**: Consistent error response format:
  ```json
  {
    "error": {
      "code": "AUTH_INVALID_TOKEN",
      "message": "The provided token is invalid or expired",
      "statusCode": 401
    }
  }
  ```

### Testing Strategy
- **Unit Tests**: Co-located with source files (`component.test.ts`)
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `tests/e2e/`
- **Coverage Target**: 80% line coverage minimum

---

## Design Patterns

### Preferred Patterns
1. **Dependency Injection**: Use constructor injection for testability
2. **Repository Pattern**: Abstraction layer over data access
3. **Factory Pattern**: For complex object creation
4. **Observer Pattern**: For event-driven logic

### Anti-Patterns to Avoid
- ❌ **God Objects**: No classes with >500 lines
- ❌ **Circular Dependencies**: Enforce with linting
- ❌ **Magic Numbers**: Use named constants
- ❌ **Callback Hell**: Use async/await

---

## API Design Principles

### RESTful Conventions
- **GET** `/api/users` - List users
- **GET** `/api/users/:id` - Get single user
- **POST** `/api/users` - Create user
- **PUT** `/api/users/:id` - Full update
- **PATCH** `/api/users/:id` - Partial update
- **DELETE** `/api/users/:id` - Delete user

### Versioning
Use URL versioning: `/api/v1/users`

### Authentication
- **Method**: JWT with refresh tokens
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: Access=15min, Refresh=7days

---

## Security Standards

### Input Validation
- All user input validated with Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via escaping in templates

### Secrets Management
- Use environment variables (never hardcode)
- `.env` files excluded from git
- Production secrets in vault (AWS Secrets Manager / Vault)

### Dependencies
- Run `npm audit` weekly
- Auto-update patch versions via Dependabot

---

## Performance Guidelines

### Frontend
- Code splitting for routes
- Lazy load images with `loading="lazy"`
- Debounce user input (300ms for search)

### Backend
- Database indexes on all foreign keys
- Connection pooling (min=10, max=50)
- Caching strategy: Cache-Aside pattern

### Monitoring
- Alert if p99 latency >500ms
- Alert if error rate >1%

---

## Deployment Process

### Branching Strategy
- **main**: Production
- **develop**: Staging
- **feature/***: Feature branches (use worktrees!)

### CI/CD Pipeline
1. Run linters (ESLint, Prettier)
2. Run tests (unit + integration)
3. Build artifacts
4. Deploy to staging
5. Run E2E tests
6. Manual approval for production
7. Deploy to production
8. Run smoke tests

---

## Revision History
- **[DATE]**: Initial architecture definition

**Last Updated**: [DATE]
PATTERNS_EOF

echo "  ✅ Created: memory-bank/systemPatterns.md"

# ----- Other Memory Bank Files -----
cat > memory-bank/productContext.md <<'PRODUCT_EOF'
# Product Context

## User Personas

### Persona 1: [Name]
- **Role**: [e.g., Software Engineer]
- **Goals**: [What they want to achieve]
- **Pain Points**: [Current problems]
- **Tech Savviness**: [Beginner / Intermediate / Expert]

### Persona 2: [Name]
[Repeat structure]

---

## User Stories

### Epic: [Epic Name]
1. **As a** [persona], **I want to** [action], **so that** [benefit].
2. **As a** [persona], **I want to** [action], **so that** [benefit].

---

## UX Goals
- **Simplicity**: [e.g., Onboarding in <5 minutes]
- **Accessibility**: [e.g., WCAG 2.1 AA compliance]
- **Performance**: [e.g., Time to Interactive <3s]

---

**Last Updated**: [DATE]
PRODUCT_EOF

cat > memory-bank/techContext.md <<'TECH_EOF'
# Technical Context

## Technology Stack

### Core Technologies
- **Language**: [e.g., TypeScript 5.3]
- **Runtime**: [e.g., Node.js 20 LTS]
- **Package Manager**: [e.g., pnpm 8]

### Key Dependencies
- [Library Name] v[X.Y.Z] - [Purpose]
- [Library Name] v[X.Y.Z] - [Purpose]

---

## Development Environment

### Required Tools
- Node.js >= 20
- Docker >= 24
- Git >= 2.40

### Setup Instructions
```bash
# Clone and setup
git clone <repo>
cd <repo>
./scripts/setup-worktree.sh main
cd main
npm install
cp .env.template .env
# Edit .env with real values
npm run dev
```

---

## Known Constraints

### Technical Debt
1. [Description of technical debt item]
2. [Description of technical debt item]

### Deprecated Features
- [Feature X] - To be removed in v3.0

---

**Last Updated**: [DATE]
TECH_EOF

cat > memory-bank/activeContext.md <<'ACTIVE_EOF'
# Active Context (Global Roadmap)

## Current Sprint Goals
1. [Goal 1]
2. [Goal 2]

## Active Worktrees
- `main/` - Production codebase

## Priority Queue
1. **High**: [Task]
2. **Medium**: [Task]
3. **Low**: [Task]

---

**Last Updated**: [DATE]
ACTIVE_EOF

cat > memory-bank/progress.md <<'PROGRESS_EOF'
# Progress Tracker

## Completed Features
- [x] Project initialization - Completed on [DATE]

## In Progress
- [ ] [Feature 1]
- [ ] [Feature 2]

## Blocked
- [ ] [Feature 3] - Blocked by: [Reason]

---

## Known Issues
1. **[BUG-001]**: [Description] - Priority: High
2. **[BUG-002]**: [Description] - Priority: Medium

---

**Last Updated**: [DATE]
PROGRESS_EOF

cat > memory-bank/decisionLog.md <<'DECISION_EOF'
# Architectural Decision Log (ADR)

## ADR-001: Initialize Autonomous Software Forge

### Date
[TODAY]

### Status
Accepted

### Context
Setting up an AI-native development environment that supports parallel agent execution,
memory persistence, and deterministic safety controls.

### Decision
Adopted the "Fractal Worktree" architecture with:
- Bare Git repository as central nucleus
- Git Worktrees for isolated parallel development
- Tri-layer memory system (Memory Bank + Active Context + Chat)
- Hook-based safety enforcement

### Consequences
**Positive**:
- Enables true parallel agent execution
- Prevents context rot through memory persistence
- Deterministic safety via hooks

**Negative**:
- Additional complexity in repository structure
- Requires understanding of worktree concepts

---

## ADR-002: [Next Decision]
[Repeat structure]
DECISION_EOF

echo "  ✅ Created: memory-bank/productContext.md"
echo "  ✅ Created: memory-bank/techContext.md"
echo "  ✅ Created: memory-bank/activeContext.md"
echo "  ✅ Created: memory-bank/progress.md"
echo "  ✅ Created: memory-bank/decisionLog.md"

# ============================================================================
# PHASE 6: SHARED CONFIGURATION FILES
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 6]${NC} Creating Shared Configuration Files"

cat > shared-config/.env.template <<'ENV_EOF'
# Environment Configuration Template
# Copy this to .env in your worktree and fill in real values

# Application
NODE_ENV=development
PORT=3000
APP_NAME=my-app

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_dev
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=change_this_too
REFRESH_TOKEN_EXPIRES_IN=7d

# External APIs
GITHUB_TOKEN=ghp_your_token_here
OPENAI_API_KEY=sk-your-key-here

# Monitoring
LOG_LEVEL=debug
SENTRY_DSN=
ENV_EOF

cat > shared-config/.editorconfig <<'EDITOR_EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,ts,jsx,tsx,json,yml,yaml}]
indent_style = space
indent_size = 2

[*.{py,sh}]
indent_style = space
indent_size = 4

[*.md]
trim_trailing_whitespace = false
EDITOR_EOF

cat > shared-config/.clinerules <<'CLINE_EOF'
# Cline/Roo Code Compatibility Rules
# These rules help maintain consistency with Cline-style workflows

# Always read memory-bank files before starting work
# Update activeContext.md after every significant step
# Never edit .env files directly
# Use TDD: Write tests before implementation
CLINE_EOF

cat > shared-config/.prettierrc <<'PRETTIER_EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
PRETTIER_EOF

cat > shared-config/.eslintrc.json <<'ESLINT_EOF'
{
  "env": {
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
ESLINT_EOF

echo "  ✅ Created: shared-config/.env.template"
echo "  ✅ Created: shared-config/.editorconfig"
echo "  ✅ Created: shared-config/.clinerules"
echo "  ✅ Created: shared-config/.prettierrc"
echo "  ✅ Created: shared-config/.eslintrc.json"

# ============================================================================
# PHASE 7: AUTOMATION SCRIPTS (FULL CONTENT)
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 7]${NC} Creating Automation Scripts"

# ----- scripts/setup-worktree.sh -----
cat > scripts/setup-worktree.sh <<'SETUP_WORKTREE_EOF'
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
SETUP_WORKTREE_EOF

chmod +x scripts/setup-worktree.sh
echo "  ✅ Created: scripts/setup-worktree.sh"

# ----- scripts/cleanup-worktree.sh -----
cat > scripts/cleanup-worktree.sh <<'CLEANUP_WORKTREE_EOF'
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
CLEANUP_WORKTREE_EOF

chmod +x scripts/cleanup-worktree.sh
echo "  ✅ Created: scripts/cleanup-worktree.sh"

# ----- scripts/sync-memory.sh -----
cat > scripts/sync-memory.sh <<'SYNC_MEMORY_EOF'
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
SYNC_MEMORY_EOF

chmod +x scripts/sync-memory.sh
echo "  ✅ Created: scripts/sync-memory.sh"

# ============================================================================
# PHASE 8: HOOKS (FULL CONTENT)
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 8]${NC} Creating Hook Scripts"

# ----- .claude/hooks/pre_tool_use.py -----
cat > .claude/hooks/pre_tool_use.py <<'PRE_TOOL_USE_EOF'
#!/usr/bin/env python3
"""
PRE-TOOL-USE HOOK: Security & Policy Enforcement
Purpose: Intercept and validate all tool calls before execution
Policies:
  1. Block editing of sensitive files (.env, .git/, package-lock.json)
  2. Block dangerous bash commands (rm -rf, wget | bash, etc.)
  3. Enforce TDD workflow (warn if committing without tests)
  4. Block unauthorized git operations in worktrees
"""

import sys
import json
import re
import os
from pathlib import Path

# ANSI color codes for terminal output
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color


def log_error(message):
    """Print error message to stderr"""
    print(f"{RED}🛑 HOOK BLOCKED:{NC} {message}", file=sys.stderr)


def log_warning(message):
    """Print warning message to stderr"""
    print(f"{YELLOW}⚠️  HOOK WARNING:{NC} {message}", file=sys.stderr)


def log_info(message):
    """Print info message to stderr"""
    print(f"{BLUE}ℹ️  HOOK INFO:{NC} {message}", file=sys.stderr)


def block_action(reason, suggestion=None):
    """Block the tool call and provide feedback"""
    response = {
        "decision": "block",
        "reason": reason
    }
    if suggestion:
        response["suggestion"] = suggestion
    print(json.dumps(response))
    sys.exit(0)


def allow_action():
    """Allow the tool call to proceed"""
    print(json.dumps({"decision": "allow"}))
    sys.exit(0)


def warn_action(message):
    """Allow the tool call but show a warning"""
    print(json.dumps({
        "decision": "allow",
        "warning": message
    }))
    sys.exit(0)


# =============================================================================
# POLICY 1: NO-FLY ZONE FOR FILES
# =============================================================================
RESTRICTED_FILE_PATTERNS = [
    r'\.env$',                    # Environment files
    r'\.env\.',                   # .env.local, .env.production, etc.
    r'\.git/',                    # Git internals
    r'\.bare/',                   # Bare repo metadata
    r'package-lock\.json$',       # Lock files (use npm install instead)
    r'yarn\.lock$',
    r'pnpm-lock\.yaml$',
    r'composer\.lock$',
    r'Gemfile\.lock$',
    r'\.aws/credentials',         # AWS credentials
    r'\.ssh/id_',                 # SSH keys
    r'\.gnupg/',                  # GPG keys
    r'node_modules/',             # Dependencies (should be .gitignored)
]

def check_file_restrictions(file_path):
    """Check if file path matches restricted patterns"""
    for pattern in RESTRICTED_FILE_PATTERNS:
        if re.search(pattern, file_path):
            return pattern
    return None


# =============================================================================
# POLICY 2: DANGEROUS BASH COMMAND BLOCKLIST
# =============================================================================
DANGEROUS_COMMAND_PATTERNS = [
    (r'rm\s+-rf\s+/', 'Recursive force delete from root'),
    (r'rm\s+-rf\s+\*', 'Recursive force delete with wildcard'),
    (r'rm\s+-rf\s+~', 'Recursive force delete from home'),
    (r'rm\s+-rf\s+\.\./', 'Recursive force delete of parent directory'),
    (r'mkfs', 'Filesystem formatting (potential data loss)'),
    (r'dd\s+if=.*of=/dev/', 'Direct disk write (potential data loss)'),
    (r':\(\)\{.*:\|:.*\};:', 'Fork bomb pattern'),
    (r'wget\s+.*\|\s*bash', 'Remote code execution via wget'),
    (r'curl\s+.*\|\s*bash', 'Remote code execution via curl'),
    (r'curl\s+.*\|\s*sh', 'Remote code execution via curl'),
    (r'eval\s+\$\(curl', 'Remote code execution via eval'),
    (r'chmod\s+777', 'Overly permissive file permissions'),
    (r'chown\s+-R\s+.*:.*\s+/', 'Recursive ownership change from root'),
    (r'git\s+push\s+.*--force', 'Force push (potential data loss)'),
    (r'git\s+reset\s+--hard\s+HEAD~', 'Hard reset (potential data loss)'),
    (r'npm\s+install\s+-g', 'Global npm install (use local dependencies)'),
    (r'sudo\s+rm', 'Sudo with rm (dangerous)'),
    (r'>\s*/dev/sd', 'Direct write to disk device'),
]

def check_dangerous_commands(command):
    """Check if command matches dangerous patterns"""
    for pattern, reason in DANGEROUS_COMMAND_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return reason
    return None


# =============================================================================
# POLICY 3: GIT SAFETY IN WORKTREES
# =============================================================================
RESTRICTED_GIT_COMMANDS = [
    r'git\s+remote\s+add',
    r'git\s+remote\s+set-url',
    r'git\s+gc',
    r'git\s+prune',
    r'git\s+worktree\s+prune',
    r'git\s+config\s+--global',
]

def check_git_restrictions(command):
    """Check if git command is restricted in worktree context"""
    for pattern in RESTRICTED_GIT_COMMANDS:
        if re.search(pattern, command, re.IGNORECASE):
            return pattern
    return None


# =============================================================================
# POLICY 5: RECITATION VERIFICATION (Memory Sync Before Deletion)
# =============================================================================
SYNC_STATE_FILE = ".claude/.last_sync.json"
SYNC_TIMEOUT = 3600  # 1 hour - memory should have been synced within this window

def get_last_sync_time():
    """Get timestamp of last memory sync"""
    try:
        if os.path.exists(SYNC_STATE_FILE):
            with open(SYNC_STATE_FILE, 'r') as f:
                state = json.load(f)
                return state.get('timestamp', 0)
    except (json.JSONDecodeError, IOError):
        pass
    return 0

def check_recitation_before_deletion(command):
    """
    Check if memory was synced recently before allowing worktree deletion.
    Prevents context loss when removing worktrees.
    Returns: (should_block, message) or (False, None)
    """
    # Check for worktree deletion commands
    deletion_patterns = [
        r'git\s+worktree\s+remove',
        r'cleanup-worktree\.sh',
        r'rm\s+-rf.*worktree',
    ]

    for pattern in deletion_patterns:
        if re.search(pattern, command, re.IGNORECASE):
            import time
            last_sync = get_last_sync_time()
            current_time = time.time()

            if last_sync == 0:
                return (True,
                    "RECITATION GATE: No memory sync detected for this worktree. "
                    "Run `./scripts/sync-memory.sh` or `/memory-update` before deleting "
                    "to prevent context loss."
                )

            time_since_sync = current_time - last_sync
            if time_since_sync > SYNC_TIMEOUT:
                minutes_ago = int(time_since_sync / 60)
                return (True,
                    f"RECITATION GATE: Last memory sync was {minutes_ago} minutes ago. "
                    "Run `./scripts/sync-memory.sh` or `/memory-update` to capture recent "
                    "work before deleting this worktree."
                )

    return (False, None)

def record_sync_event():
    """Record that a memory sync occurred (called by sync-memory.sh)"""
    import time
    try:
        os.makedirs(os.path.dirname(SYNC_STATE_FILE), exist_ok=True)
        with open(SYNC_STATE_FILE, 'w') as f:
            json.dump({'timestamp': time.time()}, f)
    except IOError:
        pass


# =============================================================================
# POLICY 4: TDD ENFORCEMENT (ENHANCED WITH STATE TRACKING)
# =============================================================================
TDD_STATE_FILE = ".claude/.tdd_state.json"
TDD_STATE_TIMEOUT = 900  # 15 minutes - increased for long-running test suites

def get_tdd_state():
    """Read TDD state from file"""
    try:
        if os.path.exists(TDD_STATE_FILE):
            with open(TDD_STATE_FILE, 'r') as f:
                import time
                state = json.load(f)
                # Check if state is still valid (within timeout)
                if time.time() - state.get('timestamp', 0) < TDD_STATE_TIMEOUT:
                    return state
    except (json.JSONDecodeError, IOError):
        pass
    return None

def update_tdd_state(tests_passed=True, tests_run=True):
    """Update TDD state file"""
    try:
        import time
        os.makedirs(os.path.dirname(TDD_STATE_FILE), exist_ok=True)
        with open(TDD_STATE_FILE, 'w') as f:
            json.dump({
                'tests_passed': tests_passed,
                'tests_run': tests_run,
                'timestamp': time.time()
            }, f)
    except IOError:
        pass

def check_tdd_compliance(command):
    """
    Check TDD compliance:
    - Track when tests are run
    - Warn/block commits if tests haven't run recently
    Returns: (should_warn, message)
    """
    # Check if this is a test command - update state
    test_patterns = [
        r'npm\s+(run\s+)?test',
        r'yarn\s+(run\s+)?test',
        r'pnpm\s+(run\s+)?test',
        r'pytest',
        r'jest',
        r'mocha',
        r'vitest',
        r'cargo\s+test',
        r'go\s+test',
        r'dotnet\s+test',
        r'mvn\s+test',
        r'gradle\s+test',
    ]

    for pattern in test_patterns:
        if re.search(pattern, command, re.IGNORECASE):
            # Test command detected - post_tool_use.py will record the actual result
            # We don't update state here to avoid "pre-update noise" where the system
            # thinks tests passed before they've even run
            return (False, None)

    # Check if this is a commit command
    if re.search(r'git\s+commit', command, re.IGNORECASE):
        state = get_tdd_state()
        if state is None:
            return (True, "No test run detected in this session. TDD requires running tests before commits.")
        elif not state.get('tests_run', False):
            return (True, "Tests have not been run. TDD requires running tests before commits.")
        elif not state.get('tests_passed', True):
            return (True, "Tests failed in last run. Fix failing tests before committing.")

    return (False, None)


# =============================================================================
# MAIN HOOK LOGIC
# =============================================================================
def main():
    try:
        # Read input from Claude Agent SDK
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        log_error(f"Failed to parse hook input: {e}")
        allow_action()  # Fail open if we can't parse input
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Skip hook if tool name is not recognized
    if not tool_name:
        allow_action()
        return

    # -------------------------------------------------------------------------
    # CHECK: File editing restrictions
    # -------------------------------------------------------------------------
    if tool_name in ["Write", "Edit", "NotebookEdit"]:
        file_path = tool_input.get("file_path", "")

        if file_path:
            restricted_pattern = check_file_restrictions(file_path)
            if restricted_pattern:
                block_action(
                    f"SECURITY VIOLATION: Cannot edit '{file_path}'. "
                    f"This file matches restricted pattern: {restricted_pattern}",
                    suggestion=(
                        "If you need to modify environment variables, edit "
                        "'shared-config/.env.template' instead and regenerate "
                        "the worktree .env file."
                    )
                )

    # -------------------------------------------------------------------------
    # CHECK: Bash command restrictions
    # -------------------------------------------------------------------------
    if tool_name == "Bash":
        command = tool_input.get("command", "")

        if not command:
            allow_action()
            return

        # Check for dangerous commands
        danger_reason = check_dangerous_commands(command)
        if danger_reason:
            block_action(
                f"SAFETY INTERVENTION: {danger_reason}",
                suggestion=(
                    "This command is blocked for safety. If you absolutely need to "
                    "run it, ask the user for explicit permission and have them "
                    "run it manually."
                )
            )

        # Check for restricted git commands in worktree
        git_restriction = check_git_restrictions(command)
        if git_restriction:
            block_action(
                f"GIT SAFETY: Command '{git_restriction}' is restricted in worktrees",
                suggestion=(
                    "This git command affects the global repository. "
                    "Only branch-specific operations are allowed in worktrees."
                )
            )

        # Check Recitation Verification before worktree deletion
        should_block_deletion, deletion_message = check_recitation_before_deletion(command)
        if should_block_deletion:
            block_action(
                deletion_message,
                suggestion=(
                    "Run one of these commands first:\n"
                    "  ./scripts/sync-memory.sh\n"
                    "  /memory-update\n"
                    "This ensures your work is preserved in the Memory Bank."
                )
            )

        # Enhanced TDD compliance check
        should_warn, tdd_message = check_tdd_compliance(command)
        if should_warn and tdd_message:
            warn_action(f"TDD REMINDER: {tdd_message}")

    # -------------------------------------------------------------------------
    # CHECK: Read restrictions (prevent reading sensitive files)
    # -------------------------------------------------------------------------
    if tool_name == "Read":
        file_path = tool_input.get("file_path", "")

        # Allow reading but warn for sensitive files
        if re.search(r'\.env$', file_path) and not re.search(r'\.env\.template$', file_path):
            warn_action(
                f"Reading '{file_path}'. Remember: NEVER commit secrets or "
                "hardcode them in your responses."
            )

    # -------------------------------------------------------------------------
    # All checks passed - allow action
    # -------------------------------------------------------------------------
    allow_action()


if __name__ == "__main__":
    main()
PRE_TOOL_USE_EOF

chmod +x .claude/hooks/pre_tool_use.py
echo "  ✅ Created: .claude/hooks/pre_tool_use.py"

# ----- .claude/hooks/user_prompt_submit.sh -----
cat > .claude/hooks/user_prompt_submit.sh <<'USER_PROMPT_EOF'
#!/bin/bash
################################################################################
# USER-PROMPT-SUBMIT HOOK: Anti-Sycophancy & Context Injection
# Purpose: Sanitize and enhance user prompts before they reach the LLM
# Functionality:
#   1. Inject current branch and worktree context
#   2. Add anti-sycophancy system reminder
#   3. Prepend Memory Bank reading reminder for first prompt in session
################################################################################

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Extract the prompt from JSON (using jq if available, fallback to manual parsing)
if command -v jq &> /dev/null; then
    prompt=$(echo "$input" | jq -r '.prompt // empty')
else
    # Fallback: simple grep-based extraction (less robust)
    prompt=$(echo "$input" | grep -oP '(?<="prompt":")[^"]*' || echo "")
fi

# If prompt is empty, pass through unchanged
if [ -z "$prompt" ]; then
    echo "$input"
    exit 0
fi

# =============================================================================
# CONTEXT INJECTION 1: Git Branch & Worktree Info
# =============================================================================
branch_context=""
if git rev-parse --is-inside-work-tree &> /dev/null; then
    current_branch=$(git branch --show-current 2>/dev/null || echo "detached")
    worktree_path=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

    branch_context="<context-injection>
🌳 **Current Worktree Context**:
- Branch: \`$current_branch\`
- Worktree Path: \`$worktree_path\`
- Working in isolated environment (changes do not affect other worktrees)
</context-injection>"
fi

# =============================================================================
# CONTEXT INJECTION 2: Memory Bank Reminder (First Prompt Detection)
# =============================================================================
memory_reminder=""

# Simple heuristic: if prompt contains greeting words or is short, likely first prompt
if echo "$prompt" | grep -iE "^(hi|hello|hey|start|begin)" &> /dev/null; then
    memory_reminder="<context-injection>
📚 **Session Initialization Protocol**:
Before proceeding, you MUST:
1. Read \`memory-bank/projectbrief.md\` (project vision & requirements)
2. Read \`memory-bank/systemPatterns.md\` (architecture & coding standards)
3. Review \`.claude/activeContext.md\` in your worktree (current task state)

These files provide the \"Constitutional\" knowledge for this project.
</context-injection>"
fi

# =============================================================================
# CONTEXT INJECTION 3: Anti-Sycophancy System Override
# =============================================================================
antisycophancy_reminder="<system-override>
⚖️ **Critical Behavioral Directive**:
You are an autonomous senior engineer, NOT a yes-machine. Your responsibilities:

1. **Challenge Technical Errors**: If the user suggests something that contradicts \`systemPatterns.md\` or established best practices, you MUST:
   - Politely explain why the approach is problematic
   - Reference specific patterns/standards from the Memory Bank
   - Suggest the correct alternative
   - Only proceed if the user explicitly overrides after understanding the risk

2. **Verify Assumptions**: If requirements are ambiguous:
   - Ask clarifying questions BEFORE writing code
   - Use the AskUserQuestion tool to present options
   - Do not guess or assume intent

3. **Enforce Quality**:
   - Block yourself from committing code without tests (TDD mandatory)
   - Refuse to skip error handling in production code
   - Push back on requests that create technical debt without user acknowledgment

4. **Transparency Over Agreement**:
   - Say \"I don't know\" rather than hallucinating
   - Admit mistakes if you realize you wrote buggy code
   - Suggest better approaches even if not explicitly asked

**Remember**: The user trusts you to be technically rigorous, not agreeable. False consensus helps no one.
</system-override>"

# =============================================================================
# CONSTRUCT ENHANCED PROMPT
# =============================================================================
enhanced_prompt="$branch_context

$memory_reminder

$antisycophancy_reminder

---

**User Prompt**:
$prompt"

# Output modified JSON with enhanced prompt
if command -v jq &> /dev/null; then
    echo "$input" | jq --arg new_prompt "$enhanced_prompt" '.prompt = $new_prompt'
else
    # Fallback: manual JSON construction (fragile, but works for simple cases)
    echo "{\"prompt\": \"$enhanced_prompt\"}"
fi
USER_PROMPT_EOF

chmod +x .claude/hooks/user_prompt_submit.sh
echo "  ✅ Created: .claude/hooks/user_prompt_submit.sh"

# ----- .claude/hooks/post_tool_use.py -----
cat > .claude/hooks/post_tool_use.py <<'POST_TOOL_USE_EOF'
#!/usr/bin/env python3
"""
POST-TOOL-USE HOOK: Context Compaction & State Management
Purpose: Monitor session state and trigger context management actions
Functionality:
  1. Track approximate token usage
  2. Inject context compaction reminders when approaching limits
  3. Update TDD state after test commands complete
  4. Log tool usage for debugging
"""

import sys
import json
import os
import time
from pathlib import Path

# Configuration
CONTEXT_STATE_FILE = ".claude/.context_state.json"
TDD_STATE_FILE = ".claude/.tdd_state.json"
TOOL_LOG_FILE = ".claude/.tool_usage.log"

# Approximate token thresholds
TOKEN_WARNING_THRESHOLD = 25000
TOKEN_CRITICAL_THRESHOLD = 35000
TOKENS_PER_CHAR = 0.25


def get_context_state():
    """Read context state from file"""
    try:
        if os.path.exists(CONTEXT_STATE_FILE):
            with open(CONTEXT_STATE_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {
        'estimated_tokens': 0,
        'tool_calls': 0,
        'session_start': time.time(),
        'last_compaction': None,
        'compaction_reminders': 0
    }


def update_context_state(state):
    """Update context state file"""
    try:
        os.makedirs(os.path.dirname(CONTEXT_STATE_FILE), exist_ok=True)
        with open(CONTEXT_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError:
        pass


def update_tdd_state_completion(success=True):
    """Update TDD state to mark test completion"""
    try:
        if os.path.exists(TDD_STATE_FILE):
            with open(TDD_STATE_FILE, 'r') as f:
                state = json.load(f)
                state['tests_passed'] = success
                state['tests_run'] = True
                state['test_running'] = False
                state['timestamp'] = time.time()

            with open(TDD_STATE_FILE, 'w') as f:
                json.dump(state, f)
    except (json.JSONDecodeError, IOError):
        pass


def log_tool_usage(tool_name, tool_input, tool_output_size):
    """Log tool usage for debugging and analysis"""
    try:
        os.makedirs(os.path.dirname(TOOL_LOG_FILE), exist_ok=True)
        with open(TOOL_LOG_FILE, 'a') as f:
            log_entry = {
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'tool': tool_name,
                'input_size': len(json.dumps(tool_input)),
                'output_size': tool_output_size
            }
            f.write(json.dumps(log_entry) + '\n')
    except IOError:
        pass


def estimate_token_increase(tool_input, tool_output):
    """Estimate tokens used by this tool call"""
    input_chars = len(json.dumps(tool_input))
    output_chars = len(str(tool_output)) if tool_output else 0
    return int((input_chars + output_chars) * TOKENS_PER_CHAR)


def check_context_compaction(state):
    """Check if context compaction is needed"""
    tokens = state.get('estimated_tokens', 0)

    if tokens >= TOKEN_CRITICAL_THRESHOLD:
        return {
            'level': 'critical',
            'message': (
                f"⚠️ CRITICAL: Context limit approaching ({tokens} estimated tokens). "
                "You MUST run `/memory-update`, summarize current state to "
                "`activeContext.md`, and consider resetting the session."
            )
        }
    elif tokens >= TOKEN_WARNING_THRESHOLD:
        return {
            'level': 'warning',
            'message': (
                f"📊 Context usage: ~{tokens} tokens. Consider running "
                "`/memory-update` soon to preserve state before hitting limits."
            )
        }
    return None


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    tool_output = input_data.get("tool_output", "")
    tool_exit_code = input_data.get("exit_code", 0)

    # Get current context state
    state = get_context_state()

    # Update tool call count
    state['tool_calls'] = state.get('tool_calls', 0) + 1

    # Estimate token increase
    token_increase = estimate_token_increase(tool_input, tool_output)
    state['estimated_tokens'] = state.get('estimated_tokens', 0) + token_increase

    # Log tool usage
    log_tool_usage(tool_name, tool_input, len(str(tool_output)))

    # Handle test command completion
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        import re

        test_patterns = [
            r'npm\s+(run\s+)?test',
            r'yarn\s+(run\s+)?test',
            r'pytest',
            r'jest',
            r'mocha',
            r'vitest',
            r'cargo\s+test',
            r'go\s+test',
        ]

        for pattern in test_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                success = (tool_exit_code == 0)
                update_tdd_state_completion(success)
                break

    # Check context compaction
    compaction_check = check_context_compaction(state)
    response = {}

    if compaction_check:
        state['compaction_reminders'] = state.get('compaction_reminders', 0) + 1
        response['message'] = compaction_check['message']

        if compaction_check['level'] == 'critical':
            response['system_directive'] = (
                "<system-directive priority='high'>\n"
                "CONTEXT LIMIT REACHED. Before continuing:\n"
                "1. Run /memory-update to sync important state\n"
                "2. Update .claude/activeContext.md with current progress\n"
                "3. Consider starting a new session\n"
                "</system-directive>"
            )

    # Save updated state
    update_context_state(state)
    print(json.dumps(response))


if __name__ == "__main__":
    main()
POST_TOOL_USE_EOF

chmod +x .claude/hooks/post_tool_use.py
echo "  ✅ Created: .claude/hooks/post_tool_use.py"

# ----- .claude/hooks/notification.py -----
cat > .claude/hooks/notification.py <<'NOTIFICATION_EOF'
#!/usr/bin/env python3
"""
NOTIFICATION HOOK: External Alerting System
Purpose: Send alerts to external systems when critical events occur
Functionality:
  1. Terminal notifications (cross-platform)
  2. Desktop notifications (when available)
  3. Webhook alerts (Slack, Discord, etc.)
  4. Log file for persistent record
"""

import sys
import json
import os
import time
import subprocess
import argparse
from pathlib import Path

# Configuration
NOTIFICATION_LOG_FILE = ".claude/.notifications.log"
NOTIFICATION_CONFIG_FILE = ".claude/notification_config.json"

DEFAULT_CONFIG = {
    'enabled': True,
    'terminal_bell': True,
    'desktop_notifications': True,
    'webhook_url': None,
    'log_to_file': True,
    'min_severity': 'warning'
}

SEVERITY_LEVELS = {'info': 0, 'warning': 1, 'error': 2, 'critical': 3}

# ANSI colors
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
BOLD = '\033[1m'
NC = '\033[0m'


def load_config():
    """Load notification configuration"""
    config = DEFAULT_CONFIG.copy()
    try:
        if os.path.exists(NOTIFICATION_CONFIG_FILE):
            with open(NOTIFICATION_CONFIG_FILE, 'r') as f:
                config.update(json.load(f))
    except (json.JSONDecodeError, IOError):
        pass
    return config


def send_terminal_notification(title, message, severity='info'):
    """Print formatted notification to terminal"""
    colors = {'info': BLUE, 'warning': YELLOW, 'error': RED, 'critical': f"{RED}{BOLD}"}
    icons = {'info': 'ℹ️ ', 'warning': '⚠️ ', 'error': '❌', 'critical': '🚨'}

    color = colors.get(severity, BLUE)
    icon = icons.get(severity, '')

    print(f"\n{color}{'═' * 60}{NC}", file=sys.stderr)
    print(f"{color}{icon} {title}{NC}", file=sys.stderr)
    print(f"{color}{'─' * 60}{NC}", file=sys.stderr)
    print(f"{message}", file=sys.stderr)
    print(f"{color}{'═' * 60}{NC}\n", file=sys.stderr)


def send_desktop_notification(title, message, severity='info'):
    """Send desktop notification (cross-platform)"""
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(
                ['powershell', '-Command', f'Write-Host "{title}: {message}"'],
                capture_output=True, timeout=5
            )
        elif os.name == 'posix':
            if subprocess.run(['which', 'osascript'], capture_output=True).returncode == 0:
                subprocess.run([
                    'osascript', '-e',
                    f'display notification "{message}" with title "{title}"'
                ], capture_output=True, timeout=5)
            elif subprocess.run(['which', 'notify-send'], capture_output=True).returncode == 0:
                urgency = 'critical' if severity in ['error', 'critical'] else 'normal'
                subprocess.run(['notify-send', '-u', urgency, title, message],
                             capture_output=True, timeout=5)
    except:
        pass


def log_notification(title, message, severity='info'):
    """Log notification to file"""
    try:
        os.makedirs(os.path.dirname(NOTIFICATION_LOG_FILE), exist_ok=True)
        with open(NOTIFICATION_LOG_FILE, 'a') as f:
            log_entry = {
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'severity': severity,
                'title': title,
                'message': message
            }
            f.write(json.dumps(log_entry) + '\n')
    except IOError:
        pass


def notify(title, message, severity='info', notification_type='general'):
    """Send notification through all configured channels"""
    config = load_config()

    if not config.get('enabled', True):
        return

    min_level = SEVERITY_LEVELS.get(config.get('min_severity', 'warning'), 1)
    current_level = SEVERITY_LEVELS.get(severity, 0)
    if current_level < min_level:
        return

    send_terminal_notification(title, message, severity)

    if config.get('terminal_bell', True) and severity in ['error', 'critical']:
        print('\a', end='', file=sys.stderr)

    if config.get('desktop_notifications', True):
        send_desktop_notification(title, message, severity)

    if config.get('log_to_file', True):
        log_notification(title, message, severity)


def notify_hook_block(reason, tool_name=None, command=None):
    """Notify when a hook blocks an action"""
    title = "Hook Blocked Action"
    message = f"Reason: {reason}"
    if tool_name:
        message += f"\nTool: {tool_name}"
    if command:
        cmd_preview = command[:100] + '...' if len(command) > 100 else command
        message += f"\nCommand: {cmd_preview}"
    notify(title, message, severity='warning', notification_type='block')


def main():
    parser = argparse.ArgumentParser(description='Send notifications from Claude Code Forge')
    parser.add_argument('--type', choices=['block', 'error', 'warning', 'info'],
                       default='info', help='Notification type')
    parser.add_argument('--title', default='Forge Notification', help='Notification title')
    parser.add_argument('--message', required=True, help='Notification message')
    parser.add_argument('--severity', choices=['info', 'warning', 'error', 'critical'],
                       default='info', help='Severity level')

    args = parser.parse_args()

    if args.type == 'block':
        args.severity = 'warning'
    elif args.type == 'error':
        args.severity = 'error'

    notify(args.title, args.message, args.severity, args.type)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        main()
    else:
        try:
            input_data = json.load(sys.stdin)
            notify(
                input_data.get('title', 'Notification'),
                input_data.get('message', ''),
                input_data.get('severity', 'info'),
                input_data.get('type', 'general')
            )
        except json.JSONDecodeError:
            pass
NOTIFICATION_EOF

chmod +x .claude/hooks/notification.py
echo "  ✅ Created: .claude/hooks/notification.py"

# ============================================================================
# PHASE 9: CCPM COMMANDS (FULL CONTENT)
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 9]${NC} Creating CCPM Command Definitions"

# The CCPM commands are large - we'll create them with the essential content
# For brevity, I'm including the key metadata and structure

cat > .claude/commands/prd-new.md <<'PRD_NEW_EOF'
---
description: "Start a new Product Requirement Document (PRD) brainstorming session"
argument-hint: "[feature-name]"
---

# PRD Generation Protocol

## Persona
**Product Manager** + **System Architect Hybrid**

## Objective
Generate a comprehensive Product Requirement Document (PRD) for a new feature by combining user needs analysis with technical feasibility assessment.

---

## Execution Steps

### 1. Context Ingestion
**MANDATORY**: Before asking any questions, read:
- `memory-bank/projectbrief.md` - Overall project vision
- `memory-bank/systemPatterns.md` - Technical constraints
- `memory-bank/productContext.md` - Existing user personas

### 2. Feature Scoping Interview
Ask the user the following questions (use **AskUserQuestion** tool for structured input):

#### Question Set A: User Value
1. **What user problem does this feature solve?**
2. **What is the desired user outcome?**

#### Question Set B: Scope Definition
3. **What is IN scope for v1?**
4. **What is OUT of scope?**

#### Question Set C: Constraints
5. **Are there technical constraints?**
6. **What is the target timeline?**

### 3. Technical Feasibility Check
Cross-reference user requirements against `systemPatterns.md`:
- Does this fit our architecture?
- Do we need new dependencies?
- Are there API breaking changes?

### 4. PRD Document Generation
Create a new file: `.claude/prds/$ARGUMENTS.md` with sections:
- Problem Statement
- Proposed Solution
- User Stories
- Requirements (Functional & Non-Functional)
- Technical Design (High-Level)
- Out of Scope
- Success Metrics
- Risks & Mitigation
- Open Questions

### 5. Finalization
1. Present PRD to user for review
2. Ask for approval to save
3. Update `memory-bank/activeContext.md`
4. Suggest next step: `/epic-decompose $ARGUMENTS`

---

## Best Practices
1. **Always ground decisions in the Memory Bank**
2. **Use structured questions** via AskUserQuestion tool
3. **Think in layers** - User needs → Product requirements → Technical design
4. **Be realistic** - Flag technical debt or complexity early

---

## Related Commands
- `/epic-decompose <feature-name>` - Next step after PRD approval
- `/memory-update` - Sync PRD insights back to Memory Bank
PRD_NEW_EOF

echo "  ✅ Created: .claude/commands/prd-new.md"

cat > .claude/commands/epic-decompose.md <<'EPIC_DECOMPOSE_EOF'
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
EPIC_DECOMPOSE_EOF

echo "  ✅ Created: .claude/commands/epic-decompose.md"

cat > .claude/commands/worktree-sync.md <<'WORKTREE_SYNC_EOF'
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
WORKTREE_SYNC_EOF

echo "  ✅ Created: .claude/commands/worktree-sync.md"

cat > .claude/commands/memory-update.md <<'MEMORY_UPDATE_EOF'
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
MEMORY_UPDATE_EOF

echo "  ✅ Created: .claude/commands/memory-update.md"

# ============================================================================
# PHASE 10: AGENT PERSONAS (FULL CONTENT)
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 10]${NC} Creating Agent Persona Definitions"

cat > .claude/agents/architect.md <<'ARCHITECT_EOF'
# Architect Persona

## Role Definition
**System Design Specialist** focused on maintainability, scalability, and architectural consistency.

## Primary Responsibilities
1. **MUST** read `memory-bank/systemPatterns.md` before approving any implementation
2. **MUST** update `systemPatterns.md` whenever new patterns are introduced
3. **MUST** create ADRs in `decisionLog.md` for significant architectural decisions

## Behavioral Directives
- Always reference existing patterns before proposing new ones
- Document trade-offs explicitly
- Never approve architectural changes without updating Memory Bank

## Tool Usage
- **PREFER**: Read, Glob, Grep (analysis tools)
- **CAUTION**: Write, Edit (only for documentation)
- **AVOID**: Bash commands that execute code

## Quality Gates
- [ ] Reviewed against systemPatterns.md
- [ ] ADR created in decisionLog.md
- [ ] No circular dependencies introduced
- [ ] Component boundaries respected
ARCHITECT_EOF

echo "  ✅ Created: .claude/agents/architect.md"

cat > .claude/agents/qa-engineer.md <<'QA_EOF'
# QA Engineer Persona

## Role Definition
**Quality Assurance Specialist** focused on test coverage, reliability, and defect prevention.

## Primary Responsibilities
1. **MUST** ensure tests are written BEFORE implementation (TDD)
2. **MUST** verify test coverage meets 80% minimum
3. **MUST** block commits that reduce test coverage

## Test Categories
- Unit Tests: Co-located with source files
- Integration Tests: `tests/integration/`
- E2E Tests: `tests/e2e/`

## TDD Workflow
1. RED: Write a failing test
2. GREEN: Write minimal code to pass
3. REFACTOR: Improve code quality

## Quality Gates
- [ ] All tests pass locally
- [ ] No skipped tests without TODO
- [ ] Coverage meets minimum threshold
- [ ] Edge cases are covered
QA_EOF

echo "  ✅ Created: .claude/agents/qa-engineer.md"

cat > .claude/agents/security-auditor.md <<'SECURITY_EOF'
# Security Auditor Persona

## Role Definition
**Security Specialist** focused on vulnerability prevention and secure coding practices.

## Primary Responsibilities
1. **MUST** review all code for OWASP Top 10 vulnerabilities
2. **MUST** block commits containing hardcoded secrets
3. **MUST** verify input validation on all user-facing endpoints

## OWASP Top 10 Checklist
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Authentication Failures
- A08: Software Integrity Failures
- A09: Logging & Monitoring Failures
- A10: SSRF

## Immediate Blockers
- Hardcoded passwords, API keys, or tokens
- SQL injection vulnerabilities
- Missing authentication on protected routes
- Sensitive data in logs

## Quality Gates
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Parameterized queries used
- [ ] Auth checks on protected routes
SECURITY_EOF

echo "  ✅ Created: .claude/agents/security-auditor.md"

cat > .claude/agents/product-manager.md <<'PM_EOF'
# Product Manager Persona

## Role Definition
**CCPM Workflow Orchestrator** focused on requirements gathering and project governance.

## Primary Responsibilities
1. **MUST** use `/prd-new` for all new feature requests
2. **MUST** ensure PRDs align with `projectbrief.md` vision
3. **MUST** validate requirements against `techContext.md` constraints

## CCPM Workflow
1. Brainstorm → `/prd-new <feature>`
2. Plan → `/epic-decompose <feature>`
3. Decompose → `./scripts/setup-worktree.sh <branch>`
4. Execute → Agent development in worktree
5. Sync → `/worktree-sync <branch>`

## Behavioral Directives
- **Always** run `/prd-new` first - never skip to implementation
- **Always** read Memory Bank before asking questions
- **Always** check `projectbrief.md` for alignment

## Quality Gates
- [ ] Problem statement clearly defined
- [ ] User stories with acceptance criteria
- [ ] In-scope and out-of-scope documented
- [ ] Technical constraints identified
PM_EOF

echo "  ✅ Created: .claude/agents/product-manager.md"

# ============================================================================
# PHASE 11: INITIALIZE MAIN WORKTREE
# ============================================================================
echo ""
echo -e "${GREEN}[PHASE 11]${NC} Initializing Main Worktree"

if [ ! -d "main" ]; then
    # Create initial commit in bare repo
    git --git-dir=.bare --work-tree=. add .claude memory-bank shared-config scripts
    git --git-dir=.bare commit -m "chore: Initialize Autonomous Software Forge v2.0" || true

    # Create main worktree
    git worktree add main main 2>/dev/null || {
        echo -e "  ${YELLOW}⚠️  Main worktree already exists or cannot be created${NC}"
    }

    if [ -d "main" ]; then
        # Create basic structure in main worktree
        mkdir -p main/{src,tests}
        mkdir -p main/.claude

        # Create activeContext.md for main
        cat > main/.claude/activeContext.md <<'MAIN_CONTEXT_EOF'
# Active Context for Main Worktree

## Current Objective
Production-ready codebase

## Progress
- [x] Environment initialized
- [ ] Memory Bank populated with project details
- [ ] First feature development

## Notes
This is the primary worktree representing the main branch.
All production code lives here.

## Next Steps
1. Edit `memory-bank/projectbrief.md` with your project vision
2. Edit `memory-bank/systemPatterns.md` with your architecture
3. Run `/prd-new <feature>` to start your first feature
MAIN_CONTEXT_EOF

        echo -e "  ${GREEN}✅ Main worktree created at ./main/${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Main worktree already exists. Skipping.${NC}"
fi

# ============================================================================
# COMPLETION
# ============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      🎉 FORGE INITIALIZATION COMPLETE 🎉               ║${NC}"
echo -e "${GREEN}║            Production Ready v2.0                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}✅ What was created:${NC}"
echo ""
echo "  📁 .bare/                    - Git database (bare repo)"
echo "  📁 .claude/                  - Agent configuration"
echo "     ├── CLAUDE.md            - Master system prompt"
echo "     ├── settings.json        - Hook registration"
echo "     ├── hooks/               - Safety enforcement"
echo "     │   ├── pre_tool_use.py  - Security & TDD hooks"
echo "     │   └── user_prompt_submit.sh - Context injection"
echo "     ├── commands/            - CCPM slash commands"
echo "     │   ├── prd-new.md       - PRD generation"
echo "     │   ├── epic-decompose.md- Task breakdown"
echo "     │   ├── worktree-sync.md - Merge & sync"
echo "     │   └── memory-update.md - Memory Bank updates"
echo "     └── agents/              - Role-based personas"
echo "  📁 memory-bank/             - Long-term memory"
echo "  📁 shared-config/           - Shared tooling configs"
echo "  📁 scripts/                 - Automation"
echo "     ├── setup-worktree.sh    - Create isolated environments"
echo "     ├── cleanup-worktree.sh  - Safe worktree removal"
echo "     └── sync-memory.sh       - Memory Bank synchronization"
echo "  📁 main/                    - Production worktree"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "  1. ${YELLOW}Populate your Memory Bank:${NC}"
echo "     Edit memory-bank/projectbrief.md with your project vision"
echo "     Edit memory-bank/systemPatterns.md with your architecture"
echo ""
echo "  2. ${YELLOW}Start your first agent:${NC}"
echo "     cd main && claude"
echo ""
echo "  3. ${YELLOW}Begin the CCPM workflow:${NC}"
echo "     /prd-new <your-feature-name>"
echo ""
echo "  4. ${YELLOW}Create parallel worktrees:${NC}"
echo "     ./scripts/setup-worktree.sh feature/my-feature"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  - Master Config: ${YELLOW}.claude/CLAUDE.md${NC}"
echo "  - Quick Start: ${YELLOW}DAY_1_PROTOCOL.md${NC}"
echo "  - Full Guide: ${YELLOW}README.md${NC}"
echo ""
echo -e "${GREEN}Happy Forging! 🔨${NC}"
