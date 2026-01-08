# Task 009: WhisperLogWidget

**Category**: Core (1-series)
**Dependencies**: Task 005
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create the whisper log widget that displays internal agent logs for the selected agent, with timestamps, log levels, and auto-scroll behavior.

## Acceptance Criteria
- [ ] `WhisperLogWidget` extends `BaseWidget`
- [ ] Shows logs for currently selected agent
- [ ] Displays timestamp, level (color-coded), and message
- [ ] Log levels: Info=white, Warn=yellow, Error=red
- [ ] Auto-scrolls to bottom on new logs
- [ ] Pause auto-scroll when user scrolls up
- [ ] Shows "Select an agent" when no agent selected
- [ ] Shows "No logs" when agent has no logs
- [ ] Unit tests for rendering and scroll behavior

## Implementation Steps
1. Create `src/dashboard/widgets/WhisperLogWidget.ts`
2. Extend BaseWidget with log rendering
3. Implement timestamp formatting
4. Add log level coloring
5. Implement auto-scroll with pause detection
6. Write comprehensive tests

## Test Specification
```typescript
// src/dashboard/widgets/__tests__/WhisperLogWidget.test.ts
import blessed from 'neo-blessed';
import { WhisperLogWidget } from '../WhisperLogWidget';
import { DashboardState, LogEntry } from '../../types';

describe('WhisperLogWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: WhisperLogWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new WhisperLogWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
    screen.destroy();
  });

  it('shows placeholder when no agent selected', () => {
    const state = createMockState({ selectedAgentId: null });
    widget.render(state);
    expect(widget.element.getContent()).toContain('Select an agent');
  });

  it('shows empty message when agent has no logs', () => {
    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([['A01', []]])
    });
    widget.render(state);
    expect(widget.element.getContent()).toContain('No logs');
  });

  it('displays logs with timestamp', () => {
    const timestamp = new Date('2026-01-07T14:23:01').getTime();
    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([['A01', [
        { id: 1, agentId: 'A01', level: 'Info', message: 'Reading patterns', timestamp }
      ]]])
    });
    widget.render(state);
    const content = widget.element.getContent();
    expect(content).toContain('14:23:01');
    expect(content).toContain('Reading patterns');
  });

  it('color-codes log levels', () => {
    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([['A01', [
        { id: 1, agentId: 'A01', level: 'Info', message: 'info msg', timestamp: 0 },
        { id: 2, agentId: 'A01', level: 'Warn', message: 'warn msg', timestamp: 0 },
        { id: 3, agentId: 'A01', level: 'Error', message: 'error msg', timestamp: 0 },
      ]]])
    });
    widget.render(state);
    const content = widget.element.getContent();
    expect(content).toContain('info msg');
    expect(content).toContain('warn msg');
    expect(content).toContain('error msg');
  });

  it('auto-scrolls to bottom by default', () => {
    const logs = Array(50).fill(null).map((_, i) => ({
      id: i,
      agentId: 'A01',
      level: 'Info' as const,
      message: `Log entry ${i}`,
      timestamp: i * 1000,
    }));

    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([['A01', logs]])
    });

    widget.render(state);
    // Verify scroll position is at bottom
    expect(widget.isAtBottom()).toBe(true);
  });

  it('pauses auto-scroll when manually scrolled up', () => {
    const logs = Array(50).fill(null).map((_, i) => ({
      id: i,
      agentId: 'A01',
      level: 'Info' as const,
      message: `Log entry ${i}`,
      timestamp: i * 1000,
    }));

    const state = createMockState({
      selectedAgentId: 'A01',
      logs: new Map([['A01', logs]])
    });

    widget.render(state);
    widget.scrollUp();

    expect(widget.isAutoScrollPaused()).toBe(true);
  });

  it('updates title with agent ID', () => {
    const state = createMockState({
      selectedAgentId: 'A03',
      logs: new Map([['A03', []]])
    });
    widget.render(state);
    expect(widget.element.options.label).toContain('A03');
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
┌─ WHISPER LOG [A03] ──────────────────────────┐
│ [14:23:01] Reading systemPatterns            │
│ [14:23:03] Planning auth module              │
│ [14:23:15] Writing failing test              │
│ [14:23:22] Implementing handler              │
│ [14:23:45] Running npm test                  │
│ [14:23:58] {green}Tests passing{/green}      │
└──────────────────────────────────────────────┘
```

## Class Interface
```typescript
export class WhisperLogWidget extends BaseWidget {
  constructor(screen: blessed.Widgets.Screen);

  render(state: DashboardState): void;

  scrollUp(): void;
  scrollDown(): void;
  scrollToBottom(): void;

  isAtBottom(): boolean;
  isAutoScrollPaused(): boolean;
  resumeAutoScroll(): void;

  private formatTimestamp(timestamp: number): string;
  private formatLogLevel(level: string): string;
}
```

---

**Blocked By**: Task 005
**Blocks**: Task 011
