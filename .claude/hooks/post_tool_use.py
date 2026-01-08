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
