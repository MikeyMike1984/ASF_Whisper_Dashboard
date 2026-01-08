#!/usr/bin/env python3
"""
PRE-TOOL-USE HOOK: Security & Protocol Enforcement
Purpose: Intercept and validate all tool calls before execution

Policies:
  1. Block editing of sensitive files (.env, .git/, package-lock.json)
  2. Block dangerous bash commands (rm -rf, wget | bash, etc.)
  3. Enforce TDD workflow (warn if committing without tests)
  4. Block unauthorized git operations in worktrees
  5. Enforce session initialization before code modifications
  6. Enforce agent consultation gates before commits/merges
  7. Enforce recitation loop compliance
  8. Enforce CCPM 5-phase governance (PRD -> Epic -> Decompose -> Sync -> Execute)
"""

import sys
import json
import re
import os
import time
from pathlib import Path

# ANSI color codes for terminal output
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
NC = '\033[0m'  # No Color

# State files
SESSION_STATE_FILE = ".claude/.session_state.json"
TDD_STATE_FILE = ".claude/.tdd_state.json"
SYNC_STATE_FILE = ".claude/.last_sync.json"
AGENT_LOG_FILE = ".claude/.agent_consultations.json"
RECITATION_LOG_FILE = ".claude/.recitation_log.json"
CCPM_STATE_FILE = ".claude/.ccpm_state.json"

# CCPM directories
PRD_DIR = ".claude/prds"
EPIC_DIR = ".claude/epics"

# Thresholds
RECITATION_WARNING_THRESHOLD = 3
RECITATION_BLOCKING_THRESHOLD = 5
SYNC_TIMEOUT = 3600  # 1 hour

# CCPM Phases
CCPM_PHASES = ['brainstorm', 'plan', 'decompose', 'sync', 'execute']


def log_error(message):
    """Print error message to stderr"""
    print(f"{RED}🛑 HOOK BLOCKED:{NC} {message}", file=sys.stderr)


def log_warning(message):
    """Print warning message to stderr"""
    print(f"{YELLOW}⚠️  HOOK WARNING:{NC} {message}", file=sys.stderr)


def log_info(message):
    """Print info message to stderr"""
    print(f"{BLUE}ℹ️  HOOK INFO:{NC} {message}", file=sys.stderr)


def log_protocol(message):
    """Print protocol reminder to stderr"""
    print(f"{CYAN}📋 PROTOCOL:{NC} {message}", file=sys.stderr)


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
# SESSION STATE MANAGEMENT
# =============================================================================

def get_session_state():
    """Read session state from file"""
    default_state = {
        'initialized': False,
        'memory_bank_read': {
            'projectbrief': False,
            'systemPatterns': False,
            'activeContext': False,
            'decisionLog': False
        },
        'actions_since_recitation': 0,
        'significant_actions': 0,
        'session_start': time.time()
    }

    try:
        if os.path.exists(SESSION_STATE_FILE):
            with open(SESSION_STATE_FILE, 'r') as f:
                state = json.load(f)
                # Check if session is stale (>4 hours)
                if time.time() - state.get('session_start', 0) > 14400:
                    return default_state
                return state
    except (json.JSONDecodeError, IOError):
        pass
    return default_state


def update_session_state(state):
    """Update session state file"""
    try:
        os.makedirs(os.path.dirname(SESSION_STATE_FILE), exist_ok=True)
        with open(SESSION_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError:
        pass


def mark_memory_bank_read(file_path, state):
    """Mark a memory bank file as read in session state"""
    key_map = {
        'projectbrief.md': 'projectbrief',
        'systemPatterns.md': 'systemPatterns',
        'activeContext.md': 'activeContext',
        'decisionLog.md': 'decisionLog'
    }

    for file_key, state_key in key_map.items():
        if file_key in file_path:
            state['memory_bank_read'][state_key] = True
            break

    # Check if core files are read (initialization complete)
    mb = state['memory_bank_read']
    if mb['projectbrief'] and mb['systemPatterns'] and mb['activeContext']:
        state['initialized'] = True

    update_session_state(state)
    return state


def check_session_initialized(state):
    """Check if session has been properly initialized"""
    if not state.get('initialized', False):
        mb = state.get('memory_bank_read', {})
        missing = []
        if not mb.get('projectbrief'):
            missing.append('memory-bank/projectbrief.md')
        if not mb.get('systemPatterns'):
            missing.append('memory-bank/systemPatterns.md')
        if not mb.get('activeContext'):
            missing.append('memory-bank/activeContext.md')

        return False, missing
    return True, []


# =============================================================================
# AGENT CONSULTATION TRACKING
# =============================================================================

def get_agent_consultations():
    """Get list of agents consulted in this session"""
    try:
        if os.path.exists(AGENT_LOG_FILE):
            with open(AGENT_LOG_FILE, 'r') as f:
                consultations = json.load(f)
                # Filter to current session (last 4 hours)
                cutoff = time.time() - 14400
                return [c for c in consultations if c.get('timestamp', 0) > cutoff]
    except (json.JSONDecodeError, IOError):
        pass
    return []


def check_agent_gates(action_type):
    """Check if required agents have been consulted for an action"""
    consultations = get_agent_consultations()
    consulted_agents = [c.get('agent', '').lower() for c in consultations]

    if action_type == 'commit':
        if 'qa-engineer' not in consulted_agents and 'qa' not in consulted_agents:
            return {
                'blocked': True,
                'reason': "QA Engineer review required before commit",
                'required': ['qa-engineer'],
                'suggestion': (
                    "Invoke QA Engineer agent to review your changes:\n"
                    "Use Task tool with: ACTIVATE PERSONA: QA Engineer\n"
                    "Or run tests and document review in activeContext.md"
                )
            }

    elif action_type in ['push', 'merge']:
        missing = []
        if 'architect' not in consulted_agents:
            missing.append('architect')
        if 'security-auditor' not in consulted_agents and 'security' not in consulted_agents:
            missing.append('security-auditor')

        if missing:
            return {
                'blocked': True,
                'reason': f"Required agent reviews missing: {', '.join(missing)}",
                'required': missing,
                'suggestion': (
                    "Before pushing/merging, consult:\n"
                    "1. Architect agent for architectural approval\n"
                    "2. Security Auditor agent for security review\n"
                    "Document approvals in activeContext.md"
                )
            }

    return None


# =============================================================================
# RECITATION LOOP ENFORCEMENT
# =============================================================================

def get_recitation_state():
    """Get recitation loop state"""
    try:
        if os.path.exists(SESSION_STATE_FILE):
            with open(SESSION_STATE_FILE, 'r') as f:
                state = json.load(f)
                return {
                    'actions_since_recitation': state.get('actions_since_recitation', 0),
                    'last_recitation': state.get('last_recitation'),
                    'significant_actions': state.get('significant_actions', 0)
                }
    except (json.JSONDecodeError, IOError):
        pass
    return {'actions_since_recitation': 0, 'last_recitation': None, 'significant_actions': 0}


def record_significant_action(action_type, description):
    """Record a significant action for recitation tracking"""
    state = get_session_state()
    state['significant_actions'] = state.get('significant_actions', 0) + 1
    state['actions_since_recitation'] = state.get('actions_since_recitation', 0) + 1
    update_session_state(state)

    # Log to recitation log
    try:
        os.makedirs(os.path.dirname(RECITATION_LOG_FILE), exist_ok=True)
        log = []
        if os.path.exists(RECITATION_LOG_FILE):
            with open(RECITATION_LOG_FILE, 'r') as f:
                log = json.load(f)

        log.append({
            'timestamp': time.time(),
            'type': action_type,
            'description': description[:200]  # Truncate long descriptions
        })
        log = log[-50:]  # Keep last 50

        with open(RECITATION_LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)
    except (json.JSONDecodeError, IOError):
        pass


def check_recitation_compliance():
    """Check if recitation loop is being followed"""
    recitation = get_recitation_state()
    actions = recitation.get('actions_since_recitation', 0)

    if actions >= RECITATION_BLOCKING_THRESHOLD:
        return {
            'level': 'blocking',
            'message': (
                f"RECITATION REQUIRED: {actions} significant actions without updating activeContext.md. "
                "Update memory-bank/activeContext.md before continuing."
            ),
            'actions': actions
        }
    elif actions >= RECITATION_WARNING_THRESHOLD:
        return {
            'level': 'warning',
            'message': (
                f"Recitation recommended: {actions} actions since last activeContext.md update. "
                "Consider updating to preserve context."
            ),
            'actions': actions
        }
    return None


def reset_recitation_counter():
    """Reset recitation counter (called when activeContext.md is updated)"""
    state = get_session_state()
    state['actions_since_recitation'] = 0
    state['last_recitation'] = time.time()
    update_session_state(state)


# =============================================================================
# CCPM (Claude Code Project Management) ENFORCEMENT
# =============================================================================

def get_ccpm_state():
    """Get CCPM state tracking for features"""
    try:
        if os.path.exists(CCPM_STATE_FILE):
            with open(CCPM_STATE_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {'features': {}, 'current_feature': None}


def update_ccpm_state(state):
    """Update CCPM state file"""
    try:
        os.makedirs(os.path.dirname(CCPM_STATE_FILE), exist_ok=True)
        with open(CCPM_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except IOError:
        pass


def detect_feature_from_path(file_path):
    """Detect feature name from file path (e.g., feature/my-feature -> my-feature)"""
    # Match patterns like 'feature/feature-name/' or 'feature\\feature-name\\'
    match = re.search(r'feature[/\\]([^/\\]+)', file_path)
    if match:
        return match.group(1)
    return None


def get_prd_for_feature(feature_name):
    """Check if PRD exists for a feature"""
    prd_patterns = [
        os.path.join(PRD_DIR, f"{feature_name}.md"),
        os.path.join(PRD_DIR, f"{feature_name.replace('-', '_')}.md"),
        os.path.join(PRD_DIR, f"{feature_name.replace('_', '-')}.md"),
    ]

    for prd_path in prd_patterns:
        if os.path.exists(prd_path):
            return prd_path

    # Check for any PRD that mentions the feature
    if os.path.isdir(PRD_DIR):
        for filename in os.listdir(PRD_DIR):
            if filename.endswith('.md'):
                feature_lower = feature_name.lower().replace('-', '').replace('_', '')
                file_lower = filename.lower().replace('-', '').replace('_', '').replace('.md', '')
                if feature_lower in file_lower or file_lower in feature_lower:
                    return os.path.join(PRD_DIR, filename)

    return None


def get_epic_for_feature(feature_name):
    """Check if Epic decomposition exists for a feature"""
    epic_patterns = [
        os.path.join(EPIC_DIR, feature_name),
        os.path.join(EPIC_DIR, feature_name.replace('-', '_')),
        os.path.join(EPIC_DIR, feature_name.replace('_', '-')),
    ]

    for epic_path in epic_patterns:
        if os.path.isdir(epic_path):
            # Check if epic has tasks
            task_files = [f for f in os.listdir(epic_path) if f.endswith('.md') and f != 'README.md']
            if task_files:
                return epic_path

    return None


def check_ccpm_phase_compliance(feature_name, action_type):
    """
    Check if the current action is allowed based on CCPM phase requirements.

    CCPM requires:
    1. PRD must exist before implementation
    2. Epic must be decomposed before coding
    3. Product Manager consulted for requirements changes
    """
    result = {
        'compliant': True,
        'phase': 'execute',
        'warnings': [],
        'blocks': []
    }

    if not feature_name:
        return result

    # Check PRD existence
    prd_path = get_prd_for_feature(feature_name)
    if not prd_path:
        result['compliant'] = False
        result['phase'] = 'brainstorm'
        result['blocks'].append({
            'reason': f"CCPM VIOLATION: No PRD found for feature '{feature_name}'",
            'suggestion': (
                f"Before implementing, create a PRD using:\n"
                f"  /prd-new {feature_name}\n\n"
                f"Or manually create: {PRD_DIR}/{feature_name}.md"
            )
        })
        return result

    # Check Epic decomposition
    epic_path = get_epic_for_feature(feature_name)
    if not epic_path:
        result['phase'] = 'plan'
        if action_type in ['code_edit', 'implementation']:
            result['warnings'].append({
                'level': 'warning',
                'message': (
                    f"CCPM WARNING: No epic decomposition found for '{feature_name}'. "
                    f"Consider running: /epic-decompose {feature_name}"
                )
            })
    else:
        result['phase'] = 'execute'

    return result


def check_product_manager_consultation(feature_name, action_type):
    """Check if Product Manager was consulted for requirements changes"""
    if action_type != 'requirements_change':
        return None

    consultations = get_agent_consultations()
    pm_consulted = any(
        c.get('agent', '').lower() in ['product-manager', 'product_manager', 'pm']
        for c in consultations
    )

    if not pm_consulted:
        return {
            'blocked': False,  # Warn, don't block
            'reason': (
                f"CCPM RECOMMENDATION: Product Manager should be consulted for "
                f"requirements changes to feature '{feature_name}'"
            ),
            'suggestion': (
                "Invoke Product Manager agent to review requirements:\n"
                "Use Task tool with: ACTIVATE PERSONA: Product Manager"
            )
        }

    return None


def is_implementation_file(file_path):
    """Check if the file is an implementation file (not test, config, or docs)"""
    # Exclude test files
    if '.test.' in file_path or '__tests__' in file_path or 'test_' in file_path:
        return False

    # Exclude config files
    config_patterns = [
        r'\.config\.',
        r'tsconfig',
        r'jest\.config',
        r'package\.json',
        r'\.eslint',
        r'\.prettier',
    ]
    for pattern in config_patterns:
        if re.search(pattern, file_path):
            return False

    # Exclude documentation
    if file_path.endswith('.md') and 'src/' not in file_path:
        return False

    # Implementation files are typically in src/
    return '/src/' in file_path or '\\src\\' in file_path


# =============================================================================
# POLICY 1: NO-FLY ZONE FOR FILES
# =============================================================================
RESTRICTED_FILE_PATTERNS = [
    r'\.env$',
    r'\.env\.',
    r'\.git/',
    r'\.bare/',
    r'package-lock\.json$',
    r'yarn\.lock$',
    r'pnpm-lock\.yaml$',
    r'composer\.lock$',
    r'Gemfile\.lock$',
    r'\.aws/credentials',
    r'\.ssh/id_',
    r'\.gnupg/',
    r'node_modules/',
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
# POLICY 4: TDD ENFORCEMENT
# =============================================================================
TDD_STATE_TIMEOUT = 900  # 15 minutes

def get_tdd_state():
    """Read TDD state from file"""
    try:
        if os.path.exists(TDD_STATE_FILE):
            with open(TDD_STATE_FILE, 'r') as f:
                state = json.load(f)
                if time.time() - state.get('timestamp', 0) < TDD_STATE_TIMEOUT:
                    return state
    except (json.JSONDecodeError, IOError):
        pass
    return None


def check_tdd_compliance(command):
    """Check TDD compliance for commits"""
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
# POLICY 5: RECITATION VERIFICATION BEFORE DELETION
# =============================================================================

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
    """Check if memory was synced recently before allowing worktree deletion"""
    deletion_patterns = [
        r'git\s+worktree\s+remove',
        r'cleanup-worktree\.sh',
        r'rm\s+-rf.*worktree',
    ]

    for pattern in deletion_patterns:
        if re.search(pattern, command, re.IGNORECASE):
            last_sync = get_last_sync_time()
            current_time = time.time()

            if last_sync == 0:
                return (True,
                    "RECITATION GATE: No memory sync detected. "
                    "Run `/memory-update` before deleting to prevent context loss."
                )

            time_since_sync = current_time - last_sync
            if time_since_sync > SYNC_TIMEOUT:
                minutes_ago = int(time_since_sync / 60)
                return (True,
                    f"RECITATION GATE: Last memory sync was {minutes_ago} minutes ago. "
                    "Run `/memory-update` to capture recent work before deleting."
                )

    return (False, None)


# =============================================================================
# POLICY 6: SESSION INITIALIZATION ENFORCEMENT
# =============================================================================

def check_initialization_required(tool_name, tool_input):
    """Check if session initialization is required before this action"""
    state = get_session_state()
    initialized, missing = check_session_initialized(state)

    if initialized:
        return None

    # Actions that require initialization
    blocking_tools = ['Write', 'Edit', 'NotebookEdit']

    if tool_name in blocking_tools:
        file_path = tool_input.get('file_path', '')
        # Allow writing to .claude/ directory (session state, etc.)
        if '.claude/' in file_path or '.claude\\' in file_path:
            return None
        # Allow writing to test files (TDD)
        if '.test.' in file_path or '__tests__' in file_path or 'test_' in file_path:
            return None

        return {
            'blocked': True,
            'reason': "SESSION NOT INITIALIZED: Cannot modify code without reading Memory Bank",
            'missing': missing,
            'suggestion': (
                "Before writing code, you MUST read:\n"
                + "\n".join([f"  - {f}" for f in missing]) +
                "\n\nThis ensures you have project context before making changes."
            )
        }

    if tool_name == 'Bash':
        command = tool_input.get('command', '')
        # Block git commits without initialization
        if re.search(r'git\s+commit', command, re.IGNORECASE):
            return {
                'blocked': True,
                'reason': "SESSION NOT INITIALIZED: Cannot commit without reading Memory Bank",
                'missing': missing,
                'suggestion': (
                    "Before committing, read Memory Bank files to ensure you understand project context."
                )
            }

    return None


# =============================================================================
# MAIN HOOK LOGIC
# =============================================================================
def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        log_error(f"Failed to parse hook input: {e}")
        allow_action()
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if not tool_name:
        allow_action()
        return

    state = get_session_state()

    # -------------------------------------------------------------------------
    # CHECK: Session initialization (POLICY 6)
    # -------------------------------------------------------------------------
    init_check = check_initialization_required(tool_name, tool_input)
    if init_check and init_check.get('blocked'):
        block_action(
            init_check['reason'],
            suggestion=init_check.get('suggestion')
        )

    # -------------------------------------------------------------------------
    # CHECK: CCPM Phase Compliance (POLICY 8)
    # -------------------------------------------------------------------------
    if tool_name in ["Write", "Edit", "NotebookEdit"]:
        file_path = tool_input.get("file_path", "")
        feature_name = detect_feature_from_path(file_path)

        if feature_name and is_implementation_file(file_path):
            ccpm_check = check_ccpm_phase_compliance(feature_name, 'code_edit')

            # Block if PRD is missing
            if not ccpm_check['compliant'] and ccpm_check['blocks']:
                for block in ccpm_check['blocks']:
                    # For now, warn instead of block to avoid disrupting workflow
                    log_warning(block['reason'])
                    log_protocol(block.get('suggestion', ''))

            # Warn if epic is missing
            for warning in ccpm_check.get('warnings', []):
                log_warning(warning['message'])

            # Track current feature in CCPM state
            ccpm_state = get_ccpm_state()
            ccpm_state['current_feature'] = feature_name
            if feature_name not in ccpm_state['features']:
                ccpm_state['features'][feature_name] = {
                    'phase': ccpm_check['phase'],
                    'started': time.time(),
                    'prd_exists': get_prd_for_feature(feature_name) is not None,
                    'epic_exists': get_epic_for_feature(feature_name) is not None
                }
            update_ccpm_state(ccpm_state)

    # -------------------------------------------------------------------------
    # TRACK: Memory Bank file reads
    # -------------------------------------------------------------------------
    if tool_name == "Read":
        file_path = tool_input.get("file_path", "")
        if 'memory-bank' in file_path or 'memory_bank' in file_path:
            state = mark_memory_bank_read(file_path, state)
            log_info(f"Memory Bank file read: {os.path.basename(file_path)}")

        # Check for activeContext.md updates (reset recitation counter)
        if 'activeContext.md' in file_path:
            # Reading activeContext is part of recitation
            pass

    # -------------------------------------------------------------------------
    # TRACK: activeContext.md writes (reset recitation counter)
    # -------------------------------------------------------------------------
    if tool_name in ["Write", "Edit"]:
        file_path = tool_input.get("file_path", "")
        if 'activeContext.md' in file_path:
            reset_recitation_counter()
            log_info("Recitation loop: activeContext.md updated")

    # -------------------------------------------------------------------------
    # CHECK: File editing restrictions (POLICY 1)
    # -------------------------------------------------------------------------
    if tool_name in ["Write", "Edit", "NotebookEdit"]:
        file_path = tool_input.get("file_path", "")

        if file_path:
            restricted_pattern = check_file_restrictions(file_path)
            if restricted_pattern:
                block_action(
                    f"SECURITY VIOLATION: Cannot edit '{file_path}'. "
                    f"Matches restricted pattern: {restricted_pattern}",
                    suggestion=(
                        "If you need to modify environment variables, edit "
                        "'shared-config/.env.template' instead."
                    )
                )

        # Track as significant action for recitation
        if not ('.claude/' in file_path or 'activeContext.md' in file_path):
            record_significant_action('file_edit', f"Edited {os.path.basename(file_path)}")

    # -------------------------------------------------------------------------
    # CHECK: Bash command restrictions (POLICIES 2, 3, 4, 5, AGENT GATES)
    # -------------------------------------------------------------------------
    if tool_name == "Bash":
        command = tool_input.get("command", "")

        if not command:
            allow_action()
            return

        # Check for dangerous commands (POLICY 2)
        danger_reason = check_dangerous_commands(command)
        if danger_reason:
            block_action(
                f"SAFETY INTERVENTION: {danger_reason}",
                suggestion="Ask the user to run this command manually if absolutely necessary."
            )

        # Check for restricted git commands (POLICY 3)
        git_restriction = check_git_restrictions(command)
        if git_restriction:
            block_action(
                f"GIT SAFETY: Command '{git_restriction}' is restricted in worktrees",
                suggestion="Only branch-specific operations are allowed in worktrees."
            )

        # Check recitation before deletion (POLICY 5)
        should_block_deletion, deletion_message = check_recitation_before_deletion(command)
        if should_block_deletion:
            block_action(
                deletion_message,
                suggestion="Run `/memory-update` first to preserve your work."
            )

        # Check agent gates for commits
        if re.search(r'git\s+commit', command, re.IGNORECASE):
            # CCPM: Verify governance compliance for commit
            ccpm_state = get_ccpm_state()
            current_feature = ccpm_state.get('current_feature')

            if current_feature:
                feature_info = ccpm_state.get('features', {}).get(current_feature, {})

                # Warn if PRD doesn't exist
                if not feature_info.get('prd_exists', True):
                    log_warning(
                        f"CCPM GOVERNANCE: Committing to '{current_feature}' without PRD. "
                        "Consider running /prd-new first."
                    )

                # Warn if Epic doesn't exist
                if not feature_info.get('epic_exists', True):
                    log_warning(
                        f"CCPM GOVERNANCE: Committing to '{current_feature}' without Epic decomposition. "
                        "Consider running /epic-decompose first."
                    )

            agent_gate = check_agent_gates('commit')
            if agent_gate and agent_gate.get('blocked'):
                # For commits, warn but don't block (allow override)
                log_warning(agent_gate['reason'])
                log_protocol(agent_gate.get('suggestion', ''))
                # Record as significant action
                record_significant_action('git_commit', 'Committed changes')

        # Check agent gates for push/merge
        if re.search(r'git\s+push', command, re.IGNORECASE):
            agent_gate = check_agent_gates('push')
            if agent_gate and agent_gate.get('blocked'):
                block_action(
                    agent_gate['reason'],
                    suggestion=agent_gate.get('suggestion')
                )

        if re.search(r'git\s+merge', command, re.IGNORECASE):
            agent_gate = check_agent_gates('merge')
            if agent_gate and agent_gate.get('blocked'):
                block_action(
                    agent_gate['reason'],
                    suggestion=agent_gate.get('suggestion')
                )

        # Check TDD compliance (POLICY 4)
        should_warn, tdd_message = check_tdd_compliance(command)
        if should_warn and tdd_message:
            warn_action(f"TDD REMINDER: {tdd_message}")

        # Track test runs as significant actions
        test_patterns = [r'npm\s+(run\s+)?test', r'pytest', r'jest', r'cargo\s+test']
        for pattern in test_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                record_significant_action('test_run', 'Ran tests')
                break

    # -------------------------------------------------------------------------
    # CHECK: Recitation loop compliance
    # -------------------------------------------------------------------------
    recitation_check = check_recitation_compliance()
    if recitation_check:
        if recitation_check['level'] == 'blocking':
            # For blocking level, warn strongly but allow (user can override)
            log_warning(recitation_check['message'])
            log_protocol("Update memory-bank/activeContext.md to continue smoothly.")
        elif recitation_check['level'] == 'warning':
            log_warning(recitation_check['message'])

    # -------------------------------------------------------------------------
    # CHECK: Read restrictions (warn for sensitive files)
    # -------------------------------------------------------------------------
    if tool_name == "Read":
        file_path = tool_input.get("file_path", "")
        if re.search(r'\.env$', file_path) and not re.search(r'\.env\.template$', file_path):
            warn_action(f"Reading '{file_path}'. NEVER commit secrets or hardcode them.")

    # -------------------------------------------------------------------------
    # All checks passed - allow action
    # -------------------------------------------------------------------------
    allow_action()


if __name__ == "__main__":
    main()
