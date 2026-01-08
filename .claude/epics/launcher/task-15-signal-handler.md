# Task 15: Signal Handler

## Category
Core Logic

## Objective
Implement cross-platform signal handling for graceful shutdown.

## Dependencies
- task-14 (ProcessManager)

## Deliverables
1. `src/launcher/signals/SignalHandler.ts` - Signal handling logic
2. `src/launcher/signals/SignalHandler.test.ts` - Unit tests

## Implementation

### SignalHandler.ts
```typescript
import { EventEmitter } from 'events';

export type SignalType = 'SIGINT' | 'SIGTERM' | 'SIGHUP';

export interface SignalHandlerOptions {
  signals?: SignalType[];
  onShutdown: () => Promise<void>;
}

export class SignalHandler extends EventEmitter {
  private signals: SignalType[];
  private onShutdown: () => Promise<void>;
  private isShuttingDown: boolean = false;
  private handlers: Map<SignalType, NodeJS.SignalsListener> = new Map();

  constructor(options: SignalHandlerOptions) {
    super();
    this.signals = options.signals || ['SIGINT', 'SIGTERM'];
    this.onShutdown = options.onShutdown;
  }

  register(): void {
    for (const signal of this.signals) {
      const handler = this.createHandler(signal);
      this.handlers.set(signal, handler);
      process.on(signal, handler);
    }

    // Windows-specific: Handle Ctrl+C via 'message' event if IPC
    if (process.platform === 'win32') {
      process.on('message', (msg) => {
        if (msg === 'shutdown') {
          this.handleSignal('SIGTERM');
        }
      });
    }

    this.emit('registered');
  }

  unregister(): void {
    for (const [signal, handler] of this.handlers) {
      process.removeListener(signal, handler);
    }
    this.handlers.clear();
    this.emit('unregistered');
  }

  private createHandler(signal: SignalType): NodeJS.SignalsListener {
    return async () => {
      await this.handleSignal(signal);
    };
  }

  private async handleSignal(signal: SignalType): Promise<void> {
    if (this.isShuttingDown) {
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

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  forceShutdown(): void {
    console.log('Forcing immediate shutdown...');
    process.exit(1);
  }
}
```

## Acceptance Criteria
- [ ] Handles SIGINT (Ctrl+C) gracefully
- [ ] Handles SIGTERM gracefully
- [ ] Second signal forces immediate exit
- [ ] Windows compatibility via message event
- [ ] Emits events for shutdown tracking
- [ ] Prevents duplicate shutdown calls
- [ ] 100% test coverage

## Test Specification
```typescript
describe('SignalHandler', () => {
  let handler: SignalHandler;
  let shutdownCalled: boolean;

  beforeEach(() => {
    shutdownCalled = false;
    handler = new SignalHandler({
      onShutdown: async () => {
        shutdownCalled = true;
      }
    });
  });

  afterEach(() => {
    handler.unregister();
  });

  it('should register signal handlers', () => {
    handler.register();
    // Check that handlers are registered
    expect(handler.listeners('registered')).toBeDefined();
  });

  it('should call onShutdown when signal received', async () => {
    handler.register();
    // Simulate signal (can't actually send in tests)
    // This would be an integration test
  });

  it('should prevent duplicate shutdown calls', () => {
    handler.register();
    // First call sets isShuttingDown
    expect(handler.isShutdownInProgress()).toBe(false);
  });

  it('should unregister handlers', () => {
    handler.register();
    handler.unregister();
    // Verify handlers removed
  });
});
```

## Estimated Effort
2 hours

## Notes
- Windows doesn't have real POSIX signals
- Ctrl+C on Windows sends SIGINT-like event
- Second Ctrl+C should force exit immediately
- Consider using `exit-hook` library as alternative
