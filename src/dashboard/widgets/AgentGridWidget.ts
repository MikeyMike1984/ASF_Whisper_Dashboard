/**
 * Agent Grid Widget
 *
 * Displays a configurable matrix of agent cards with status and progress.
 */

import blessed from 'neo-blessed';
import { BaseWidget, WidgetOptions } from './BaseWidget';
import { DashboardState, DashboardAgent, STATUS_COLORS } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface AgentGridOptions extends WidgetOptions {
  rows?: number;
  cols?: number;
}

// ============================================================================
// Agent Grid Widget Class
// ============================================================================

export class AgentGridWidget extends BaseWidget {
  private rows: number;
  private cols: number;
  private selectedIndex = -1;
  private agents: DashboardAgent[] = [];

  constructor(screen: blessed.Widgets.Screen, options: AgentGridOptions = {}) {
    super(screen, {
      label: ' Agents ',
      ...options,
    });
    this.rows = options.rows || 2;
    this.cols = options.cols || 4;
  }

  protected createElement(options: WidgetOptions): blessed.Widgets.BoxElement {
    return blessed.box({
      label: options.label,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'white' },
        label: { fg: 'white', bold: true },
      },
    });
  }

  render(state: DashboardState): void {
    this.agents = state.agents;

    // Update selection if selected agent changed externally
    if (state.selectedAgentId) {
      const idx = this.agents.findIndex((a) => a.id === state.selectedAgentId);
      if (idx >= 0) this.selectedIndex = idx;
    }

    const lines: string[] = [];

    for (let row = 0; row < this.rows; row++) {
      const rowCards: string[] = [];

      for (let col = 0; col < this.cols; col++) {
        const idx = row * this.cols + col;
        const agent = this.agents[idx];

        if (agent) {
          const card = this.renderAgentCard(agent, idx === this.selectedIndex);
          rowCards.push(card);
        } else {
          rowCards.push(this.renderEmptyCard());
        }
      }

      // Each card is 3 lines high, so we need to interleave them
      const cardLines = this.interleaveCards(rowCards);
      lines.push(...cardLines);

      // Add spacing between rows
      if (row < this.rows - 1) {
        lines.push('');
      }
    }

    this.setContent(lines.join('\n'));
  }

  /**
   * Render a single agent card
   */
  private renderAgentCard(agent: DashboardAgent, selected: boolean): string {
    const color = STATUS_COLORS[agent.status];
    const statusText = agent.status.toUpperCase().padEnd(4);
    const progressText = agent.status === 'Busy' ? `${agent.progress}%`.padStart(4) : agent.status === 'Idle' ? ' -  ' : agent.status === 'Error' ? ' !  ' : ' X  ';

    // Short ID (last 3 chars or full if short)
    const shortId = agent.id.length > 6 ? agent.id.slice(-3) : agent.id;

    const border = selected ? '{bold}{white-fg}' : '{white-fg}';
    const reset = '{/}';

    return [
      `${border}┌─${shortId.padEnd(4)}─┐${reset}`,
      `${border}│{${color}-fg}${statusText}{/}  │${reset}`,
      `${border}│${progressText}  │${reset}`,
      `${border}└───────┘${reset}`,
    ].join('\n');
  }

  /**
   * Render an empty card slot
   */
  private renderEmptyCard(): string {
    return [
      '{gray-fg}┌───────┐{/}',
      '{gray-fg}│       │{/}',
      '{gray-fg}│       │{/}',
      '{gray-fg}└───────┘{/}',
    ].join('\n');
  }

  /**
   * Interleave multiple cards side by side
   */
  private interleaveCards(cards: string[]): string[] {
    const cardLines = cards.map((c) => c.split('\n'));
    const maxLines = Math.max(...cardLines.map((l) => l.length));
    const result: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const line = cardLines.map((cl) => cl[i] || '         ').join(' ');
      result.push(line);
    }

    return result;
  }

  /**
   * Select next agent
   */
  selectNext(): void {
    if (this.agents.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.agents.length;
  }

  /**
   * Select previous agent
   */
  selectPrev(): void {
    if (this.agents.length === 0) return;
    this.selectedIndex = this.selectedIndex <= 0 ? this.agents.length - 1 : this.selectedIndex - 1;
  }

  /**
   * Select agent above
   */
  selectUp(): void {
    if (this.agents.length === 0) return;
    const newIdx = this.selectedIndex - this.cols;
    if (newIdx >= 0) {
      this.selectedIndex = newIdx;
    }
  }

  /**
   * Select agent below
   */
  selectDown(): void {
    if (this.agents.length === 0) return;
    const newIdx = this.selectedIndex + this.cols;
    if (newIdx < this.agents.length) {
      this.selectedIndex = newIdx;
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedIndex = -1;
  }

  /**
   * Get current selection index
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  /**
   * Get selected agent ID
   */
  getSelectedAgentId(): string | null {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.agents.length) {
      return null;
    }
    return this.agents[this.selectedIndex].id;
  }
}
