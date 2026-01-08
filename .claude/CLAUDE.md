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
