#!/usr/bin/env python3
"""
ASF Environment Validation Script
Purpose: Validate the ASF environment before starting a new session

Checks:
1. Required files exist (Memory Bank, CLAUDE.md, hooks)
2. Git worktree is properly configured
3. Hook scripts are executable
4. State files are valid
5. No stale session data

Usage:
    python scripts/validate-environment.py [--fix] [--verbose]

Options:
    --fix       Attempt to fix issues automatically
    --verbose   Show detailed output
    --reset     Reset session state for fresh start
"""

import os
import sys
import json
import argparse
import time
from pathlib import Path

# ANSI color codes
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
NC = '\033[0m'


class EnvironmentValidator:
    """Validates ASF environment configuration"""

    def __init__(self, verbose=False):
        self.verbose = verbose
        self.errors = []
        self.warnings = []
        self.fixes_applied = []

    def log(self, message, level='info'):
        """Log a message with color"""
        if level == 'error':
            print(f"{RED}[ERROR]{NC} {message}")
        elif level == 'warning':
            print(f"{YELLOW}[WARN]{NC} {message}")
        elif level == 'success':
            print(f"{GREEN}[OK]{NC} {message}")
        elif level == 'info' and self.verbose:
            print(f"{BLUE}[INFO]{NC} {message}")
        elif level == 'fix':
            print(f"{CYAN}[FIX]{NC} {message}")

    def check_file_exists(self, path, description, required=True):
        """Check if a file exists"""
        if os.path.exists(path):
            self.log(f"{description}: {path}", 'success')
            return True
        else:
            if required:
                self.errors.append(f"Missing required file: {path}")
                self.log(f"Missing: {description} ({path})", 'error')
            else:
                self.warnings.append(f"Optional file missing: {path}")
                self.log(f"Missing (optional): {description}", 'warning')
            return False

    def check_directory_exists(self, path, description, required=True):
        """Check if a directory exists"""
        if os.path.isdir(path):
            self.log(f"{description}: {path}", 'success')
            return True
        else:
            if required:
                self.errors.append(f"Missing required directory: {path}")
                self.log(f"Missing directory: {description} ({path})", 'error')
            else:
                self.warnings.append(f"Optional directory missing: {path}")
                self.log(f"Missing directory (optional): {description}", 'warning')
            return False

    def validate_memory_bank(self):
        """Validate Memory Bank files"""
        print(f"\n{CYAN}=== Checking Memory Bank ==={NC}")

        memory_bank_files = [
            ('memory-bank/projectbrief.md', 'Project Brief', True),
            ('memory-bank/systemPatterns.md', 'System Patterns', True),
            ('memory-bank/activeContext.md', 'Active Context', True),
            ('memory-bank/productContext.md', 'Product Context', True),
            ('memory-bank/techContext.md', 'Tech Context', True),
            ('memory-bank/progress.md', 'Progress Log', True),
            ('memory-bank/decisionLog.md', 'Decision Log', True),
        ]

        all_present = True
        for path, description, required in memory_bank_files:
            if not self.check_file_exists(path, description, required):
                all_present = False

        return all_present

    def validate_claude_config(self):
        """Validate Claude configuration files"""
        print(f"\n{CYAN}=== Checking Claude Configuration ==={NC}")

        config_files = [
            ('.claude/CLAUDE.md', 'Main Directives', True),
            ('.claude/PROTOCOL_ENFORCEMENT.md', 'Protocol Enforcement', True),
            ('.claude/settings.json', 'Settings', False),
        ]

        all_present = True
        for path, description, required in config_files:
            if not self.check_file_exists(path, description, required):
                all_present = False

        return all_present

    def validate_hooks(self):
        """Validate hook scripts"""
        print(f"\n{CYAN}=== Checking Hooks ==={NC}")

        hooks = [
            ('.claude/hooks/pre_tool_use.py', 'Pre-Tool-Use Hook', True),
            ('.claude/hooks/post_tool_use.py', 'Post-Tool-Use Hook', True),
            ('.claude/hooks/user_prompt_submit.sh', 'User Prompt Hook', True),
            ('.claude/hooks/session_tracker.py', 'Session Tracker', True),
            ('.claude/hooks/notification.py', 'Notification Hook', False),
        ]

        all_present = True
        for path, description, required in hooks:
            if not self.check_file_exists(path, description, required):
                all_present = False

        return all_present

    def validate_commands(self):
        """Validate custom commands"""
        print(f"\n{CYAN}=== Checking Commands ==={NC}")

        commands = [
            ('.claude/commands/prd-new.md', 'PRD Generation', True),
            ('.claude/commands/epic-decompose.md', 'Epic Decomposition', True),
            ('.claude/commands/memory-update.md', 'Memory Update', True),
            ('.claude/commands/worktree-sync.md', 'Worktree Sync', True),
            ('.claude/commands/session-init.md', 'Session Init', True),
        ]

        all_present = True
        for path, description, required in commands:
            if not self.check_file_exists(path, description, required):
                all_present = False

        return all_present

    def validate_agents(self):
        """Validate agent persona definitions"""
        print(f"\n{CYAN}=== Checking Agent Personas ==={NC}")

        agents = [
            ('.claude/agents/architect.md', 'Architect', True),
            ('.claude/agents/qa-engineer.md', 'QA Engineer', True),
            ('.claude/agents/security-auditor.md', 'Security Auditor', True),
            ('.claude/agents/product-manager.md', 'Product Manager', True),
        ]

        all_present = True
        for path, description, required in agents:
            if not self.check_file_exists(path, description, required):
                all_present = False

        return all_present

    def validate_worktrees(self):
        """Check worktree configuration"""
        print(f"\n{CYAN}=== Checking Worktree Structure ==={NC}")

        # Check if we're in a git repo
        if os.path.exists('.git') or os.path.exists('.bare'):
            self.log("Git repository detected", 'success')
        else:
            self.warnings.append("Not in a git repository root")
            self.log("Not in git repository root", 'warning')

        # Check for worktree directories
        worktrees = [
            'feature/swarm-pulse-sdk',
            'feature/agent-integration',
            'feature/dashboard-renderer',
            'feature/launcher',
        ]

        for worktree in worktrees:
            if os.path.isdir(worktree):
                self.log(f"Worktree exists: {worktree}", 'success')
            else:
                self.log(f"Worktree not found: {worktree}", 'info')

        return True

    def validate_session_state(self):
        """Check session state files"""
        print(f"\n{CYAN}=== Checking Session State ==={NC}")

        state_files = [
            '.claude/.session_state.json',
            '.claude/.context_state.json',
            '.claude/.tdd_state.json',
        ]

        for path in state_files:
            if os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        state = json.load(f)

                    # Check for stale session (>4 hours)
                    if 'session_start' in state:
                        age = time.time() - state.get('session_start', 0)
                        if age > 14400:  # 4 hours
                            self.warnings.append(f"Stale session data in {path} ({int(age/3600)} hours old)")
                            self.log(f"Stale session: {path} ({int(age/3600)}h old)", 'warning')
                        else:
                            self.log(f"Valid session state: {path}", 'success')
                    else:
                        self.log(f"State file exists: {path}", 'success')

                except json.JSONDecodeError:
                    self.warnings.append(f"Invalid JSON in {path}")
                    self.log(f"Invalid JSON: {path}", 'warning')
            else:
                self.log(f"No state file (will be created): {path}", 'info')

        return True

    def reset_session_state(self):
        """Reset all session state files for a fresh start"""
        print(f"\n{CYAN}=== Resetting Session State ==={NC}")

        state_files = [
            '.claude/.session_state.json',
            '.claude/.context_state.json',
            '.claude/.tdd_state.json',
            '.claude/.agent_consultations.json',
            '.claude/.recitation_log.json',
            '.claude/.compliance_log.json',
        ]

        for path in state_files:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    self.log(f"Removed: {path}", 'fix')
                    self.fixes_applied.append(f"Removed stale state file: {path}")
                except IOError as e:
                    self.log(f"Failed to remove {path}: {e}", 'error')

        # Create fresh session state
        fresh_state = {
            'session_id': f"session-{int(time.time())}",
            'session_start': time.time(),
            'initialized': False,
            'memory_bank_read': {
                'projectbrief': False,
                'systemPatterns': False,
                'activeContext': False,
                'decisionLog': False
            },
            'actions_since_recitation': 0,
            'significant_actions': 0,
            'agents_consulted': []
        }

        try:
            os.makedirs('.claude', exist_ok=True)
            with open('.claude/.session_state.json', 'w') as f:
                json.dump(fresh_state, f, indent=2)
            self.log("Created fresh session state", 'fix')
            self.fixes_applied.append("Created fresh session state")
        except IOError as e:
            self.log(f"Failed to create session state: {e}", 'error')

    def create_missing_directories(self):
        """Create missing directories"""
        directories = [
            '.claude',
            '.claude/hooks',
            '.claude/commands',
            '.claude/agents',
            '.claude/prds',
            '.claude/epics',
            'memory-bank',
        ]

        for directory in directories:
            if not os.path.exists(directory):
                try:
                    os.makedirs(directory, exist_ok=True)
                    self.log(f"Created directory: {directory}", 'fix')
                    self.fixes_applied.append(f"Created directory: {directory}")
                except IOError as e:
                    self.log(f"Failed to create {directory}: {e}", 'error')

    def print_summary(self):
        """Print validation summary"""
        print(f"\n{CYAN}{'='*60}{NC}")
        print(f"{CYAN}=== VALIDATION SUMMARY ==={NC}")
        print(f"{CYAN}{'='*60}{NC}\n")

        if self.errors:
            print(f"{RED}ERRORS ({len(self.errors)}):{NC}")
            for error in self.errors:
                print(f"  - {error}")
            print()

        if self.warnings:
            print(f"{YELLOW}WARNINGS ({len(self.warnings)}):{NC}")
            for warning in self.warnings:
                print(f"  - {warning}")
            print()

        if self.fixes_applied:
            print(f"{CYAN}FIXES APPLIED ({len(self.fixes_applied)}):{NC}")
            for fix in self.fixes_applied:
                print(f"  - {fix}")
            print()

        if not self.errors:
            print(f"{GREEN}Environment validation PASSED{NC}")
            print(f"\n{CYAN}Ready to start session. Remember to:{NC}")
            print("  1. Read memory-bank/projectbrief.md")
            print("  2. Read memory-bank/systemPatterns.md")
            print("  3. Read memory-bank/activeContext.md")
            print("  4. Confirm: 'Session initialized. Memory Bank loaded.'")
            return True
        else:
            print(f"{RED}Environment validation FAILED{NC}")
            print("Fix the errors above before starting a session.")
            return False

    def run_all_checks(self, fix=False, reset=False):
        """Run all validation checks"""
        print(f"{CYAN}{'='*60}{NC}")
        print(f"{CYAN}  ASF Environment Validation{NC}")
        print(f"{CYAN}{'='*60}{NC}")

        if reset:
            self.reset_session_state()

        if fix:
            self.create_missing_directories()

        self.validate_memory_bank()
        self.validate_claude_config()
        self.validate_hooks()
        self.validate_commands()
        self.validate_agents()
        self.validate_worktrees()
        self.validate_session_state()

        return self.print_summary()


def main():
    parser = argparse.ArgumentParser(
        description='Validate ASF environment before starting a session'
    )
    parser.add_argument('--fix', action='store_true',
                        help='Attempt to fix issues automatically')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show detailed output')
    parser.add_argument('--reset', action='store_true',
                        help='Reset session state for fresh start')

    args = parser.parse_args()

    validator = EnvironmentValidator(verbose=args.verbose)
    success = validator.run_all_checks(fix=args.fix, reset=args.reset)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
