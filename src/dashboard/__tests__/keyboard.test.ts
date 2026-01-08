/**
 * Keyboard Navigation Tests
 *
 * Tests for keyboard handlers and poll interval adjustment.
 */

import { DashboardRenderer } from '../DashboardRenderer';
import { initializeDatabase } from '../../core/monitoring/db/schema';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

// Mock blessed module
jest.mock('neo-blessed', () => {
  const keyHandlers: Record<string, Function[]> = {};

  return {
    screen: jest.fn(() => ({
      append: jest.fn(),
      render: jest.fn(),
      destroy: jest.fn(),
      focused: null,
      key: jest.fn((keys: string[], handler: Function) => {
        for (const key of keys) {
          if (!keyHandlers[key]) keyHandlers[key] = [];
          keyHandlers[key].push(handler);
        }
      }),
      on: jest.fn(),
      emit: jest.fn((event: string, ch: any, key: any) => {
        if (event === 'keypress' && keyHandlers[key?.name]) {
          keyHandlers[key.name].forEach((h) => h(ch, key));
        }
      }),
      _keyHandlers: keyHandlers,
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
  };
});

describe('Keyboard Navigation', () => {
  let tempDir: string;
  let dbPath: string;
  let renderer: DashboardRenderer;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'keyboard-test-'));
    dbPath = resolve(tempDir, 'test.db');
    const db = initializeDatabase(dbPath);
    db.close();
  });

  afterEach(async () => {
    if (renderer) {
      await renderer.stop();
    }
    rmSync(tempDir, { recursive: true });
  });

  describe('poll interval adjustment', () => {
    it('increases poll interval with + key', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();

      renderer.simulateKeypress('+');

      expect(renderer.getConfig().pollInterval).toBe(750);
    });

    it('decreases poll interval with - key', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 750 });
      await renderer.start();

      renderer.simulateKeypress('-');

      expect(renderer.getConfig().pollInterval).toBe(500);
    });

    it('does not decrease below minimum (250ms)', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 300 });
      await renderer.start();

      renderer.simulateKeypress('-');

      expect(renderer.getConfig().pollInterval).toBe(250);
    });

    it('does not increase above maximum (2000ms)', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 1900 });
      await renderer.start();

      renderer.simulateKeypress('+');

      expect(renderer.getConfig().pollInterval).toBe(2000);
    });
  });

  describe('agent selection', () => {
    it('selects first agent with right arrow when no selection', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`INSERT INTO agents VALUES ('A01', 1, 'worker', 'Idle', NULL, ${now}, '/path', ${now}, 1)`);
      db.exec(`INSERT INTO agents VALUES ('A02', 2, 'worker', 'Idle', NULL, ${now}, '/path', ${now}, 1)`);
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();
      await sleep(100);

      renderer.simulateKeypress('right');

      expect(renderer.getState().selectedAgentId).toBeTruthy();
    });

    it('navigates with left arrow', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`INSERT INTO agents VALUES ('A01', 1, 'worker', 'Idle', NULL, ${now}, '/path', ${now}, 1)`);
      db.exec(`INSERT INTO agents VALUES ('A02', 2, 'worker', 'Idle', NULL, ${now}, '/path', ${now}, 1)`);
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();
      await sleep(100);

      renderer.simulateKeypress('right'); // Select first
      renderer.simulateKeypress('right'); // Move to second
      renderer.simulateKeypress('left'); // Move back to first

      expect(renderer.getState().selectedAgentId).toBeTruthy();
    });

    it('navigates with up arrow', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      // Create enough agents for grid navigation
      for (let i = 1; i <= 8; i++) {
        db.exec(`INSERT INTO agents VALUES ('A0${i}', ${i}, 'worker', 'Idle', NULL, ${now}, '/path', ${now}, 1)`);
      }
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 500, gridCols: 4 });
      await renderer.start();
      await sleep(100);

      // Select an agent in second row then navigate up
      for (let i = 0; i < 5; i++) renderer.simulateKeypress('right');
      renderer.simulateKeypress('up');

      expect(renderer.getState().selectedAgentId).toBeTruthy();
    });

    it('navigates with down arrow', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      // Create enough agents for grid navigation
      for (let i = 1; i <= 8; i++) {
        db.exec(`INSERT INTO agents VALUES ('A0${i}', ${i}, 'worker', 'Idle', NULL, ${now}, '/path', ${now}, 1)`);
      }
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 500, gridCols: 4 });
      await renderer.start();
      await sleep(100);

      renderer.simulateKeypress('right'); // Select first
      renderer.simulateKeypress('down'); // Move down to second row

      expect(renderer.getState().selectedAgentId).toBeTruthy();
    });

    it('focuses whisper log with enter key', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();

      // Pressing enter should focus the whisper log widget
      renderer.simulateKeypress('enter');

      // Just verify it doesn't throw - widget focus is mocked
      expect(renderer.isRunning()).toBe(true);
    });

    it('clears selection with escape', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();

      renderer.selectAgent('A01');
      expect(renderer.getState().selectedAgentId).toBe('A01');

      renderer.simulateKeypress('escape');

      expect(renderer.getState().selectedAgentId).toBeNull();
    });

    it('handles updateSelectionFromGrid when agent is null', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();

      // Pressing left on empty grid should clear selection
      renderer.simulateKeypress('left');

      expect(renderer.getState().selectedAgentId).toBeNull();
    });
  });

  describe('exit handling', () => {
    it('emits exit event on q key', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      const exitListener = jest.fn();
      renderer.on('exit', exitListener);

      await renderer.start();
      renderer.simulateKeypress('q');

      expect(exitListener).toHaveBeenCalled();
    });
  });

  describe('force refresh', () => {
    it('triggers poll on r key', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 2000 });
      await renderer.start();

      const beforePoll = renderer.getState().lastPollTime;
      await sleep(50);

      renderer.simulateKeypress('r');
      await sleep(100);

      const afterPoll = renderer.getState().lastPollTime;
      expect(afterPoll).toBeGreaterThan(beforePoll);
    });
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
