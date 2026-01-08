# DAY 1 PROTOCOL: Autonomous Software Forge Quick Start

**Objective**: Transform your project from zero to fully operational AI-native development environment in <10 minutes.

---

## Prerequisites

Ensure you have the following installed:
- **Git**: `git --version` (>= 2.40)
- **Python 3**: `python3 --version` (>= 3.8)
- **Node.js**: `node --version` (>= 18) - Optional, for MCP servers
- **Bash**: (Built-in on macOS/Linux, use Git Bash on Windows)

---

## PHASE 1: Bootstrap the Forge (5 minutes)

### Step 1.1: Navigate to Your Project Directory

```bash
# Create a new project or navigate to existing one
mkdir my-ai-project
cd my-ai-project

# OR navigate to existing project
cd /path/to/existing/project
```

### Step 1.2: Download the Bootstrap Script

Option A: If you have the `init_forge.sh` script already:
```bash
# Make it executable
chmod +x init_forge.sh

# Run it
./init_forge.sh
```

Option B: If you need to download it:
```bash
# Download from your repository or copy from the research document
# Then make executable and run
chmod +x init_forge.sh
./init_forge.sh
```

### Step 1.3: Follow the Interactive Prompts

The script will ask:
```
Enter project name [my-ai-project]: <Press Enter or type name>
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════╗
║   THE AUTONOMOUS SOFTWARE FORGE - BOOTSTRAP v1.0      ║
╔════════════════════════════════════════════════════════╗

[PHASE 1] Project Configuration
  📦 Project: my-ai-project

[PHASE 2] Initializing Fractal Worktree Infrastructure
  🔨 Creating bare repository...
  ✅ Bare repository initialized

[PHASE 3] Scaffolding Directory Structure
  📁 Created: .claude/ (Global Agent Config)
  📁 Created: memory-bank/ (Long-Term Memory)
  ...

[PHASE 11] Initializing Main Worktree
  ✅ Main worktree created at ./main/

╔════════════════════════════════════════════════════════╗
║           🎉 FORGE INITIALIZATION COMPLETE 🎉          ║
╔════════════════════════════════════════════════════════╗
```

**Verification**:
```bash
# Check directory structure
ls -la

# Expected:
# .bare/
# .claude/
# memory-bank/
# scripts/
# shared-config/
# main/
```

---

## PHASE 2: Populate the Memory Bank (3 minutes)

The Memory Bank is your project's "Constitution." Fill it out now to ground all future AI work.

### Step 2.1: Edit Project Brief

```bash
# Open in your editor
vim memory-bank/projectbrief.md
# OR
code memory-bank/projectbrief.md
# OR
nano memory-bank/projectbrief.md
```

**Replace placeholders with**:
- **Vision**: 2-3 sentence description of what you're building
- **Core Requirements**: List 3-5 key functional requirements
- **Success Metrics**: Define measurable KPIs

**Example**:
```markdown
## Vision
Build a real-time task management API with <100ms response times,
supporting 10,000 concurrent users with end-to-end encryption.

## Core Requirements
1. **User Authentication**: JWT-based auth with refresh tokens
2. **Task CRUD**: Create, read, update, delete tasks with tags
3. **Real-time Sync**: WebSocket-based live updates across clients
4. **Search**: Full-text search with filters
5. **Audit Log**: Immutable log of all task changes

## Success Metrics
1. **Performance**: p99 API latency <100ms
2. **Adoption**: 1,000 active users within 3 months
3. **Reliability**: 99.9% uptime
```

### Step 2.2: Edit System Patterns

```bash
vim memory-bank/systemPatterns.md
```

**Define**:
- **Architecture Pattern**: (e.g., Hexagonal Architecture, Microservices)
- **Tech Stack**: Frontend, backend, database, caching
- **Code Conventions**: Naming, file structure, error handling
- **Testing Strategy**: Unit, integration, E2E coverage targets

**Example**:
```markdown
## Architecture Style
**Pattern**: Hexagonal Architecture (Ports & Adapters)

## Core Components
### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Language**: TypeScript with strict mode
- **API Style**: REST with OpenAPI 3.0 spec

### Data
- **Primary Database**: PostgreSQL 16
- **Caching**: Redis 7
- **Search**: ElasticSearch 8

## Code Conventions
- **Naming**: camelCase for variables, PascalCase for classes
- **Testing**: 80% line coverage minimum, TDD mandatory
```

### Step 2.3: Commit the Memory Bank

```bash
cd main
git add ../memory-bank/
git commit -m "docs: Initialize Memory Bank with project context"
```

---

## PHASE 3: Activate Your First Agent (2 minutes)

Now you're ready to spawn an AI agent in the Forge environment.

### Step 3.1: Navigate to Main Worktree

```bash
cd main
```

### Step 3.2: Start Claude Agent

```bash
claude
```

**OR** if using Claude Code CLI:
```bash
claude-code
```

### Step 3.3: Verify Memory Bank Ingestion

At the Claude prompt, type:
```
Read memory-bank/projectbrief.md and memory-bank/systemPatterns.md
```

**Expected Response**:
```
I've read your Memory Bank files. Here's what I understand:

Vision: Real-time task management API with sub-100ms latency...

Architecture: Hexagonal Architecture with Node.js/Express backend...

I'm ready to help you build this system following these patterns.
What would you like to start with?
```

---

## PHASE 4: Run Your First CCPM Command (1 minute)

Test the Project Management workflow.

### Step 4.1: Generate Your First PRD

```
/prd-new task-management
```

**The agent will**:
1. Ask you structured questions about the feature
2. Generate a comprehensive PRD in `.claude/prds/task-management.md`
3. Cross-reference it against your Memory Bank for consistency

### Step 4.2: Decompose Into Tasks

```
/epic-decompose task-management
```

**The agent will**:
1. Break the PRD into atomic tasks
2. Generate a dependency graph
3. Create individual task files in `.claude/epics/task-management/`
4. Suggest worktree branches for parallel execution

---

## PHASE 5: Spawn Parallel Agent Environments (1 minute)

Now test the Fractal Worktree system by creating isolated environments.

### Step 5.1: Create a Feature Worktree

Open a **new terminal window** and run:

```bash
./scripts/setup-worktree.sh feature/user-authentication
```

**Expected Output**:
```
🔨 Forging new worktree: feature/user-authentication...
✅ Worktree created successfully
⚙️  Hydrating environment...
  → Symlinking Memory Bank...
  → Copying shared configurations...
  → Generating .env with unique ports...
    ✓ APP_PORT=3147
    ✓ DB_PORT=5579
    ✓ REDIS_PORT=6526

✅ WORKTREE READY FOR DEPLOYMENT

📊 Summary:
  Branch      : feature/user-authentication
  Location    : /path/to/my-ai-project/feature/user-authentication
  App Port    : 3147

🚀 Next Steps:
  1. Navigate to worktree: cd feature/user-authentication
  2. Start Claude agent: claude
```

### Step 5.2: Verify Isolation

```bash
cd feature/user-authentication

# Check unique port
cat .env | grep PORT
# Output: PORT=3147 (different from main's 3000!)

# Verify Memory Bank is shared (symlink)
ls -la memory-bank
# Output: memory-bank -> ../memory-bank/
```

### Step 5.3: Run Agent in Parallel

In this worktree, start another Claude instance:

```bash
claude
```

**You now have TWO agents running in parallel:**
- **Agent 1** in `main/` - Working on port 3000
- **Agent 2** in `feature/user-authentication/` - Working on port 3147

**No file conflicts, no port collisions!**

---

## PHASE 6: Test the Safety Hooks (1 minute)

Verify that the deterministic control layer is working.

### Step 6.1: Try to Edit a Restricted File

In Claude:
```
Edit the .env file to add a new variable
```

**Expected Behavior**:
```
🛑 HOOK BLOCKED: SECURITY VIOLATION: Cannot edit '.env'.
This file matches restricted pattern: \.env$

Suggestion: If you need to modify environment variables, edit
'shared-config/.env.template' instead and regenerate the worktree .env file.
```

### Step 6.2: Try a Dangerous Command

```
Run: rm -rf /tmp/test
```

**Expected Behavior**:
```
🛑 HOOK BLOCKED: SAFETY INTERVENTION: Recursive force delete with wildcard

Suggestion: This command is blocked for safety. If you absolutely need to
run it, ask the user for explicit permission.
```

**✅ If you see these blocks, your hooks are working!**

---

## PHASE 7: Complete Your First Task (10 minutes)

Now build something real using the TDD workflow.

### Step 7.1: Implement a Simple Feature

In Claude (inside `feature/user-authentication` worktree):

```
Using TDD, implement a User registration endpoint.

Requirements:
- POST /api/auth/register
- Accept: { email, password }
- Validate email format
- Hash password with bcrypt
- Return: { userId, token }
```

**The agent will**:
1. Read `systemPatterns.md` for architecture guidance
2. Write a failing test first (TDD)
3. Implement the minimal code to pass
4. Run tests and lint checks
5. Update `.claude/activeContext.md` with progress

### Step 7.2: Commit Your Work

```
Create a git commit for this feature
```

**The agent will**:
1. Run `git status` and `git diff`
2. Draft a conventional commit message
3. Add files to staging
4. Commit with proper format

### Step 7.3: Sync Back to Main

Return to the project root terminal:

```bash
cd ..
./scripts/setup-worktree.sh main  # Or just cd main
claude
```

Inside Claude:
```
/worktree-sync feature/user-authentication
```

**The agent will**:
1. Validate tests pass in the feature branch
2. Merge into main
3. Update Memory Bank with progress
4. Optionally clean up the worktree

---

## VERIFICATION CHECKLIST

Confirm all systems are operational:

- [ ] **Forge Structure**: All directories created (`.claude/`, `memory-bank/`, `scripts/`)
- [ ] **Memory Bank Populated**: `projectbrief.md` and `systemPatterns.md` filled out
- [ ] **Hooks Active**: Dangerous commands blocked
- [ ] **CCPM Working**: `/prd-new` and `/epic-decompose` commands functional
- [ ] **Worktrees Functional**: Can create isolated environments with unique ports
- [ ] **Parallel Agents**: Multiple Claude instances running simultaneously
- [ ] **TDD Enforced**: Commits blocked without tests (soft warning works)
- [ ] **Sync Works**: Can merge worktrees back to main

---

## TROUBLESHOOTING

### Issue: "Hooks not executing"

**Solution**:
```bash
# Verify hooks are executable
ls -la .claude/hooks/
# If not: chmod +x .claude/hooks/*.py .claude/hooks/*.sh

# Check settings.json exists
cat .claude/settings.json
```

### Issue: "Claude not loading CLAUDE.md"

**Solution**:
```bash
# Manually read in first prompt
Read .claude/CLAUDE.md
```

### Issue: "Worktree creation fails"

**Solution**:
```bash
# Check if .bare repo exists
ls -la .bare/

# If missing, re-run init_forge.sh
./init_forge.sh
```

### Issue: "Port conflicts even with unique ports"

**Solution**:
```bash
# Check if process is using the port
lsof -i :3147  # Replace with your port

# Kill the process if needed
kill -9 <PID>
```

### Issue: "Memory Bank not updating"

**Solution**:
```bash
# Commit changes manually
cd main
git add memory-bank/
git commit -m "docs: Update Memory Bank"
```

---

## NEXT STEPS

Now that your Forge is operational:

1. **Define Your First Epic**:
   ```
   /prd-new <your-feature-name>
   /epic-decompose <your-feature-name>
   ```

2. **Spawn Multiple Agents**:
   ```bash
   ./scripts/setup-worktree.sh feature/frontend
   ./scripts/setup-worktree.sh feature/backend
   ./scripts/setup-worktree.sh feature/database
   # Work on all three in parallel!
   ```

3. **Iterate on the Memory Bank**:
   ```
   /memory-update
   # Keep your knowledge base fresh
   ```

4. **Monitor Progress**:
   ```bash
   cat memory-bank/progress.md
   cat memory-bank/decisionLog.md
   ```

---

## ADVANCED: Multi-Agent Swarm Setup

For true parallel development:

```bash
# Terminal 1: Architect Agent
./scripts/setup-worktree.sh arch/system-design
cd arch/system-design
claude  # Loads .claude/agents/architect.md

# Terminal 2: QA Agent
./scripts/setup-worktree.sh qa/integration-tests
cd qa/integration-tests
claude  # Loads .claude/agents/qa-engineer.md

# Terminal 3: Security Agent
./scripts/setup-worktree.sh security/audit
cd security/audit
claude  # Loads .claude/agents/security-auditor.md
```

All three agents:
- Share the same Memory Bank (via symlinks)
- Work on different branches
- Have unique ports
- Can run tests in parallel without conflicts

---

## RESOURCES

### Key Files to Reference
- **Global Config**: `.claude/CLAUDE.md`
- **Memory Bank**: `memory-bank/*.md`
- **Hooks**: `.claude/hooks/pre_tool_use.py`
- **Commands**: `.claude/commands/*.md`

### Useful Commands
```bash
# List all worktrees
git worktree list

# View Memory Bank
cat memory-bank/projectbrief.md

# Check hook logs (if hooks fail)
cat .claude/hooks/hook.log  # (Create this for debugging)

# View current branch
git branch --show-current

# View recent commits
git log --oneline -10
```

### Documentation
- Read the full research document for deep theory
- Check `.claude/CLAUDE.md` for operational directives
- Review individual command docs in `.claude/commands/`

---

## SUCCESS METRICS

After completing Day 1, you should be able to:

✅ Explain how the Fractal Worktree architecture prevents context pollution
✅ Describe the Tri-Layer Memory system (LTM, Recitation, Ephemeral)
✅ Use CCPM commands to manage product workflows
✅ Spawn and sync parallel agent environments
✅ Rely on hooks to prevent AI safety failures
✅ Maintain the Memory Bank as source of truth

---

## CONGRATULATIONS! 🎉

You now have a production-grade AI-native development environment.

**Your agents can now**:
- Work in parallel without conflicts
- Maintain architectural consistency via Memory Bank
- Operate safely within deterministic guardrails
- Follow structured product workflows (CCPM)
- Scale to 10x, 50x, or 100x parallel streams

**Welcome to the Autonomous Software Forge.**

---

**Questions?** Check the research document or open an issue in your project repo.

**Next**: Read `.claude/commands/prd-new.md` to start building your first feature.
