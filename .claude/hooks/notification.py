#!/usr/bin/env python3
"""
NOTIFICATION HOOK: External Alerting System
Purpose: Send alerts to external systems when critical events occur
Functionality:
  1. Terminal notifications (cross-platform)
  2. Desktop notifications (when available)
  3. Webhook alerts (Slack, Discord, etc.)
  4. Log file for persistent record
"""

import sys
import json
import os
import time
import subprocess
import argparse
from pathlib import Path

# Configuration
NOTIFICATION_LOG_FILE = ".claude/.notifications.log"
NOTIFICATION_CONFIG_FILE = ".claude/notification_config.json"

DEFAULT_CONFIG = {
    'enabled': True,
    'terminal_bell': True,
    'desktop_notifications': True,
    'webhook_url': None,
    'log_to_file': True,
    'min_severity': 'warning'
}

SEVERITY_LEVELS = {'info': 0, 'warning': 1, 'error': 2, 'critical': 3}

# ANSI colors
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
BOLD = '\033[1m'
NC = '\033[0m'


def load_config():
    """Load notification configuration"""
    config = DEFAULT_CONFIG.copy()
    try:
        if os.path.exists(NOTIFICATION_CONFIG_FILE):
            with open(NOTIFICATION_CONFIG_FILE, 'r') as f:
                config.update(json.load(f))
    except (json.JSONDecodeError, IOError):
        pass
    return config


def send_terminal_notification(title, message, severity='info'):
    """Print formatted notification to terminal"""
    colors = {'info': BLUE, 'warning': YELLOW, 'error': RED, 'critical': f"{RED}{BOLD}"}
    icons = {'info': 'ℹ️ ', 'warning': '⚠️ ', 'error': '❌', 'critical': '🚨'}

    color = colors.get(severity, BLUE)
    icon = icons.get(severity, '')

    print(f"\n{color}{'═' * 60}{NC}", file=sys.stderr)
    print(f"{color}{icon} {title}{NC}", file=sys.stderr)
    print(f"{color}{'─' * 60}{NC}", file=sys.stderr)
    print(f"{message}", file=sys.stderr)
    print(f"{color}{'═' * 60}{NC}\n", file=sys.stderr)


def send_desktop_notification(title, message, severity='info'):
    """Send desktop notification (cross-platform)"""
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(
                ['powershell', '-Command', f'Write-Host "{title}: {message}"'],
                capture_output=True, timeout=5
            )
        elif os.name == 'posix':
            if subprocess.run(['which', 'osascript'], capture_output=True).returncode == 0:
                subprocess.run([
                    'osascript', '-e',
                    f'display notification "{message}" with title "{title}"'
                ], capture_output=True, timeout=5)
            elif subprocess.run(['which', 'notify-send'], capture_output=True).returncode == 0:
                urgency = 'critical' if severity in ['error', 'critical'] else 'normal'
                subprocess.run(['notify-send', '-u', urgency, title, message],
                             capture_output=True, timeout=5)
    except:
        pass


def log_notification(title, message, severity='info'):
    """Log notification to file"""
    try:
        os.makedirs(os.path.dirname(NOTIFICATION_LOG_FILE), exist_ok=True)
        with open(NOTIFICATION_LOG_FILE, 'a') as f:
            log_entry = {
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'severity': severity,
                'title': title,
                'message': message
            }
            f.write(json.dumps(log_entry) + '\n')
    except IOError:
        pass


def notify(title, message, severity='info', notification_type='general'):
    """Send notification through all configured channels"""
    config = load_config()

    if not config.get('enabled', True):
        return

    min_level = SEVERITY_LEVELS.get(config.get('min_severity', 'warning'), 1)
    current_level = SEVERITY_LEVELS.get(severity, 0)
    if current_level < min_level:
        return

    send_terminal_notification(title, message, severity)

    if config.get('terminal_bell', True) and severity in ['error', 'critical']:
        print('\a', end='', file=sys.stderr)

    if config.get('desktop_notifications', True):
        send_desktop_notification(title, message, severity)

    if config.get('log_to_file', True):
        log_notification(title, message, severity)


def notify_hook_block(reason, tool_name=None, command=None):
    """Notify when a hook blocks an action"""
    title = "Hook Blocked Action"
    message = f"Reason: {reason}"
    if tool_name:
        message += f"\nTool: {tool_name}"
    if command:
        cmd_preview = command[:100] + '...' if len(command) > 100 else command
        message += f"\nCommand: {cmd_preview}"
    notify(title, message, severity='warning', notification_type='block')


def main():
    parser = argparse.ArgumentParser(description='Send notifications from Claude Code Forge')
    parser.add_argument('--type', choices=['block', 'error', 'warning', 'info'],
                       default='info', help='Notification type')
    parser.add_argument('--title', default='Forge Notification', help='Notification title')
    parser.add_argument('--message', required=True, help='Notification message')
    parser.add_argument('--severity', choices=['info', 'warning', 'error', 'critical'],
                       default='info', help='Severity level')

    args = parser.parse_args()

    if args.type == 'block':
        args.severity = 'warning'
    elif args.type == 'error':
        args.severity = 'error'

    notify(args.title, args.message, args.severity, args.type)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        main()
    else:
        try:
            input_data = json.load(sys.stdin)
            notify(
                input_data.get('title', 'Notification'),
                input_data.get('message', ''),
                input_data.get('severity', 'info'),
                input_data.get('type', 'general')
            )
        except json.JSONDecodeError:
            pass
