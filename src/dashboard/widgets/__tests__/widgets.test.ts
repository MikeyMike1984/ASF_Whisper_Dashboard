/**
 * Widget Tests
 *
 * Tests for dashboard widgets using mocked blessed screen.
 */

import { DashboardState, DashboardAgent, Task } from '../../types';
import { TaskStatus, LogLevel, AgentStatus } from '../../../core/monitoring';

// Mock blessed module
jest.mock('neo-blessed', () => ({
  screen: jest.fn(() => ({
    append: jest.fn(),
    render: jest.fn(),
    destroy: jest.fn(),
    focused: null,
    key: jest.fn(),
    on: jest.fn(),
  })),
  box: jest.fn(() => ({
    setContent: jest.fn(),
    setLabel: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    detach: jest.fn(),
    scroll: jest.fn(),
    scrollTo: jest.fn(),
    setScrollPerc: jest.fn(),
    getScrollHeight: jest.fn(() => 100),
    getScroll: jest.fn(() => 0),
    on: jest.fn(),
    left: 0,
    top: 0,
    width: 0,
    height: 10,
    hidden: false,
    type: 'box',
    options: { label: '' },
  })),
}));

import blessed from 'neo-blessed';
import { HeaderWidget } from '../HeaderWidget';
import { AgentGridWidget } from '../AgentGridWidget';
import { TaskQueueWidget } from '../TaskQueueWidget';
import { WhisperLogWidget } from '../WhisperLogWidget';

describe('HeaderWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: HeaderWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new HeaderWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
  });

  it('creates a blessed box element', () => {
    expect(widget.element).toBeDefined();
  });

  it('renders with metrics', () => {
    const state = createMockState({
      metrics: {
        activeAgents: 5,
        totalAgents: 8,
        totalTokens: 125400,
        totalCost: 2.3456,
      },
    });

    widget.render(state);

    expect(widget.element.setContent).toHaveBeenCalled();
    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    expect(content).toContain('ASF Whisper Dashboard');
    expect(content).toContain('Agents: 5/8');
    expect(content).toContain('$2.35');
    expect(content).toContain('125.4k');
  });

  it('formats tokens with M suffix for millions', () => {
    const state = createMockState({
      metrics: {
        activeAgents: 1,
        totalAgents: 1,
        totalTokens: 1500000,
        totalCost: 0,
      },
    });

    widget.render(state);

    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    expect(content).toContain('1.5M');
  });
});

describe('AgentGridWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: AgentGridWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new AgentGridWidget(screen, { rows: 2, cols: 4 });
  });

  afterEach(() => {
    widget.destroy();
  });

  it('creates a blessed box element', () => {
    expect(widget.element).toBeDefined();
  });

  it('renders agents', () => {
    const state = createMockState({
      agents: [
        createMockAgent('A01', { status: AgentStatus.Busy, progress: 45 }),
        createMockAgent('A02', { status: AgentStatus.Idle }),
      ],
    });

    widget.render(state);

    expect(widget.element.setContent).toHaveBeenCalled();
  });

  it('navigates selection with selectNext', () => {
    const state = createMockState({
      agents: [createMockAgent('A01'), createMockAgent('A02')],
    });
    widget.render(state);

    widget.selectNext();
    expect(widget.getSelectedIndex()).toBe(0);

    widget.selectNext();
    expect(widget.getSelectedIndex()).toBe(1);
  });

  it('wraps selection at end', () => {
    const state = createMockState({
      agents: [createMockAgent('A01'), createMockAgent('A02')],
    });
    widget.render(state);

    widget.selectNext();
    widget.selectNext();
    widget.selectNext(); // Wrap

    expect(widget.getSelectedIndex()).toBe(0);
  });

  it('returns selected agent ID', () => {
    const state = createMockState({
      agents: [createMockAgent('A01'), createMockAgent('A02')],
    });
    widget.render(state);

    widget.selectNext();
    expect(widget.getSelectedAgentId()).toBe('A01');
  });

  it('clears selection', () => {
    const state = createMockState({
      agents: [createMockAgent('A01')],
    });
    widget.render(state);

    widget.selectNext();
    widget.clearSelection();

    expect(widget.getSelectedIndex()).toBe(-1);
    expect(widget.getSelectedAgentId()).toBeNull();
  });

  it('navigates selection with selectPrev', () => {
    const state = createMockState({
      agents: [createMockAgent('A01'), createMockAgent('A02'), createMockAgent('A03')],
    });
    widget.render(state);

    widget.selectNext(); // index 0
    widget.selectNext(); // index 1
    widget.selectPrev(); // index 0

    expect(widget.getSelectedIndex()).toBe(0);
  });

  it('wraps selection at beginning with selectPrev', () => {
    const state = createMockState({
      agents: [createMockAgent('A01'), createMockAgent('A02')],
    });
    widget.render(state);

    widget.selectNext(); // index 0
    widget.selectPrev(); // should wrap to end

    expect(widget.getSelectedIndex()).toBe(1);
  });

  it('navigates up in grid with selectUp', () => {
    // Grid: 2 rows x 4 cols
    const state = createMockState({
      agents: [
        createMockAgent('A01'),
        createMockAgent('A02'),
        createMockAgent('A03'),
        createMockAgent('A04'),
        createMockAgent('A05'),
        createMockAgent('A06'),
      ],
    });
    widget.render(state);

    // Move to index 4 (second row)
    for (let i = 0; i < 5; i++) widget.selectNext();
    expect(widget.getSelectedIndex()).toBe(4);

    widget.selectUp(); // Should move to index 0 (4 - 4 cols)
    expect(widget.getSelectedIndex()).toBe(0);
  });

  it('does not move up if already at top row', () => {
    const state = createMockState({
      agents: [
        createMockAgent('A01'),
        createMockAgent('A02'),
        createMockAgent('A03'),
        createMockAgent('A04'),
      ],
    });
    widget.render(state);

    widget.selectNext(); // index 0
    widget.selectUp(); // Should stay at 0

    expect(widget.getSelectedIndex()).toBe(0);
  });

  it('navigates down in grid with selectDown', () => {
    // Grid: 2 rows x 4 cols
    const state = createMockState({
      agents: [
        createMockAgent('A01'),
        createMockAgent('A02'),
        createMockAgent('A03'),
        createMockAgent('A04'),
        createMockAgent('A05'),
        createMockAgent('A06'),
      ],
    });
    widget.render(state);

    widget.selectNext(); // index 0
    widget.selectDown(); // Should move to index 4 (0 + 4 cols)

    expect(widget.getSelectedIndex()).toBe(4);
  });

  it('does not move down if would exceed agent count', () => {
    const state = createMockState({
      agents: [createMockAgent('A01'), createMockAgent('A02')],
    });
    widget.render(state);

    widget.selectNext(); // index 0
    widget.selectDown(); // Should stay at 0 (0 + 4 = 4 >= 2)

    expect(widget.getSelectedIndex()).toBe(0);
  });

  it('handles navigation with empty agents', () => {
    const state = createMockState({ agents: [] });
    widget.render(state);

    widget.selectNext();
    widget.selectPrev();
    widget.selectUp();
    widget.selectDown();

    expect(widget.getSelectedIndex()).toBe(-1);
  });
});

describe('TaskQueueWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: TaskQueueWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new TaskQueueWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
  });

  it('creates a blessed box element', () => {
    expect(widget.element).toBeDefined();
  });

  it('renders tasks with progress bars', () => {
    const state = createMockState({
      tasks: [
        createMockTask('t1', { title: 'auth-login', status: TaskStatus.InProgress, progressPercent: 75 }),
      ],
    });

    widget.render(state);

    expect(widget.element.setContent).toHaveBeenCalled();
  });

  it('shows no tasks message when empty', () => {
    const state = createMockState({ tasks: [] });
    widget.render(state);

    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    expect(content).toContain('No tasks');
  });

  it('sorts tasks by status: InProgress > Pending > Complete > Failed', () => {
    const now = Date.now();
    const state = createMockState({
      tasks: [
        createMockTask('t1', { status: TaskStatus.Failed, createdAt: now }),
        createMockTask('t2', { status: TaskStatus.InProgress, createdAt: now }),
        createMockTask('t3', { status: TaskStatus.Complete, createdAt: now }),
        createMockTask('t4', { status: TaskStatus.Pending, createdAt: now }),
      ],
    });
    widget.render(state);

    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    const lines = content.split('\n');
    expect(lines.length).toBe(4);
  });

  it('sorts tasks with same status by createdAt descending', () => {
    const now = Date.now();
    const state = createMockState({
      tasks: [
        createMockTask('t1', { title: 'older', status: TaskStatus.Pending, createdAt: now - 1000 }),
        createMockTask('t2', { title: 'newer', status: TaskStatus.Pending, createdAt: now }),
      ],
    });
    widget.render(state);

    expect(widget.element.setContent).toHaveBeenCalled();
  });

  it('truncates long task titles', () => {
    const state = createMockState({
      tasks: [
        createMockTask('t1', { title: 'This is a very long task title that exceeds the limit', status: TaskStatus.InProgress }),
      ],
    });
    widget.render(state);

    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    expect(content).toContain('...');
  });

  it('scrolls up and down', () => {
    widget.scrollUp();
    expect(widget.element.scroll).toHaveBeenCalledWith(-1);

    widget.scrollDown();
    expect(widget.element.scroll).toHaveBeenCalledWith(1);
  });

  it('scrolls to top', () => {
    widget.scrollToTop();
    expect(widget.element.scrollTo).toHaveBeenCalledWith(0);
  });
});

describe('WhisperLogWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: WhisperLogWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new WhisperLogWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
  });

  it('creates a blessed box element', () => {
    expect(widget.element).toBeDefined();
  });

  it('shows placeholder when no agent selected', () => {
    const state = createMockState({ selectedAgentId: null });
    widget.render(state);

    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    expect(content).toContain('Select an agent');
  });

  it('shows no logs message when agent has no logs', () => {
    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([['A01', []]]),
    });
    widget.render(state);

    const content = (widget.element.setContent as jest.Mock).mock.calls[0][0];
    expect(content).toContain('No logs');
  });

  it('renders logs with timestamps', () => {
    const timestamp = new Date('2026-01-07T14:23:01').getTime();
    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([
        [
          'A01',
          [{ id: 1, agentId: 'A01', level: LogLevel.Info, message: 'Test message', timestamp }],
        ],
      ]),
    });
    widget.render(state);

    expect(widget.element.setContent).toHaveBeenCalled();
  });

  it('updates label with agent ID', () => {
    const state = createMockState({
      selectedAgentId: 'A03',
      logs: new Map([['A03', []]]),
    });
    widget.render(state);

    expect(widget.element.setLabel).toHaveBeenCalled();
    const label = (widget.element.setLabel as jest.Mock).mock.calls[0][0];
    expect(label).toContain('A03');
  });

  it('scrolls up and disables auto-scroll', () => {
    widget.scrollUp();
    expect(widget.element.scroll).toHaveBeenCalledWith(-1);
    expect(widget.isAutoScrollPaused()).toBe(true);
  });

  it('scrolls down', () => {
    widget.scrollDown();
    expect(widget.element.scroll).toHaveBeenCalledWith(1);
  });

  it('scrolls to bottom and enables auto-scroll', () => {
    widget.scrollUp(); // Disable auto-scroll first
    expect(widget.isAutoScrollPaused()).toBe(true);

    widget.scrollToBottom();
    expect(widget.element.setScrollPerc).toHaveBeenCalledWith(100);
    expect(widget.isAutoScrollPaused()).toBe(false);
  });

  it('reports auto-scroll state', () => {
    // Initially auto-scroll is enabled
    expect(widget.isAutoScrollPaused()).toBe(false);

    widget.scrollUp();
    expect(widget.isAutoScrollPaused()).toBe(true);
  });

  it('resumes auto-scroll', () => {
    widget.scrollUp(); // Disable
    expect(widget.isAutoScrollPaused()).toBe(true);

    widget.resumeAutoScroll();
    expect(widget.isAutoScrollPaused()).toBe(false);
    expect(widget.element.setScrollPerc).toHaveBeenCalledWith(100);
  });

  it('checks if at bottom', () => {
    // Mock returns scrollHeight=100, height=10, scroll=0
    // isAtBottom: scroll >= scrollHeight - (height - 2) = 0 >= 100 - 8 = false
    expect(widget.isAtBottom()).toBe(false);
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockState(overrides: Partial<DashboardState> = {}): DashboardState {
  return {
    agents: [],
    tasks: [],
    logs: new Map(),
    metrics: {
      totalTokens: 0,
      totalCost: 0,
      activeAgents: 0,
      totalAgents: 0,
    },
    selectedAgentId: null,
    lastPollTime: Date.now(),
    ...overrides,
  };
}

function createMockAgent(id: string, overrides: Partial<DashboardAgent> = {}): DashboardAgent {
  return {
    id,
    pid: 123,
    role: 'worker',
    status: AgentStatus.Idle,
    currentTaskId: null,
    lastSeen: Date.now(),
    worktreePath: '/path',
    createdAt: Date.now(),
    isActive: true,
    progress: 0,
    ...overrides,
  };
}

function createMockTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    status: TaskStatus.Pending,
    assignedAgentId: null,
    progressPercent: 0,
    dependencies: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}
