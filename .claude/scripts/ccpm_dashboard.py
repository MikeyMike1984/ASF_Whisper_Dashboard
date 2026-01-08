#!/usr/bin/env python3
"""
CCPM Compliance Dashboard
Shows current CCPM (Claude Code Project Management) governance status for all features.

Usage:
    python .claude/scripts/ccpm_dashboard.py
"""

import os
import json
from pathlib import Path
from datetime import datetime

# ANSI color codes
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
BOLD = '\033[1m'
NC = '\033[0m'

# State files and directories
CCPM_STATE_FILE = ".claude/.ccpm_state.json"
PRD_DIR = ".claude/prds"
EPIC_DIR = ".claude/epics"
AGENT_LOG_FILE = ".claude/.agent_consultations.json"
SESSION_STATE_FILE = ".claude/.session_state.json"


def check_mark(passed: bool) -> str:
    """Return colored check mark or X"""
    return f"{GREEN}[x]{NC}" if passed else f"{RED}[ ]{NC}"


def phase_badge(phase: str) -> str:
    """Return colored phase badge"""
    colors = {
        'brainstorm': YELLOW,
        'plan': BLUE,
        'decompose': CYAN,
        'sync': YELLOW,
        'execute': GREEN
    }
    color = colors.get(phase, NC)
    return f"{color}{phase.upper()}{NC}"


def get_prds() -> list:
    """Get list of PRD files"""
    if not os.path.isdir(PRD_DIR):
        return []
    return [f for f in os.listdir(PRD_DIR) if f.endswith('.md')]


def get_epics() -> dict:
    """Get dict of epic directories with their task counts"""
    if not os.path.isdir(EPIC_DIR):
        return {}
    result = {}
    for item in os.listdir(EPIC_DIR):
        epic_path = os.path.join(EPIC_DIR, item)
        if os.path.isdir(epic_path):
            tasks = [f for f in os.listdir(epic_path) if f.endswith('.md') and f != 'README.md']
            result[item] = len(tasks)
    return result


def get_feature_worktrees() -> list:
    """Get list of feature worktrees"""
    worktrees = []
    feature_dir = "feature"
    if os.path.isdir(feature_dir):
        for item in os.listdir(feature_dir):
            if os.path.isdir(os.path.join(feature_dir, item)):
                worktrees.append(item)
    return worktrees


def get_ccpm_state() -> dict:
    """Get CCPM state from file"""
    try:
        if os.path.exists(CCPM_STATE_FILE):
            with open(CCPM_STATE_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {'features': {}, 'current_feature': None}


def get_agent_consultations() -> list:
    """Get recent agent consultations"""
    try:
        if os.path.exists(AGENT_LOG_FILE):
            with open(AGENT_LOG_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return []


def get_session_state() -> dict:
    """Get session state"""
    try:
        if os.path.exists(SESSION_STATE_FILE):
            with open(SESSION_STATE_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {}


def print_header():
    """Print dashboard header"""
    print(f"\n{BOLD}{'='*60}{NC}")
    print(f"{BOLD}       CCPM COMPLIANCE DASHBOARD{NC}")
    print(f"{BOLD}{'='*60}{NC}\n")


def print_section(title: str):
    """Print section header"""
    print(f"\n{CYAN}{BOLD}{title}{NC}")
    print(f"{CYAN}{'-'*40}{NC}")


def print_feature_status(feature: str, prd_exists: bool, epic_exists: bool,
                          task_count: int, phase: str, consulted_agents: list):
    """Print status for a single feature"""
    print(f"\n  {BOLD}{feature}{NC}")
    print(f"    Phase: {phase_badge(phase)}")
    print(f"    PRD:   {check_mark(prd_exists)} {'exists' if prd_exists else 'MISSING'}")
    print(f"    Epic:  {check_mark(epic_exists)} {f'{task_count} tasks' if epic_exists else 'MISSING'}")

    if consulted_agents:
        agents_str = ', '.join(consulted_agents)
        print(f"    Agents: {GREEN}{agents_str}{NC}")
    else:
        print(f"    Agents: {YELLOW}None consulted{NC}")


def main():
    """Main dashboard display"""
    print_header()

    # Get all data
    prds = get_prds()
    epics = get_epics()
    worktrees = get_feature_worktrees()
    ccpm_state = get_ccpm_state()
    consultations = get_agent_consultations()
    session_state = get_session_state()

    # Session Status
    print_section("SESSION STATUS")
    initialized = session_state.get('initialized', False)
    print(f"  Initialized: {check_mark(initialized)}")

    mb = session_state.get('memory_bank_read', {})
    print(f"  Memory Bank Read:")
    print(f"    - projectbrief.md:   {check_mark(mb.get('projectbrief', False))}")
    print(f"    - systemPatterns.md: {check_mark(mb.get('systemPatterns', False))}")
    print(f"    - activeContext.md:  {check_mark(mb.get('activeContext', False))}")
    print(f"    - decisionLog.md:    {check_mark(mb.get('decisionLog', False))}")

    actions = session_state.get('actions_since_recitation', 0)
    recitation_status = f"{GREEN}OK{NC}" if actions < 3 else (
        f"{YELLOW}WARNING ({actions} actions){NC}" if actions < 5 else
        f"{RED}BLOCKING ({actions} actions){NC}"
    )
    print(f"  Recitation Status: {recitation_status}")

    # CCPM Overview
    print_section("CCPM OVERVIEW")
    print(f"  PRDs:       {len(prds)} documents in {PRD_DIR}/")
    print(f"  Epics:      {len(epics)} decomposed in {EPIC_DIR}/")
    print(f"  Worktrees:  {len(worktrees)} feature branches")

    current = ccpm_state.get('current_feature')
    if current:
        print(f"  Current:    {BOLD}{current}{NC}")

    # Feature Details
    print_section("FEATURE STATUS")

    # Combine all known features
    all_features = set()
    all_features.update([p.replace('.md', '') for p in prds])
    all_features.update(epics.keys())
    all_features.update(worktrees)
    all_features.update(ccpm_state.get('features', {}).keys())

    if not all_features:
        print(f"  {YELLOW}No features tracked yet.{NC}")
        print(f"  Run /prd-new <feature> to start a new feature.")
    else:
        # Get consulted agents per feature (rough mapping)
        consulted = set(c.get('agent', '').lower() for c in consultations)

        for feature in sorted(all_features):
            # Normalize feature name for matching
            feature_normalized = feature.lower().replace('-', '').replace('_', '')

            # Check PRD
            prd_exists = any(
                p.lower().replace('-', '').replace('_', '').replace('.md', '') == feature_normalized
                for p in prds
            )

            # Check Epic
            epic_exists = any(
                e.lower().replace('-', '').replace('_', '') == feature_normalized
                for e in epics.keys()
            )
            task_count = 0
            for epic_name, count in epics.items():
                if epic_name.lower().replace('-', '').replace('_', '') == feature_normalized:
                    task_count = count
                    break

            # Get phase from CCPM state
            feature_state = ccpm_state.get('features', {}).get(feature, {})
            phase = feature_state.get('phase',
                'execute' if (prd_exists and epic_exists) else
                'plan' if prd_exists else 'brainstorm'
            )

            print_feature_status(
                feature, prd_exists, epic_exists, task_count, phase, list(consulted)
            )

    # Agent Consultations
    print_section("RECENT AGENT CONSULTATIONS")
    if consultations:
        for c in consultations[-5:]:  # Last 5
            agent = c.get('agent', 'unknown')
            result = c.get('result', 'N/A')
            ts = c.get('timestamp', 0)
            time_str = datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M') if ts else 'N/A'
            print(f"  {GREEN}{agent}{NC}: {result} ({time_str})")
    else:
        print(f"  {YELLOW}No agent consultations recorded.{NC}")

    # Recommendations
    print_section("RECOMMENDATIONS")
    recommendations = []

    if not initialized:
        recommendations.append("Read Memory Bank files to initialize session")

    if actions >= 3:
        recommendations.append("Update activeContext.md (recitation due)")

    for feature in all_features:
        feature_normalized = feature.lower().replace('-', '').replace('_', '')
        prd_exists = any(
            p.lower().replace('-', '').replace('_', '').replace('.md', '') == feature_normalized
            for p in prds
        )
        epic_exists = any(
            e.lower().replace('-', '').replace('_', '') == feature_normalized
            for e in epics.keys()
        )

        if not prd_exists:
            recommendations.append(f"Create PRD for '{feature}': /prd-new {feature}")
        elif not epic_exists:
            recommendations.append(f"Decompose '{feature}': /epic-decompose {feature}")

    if not recommendations:
        print(f"  {GREEN}All CCPM protocols are being followed!{NC}")
    else:
        for rec in recommendations[:5]:  # Limit to 5
            print(f"  {YELLOW}- {rec}{NC}")

    print(f"\n{BOLD}{'='*60}{NC}\n")


if __name__ == "__main__":
    main()
