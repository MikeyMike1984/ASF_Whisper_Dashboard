# Task 006: HeaderWidget

**Category**: Core (1-series)
**Dependencies**: Task 005
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create the header widget that displays the dashboard title, active agent count, total cost, and token usage.

## Acceptance Criteria
- [ ] `HeaderWidget` extends `BaseWidget`
- [ ] Displays "ASF Whisper Dashboard" title
- [ ] Shows "Agents: X/Y" (active/total count)
- [ ] Shows "Cost: $X.XX" (total estimated cost)
- [ ] Shows "Tokens: XXX.Xk" (total tokens with k/M suffix)
- [ ] Updates on each render with new metrics
- [ ] Fixed height of 3 rows
- [ ] Unit tests verify rendering output

## Implementation Steps
1. Create `src/dashboard/widgets/HeaderWidget.ts`
2. Extend BaseWidget with header-specific rendering
3. Implement metric formatting helpers (cost, tokens)
4. Style with inverse colors for visibility
5. Write rendering tests

## Test Specification
```typescript
// src/dashboard/widgets/__tests__/HeaderWidget.test.ts
import blessed from 'neo-blessed';
import { HeaderWidget } from '../HeaderWidget';
import { DashboardState, AggregatedMetrics } from '../../types';

describe('HeaderWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: HeaderWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new HeaderWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
    screen.destroy();
  });

  it('displays dashboard title', () => {
    widget.render(createMockState());
    const content = widget.element.getContent();
    expect(content).toContain('ASF Whisper Dashboard');
  });

  it('shows agent count', () => {
    const state = createMockState({
      metrics: { activeAgents: 5, totalAgents: 8 }
    });
    widget.render(state);
    expect(widget.element.getContent()).toContain('Agents: 5/8');
  });

  it('formats cost with dollar sign', () => {
    const state = createMockState({
      metrics: { totalCost: 2.3456 }
    });
    widget.render(state);
    expect(widget.element.getContent()).toContain('Cost: $2.35');
  });

  it('formats tokens with k suffix', () => {
    const state = createMockState({
      metrics: { totalTokens: 125400 }
    });
    widget.render(state);
    expect(widget.element.getContent()).toContain('125.4k');
  });

  it('formats tokens with M suffix for millions', () => {
    const state = createMockState({
      metrics: { totalTokens: 1500000 }
    });
    widget.render(state);
    expect(widget.element.getContent()).toContain('1.5M');
  });
});

function createMockState(overrides?: Partial<DashboardState>): DashboardState {
  return {
    agents: [],
    tasks: [],
    logs: new Map(),
    metrics: {
      totalTokens: 0,
      totalCost: 0,
      activeAgents: 0,
      totalAgents: 0,
      ...overrides?.metrics,
    },
    selectedAgentId: null,
    lastPollTime: Date.now(),
    ...overrides,
  };
}
```

## Visual Design
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ASF Whisper Dashboard          Agents: 5/8    Cost: $2.35    Tokens: 125.4k │
└──────────────────────────────────────────────────────────────────────────┘
```

## Class Interface
```typescript
export class HeaderWidget extends BaseWidget {
  constructor(screen: blessed.Widgets.Screen);

  render(state: DashboardState): void;

  private formatTokens(tokens: number): string;
  private formatCost(cost: number): string;
}
```

---

**Blocked By**: Task 005
**Blocks**: Task 011
