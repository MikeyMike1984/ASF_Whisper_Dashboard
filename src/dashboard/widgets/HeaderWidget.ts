/**
 * Header Widget
 *
 * Displays dashboard title, agent count, cost, and token metrics.
 */

import blessed from 'neo-blessed';
import { BaseWidget, WidgetOptions } from './BaseWidget';
import { DashboardState } from '../types';

// ============================================================================
// Header Widget Class
// ============================================================================

export class HeaderWidget extends BaseWidget {
  constructor(screen: blessed.Widgets.Screen, options: WidgetOptions = {}) {
    super(screen, {
      label: '',
      border: 'none',
      style: {
        fg: 'white',
        bg: 'blue',
        bold: true,
      },
      ...options,
    });
  }

  protected createElement(options: WidgetOptions): blessed.Widgets.BoxElement {
    return blessed.box({
      tags: true,
      style: options.style || {
        fg: 'white',
        bg: 'blue',
        bold: true,
      },
    });
  }

  render(state: DashboardState): void {
    const { metrics } = state;

    const title = 'ASF Whisper Dashboard';
    const agents = `Agents: ${metrics.activeAgents}/${metrics.totalAgents}`;
    const cost = `Cost: ${this.formatCost(metrics.totalCost)}`;
    const tokens = `Tokens: ${this.formatTokens(metrics.totalTokens)}`;

    // Calculate spacing for alignment
    const parts = [title, agents, cost, tokens];
    const content = parts.join('    ');

    this.setContent(` ${content}`);
  }

  /**
   * Format cost with dollar sign and 2 decimal places
   */
  private formatCost(cost: number): string {
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Format tokens with k/M suffix
   */
  private formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return String(tokens);
  }
}
