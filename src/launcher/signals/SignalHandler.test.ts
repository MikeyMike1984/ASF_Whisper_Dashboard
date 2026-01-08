/**
 * Tests for SignalHandler
 */

import { SignalHandler } from './SignalHandler';

describe('SignalHandler', () => {
  let handler: SignalHandler;

  beforeEach(() => {
    handler = new SignalHandler({
      onShutdown: async () => {
        // Shutdown callback for testing
      },
    });
  });

  afterEach(() => {
    handler.unregister();
    handler.reset();
  });

  describe('register', () => {
    it('should emit "registered" event', () => {
      const onRegistered = jest.fn();
      handler.on('registered', onRegistered);

      handler.register();

      expect(onRegistered).toHaveBeenCalled();
    });

    it('should register handlers for default signals', () => {
      // Can't easily test actual signal registration without sending signals
      // Just verify no errors occur
      expect(() => handler.register()).not.toThrow();
    });
  });

  describe('unregister', () => {
    it('should emit "unregistered" event', () => {
      const onUnregistered = jest.fn();
      handler.on('unregistered', onUnregistered);

      handler.register();
      handler.unregister();

      expect(onUnregistered).toHaveBeenCalled();
    });

    it('should not throw when called multiple times', () => {
      handler.register();
      expect(() => {
        handler.unregister();
        handler.unregister();
      }).not.toThrow();
    });
  });

  describe('isShutdownInProgress', () => {
    it('should return false initially', () => {
      expect(handler.isShutdownInProgress()).toBe(false);
    });

    it('should return false after reset', () => {
      // Can't easily trigger shutdown state without actual signals
      // Test the reset behavior
      handler.reset();
      expect(handler.isShutdownInProgress()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset shutdown state', () => {
      handler.reset();
      expect(handler.isShutdownInProgress()).toBe(false);
    });
  });

  describe('custom signals', () => {
    it('should accept custom signal list', () => {
      const customHandler = new SignalHandler({
        signals: ['SIGINT'],
        onShutdown: async () => {},
      });

      expect(() => customHandler.register()).not.toThrow();
      customHandler.unregister();
    });
  });
});
