# Task 007: AgentGridWidget

**Category**: Core (1-series)
**Dependencies**: Task 005
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create the agent grid widget that displays a configurable matrix of agent cards with real-time status, progress, and selection highlighting.

## Acceptance Criteria
- [ ] `AgentGridWidget` extends `BaseWidget`
- [ ] Configurable grid size (default 2x4)
- [ ] Each cell shows: Agent ID, Status (color-coded), Progress %
- [ ] Status colors: Idle=cyan, Busy=green, Error=yellow, Dead=red
- [ ] Selected agent has highlighted border
- [ ] `selectNext()`, `selectPrev()`, `selectUp()`, `selectDown()` methods
- [ ] Handles fewer agents than grid cells gracefully
- [ ] Unit tests for rendering and navigation

## Implementation Steps
1. Create `src/dashboard/widgets/AgentGridWidget.ts`
2. Extend BaseWidget with grid layout logic
3. Create agent card renderer with status coloring
4. Implement grid navigation methods
5. Handle selection state and highlighting
6. Write comprehensive tests

## Test Specification
```typescript
// src/dashboard/widgets/__tests__/AgentGridWidget.test.ts
import blessed from 'neo-blessed';
import { AgentGridWidget } from '../AgentGridWidget';
import { DashboardState, Agent } from '../../types';

describe('AgentGridWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: AgentGridWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new AgentGridWidget(screen, { rows: 2, cols: 4 });
  });

  afterEach(() => {
    widget.destroy();
    screen.destroy();
  });

  it('displays agents in grid layout', () => {
    const state = createMockState({
      agents: [
        { id: 'A01', status: 'Busy', progress: 45 },
        { id: 'A02', status: 'Idle', progress: 0 },
      ]
    });
    widget.render(state);
    const content = widget.element.getContent();
    expect(content).toContain('A01');
    expect(content).toContain('A02');
  });

  it('shows status with correct colors', () => {
    const state = createMockState({
      agents: [
        { id: 'A01', status: 'Busy', progress: 45 },
        { id: 'A02', status: 'Dead', progress: 0 },
      ]
    });
    widget.render(state);
    // Color verification happens through blessed style tags
    const content = widget.element.getContent();
    expect(content).toContain('BUSY');
    expect(content).toContain('DEAD');
  });

  it('displays progress percentage for busy agents', () => {
    const state = createMockState({
      agents: [{ id: 'A01', status: 'Busy', progress: 78 }]
    });
    widget.render(state);
    expect(widget.element.getContent()).toContain('78%');
  });

  it('navigates selection with selectNext', () => {
    const state = createMockState({
      agents: [
        { id: 'A01', status: 'Idle' },
        { id: 'A02', status: 'Idle' },
      ]
    });
    widget.render(state);

    widget.selectNext();
    expect(widget.getSelectedIndex()).toBe(0);

    widget.selectNext();
    expect(widget.getSelectedIndex()).toBe(1);
  });

  it('wraps selection at grid boundaries', () => {
    const state = createMockState({
      agents: [
        { id: 'A01', status: 'Idle' },
        { id: 'A02', status: 'Idle' },
      ]
    });
    widget.render(state);

    widget.selectNext();
    widget.selectNext();
    widget.selectNext(); // Should wrap to 0

    expect(widget.getSelectedIndex()).toBe(0);
  });

  it('handles vertical navigation', () => {
    const state = createMockState({
      agents: Array(8).fill(null).map((_, i) => ({
        id: `A0${i + 1}`,
        status: 'Idle',
      }))
    });
    widget.render(state);

    widget.selectNext(); // Select first
    widget.selectDown(); // Should jump to row 2

    expect(widget.getSelectedIndex()).toBe(4); // 4 cols per row
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
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ A01 │ │ A02 │ │ A03 │ │ A04 │
│BUSY │ │IDLE │ │BUSY │ │ ERR │
│ 45% │ │  -  │ │ 78% │ │  !  │
└─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ A05 │ │ A06 │ │ A07 │ │ A08 │
│BUSY │ │BUSY │ │IDLE │ │DEAD │
│ 12% │ │ 91% │ │  -  │ │  X  │
└─────┘ └─────┘ └─────┘ └─────┘
```

## Class Interface
```typescript
export interface AgentGridOptions {
  rows: number;
  cols: number;
}

export class AgentGridWidget extends BaseWidget {
  constructor(screen: blessed.Widgets.Screen, options?: AgentGridOptions);

  render(state: DashboardState): void;

  selectNext(): void;
  selectPrev(): void;
  selectUp(): void;
  selectDown(): void;
  clearSelection(): void;

  getSelectedIndex(): number;
  getSelectedAgentId(): string | null;
}
```

---

**Blocked By**: Task 005
**Blocks**: Task 011
