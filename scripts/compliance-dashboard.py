#!/usr/bin/env python3
"""
ASF Compliance Dashboard
Purpose: Display current protocol adherence status across all ASF enforcement mechanisms

Usage:
    python scripts/compliance-dashboard.py [--json] [--brief]

Options:
    --json    Output in JSON format for programmatic consumption
    --brief   Show only status indicators without details
"""

import os
import sys
import json
import argparse
import time
from pathlib import Path
from datetime import datetime

# ANSI color codes
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
MAGENTA = '\033[0;35m'
BOLD = '\033[1m'
NC = '\033[0m'

# State file paths
SESSION_STATE_FILE = ".claude/.session_state.json"
CONTEXT_STATE_FILE = ".claude/.context_state.json"
TDD_STATE_FILE = ".claude/.tdd_state.json"
AGENT_LOG_FILE = ".claude/.agent_consultations.json"
COMPLIANCE_LOG_FILE = ".claude/.compliance_log.json"
TOOL_LOG_FILE = ".claude/.tool_usage.log"

# Thresholds
TOKEN_WARNING_THRESHOLD = 50000
TOKEN_COMPACTION_THRESHOLD = 140000
TOKEN_CRITICAL_THRESHOLD = 170000
TOKEN_MAX = 200000

RECITATION_WARNING = 3
RECITATION_BLOCKING = 5


class ComplianceDashboard:
    """Generate and display compliance dashboard"""

    def __init__(self):
        self.session_state = self._load_json(SESSION_STATE_FILE, {})
        self.context_state = self._load_json(CONTEXT_STATE_FILE, {})
        self.tdd_state = self._load_json(TDD_STATE_FILE, {})
        self.agent_log = self._load_json(AGENT_LOG_FILE, [])
        self.compliance_log = self._load_json(COMPLIANCE_LOG_FILE, [])
        self.status = {
            'session': 'unknown',
            'recitation': 'unknown',
            'agents': 'unknown',
            'context': 'unknown',
            'tdd': 'unknown',
            'overall': 'unknown'
        }

    def _load_json(self, path, default):
        """Load JSON file or return default"""
        try:
            if os.path.exists(path):
                with open(path, 'r') as f:
                    return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
        return default

    def _status_icon(self, status):
        """Get status icon"""
        icons = {
            'ok': f'{GREEN}[OK]{NC}',
            'warn': f'{YELLOW}[WARN]{NC}',
            'blocked': f'{RED}[BLOCKED]{NC}',
            'pending': f'{BLUE}[PENDING]{NC}',
            'unknown': f'{MAGENTA}[?]{NC}'
        }
        return icons.get(status, icons['unknown'])

    def _format_duration(self, seconds):
        """Format duration in human readable form"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds/60)}m {int(seconds%60)}s"
        else:
            hours = int(seconds / 3600)
            minutes = int((seconds % 3600) / 60)
            return f"{hours}h {minutes}m"

    def check_session_status(self):
        """Check session initialization status"""
        memory_bank_read = self.session_state.get('memory_bank_read', {})
        required_files = ['projectbrief', 'systemPatterns', 'activeContext']

        initialized = self.session_state.get('initialized', False)
        files_read = [f for f in required_files if memory_bank_read.get(f, False)]

        if initialized and len(files_read) == len(required_files):
            self.status['session'] = 'ok'
        elif len(files_read) > 0:
            self.status['session'] = 'warn'
        else:
            self.status['session'] = 'blocked'

        return {
            'initialized': initialized,
            'session_id': self.session_state.get('session_id', 'N/A'),
            'session_start': self.session_state.get('session_start'),
            'memory_bank_read': memory_bank_read,
            'files_read': files_read,
            'required_files': required_files
        }

    def check_recitation_status(self):
        """Check recitation loop compliance"""
        actions = self.session_state.get('actions_since_recitation', 0)
        significant = self.session_state.get('significant_actions', 0)

        if actions >= RECITATION_BLOCKING:
            self.status['recitation'] = 'blocked'
        elif actions >= RECITATION_WARNING:
            self.status['recitation'] = 'warn'
        else:
            self.status['recitation'] = 'ok'

        return {
            'actions_since_update': actions,
            'significant_actions': significant,
            'warning_threshold': RECITATION_WARNING,
            'blocking_threshold': RECITATION_BLOCKING
        }

    def check_agent_status(self):
        """Check agent consultation status"""
        consulted = self.session_state.get('agents_consulted', [])
        recent = [c for c in self.agent_log if time.time() - c.get('timestamp', 0) < 86400]  # Last 24h

        # Determine if required consultations are missing
        required_for_commit = ['qa-engineer']
        required_for_merge = ['architect', 'security-auditor']

        consulted_names = [c.get('agent') for c in recent]

        missing_commit = [a for a in required_for_commit if a not in consulted_names]
        missing_merge = [a for a in required_for_merge if a not in consulted_names]

        if not missing_commit and not missing_merge:
            self.status['agents'] = 'ok'
        elif missing_commit:
            self.status['agents'] = 'warn'
        else:
            self.status['agents'] = 'pending'

        return {
            'recent_consultations': recent[-5:] if recent else [],
            'consulted_this_session': consulted,
            'missing_for_commit': missing_commit,
            'missing_for_merge': missing_merge,
            'total_consultations': len(self.agent_log)
        }

    def check_context_status(self):
        """Check context usage status"""
        tokens = self.context_state.get('estimated_tokens', 0)
        tool_calls = self.context_state.get('tool_calls', 0)

        usage_percent = (tokens / TOKEN_MAX) * 100 if TOKEN_MAX > 0 else 0

        if tokens >= TOKEN_CRITICAL_THRESHOLD:
            self.status['context'] = 'blocked'
        elif tokens >= TOKEN_COMPACTION_THRESHOLD:
            self.status['context'] = 'warn'
        else:
            self.status['context'] = 'ok'

        return {
            'estimated_tokens': tokens,
            'usage_percent': round(usage_percent, 1),
            'tool_calls': tool_calls,
            'warning_threshold': TOKEN_WARNING_THRESHOLD,
            'compaction_threshold': TOKEN_COMPACTION_THRESHOLD,
            'critical_threshold': TOKEN_CRITICAL_THRESHOLD,
            'max_tokens': TOKEN_MAX,
            'files_read': len(self.context_state.get('files_read', [])),
            'files_written': len(self.context_state.get('files_written', []))
        }

    def check_tdd_status(self):
        """Check TDD compliance status"""
        tests_run = self.tdd_state.get('tests_run', False)
        tests_passed = self.tdd_state.get('tests_passed', False)
        timestamp = self.tdd_state.get('timestamp')

        if tests_run and tests_passed:
            self.status['tdd'] = 'ok'
        elif tests_run and not tests_passed:
            self.status['tdd'] = 'blocked'
        else:
            self.status['tdd'] = 'pending'

        return {
            'tests_run': tests_run,
            'tests_passed': tests_passed,
            'last_run': datetime.fromtimestamp(timestamp).isoformat() if timestamp else None,
            'commit_eligible': tests_run and tests_passed
        }

    def calculate_overall_status(self):
        """Calculate overall compliance status"""
        statuses = [self.status['session'], self.status['recitation'],
                    self.status['context'], self.status['tdd']]

        if 'blocked' in statuses:
            self.status['overall'] = 'blocked'
        elif 'warn' in statuses:
            self.status['overall'] = 'warn'
        elif 'pending' in statuses:
            self.status['overall'] = 'pending'
        elif all(s == 'ok' for s in statuses):
            self.status['overall'] = 'ok'
        else:
            self.status['overall'] = 'unknown'

    def generate_dashboard(self):
        """Generate full dashboard data"""
        return {
            'session': self.check_session_status(),
            'recitation': self.check_recitation_status(),
            'agents': self.check_agent_status(),
            'context': self.check_context_status(),
            'tdd': self.check_tdd_status(),
            'status': self.status,
            'timestamp': datetime.now().isoformat()
        }

    def print_dashboard(self, brief=False):
        """Print formatted dashboard to console"""
        data = self.generate_dashboard()
        self.calculate_overall_status()

        # Header
        print(f"\n{CYAN}{'='*70}{NC}")
        print(f"{CYAN}{BOLD}  ASF COMPLIANCE DASHBOARD{NC}")
        print(f"{CYAN}{'='*70}{NC}")
        print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Overall Status: {self._status_icon(self.status['overall'])}")
        print(f"{CYAN}{'='*70}{NC}\n")

        # Session Status
        session = data['session']
        print(f"{BOLD}SESSION STATUS{NC} {self._status_icon(self.status['session'])}")
        print(f"  Session ID: {session['session_id']}")
        if session['session_start']:
            duration = time.time() - session['session_start']
            print(f"  Duration: {self._format_duration(duration)}")
        print(f"  Initialized: {'Yes' if session['initialized'] else 'No'}")
        if not brief:
            print(f"  Memory Bank Files Read:")
            for f in session['required_files']:
                status = 'Read' if session['memory_bank_read'].get(f, False) else 'Not Read'
                icon = GREEN + 'x' + NC if status == 'Read' else RED + ' ' + NC
                print(f"    [{icon}] {f}.md")
        print()

        # Recitation Status
        recitation = data['recitation']
        print(f"{BOLD}RECITATION COMPLIANCE{NC} {self._status_icon(self.status['recitation'])}")
        print(f"  Actions since last update: {recitation['actions_since_update']}")
        print(f"  Significant actions: {recitation['significant_actions']}")
        if recitation['actions_since_update'] >= RECITATION_WARNING:
            print(f"  {YELLOW}Update activeContext.md to maintain compliance{NC}")
        print()

        # Agent Status
        agents = data['agents']
        print(f"{BOLD}AGENT CONSULTATIONS{NC} {self._status_icon(self.status['agents'])}")
        print(f"  Total consultations: {agents['total_consultations']}")
        if not brief and agents['recent_consultations']:
            print(f"  Recent (last 24h):")
            for c in agents['recent_consultations']:
                ts = datetime.fromtimestamp(c.get('timestamp', 0)).strftime('%H:%M')
                print(f"    - {c.get('agent', 'unknown')} at {ts}")
        if agents['missing_for_commit']:
            print(f"  {YELLOW}Missing for commit: {', '.join(agents['missing_for_commit'])}{NC}")
        if agents['missing_for_merge']:
            print(f"  {YELLOW}Missing for merge: {', '.join(agents['missing_for_merge'])}{NC}")
        print()

        # Context Status
        context = data['context']
        print(f"{BOLD}CONTEXT USAGE{NC} {self._status_icon(self.status['context'])}")
        bar_width = 40
        filled = int((context['usage_percent'] / 100) * bar_width)
        bar_color = GREEN if context['usage_percent'] < 50 else (YELLOW if context['usage_percent'] < 70 else RED)
        bar = bar_color + '=' * filled + NC + '-' * (bar_width - filled)
        print(f"  [{bar}] {context['usage_percent']}%")
        print(f"  Estimated tokens: {context['estimated_tokens']:,} / {context['max_tokens']:,}")
        print(f"  Tool calls: {context['tool_calls']}")
        if not brief:
            print(f"  Files read: {context['files_read']}, Files written: {context['files_written']}")
        if context['estimated_tokens'] >= TOKEN_COMPACTION_THRESHOLD:
            print(f"  {YELLOW}Run /memory-update to compact context{NC}")
        print()

        # TDD Status
        tdd = data['tdd']
        print(f"{BOLD}TDD STATUS{NC} {self._status_icon(self.status['tdd'])}")
        print(f"  Tests run: {'Yes' if tdd['tests_run'] else 'No'}")
        if tdd['tests_run']:
            result_color = GREEN if tdd['tests_passed'] else RED
            print(f"  Tests passed: {result_color}{'Yes' if tdd['tests_passed'] else 'No'}{NC}")
            if tdd['last_run']:
                print(f"  Last run: {tdd['last_run']}")
        print(f"  Commit eligible: {'Yes' if tdd['commit_eligible'] else 'No'}")
        print()

        # Action Items
        actions = []
        if self.status['session'] == 'blocked':
            actions.append("Run /session-init to initialize session")
        if self.status['recitation'] == 'blocked':
            actions.append("Update memory-bank/activeContext.md immediately")
        if self.status['recitation'] == 'warn':
            actions.append("Consider updating activeContext.md soon")
        if self.status['context'] == 'blocked':
            actions.append("Run /memory-update to compact context NOW")
        if self.status['context'] == 'warn':
            actions.append("Plan for context compaction soon")
        if self.status['tdd'] == 'blocked':
            actions.append("Fix failing tests before committing")
        if self.status['tdd'] == 'pending':
            actions.append("Run tests to enable commits")
        if agents['missing_for_commit']:
            actions.append(f"Consult {', '.join(agents['missing_for_commit'])} before commit")

        if actions:
            print(f"{BOLD}REQUIRED ACTIONS{NC}")
            for action in actions:
                print(f"  {RED}->{NC} {action}")
            print()

        # Footer
        print(f"{CYAN}{'='*70}{NC}")
        if self.status['overall'] == 'ok':
            print(f"  {GREEN}All protocols compliant. Ready to proceed.{NC}")
        elif self.status['overall'] == 'blocked':
            print(f"  {RED}BLOCKED: Resolve issues above before continuing.{NC}")
        else:
            print(f"  {YELLOW}Warnings present. Review and address soon.{NC}")
        print(f"{CYAN}{'='*70}{NC}\n")

    def print_json(self):
        """Print dashboard as JSON"""
        data = self.generate_dashboard()
        self.calculate_overall_status()
        data['status'] = self.status
        print(json.dumps(data, indent=2, default=str))


def main():
    parser = argparse.ArgumentParser(
        description='ASF Compliance Dashboard - Display protocol adherence status'
    )
    parser.add_argument('--json', action='store_true',
                        help='Output in JSON format')
    parser.add_argument('--brief', action='store_true',
                        help='Show only status indicators')

    args = parser.parse_args()

    dashboard = ComplianceDashboard()

    if args.json:
        dashboard.print_json()
    else:
        dashboard.print_dashboard(brief=args.brief)


if __name__ == '__main__':
    main()
