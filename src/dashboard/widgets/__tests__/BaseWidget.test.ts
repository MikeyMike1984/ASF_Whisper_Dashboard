/**
 * BaseWidget Tests
 *
 * Tests for the abstract base widget class.
 */

import { DashboardState } from '../../types';

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
import { BaseWidget } from '../BaseWidget';

// Concrete test implementation
class TestWidget extends BaseWidget {
  public renderCalled = false;

  render(_state: DashboardState): void {
    this.renderCalled = true;
    this.setContent('Test content');
  }
}

describe('BaseWidget', () => {
  let screen: blessed.Widgets.Screen;
  let widget: TestWidget;

  beforeEach(() => {
    screen = blessed.screen({ smartCSR: true });
    widget = new TestWidget(screen);
  });

  afterEach(() => {
    widget.destroy();
  });

  describe('createElement', () => {
    it('creates a blessed box element', () => {
      expect(widget.element).toBeDefined();
    });

    it('creates element with label option', () => {
      const labeledWidget = new TestWidget(screen, { label: 'Test Label' });
      expect(blessed.box).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Test Label',
        })
      );
      labeledWidget.destroy();
    });

    it('creates element with no border when specified', () => {
      const noBorderWidget = new TestWidget(screen, { border: 'none' });
      expect(blessed.box).toHaveBeenCalledWith(
        expect.objectContaining({
          border: undefined,
        })
      );
      noBorderWidget.destroy();
    });

    it('creates element with custom style', () => {
      const customStyle = { fg: 'red', bg: 'blue' };
      const styledWidget = new TestWidget(screen, { style: customStyle });
      expect(blessed.box).toHaveBeenCalledWith(
        expect.objectContaining({
          style: customStyle,
        })
      );
      styledWidget.destroy();
    });
  });

  describe('setPosition', () => {
    it('sets numeric position', () => {
      widget.setPosition(10, 20, 50, 30);
      expect(widget.element.left).toBe(10);
      expect(widget.element.top).toBe(20);
      expect(widget.element.width).toBe(50);
      expect(widget.element.height).toBe(30);
    });

    it('sets string position', () => {
      widget.setPosition('50%', '25%', '100%', '50%');
      expect(widget.element.left).toBe('50%');
      expect(widget.element.top).toBe('25%');
      expect(widget.element.width).toBe('100%');
      expect(widget.element.height).toBe('50%');
    });
  });

  describe('visibility', () => {
    it('shows element', () => {
      widget.show();
      expect(widget.element.show).toHaveBeenCalled();
    });

    it('hides element', () => {
      widget.hide();
      expect(widget.element.hide).toHaveBeenCalled();
    });
  });

  describe('focus', () => {
    it('focuses element', () => {
      widget.focus();
      expect(widget.element.focus).toHaveBeenCalled();
    });

    it('reports focus state correctly when not focused', () => {
      (screen as any).focused = null;
      expect(widget.isFocused()).toBe(false);
    });

    it('reports focus state correctly when focused', () => {
      (screen as any).focused = widget.element;
      expect(widget.isFocused()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('detaches element from screen', () => {
      widget.destroy();
      expect(widget.element.detach).toHaveBeenCalled();
    });

    it('is idempotent - multiple destroys are safe', () => {
      widget.destroy();
      widget.destroy();
      expect(widget.element.detach).toHaveBeenCalledTimes(1);
    });
  });

  describe('render', () => {
    it('calls render implementation', () => {
      widget.render(createMockState());
      expect(widget.renderCalled).toBe(true);
    });

    it('sets content via protected method', () => {
      widget.render(createMockState());
      expect(widget.element.setContent).toHaveBeenCalledWith('Test content');
    });
  });
});

function createMockState(): DashboardState {
  return {
    agents: [],
    tasks: [],
    logs: new Map(),
    metrics: { totalTokens: 0, totalCost: 0, activeAgents: 0, totalAgents: 0 },
    selectedAgentId: null,
    lastPollTime: Date.now(),
  };
}
