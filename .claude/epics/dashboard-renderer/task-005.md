# Task 005: BaseWidget Abstract Class

**Category**: Core (1-series)
**Dependencies**: Task 002
**Branch**: `feature/dashboard-renderer`

---

## Objective
Create an abstract base class for all dashboard widgets that standardizes lifecycle management, positioning, and blessed element handling.

## Acceptance Criteria
- [ ] `BaseWidget` abstract class with blessed element management
- [ ] Abstract `render(state)` method for subclasses
- [ ] `setPosition(x, y, width, height)` for layout
- [ ] `show()`, `hide()`, `focus()` methods
- [ ] `destroy()` for cleanup
- [ ] Protected `createElement()` helper for blessed elements
- [ ] Unit tests for lifecycle methods

## Implementation Steps
1. Create `src/dashboard/widgets/BaseWidget.ts`
2. Define abstract class with blessed.Widgets.BoxElement as base
3. Implement position/size management
4. Add visibility toggle methods
5. Create element factory helper
6. Write tests using concrete test subclass

## Test Specification
```typescript
// src/dashboard/widgets/__tests__/BaseWidget.test.ts
import blessed from 'neo-blessed';
import { BaseWidget } from '../BaseWidget';
import { DashboardState } from '../../types';

// Concrete implementation for testing
class TestWidget extends BaseWidget {
  public renderCalled = false;

  render(state: DashboardState): void {
    this.renderCalled = true;
  }
}

describe('BaseWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: TestWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new TestWidget(screen, { label: 'Test' });
  });

  afterEach(() => {
    widget.destroy();
    screen.destroy();
  });

  it('creates a blessed box element', () => {
    expect(widget.element).toBeDefined();
    expect(widget.element.type).toBe('box');
  });

  it('sets position correctly', () => {
    widget.setPosition(10, 20, 50, 30);

    expect(widget.element.left).toBe(10);
    expect(widget.element.top).toBe(20);
    expect(widget.element.width).toBe(50);
    expect(widget.element.height).toBe(30);
  });

  it('toggles visibility', () => {
    widget.hide();
    expect(widget.element.hidden).toBe(true);

    widget.show();
    expect(widget.element.hidden).toBe(false);
  });

  it('focuses the element', () => {
    widget.focus();
    expect(screen.focused).toBe(widget.element);
  });

  it('destroys element on cleanup', () => {
    const detachSpy = jest.spyOn(widget.element, 'detach');
    widget.destroy();
    expect(detachSpy).toHaveBeenCalled();
  });
});
```

## Class Interface
```typescript
import blessed from 'neo-blessed';
import { DashboardState } from '../types';

export interface WidgetOptions {
  label?: string;
  border?: 'line' | 'bg' | 'none';
  style?: blessed.Widgets.Types.TStyle;
}

export abstract class BaseWidget {
  protected screen: blessed.Widgets.Screen;
  public element: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen, options?: WidgetOptions);

  abstract render(state: DashboardState): void;

  setPosition(left: number, top: number, width: number, height: number): void;
  show(): void;
  hide(): void;
  focus(): void;
  destroy(): void;

  protected createElement(options: blessed.Widgets.BoxOptions): blessed.Widgets.BoxElement;
}
```

---

**Blocked By**: Task 002
**Blocks**: Task 006, 007, 008, 009
