#!/usr/bin/env python3
"""
POST-TOOL-USE HOOK: Context Management & State Tracking
Purpose: Monitor session state, track context usage, and enforce protocol compliance

Functionality:
  1. Track approximate token usage and trigger compaction warnings
  2. Update TDD state after test commands complete
  3. Log tool usage for analytics and debugging
  4. Track agent consultations from Task tool calls
  5. Monitor recitation loop compliance
  6. Record significant actions for protocol tracking
"""

import sys
import json
import os
import re
import time
from pathlib import Path

# ANSI color codes
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
MAGENTA = '\033[0;35m'
NC = '\033[0m'

# Configuration files
CONTEXT_STATE_FILE = ".claude/.context_state.json"
SESSION_STATE_FILE = ".claude/.session_state.json"
TDD_STATE_FILE = ".claude/.tdd_state.json"
TOOL_LOG_FILE = ".claude/.tool_usage.log"
AGENT_LOG_FILE = ".claude/.agent_consultations.json"
COMPLIANCE_LOG_FILE = ".claude/.compliance_log.json"

# Token thresholds (approximate)
TOKEN_WARNING_THRESHOLD = 50000      # 25% of 200K
TOKEN_COMPACTION_THRESHOLD = 140000  # 70% of 200K
TOKEN_CRITICAL_THRESHOLD = 170000    # 85% of 200K
TOKENS_PER_CHAR = 0.25               # Rough estimate


def log_info(message):
    """Print info message to stderr"""
    print(f"{BLUE}ℹ️  POST-HOOK:{NC} {message}", file=sys.stderr)


def log_warning(message):
    """Print warning message to stderr"""
    print(f"{YELLOW}⚠️  POST-HOOK:{NC} {message}", file=sys.stderr)


def log_critical(message):
    """Print critical message to stderr"""
    print(f"{RED}🚨 POST-HOOK:{NC} {message}", file=sys.stderr)


def log_success(message):
    """Print success message to stderr"""
    print(f"{GREEN}✅ POST-HOOK:{NC} {message}", file=sys.stderr)


def log_protocol(message):
    """Print protocol reminder to stderr"""
    print(f"{CYAN}📋 PROTOCOL:{NC} {message}", file=sys.stderr)


# =============================================================================
# CONTEXT STATE MANAGEMENT
# =============================================================================

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
        'compaction_reminders': 0,
        'files_read': [],
        'files_written': []
    }


def update_context_state(state):
    """Update context state file"""
    try:
        os.makedirs(os.path.dirname(CONTEXT_STATE_FILE), exist_ok=True)
        with open(CONTEXT_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError:
        pass


def estimate_token_increase(tool_input, tool_output):
    """Estimate tokens used by this tool call"""
    input_chars = len(json.dumps(tool_input)) if tool_input else 0
    output_chars = len(str(tool_output)) if tool_output else 0
    return int((input_chars + output_chars) * TOKENS_PER_CHAR)


def check_context_compaction(state):
    """Check if context compaction is needed and return appropriate message"""
    tokens = state.get('estimated_tokens', 0)

    if tokens >= TOKEN_CRITICAL_THRESHOLD:
        return {
            'level': 'critical',
            'usage_percent': round((tokens / 200000) * 100, 1),
            'tokens': tokens,
            'message': (
                f"CRITICAL: Context at {round((tokens/200000)*100)}% capacity (~{tokens:,} tokens). "
                "You MUST run `/memory-update` and compact context NOW."
            ),
            'directive': (
                "<system-directive priority='critical'>\n"
                "CONTEXT LIMIT REACHED. IMMEDIATE ACTION REQUIRED:\n"
                "1. Run /memory-update to sync state to Memory Bank\n"
                "2. Update memory-bank/activeContext.md with current progress\n"
                "3. Summarize key decisions and next steps\n"
                "4. Consider starting a new session\n"
                "</system-directive>"
            )
        }
    elif tokens >= TOKEN_COMPACTION_THRESHOLD:
        return {
            'level': 'compaction',
            'usage_percent': round((tokens / 200000) * 100, 1),
            'tokens': tokens,
            'message': (
                f"Context at {round((tokens/200000)*100)}% capacity (~{tokens:,} tokens). "
                "Run `/memory-update` soon to preserve state."
            )
        }
    elif tokens >= TOKEN_WARNING_THRESHOLD:
        return {
            'level': 'warning',
            'usage_percent': round((tokens / 200000) * 100, 1),
            'tokens': tokens,
            'message': f"Context usage: ~{tokens:,} tokens ({round((tokens/200000)*100)}% capacity)"
        }
    return None


# =============================================================================
# TDD STATE MANAGEMENT
# =============================================================================

def update_tdd_state(tests_passed, tests_run=True):
    """Update TDD state after test execution"""
    try:
        os.makedirs(os.path.dirname(TDD_STATE_FILE), exist_ok=True)
        state = {
            'tests_passed': tests_passed,
            'tests_run': tests_run,
            'timestamp': time.time(),
            'test_running': False
        }
        with open(TDD_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)

        if tests_passed:
            log_success("Tests passed - TDD gate satisfied")
        else:
            log_warning("Tests FAILED - fix before committing")

    except IOError:
        pass


def detect_test_result(command, exit_code, output):
    """Detect if this was a test command and determine pass/fail"""
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
            # Check exit code first
            if exit_code == 0:
                return True, True  # tests_run=True, tests_passed=True

            # Also check output for failure indicators
            output_str = str(output).lower()
            if 'failed' in output_str or 'error' in output_str:
                return True, False  # tests_run=True, tests_passed=False

            return True, exit_code == 0

    return False, None


# =============================================================================
# AGENT CONSULTATION TRACKING
# =============================================================================

def detect_agent_consultation(tool_name, tool_input, tool_output):
    """Detect if this tool call was an agent consultation"""
    if tool_name != "Task":
        return None

    prompt = tool_input.get('prompt', '')
    prompt_lower = prompt.lower()

    # Detect persona activation patterns
    persona_patterns = [
        (r'activate\s+persona[:\s]+architect', 'architect'),
        (r'activate\s+persona[:\s]+qa[- ]?engineer', 'qa-engineer'),
        (r'activate\s+persona[:\s]+security[- ]?auditor', 'security-auditor'),
        (r'activate\s+persona[:\s]+product[- ]?manager', 'product-manager'),
        (r'architect.*review', 'architect'),
        (r'security.*review', 'security-auditor'),
        (r'qa.*review', 'qa-engineer'),
        (r'test.*coverage', 'qa-engineer'),
    ]

    for pattern, agent_name in persona_patterns:
        if re.search(pattern, prompt_lower):
            return {
                'agent': agent_name,
                'prompt': prompt[:500],  # Truncate for storage
                'timestamp': time.time()
            }

    return None


def record_agent_consultation(consultation):
    """Record an agent consultation to the log"""
    try:
        os.makedirs(os.path.dirname(AGENT_LOG_FILE), exist_ok=True)
        log = []
        if os.path.exists(AGENT_LOG_FILE):
            with open(AGENT_LOG_FILE, 'r') as f:
                log = json.load(f)

        log.append(consultation)
        log = log[-100]  # Keep last 100 consultations

        with open(AGENT_LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)

        log_success(f"Agent consultation recorded: {consultation['agent']}")

    except (json.JSONDecodeError, IOError):
        pass


# =============================================================================
# TOOL USAGE LOGGING
# =============================================================================

def log_tool_usage(tool_name, tool_input, tool_output, exit_code, duration_ms):
    """Log tool usage for analytics"""
    try:
        os.makedirs(os.path.dirname(TOOL_LOG_FILE), exist_ok=True)

        # Calculate sizes
        input_size = len(json.dumps(tool_input)) if tool_input else 0
        output_size = len(str(tool_output)) if tool_output else 0

        log_entry = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'tool': tool_name,
            'exit_code': exit_code,
            'input_size': input_size,
            'output_size': output_size,
            'duration_ms': duration_ms
        }

        with open(TOOL_LOG_FILE, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

    except IOError:
        pass


# =============================================================================
# SESSION STATE UPDATES
# =============================================================================

def get_session_state():
    """Read session state"""
    try:
        if os.path.exists(SESSION_STATE_FILE):
            with open(SESSION_STATE_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {}


def update_session_state_field(field, value):
    """Update a specific field in session state"""
    try:
        state = get_session_state()
        state[field] = value
        os.makedirs(os.path.dirname(SESSION_STATE_FILE), exist_ok=True)
        with open(SESSION_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError:
        pass


# =============================================================================
# COMPLIANCE LOGGING
# =============================================================================

def log_compliance_event(event_type, details):
    """Log compliance-related events"""
    try:
        os.makedirs(os.path.dirname(COMPLIANCE_LOG_FILE), exist_ok=True)
        log = []
        if os.path.exists(COMPLIANCE_LOG_FILE):
            with open(COMPLIANCE_LOG_FILE, 'r') as f:
                log = json.load(f)

        log.append({
            'timestamp': time.time(),
            'event': event_type,
            'details': details
        })
        log = log[-200]  # Keep last 200 events

        with open(COMPLIANCE_LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)

    except (json.JSONDecodeError, IOError):
        pass


# =============================================================================
# MAIN HOOK LOGIC
# =============================================================================

def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    tool_output = input_data.get("tool_output", "")
    exit_code = input_data.get("exit_code", 0)

    # Get current context state
    context_state = get_context_state()

    # Update tool call count
    context_state['tool_calls'] = context_state.get('tool_calls', 0) + 1

    # Estimate token increase from this tool call
    token_increase = estimate_token_increase(tool_input, tool_output)
    context_state['estimated_tokens'] = context_state.get('estimated_tokens', 0) + token_increase

    # Track files read/written
    if tool_name == "Read":
        file_path = tool_input.get('file_path', '')
        if file_path:
            files_read = context_state.get('files_read', [])
            if file_path not in files_read:
                files_read.append(file_path)
                context_state['files_read'] = files_read[-50]  # Keep last 50

    if tool_name in ["Write", "Edit"]:
        file_path = tool_input.get('file_path', '')
        if file_path:
            files_written = context_state.get('files_written', [])
            if file_path not in files_written:
                files_written.append(file_path)
                context_state['files_written'] = files_written[-50]

    # Log tool usage
    log_tool_usage(tool_name, tool_input, tool_output, exit_code, 0)

    # -------------------------------------------------------------------------
    # Handle test command completion (TDD tracking)
    # -------------------------------------------------------------------------
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        is_test, tests_passed = detect_test_result(command, exit_code, tool_output)

        if is_test:
            update_tdd_state(tests_passed, tests_run=True)
            log_compliance_event('test_run', {
                'command': command[:200],
                'passed': tests_passed,
                'exit_code': exit_code
            })

    # -------------------------------------------------------------------------
    # Handle agent consultations (Task tool)
    # -------------------------------------------------------------------------
    if tool_name == "Task":
        consultation = detect_agent_consultation(tool_name, tool_input, tool_output)
        if consultation:
            record_agent_consultation(consultation)
            log_compliance_event('agent_consultation', {
                'agent': consultation['agent']
            })

    # -------------------------------------------------------------------------
    # Check context compaction needs
    # -------------------------------------------------------------------------
    compaction_check = check_context_compaction(context_state)
    response = {}

    if compaction_check:
        context_state['compaction_reminders'] = context_state.get('compaction_reminders', 0) + 1

        if compaction_check['level'] == 'critical':
            log_critical(compaction_check['message'])
            response['message'] = compaction_check['message']
            response['system_directive'] = compaction_check.get('directive', '')
            log_compliance_event('context_critical', {
                'tokens': compaction_check['tokens'],
                'usage_percent': compaction_check['usage_percent']
            })

        elif compaction_check['level'] == 'compaction':
            log_warning(compaction_check['message'])
            response['message'] = compaction_check['message']
            log_compliance_event('context_compaction_needed', {
                'tokens': compaction_check['tokens'],
                'usage_percent': compaction_check['usage_percent']
            })

        elif compaction_check['level'] == 'warning':
            # Only show every 10th warning to reduce noise
            if context_state.get('compaction_reminders', 0) % 10 == 0:
                log_info(compaction_check['message'])

    # -------------------------------------------------------------------------
    # Check recitation compliance (from session state)
    # -------------------------------------------------------------------------
    session_state = get_session_state()
    actions_since_recitation = session_state.get('actions_since_recitation', 0)

    if actions_since_recitation >= 5:
        log_warning(f"Recitation overdue: {actions_since_recitation} actions since last activeContext.md update")
        log_protocol("Update memory-bank/activeContext.md to maintain context continuity")
    elif actions_since_recitation >= 3:
        log_info(f"Consider updating activeContext.md ({actions_since_recitation} actions since last update)")

    # -------------------------------------------------------------------------
    # Save updated context state
    # -------------------------------------------------------------------------
    update_context_state(context_state)

    # Output response
    print(json.dumps(response))


if __name__ == "__main__":
    main()
