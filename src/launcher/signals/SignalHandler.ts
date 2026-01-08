/**
 * Cross-platform signal handling for graceful shutdown
 */

import { EventEmitter } from 'events';

/** Supported signal types */
export type SignalType = 'SIGINT' | 'SIGTERM' | 'SIGHUP';

/**
 * Options for SignalHandler
 */
export interface SignalHandlerOptions {
  /** Signals to listen for (defaults to SIGINT, SIGTERM) */
  signals?: SignalType[];
  /** Callback to execute on shutdown */
  onShutdown: () => Promise<void>;
}

/**
 * Handles system signals for graceful shutdown
 */
export class SignalHandler extends EventEmitter {
  private signals: SignalType[];
  private onShutdown: () => Promise<void>;
  private isShuttingDown: boolean = false;
  private handlers: Map<string, NodeJS.SignalsListener> = new Map();
  private messageHandler?: (msg: unknown) => void;

  /**
   * Creates a new SignalHandler
   * @param options - Handler options
   */
  constructor(options: SignalHandlerOptions) {
    super();
    this.signals = options.signals || ['SIGINT', 'SIGTERM'];
    this.onShutdown = options.onShutdown;
  }

  /**
   * Registers signal handlers
   */
  register(): void {
    for (const signal of this.signals) {
      const handler = this.createHandler(signal);
      this.handlers.set(signal, handler);
      process.on(signal, handler);
    }

    // Windows-specific: Handle shutdown message via IPC
    if (process.platform === 'win32' && process.send) {
      this.messageHandler = (msg: unknown): void => {
        if (msg === 'shutdown') {
          void this.handleSignal('SIGTERM');
        }
      };
      process.on('message', this.messageHandler);
    }

    this.emit('registered');
  }

  /**
   * Unregisters all signal handlers
   */
  unregister(): void {
    for (const [signal, handler] of this.handlers) {
      process.removeListener(signal as NodeJS.Signals, handler);
    }
    this.handlers.clear();

    if (this.messageHandler) {
      process.removeListener('message', this.messageHandler);
      this.messageHandler = undefined;
    }

    this.emit('unregistered');
  }

  /**
   * Creates a handler function for a specific signal
   */
  private createHandler(signal: SignalType): NodeJS.SignalsListener {
    return (): void => {
      void this.handleSignal(signal);
    };
  }

  /**
   * Handles a received signal
   */
  private async handleSignal(signal: SignalType): Promise<void> {
    if (this.isShuttingDown) {
      // Second signal received - force exit
      console.log(`\nReceived ${signal} again, forcing exit...`);
      process.exit(1);
    }

    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}, initiating graceful shutdown...`);
    this.emit('shutdown', signal);

    try {
      await this.onShutdown();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Checks if shutdown is in progress
   * @returns True if shutting down
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Forces immediate shutdown
   */
  forceShutdown(): void {
    console.log('Forcing immediate shutdown...');
    process.exit(1);
  }

  /**
   * Resets the shutdown state (for testing)
   */
  reset(): void {
    this.isShuttingDown = false;
  }
}
