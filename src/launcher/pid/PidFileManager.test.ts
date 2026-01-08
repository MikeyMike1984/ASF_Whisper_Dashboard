/**
 * Tests for PidFileManager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PidFileManager, PidFileData } from './PidFileManager';
import { ManagedProcess } from '../types';

describe('PidFileManager', () => {
  let tempDir: string;
  let pidPath: string;
  let manager: PidFileManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pid-test-'));
    pidPath = path.join(tempDir, '.asf', 'launcher.pid');
    manager = new PidFileManager(pidPath);
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  const createMockProcess = (id: string, type: 'dashboard' | 'agent'): ManagedProcess => ({
    id,
    type,
    pid: Math.floor(Math.random() * 100000),
    status: 'running',
    startedAt: Date.now(),
    restartCount: 0,
  });

  describe('write', () => {
    it('should create PID file with process data', () => {
      const processes: ManagedProcess[] = [
        createMockProcess('dashboard', 'dashboard'),
        createMockProcess('agent-01', 'agent'),
      ];

      manager.write(process.pid, processes);

      expect(fs.existsSync(pidPath)).toBe(true);

      const content = fs.readFileSync(pidPath, 'utf-8');
      const data = JSON.parse(content) as PidFileData;

      expect(data.launcherPid).toBe(process.pid);
      expect(data.processes).toHaveLength(2);
      expect(data.startedAt).toBeDefined();
    });

    it('should create parent directories if they do not exist', () => {
      const deepPath = path.join(tempDir, 'deep', 'nested', 'launcher.pid');
      const deepManager = new PidFileManager(deepPath);

      deepManager.write(process.pid, []);

      expect(fs.existsSync(deepPath)).toBe(true);
    });

    it('should overwrite existing PID file', () => {
      manager.write(1234, []);
      manager.write(5678, []);

      const data = manager.read();
      expect(data?.launcherPid).toBe(5678);
    });
  });

  describe('read', () => {
    it('should return null when PID file does not exist', () => {
      expect(manager.read()).toBeNull();
    });

    it('should return parsed data when PID file exists', () => {
      const processes: ManagedProcess[] = [createMockProcess('agent-01', 'agent')];
      manager.write(12345, processes);

      const data = manager.read();

      expect(data).not.toBeNull();
      expect(data?.launcherPid).toBe(12345);
      expect(data?.processes).toHaveLength(1);
    });

    it('should return null for corrupted JSON', () => {
      fs.mkdirSync(path.dirname(pidPath), { recursive: true });
      fs.writeFileSync(pidPath, 'invalid json');

      expect(manager.read()).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove PID file when it exists', () => {
      manager.write(process.pid, []);
      expect(fs.existsSync(pidPath)).toBe(true);

      manager.remove();

      expect(fs.existsSync(pidPath)).toBe(false);
    });

    it('should not throw when PID file does not exist', () => {
      expect(() => manager.remove()).not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return false when PID file does not exist', () => {
      expect(manager.exists()).toBe(false);
    });

    it('should return true when PID file exists', () => {
      manager.write(process.pid, []);
      expect(manager.exists()).toBe(true);
    });
  });

  describe('isStale', () => {
    it('should return false when PID file does not exist', () => {
      expect(manager.isStale()).toBe(false);
    });

    it('should return false when launcher process is running', () => {
      // Use current process PID (which is definitely running)
      manager.write(process.pid, []);
      expect(manager.isStale()).toBe(false);
    });

    it('should return true when launcher process is not running', () => {
      // Use a PID that almost certainly doesn't exist
      manager.write(99999999, []);
      expect(manager.isStale()).toBe(true);
    });
  });

  describe('getPath', () => {
    it('should return the absolute path', () => {
      const resultPath = manager.getPath();
      expect(path.isAbsolute(resultPath)).toBe(true);
    });
  });

  describe('updateProcesses', () => {
    it('should update processes in existing PID file', () => {
      const initialProcesses: ManagedProcess[] = [createMockProcess('agent-01', 'agent')];
      manager.write(process.pid, initialProcesses);

      const updatedProcesses: ManagedProcess[] = [
        createMockProcess('agent-01', 'agent'),
        createMockProcess('agent-02', 'agent'),
      ];
      manager.updateProcesses(updatedProcesses);

      const data = manager.read();
      expect(data?.processes).toHaveLength(2);
    });

    it('should not throw when PID file does not exist', () => {
      expect(() => manager.updateProcesses([])).not.toThrow();
    });
  });
});
