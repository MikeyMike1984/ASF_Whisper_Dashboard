/**
 * Whisper Log Widget
 *
 * Displays logs for the selected agent with timestamps and level colors.
 */

import blessed from 'neo-blessed';
import { BaseWidget, WidgetOptions } from './BaseWidget';
import { DashboardState, LogEntry, LOG_LEVEL_COLORS } from '../types';

// ============================================================================
// Whisper Log Widget Class
// ============================================================================

export class WhisperLogWidget extends BaseWidget {
  private autoScroll = true;

  constructor(screen: blessed.Widgets.Screen, options: WidgetOptions = {}) {
    super(screen, {
      label: ' Whisper Log ',
      ...options,
    });

    // Listen for scroll events to pause auto-scroll
    this.element.on('scroll', () => {
      // If user scrolled up, pause auto-scroll
      if (!this.isAtBottom()) {
        this.autoScroll = false;
      }
    });
  }

  protected createElement(options: WidgetOptions): blessed.Widgets.BoxElement {
    return blessed.box({
      label: options.label,
      tags: true,
      border: { type: 'line' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: { bg: 'gray' },
        style: { bg: 'white' },
      },
      style: {
        border: { fg: 'white' },
        label: { fg: 'white', bold: true },
      },
    });
  }

  render(state: DashboardState): void {
    const { selectedAgentId, logs } = state;

    // Update label with agent ID
    if (selectedAgentId) {
      this.setLabel(` Whisper Log [${selectedAgentId}] `);
    } else {
      this.setLabel(' Whisper Log ');
    }

    // No agent selected
    if (!selectedAgentId) {
      this.setContent('{gray-fg}Select an agent to view logs{/}');
      return;
    }

    // Get logs for selected agent
    const agentLogs = logs.get(selectedAgentId) || [];

    // No logs for agent
    if (agentLogs.length === 0) {
      this.setContent('{gray-fg}No logs for this agent{/}');
      return;
    }

    // Render logs
    const lines = agentLogs.map((log) => this.renderLogEntry(log));
    this.setContent(lines.join('\n'));

    // Auto-scroll to bottom if enabled
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Render a single log entry
   */
  private renderLogEntry(log: LogEntry): string {
    const timestamp = this.formatTimestamp(log.timestamp);
    const levelColor = LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || 'white';

    return `{gray-fg}[${timestamp}]{/} {${levelColor}-fg}${log.message}{/}`;
  }

  /**
   * Format timestamp as HH:MM:SS
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Scroll up
   */
  scrollUp(): void {
    this.element.scroll(-1);
    this.autoScroll = false;
  }

  /**
   * Scroll down
   */
  scrollDown(): void {
    this.element.scroll(1);
    // Re-enable auto-scroll if at bottom
    if (this.isAtBottom()) {
      this.autoScroll = true;
    }
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    this.element.setScrollPerc(100);
    this.autoScroll = true;
  }

  /**
   * Check if scrolled to bottom
   */
  isAtBottom(): boolean {
    const scrollHeight = (this.element as any).getScrollHeight?.() || 0;
    const height = (this.element.height as number) - 2; // Account for border
    const scrollPos = (this.element as any).getScroll?.() || 0;
    return scrollPos >= scrollHeight - height;
  }

  /**
   * Check if auto-scroll is paused
   */
  isAutoScrollPaused(): boolean {
    return !this.autoScroll;
  }

  /**
   * Resume auto-scroll
   */
  resumeAutoScroll(): void {
    this.autoScroll = true;
    this.scrollToBottom();
  }
}
