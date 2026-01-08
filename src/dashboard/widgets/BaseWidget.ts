/**
 * Base Widget
 *
 * Abstract base class for all dashboard widgets.
 * Provides common lifecycle management and blessed element handling.
 */

import blessed from 'neo-blessed';
import { DashboardState } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface WidgetOptions {
  /** Widget label/title */
  label?: string;
  /** Border style */
  border?: 'line' | 'bg' | 'none';
  /** Custom blessed style */
  style?: blessed.Widgets.Types.TStyle;
}

// ============================================================================
// Base Widget Class
// ============================================================================

/**
 * Abstract base class for dashboard widgets
 */
export abstract class BaseWidget {
  protected screen: blessed.Widgets.Screen;
  public element: blessed.Widgets.BoxElement;
  protected destroyed = false;

  constructor(screen: blessed.Widgets.Screen, options: WidgetOptions = {}) {
    this.screen = screen;
    this.element = this.createElement(options);
    this.screen.append(this.element);
  }

  /**
   * Render the widget with current state
   * Must be implemented by subclasses
   */
  abstract render(state: DashboardState): void;

  /**
   * Create the blessed element
   */
  protected createElement(options: WidgetOptions): blessed.Widgets.BoxElement {
    return blessed.box({
      label: options.label,
      border: options.border === 'none' ? undefined : { type: options.border || 'line' },
      style: options.style || {
        border: { fg: 'white' },
        label: { fg: 'white', bold: true },
      },
      scrollable: false,
      alwaysScroll: false,
    });
  }

  /**
   * Set widget position and size
   */
  setPosition(left: number | string, top: number | string, width: number | string, height: number | string): void {
    this.element.left = left;
    this.element.top = top;
    this.element.width = width;
    this.element.height = height;
  }

  /**
   * Show the widget
   */
  show(): void {
    this.element.show();
  }

  /**
   * Hide the widget
   */
  hide(): void {
    this.element.hide();
  }

  /**
   * Focus the widget
   */
  focus(): void {
    this.element.focus();
  }

  /**
   * Check if widget is focused
   */
  isFocused(): boolean {
    return this.screen.focused === this.element;
  }

  /**
   * Destroy the widget and clean up resources
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.element.detach();
  }

  /**
   * Set widget content
   */
  protected setContent(content: string): void {
    this.element.setContent(content);
  }

  /**
   * Set widget label
   */
  protected setLabel(label: string): void {
    this.element.setLabel(label);
  }

  /**
   * Request screen render
   */
  protected requestRender(): void {
    this.screen.render();
  }
}
