import * as fs from 'fs';
import * as path from 'path';
import { SwarmPulse } from '../SwarmPulse';

describe('SwarmPulse', () => {
  const testDir = '.asf-test-pulse';
  const testDbPath = path.join(testDir, 'test_swarmpulse.db');

  beforeEach(() => {
    // Reset singleton
    SwarmPulse.resetInstance();

    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
  });

  afterEach(() => {
    // Ensure cleanup
    try {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.shutdown();
    } catch {
      // Instance may already be shut down
    }
    SwarmPulse.resetInstance();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const a = SwarmPulse.getInstance({ dbPath: testDbPath });
      const b = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(a).toBe(b);
    });

    it('should apply config only on first getInstance call', () => {
      const a = SwarmPulse.getInstance({ dbPath: testDbPath, heartbeatInterval: 1000 });
      // Second call with different config should be ignored
      const b = SwarmPulse.getInstance({ dbPath: 'different.db', heartbeatInterval: 5000 });
      expect(a).toBe(b);
    });

    it('should create new instance after resetInstance', () => {
      const a = SwarmPulse.getInstance({ dbPath: testDbPath });
      a.shutdown();
      SwarmPulse.resetInstance();
      const b = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(a).not.toBe(b);
    });
  });

  describe('Agent Lifecycle', () => {
    it('should register an agent and return a unique ID', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      const id = pulse.registerAgent('developer', 'feature/auth');

      expect(id).toMatch(/^agent-\d+-\d+$/);
    });

    it('should throw if registering twice without deregistering', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      expect(() => pulse.registerAgent('qa')).toThrow('Agent already registered');
    });

    it('should deregister an agent', async () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');
      pulse.deregisterAgent();

      // Small delay to ensure unique timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));

      // Should be able to register again after deregistering
      const newId = pulse.registerAgent('qa');
      expect(newId).toBeDefined();
    });

    it('should throw when deregistering without registration', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.deregisterAgent()).toThrow('No agent registered');
    });

    it('should return the current agent ID', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(pulse.getAgentId()).toBeNull();

      const id = pulse.registerAgent('developer');
      expect(pulse.getAgentId()).toBe(id);

      pulse.deregisterAgent();
      expect(pulse.getAgentId()).toBeNull();
    });
  });

  describe('Shutdown', () => {
    it('should stop heartbeat and deregister on shutdown', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');

      // Shutdown should not throw
      expect(() => pulse.shutdown()).not.toThrow();
    });

    it('should be safe to call shutdown multiple times', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');
      pulse.shutdown();

      // Second shutdown should not throw
      expect(() => pulse.shutdown()).not.toThrow();
    });

    it('should be safe to shutdown without registering', () => {
      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      expect(() => pulse.shutdown()).not.toThrow();
    });
  });

  describe('Zero Stdout', () => {
    it('should not write to stdout during registration', () => {
      const spy = jest.spyOn(process.stdout, 'write');

      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer', 'feature/test');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should not write to stdout during lifecycle operations', () => {
      const spy = jest.spyOn(process.stdout, 'write');

      const pulse = SwarmPulse.getInstance({ dbPath: testDbPath });
      pulse.registerAgent('developer');
      pulse.deregisterAgent();
      pulse.shutdown();

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
