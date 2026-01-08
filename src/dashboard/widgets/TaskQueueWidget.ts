/**
 * Task Queue Widget
 *
 * Displays tasks with progress bars and status indicators.
 */

import blessed from 'neo-blessed';
import { BaseWidget, WidgetOptions } from './BaseWidget';
import { DashboardState, Task, TASK_STATUS_COLORS } from '../types';
import { TaskStatus } from '../../core/monitoring';

// ============================================================================
// Task Queue Widget Class
// ============================================================================

export class TaskQueueWidget extends BaseWidget {
  private tasks: Task[] = [];

  constructor(screen: blessed.Widgets.Screen, options: WidgetOptions = {}) {
    super(screen, {
      label: ' Task Queue ',
      ...options,
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
    this.tasks = this.sortTasks(state.tasks);

    const lines: string[] = [];
    const barWidth = 10;

    for (const task of this.tasks) {
      const bar = this.generateProgressBar(task.progressPercent, barWidth);
      const pct = `${task.progressPercent}%`.padStart(4);
      const title = this.truncateTitle(task.title, 20);
      const color = TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS] || 'white';

      lines.push(`{${color}-fg}[${bar}] ${pct} ${title}{/}`);
    }

    if (lines.length === 0) {
      lines.push('{gray-fg}No tasks{/}');
    }

    this.setContent(lines.join('\n'));
  }

  /**
   * Generate ASCII progress bar
   */
  private generateProgressBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '#'.repeat(filled) + ' '.repeat(empty);
  }

  /**
   * Sort tasks: InProgress first, then Pending, then Complete/Failed
   */
  private sortTasks(tasks: Task[]): Task[] {
    const statusOrder: Record<string, number> = {
      [TaskStatus.InProgress]: 0,
      [TaskStatus.Pending]: 1,
      [TaskStatus.Complete]: 2,
      [TaskStatus.Failed]: 3,
    };

    return [...tasks].sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      if (orderDiff !== 0) return orderDiff;
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * Truncate task title if too long
   */
  private truncateTitle(title: string, maxLength: number): string {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 3) + '...';
  }

  /**
   * Scroll up
   */
  scrollUp(): void {
    this.element.scroll(-1);
  }

  /**
   * Scroll down
   */
  scrollDown(): void {
    this.element.scroll(1);
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.element.scrollTo(0);
  }
}
