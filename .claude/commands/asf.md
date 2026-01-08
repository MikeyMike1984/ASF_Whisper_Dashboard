---
description: "Bootstrap a new Autonomous Software Forge environment in the current directory"
---

# ASF Bootstrap Command

## Purpose
Initialize a new ASF (Autonomous Software Forge) environment by copying and executing the init_forge.sh bootstrap script, then populating Memory Bank from a project details file.

## Execution Steps

### 1. Copy Bootstrap Script
Copy the init_forge.sh from the master location to the current directory:

```bash
cp "C:/Users/mreev/Desktop/Projects/init_forge.sh" ./init_forge.sh
```

### 2. Make Executable
Ensure the script has execute permissions:

```bash
chmod +x ./init_forge.sh
```

### 3. Execute Bootstrap
Run the initialization script:

```bash
./init_forge.sh
```

### 4. Request Project Details File
After bootstrap completes, use the **AskUserQuestion** tool to request the path to a project details markdown file:

**Question**: "Please provide the path to your PROJECT_DETAILS.md file (e.g., C:/Users/username/projects/PROJECT_DETAILS.md)"

The project details file should contain:
- Project name and description
- Tech stack and dependencies
- Architecture overview
- Key requirements
- Success criteria

Example: `C:/Users/mreev/Desktop/Projects/ASF_Agent_Dashboard/PROJECT_DETAILS.md`

### 5. Parse and Populate Memory Bank
Once the user provides the file path:

1. **Read** the PROJECT_DETAILS.md file
2. **Extract** relevant sections:
   - Project vision → `memory-bank/projectbrief.md`
   - Architecture/patterns → `memory-bank/systemPatterns.md`
   - Tech stack → `memory-bank/techContext.md`
   - Current status → `memory-bank/activeContext.md`
3. **Write** the extracted content to the appropriate Memory Bank files in `./main/memory-bank/`

### 6. Confirm Completion
After populating Memory Bank, confirm to the user:
- "ASF environment initialized successfully"
- "Memory Bank populated from [file path]"
- "Navigate to ./main and run `claude` to start"

---

## Project Details File Format

The PROJECT_DETAILS.md file should follow this structure:

```markdown
# Project Name

## Description
[Brief project description]

## Tech Stack
- Language: [e.g., TypeScript]
- Framework: [e.g., Node.js]
- Database: [e.g., SQLite]
- Testing: [e.g., Jest]

## Architecture
[High-level architecture description]

## Key Requirements
1. [Requirement 1]
2. [Requirement 2]

## Success Criteria
- [Criterion 1]
- [Criterion 2]

## Current Status
[Current project phase and progress]
```

---

## What Gets Created

```
./
├── .bare/                    - Git database (bare repo)
├── .claude/                  - Agent configuration
├── memory-bank/             - Long-term memory (populated from your file)
│   ├── projectbrief.md      - Project vision
│   ├── systemPatterns.md    - Architecture standards
│   ├── techContext.md       - Tech stack details
│   └── activeContext.md     - Current status
├── shared-config/           - Shared tooling configs
├── scripts/                 - Automation scripts
├── .asf/                    - SwarmPulse database
└── main/                    - Production worktree
```

---

## Requirements

- Git installed
- Python 3.x installed
- On Windows: Developer Mode enabled OR run as Administrator (for symlinks)
- A PROJECT_DETAILS.md file with your project information
