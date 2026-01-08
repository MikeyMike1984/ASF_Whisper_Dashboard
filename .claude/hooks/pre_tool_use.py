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
