#!/usr/bin/env python3
"""
SESSION TRACKER: Protocol Compliance Monitoring
Purpose: Track session state and enforce ASF protocol compliance

Tracks:
1. Session initialization (memory bank reading)
2. Recitation loop compliance (activeContext updates)
3. Agent consultation log
4. Context usage estimation
5. Decision logging requirements
"""

import json
import os
import time
from pathlib import Path
from typing import Optional, Dict, List, Any

# State files
SESSION_STATE_FILE = ".claude/.session_state.json"
AGENT_LOG_FILE = ".claude/.agent_consultations.json"
RECITATION_LOG_FILE = ".claude/.recitation_log.json"

class SessionTracker:
    """Singleton tracker for session state and protocol compliance"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        """Load session state from file"""
        default_state = {
            'session_id': f"session-{int(time.time())}",
            'session_start': time.time(),
            'initialized': False,
            'memory_bank_read': {
                'projectbrief': False,
                'systemPatterns': False,
                'activeContext': False,
                'decisionLog': False
            },
            'significant_actions': 0,
            'last_recitation': None,
            'actions_since_recitation': 0,
            'agents_consulted': [],
            'decisions_pending_adr': [],
            'estimated_context_tokens': 0,
            'compaction_count': 0
        }

        try:
            if os.path.exists(SESSION_STATE_FILE):
                with open(SESSION_STATE_FILE, 'r') as f:
                    saved_state = json.load(f)
                    # Check if session is stale (>4 hours old)
                    if time.time() - saved_state.get('session_start', 0) > 14400:
                        return default_state
                    return saved_state
        except (json.JSONDecodeError, IOError):
            pass
        return default_state

    def _save_state(self):
        """Save session state to file"""
        try:
            os.makedirs(os.path.dirname(SESSION_STATE_FILE), exist_ok=True)
            with open(SESSION_STATE_FILE, 'w') as f:
                json.dump(self.state, f, indent=2)
        except IOError:
            pass

    # =========================================================================
    # SESSION INITIALIZATION
    # =========================================================================

    def is_session_initialized(self) -> bool:
        """Check if session has been properly initialized"""
        return self.state.get('initialized', False)

    def mark_memory_bank_read(self, file_name: str):
        """Mark a memory bank file as read"""
        key_map = {
            'projectbrief.md': 'projectbrief',
            'systemPatterns.md': 'systemPatterns',
            'activeContext.md': 'activeContext',
            'decisionLog.md': 'decisionLog'
        }

        for file_key, state_key in key_map.items():
            if file_key in file_name:
                self.state['memory_bank_read'][state_key] = True
                break

        # Check if fully initialized
        mb = self.state['memory_bank_read']
        if mb['projectbrief'] and mb['systemPatterns'] and mb['activeContext']:
            self.state['initialized'] = True

        self._save_state()

    def get_initialization_status(self) -> Dict[str, Any]:
        """Get detailed initialization status"""
        mb = self.state['memory_bank_read']
        missing = []

        if not mb['projectbrief']:
            missing.append('memory-bank/projectbrief.md')
        if not mb['systemPatterns']:
            missing.append('memory-bank/systemPatterns.md')
        if not mb['activeContext']:
            missing.append('memory-bank/activeContext.md')

        return {
            'initialized': self.state['initialized'],
            'missing_files': missing,
            'read_files': [k for k, v in mb.items() if v]
        }

    # =========================================================================
    # RECITATION LOOP
    # =========================================================================

    def record_significant_action(self, action_type: str, description: str):
        """Record a significant action that requires recitation"""
        self.state['significant_actions'] += 1
        self.state['actions_since_recitation'] += 1

        # Log the action
        try:
            os.makedirs(os.path.dirname(RECITATION_LOG_FILE), exist_ok=True)
            log = []
            if os.path.exists(RECITATION_LOG_FILE):
                with open(RECITATION_LOG_FILE, 'r') as f:
                    log = json.load(f)

            log.append({
                'timestamp': time.time(),
                'type': action_type,
                'description': description,
                'actions_since_recitation': self.state['actions_since_recitation']
            })

            # Keep last 50 entries
            log = log[-50:]

            with open(RECITATION_LOG_FILE, 'w') as f:
                json.dump(log, f, indent=2)
        except (json.JSONDecodeError, IOError):
            pass

        self._save_state()

    def record_recitation(self):
        """Record that activeContext.md was updated"""
        self.state['last_recitation'] = time.time()
        self.state['actions_since_recitation'] = 0
        self._save_state()

    def check_recitation_needed(self) -> Optional[Dict[str, Any]]:
        """Check if recitation (activeContext update) is needed"""
        actions = self.state['actions_since_recitation']

        if actions >= 5:
            return {
                'level': 'critical',
                'message': f"RECITATION REQUIRED: {actions} significant actions without updating activeContext.md",
                'actions_since_update': actions
            }
        elif actions >= 3:
            return {
                'level': 'warning',
                'message': f"Recitation recommended: {actions} actions since last activeContext.md update",
                'actions_since_update': actions
            }
        return None

    # =========================================================================
    # AGENT CONSULTATION
    # =========================================================================

    def record_agent_consultation(self, agent_name: str, purpose: str):
        """Record that an agent persona was consulted"""
        consultation = {
            'agent': agent_name,
            'purpose': purpose,
            'timestamp': time.time()
        }
        self.state['agents_consulted'].append(consultation)

        # Also log to file
        try:
            os.makedirs(os.path.dirname(AGENT_LOG_FILE), exist_ok=True)
            log = []
            if os.path.exists(AGENT_LOG_FILE):
                with open(AGENT_LOG_FILE, 'r') as f:
                    log = json.load(f)
            log.append(consultation)
            with open(AGENT_LOG_FILE, 'w') as f:
                json.dump(log, f, indent=2)
        except (json.JSONDecodeError, IOError):
            pass

        self._save_state()

    def check_agent_gates(self, action: str) -> Optional[Dict[str, Any]]:
        """Check if required agents have been consulted for an action"""
        consulted = [c['agent'] for c in self.state['agents_consulted']]

        if action == 'commit':
            if 'qa-engineer' not in consulted:
                return {
                    'blocked': True,
                    'message': "QA Engineer review required before commit",
                    'required_agent': 'qa-engineer'
                }

        elif action == 'merge' or action == 'push':
            missing = []
            if 'architect' not in consulted:
                missing.append('architect')
            if 'security-auditor' not in consulted:
                missing.append('security-auditor')

            if missing:
                return {
                    'blocked': True,
                    'message': f"Required agent reviews missing: {', '.join(missing)}",
                    'required_agents': missing
                }

        elif action == 'architectural_decision':
            if 'architect' not in consulted:
                return {
                    'blocked': False,  # Warning only
                    'message': "Architect should be consulted for architectural decisions",
                    'required_agent': 'architect'
                }

        return None

    # =========================================================================
    # DECISION TRACKING
    # =========================================================================

    def record_pending_decision(self, decision: str):
        """Record a decision that needs ADR documentation"""
        self.state['decisions_pending_adr'].append({
            'decision': decision,
            'timestamp': time.time()
        })
        self._save_state()

    def clear_pending_decision(self, decision: str):
        """Mark a decision as documented in ADR"""
        self.state['decisions_pending_adr'] = [
            d for d in self.state['decisions_pending_adr']
            if d['decision'] != decision
        ]
        self._save_state()

    def get_pending_decisions(self) -> List[str]:
        """Get list of decisions pending ADR documentation"""
        return [d['decision'] for d in self.state['decisions_pending_adr']]

    # =========================================================================
    # CONTEXT MANAGEMENT
    # =========================================================================

    def update_context_estimate(self, tokens: int):
        """Update estimated context token usage"""
        self.state['estimated_context_tokens'] += tokens
        self._save_state()

    def record_compaction(self):
        """Record that context compaction occurred"""
        self.state['compaction_count'] += 1
        self.state['estimated_context_tokens'] = 5000  # Reset to base
        self.state['initialized'] = False  # Require re-initialization
        self.state['memory_bank_read'] = {
            'projectbrief': False,
            'systemPatterns': False,
            'activeContext': False,
            'decisionLog': False
        }
        self._save_state()

    def get_context_status(self) -> Dict[str, Any]:
        """Get current context usage status"""
        tokens = self.state['estimated_context_tokens']
        capacity = 200000  # Approximate capacity

        return {
            'estimated_tokens': tokens,
            'capacity': capacity,
            'usage_percent': (tokens / capacity) * 100,
            'compaction_needed': tokens > capacity * 0.7,
            'critical': tokens > capacity * 0.85
        }

    # =========================================================================
    # RESET
    # =========================================================================

    def reset_session(self):
        """Reset session state for new session"""
        self.state = {
            'session_id': f"session-{int(time.time())}",
            'session_start': time.time(),
            'initialized': False,
            'memory_bank_read': {
                'projectbrief': False,
                'systemPatterns': False,
                'activeContext': False,
                'decisionLog': False
            },
            'significant_actions': 0,
            'last_recitation': None,
            'actions_since_recitation': 0,
            'agents_consulted': [],
            'decisions_pending_adr': [],
            'estimated_context_tokens': 0,
            'compaction_count': self.state.get('compaction_count', 0)
        }
        self._save_state()


# Singleton instance
tracker = SessionTracker()


def get_tracker() -> SessionTracker:
    """Get the session tracker instance"""
    return tracker
