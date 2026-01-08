# Task 008: TaskQueueWidget

**Category**: Core (1-series)
**Dependencies**: Task 005
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create the task queue widget that displays all tasks with progress bars, status indicators, and scrolling capability.

## Acceptance Criteria
- [ ] `TaskQueueWidget` extends `BaseWidget`
- [ ] Displays tasks with ASCII progress bars
- [ ] Shows task title (truncated if needed) and percentage
- [ ] Tasks ordered: InProgress first, then Pending, then Complete
- [ ] Scrollable list for many tasks
- [ ] Color-coded by status (InProgress=green, Pending=yellow, Complete=cyan, Failed=red)
- [ ] `scrollUp()`, `scrollDown()` methods
- [ ] Unit tests for rendering and scrolling

## Implementation Steps
1. Create `src/dashboard/widgets/TaskQueueWidget.ts`
2. Extend BaseWidget with list rendering logic
3. Implement progress bar generator
4. Add task sorting logic
5. Implement scrolling with viewport
6. Write comprehensive tests

## Test Specification
```typescript
// src/dashboard/widgets/__tests__/TaskQueueWidget.test.ts
import blessed from 'neo-blessed';
import { TaskQueueWidget } from '../TaskQueueWidget';
import { DashboardState, Task } from '../../types';

describe('TaskQueueWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: TaskQueueWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new TaskQueueWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
    screen.destroy();
  });

  it('displays task with progress bar', () => {
    const state = createMockState({
      tasks: [{ id: 't1', title: 'auth-login', status: 'InProgress', progress: 75 }]
    });
    widget.render(state);
    const content = widget.element.getContent();
    expect(content).toContain('auth-login');
    expect(content).toContain('75%');
    expect(content).toMatch(/\[#+\s*\]/); // Progress bar pattern
  });

  it('sorts tasks by status', () => {
    const state = createMockState({
      tasks: [
        { id: 't1', title: 'complete-task', status: 'Complete', progress: 100 },
        { id: 't2', title: 'in-progress-task', status: 'InProgress', progress: 50 },
        { id: 't3', title: 'pending-task', status: 'Pending', progress: 0 },
      ]
    });
    widget.render(state);
    const content = widget.element.getContent();

    const inProgressIdx = content.indexOf('in-progress-task');
    const pendingIdx = content.indexOf('pending-task');
    const completeIdx = content.indexOf('complete-task');

    expect(inProgressIdx).toBeLessThan(pendingIdx);
    expect(pendingIdx).toBeLessThan(completeIdx);
  });

  it('renders correct progress bar fill', () => {
    const state = createMockState({
      tasks: [{ id: 't1', title: 'test', status: 'InProgress', progress: 50 }]
    });
    widget.render(state);
    const content = widget.element.getContent();

    // With 10-char bar, 50% = 5 filled
    expect(content).toMatch(/\[#{5}\s{5}\]/);
  });

  it('truncates long task titles', () => {
    const state = createMockState({
      tasks: [{
        id: 't1',
        title: 'very-long-task-name-that-exceeds-limit',
        status: 'InProgress',
        progress: 50
      }]
    });
    widget.render(state);
    const content = widget.element.getContent();
    expect(content).toContain('...');
  });

  it('scrolls through long task list', () => {
    const tasks = Array(20).fill(null).map((_, i) => ({
      id: `t${i}`,
      title: `task-${i}`,
      status: 'Pending' as const,
      progress: 0,
    }));
    const state = createMockState({ tasks });
    widget.render(state);

    widget.scrollDown();
    widget.scrollDown();

    // After scrolling, earlier tasks should not be visible
    // (exact behavior depends on viewport size)
  });
});

function createMockState(overrides?: Partial<DashboardState>): DashboardState {
  return {
    agents: [],
    tasks: [],
    logs: new Map(),
    metrics: { totalTokens: 0, totalCost: 0, activeAgents: 0, totalAgents: 0 },
    selectedAgentId: null,
    lastPollTime: Date.now(),
    ...overrides,
  };
}
```

## Visual Design
```
TASK QUEUE
───────────────────────────
[##########] 100% auth-login
[#######   ]  78% auth-register
[####      ]  45% user-model
[          ]   0% api-docs
```

## Class Interface
```typescript
export class TaskQueueWidget extends BaseWidget {
  constructor(screen: blessed.Widgets.Screen);

  render(state: DashboardState): void;

  scrollUp(): void;
  scrollDown(): void;
  scrollToTop(): void;

  private generateProgressBar(percent: number, width: number): string;
  private sortTasks(tasks: Task[]): Task[];
  private truncateTitle(title: string, maxLength: number): string;
}
```

---

**Blocked By**: Task 005
**Blocks**: Task 011
