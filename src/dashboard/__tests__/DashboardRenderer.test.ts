/**
 * Dashboard Renderer Tests
 */

import { DashboardRenderer } from '../DashboardRenderer';
import { initializeDatabase } from '../../core/monitoring/db/schema';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

// Mock blessed module for headless testing
jest.mock('neo-blessed', () => ({
  screen: jest.fn(() => ({
    append: jest.fn(),
    render: jest.fn(),
    destroy: jest.fn(),
    focused: null,
    key: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
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

describe('DashboardRenderer', () => {
  let tempDir: string;
  let dbPath: string;
  let renderer: DashboardRenderer;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'dashboard-renderer-test-'));
    dbPath = resolve(tempDir, 'test.db');

    // Initialize database with schema
    const db = initializeDatabase(dbPath);
    db.close();
  });

  afterEach(async () => {
    if (renderer) {
      await renderer.stop();
    }
    rmSync(tempDir, { recursive: true });
  });

  describe('constructor', () => {
    it('creates with default config', () => {
      renderer = new DashboardRenderer({ dbPath });
      expect(renderer).toBeDefined();
    });

    it('accepts custom config', () => {
      renderer = new DashboardRenderer({
        dbPath,
        pollInterval: 1000,
        deadAgentThreshold: 60000,
        gridRows: 3,
        gridCols: 5,
      });

      const config = renderer.getConfig();
      expect(config.pollInterval).toBe(1000);
      expect(config.deadAgentThreshold).toBe(60000);
      expect(config.gridRows).toBe(3);
      expect(config.gridCols).toBe(5);
    });

    it('throws on invalid config', () => {
      expect(() => new DashboardRenderer({ dbPath, pollInterval: 100 })).toThrow();
    });
  });

  describe('lifecycle', () => {
    it('starts successfully', async () => {
      renderer = new DashboardRenderer({ dbPath });
      await renderer.start();

      expect(renderer.isRunning()).toBe(true);
    });

    it('stops successfully', async () => {
      renderer = new DashboardRenderer({ dbPath });
      await renderer.start();
      await renderer.stop();

      expect(renderer.isRunning()).toBe(false);
    });

    it('is idempotent on multiple starts', async () => {
      renderer = new DashboardRenderer({ dbPath });
      await renderer.start();
      await renderer.start();

      expect(renderer.isRunning()).toBe(true);
    });

    it('is idempotent on multiple stops', async () => {
      renderer = new DashboardRenderer({ dbPath });
      await renderer.start();
      await renderer.stop();
      await renderer.stop();

      expect(renderer.isRunning()).toBe(false);
    });
  });

  describe('state', () => {
    it('returns initial state before start', () => {
      renderer = new DashboardRenderer({ dbPath });
      const state = renderer.getState();

      expect(state.agents).toEqual([]);
      expect(state.tasks).toEqual([]);
      expect(state.selectedAgentId).toBeNull();
    });

    it('updates state from database', async () => {
      // Seed database
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active)
        VALUES ('A01', 123, 'worker', 'Busy', ${now}, ${now}, 1)
      `);
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 250 });
      await renderer.start();
      await sleep(150);

      const state = renderer.getState();
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('A01');
    });
  });

  describe('events', () => {
    it('emits stateChange on poll', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 250 });
      const listener = jest.fn();
      renderer.on('stateChange', listener);

      await renderer.start();
      await sleep(150);

      expect(listener).toHaveBeenCalled();
    });

    it('emits error on DB failure', async () => {
      renderer = new DashboardRenderer({
        dbPath: '/nonexistent/path.db',
        pollInterval: 250,
      });
      const errorListener = jest.fn();
      renderer.on('error', errorListener);

      try {
        await renderer.start();
      } catch {
        // Expected
      }

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    it('selects agent', async () => {
      renderer = new DashboardRenderer({ dbPath });
      await renderer.start();

      renderer.selectAgent('A01');

      expect(renderer.getState().selectedAgentId).toBe('A01');
    });

    it('clears selection', async () => {
      renderer = new DashboardRenderer({ dbPath });
      await renderer.start();

      renderer.selectAgent('A01');
      renderer.clearSelection();

      expect(renderer.getState().selectedAgentId).toBeNull();
    });
  });

  describe('forcePoll', () => {
    it('triggers immediate poll', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active)
        VALUES ('A01', 123, 'worker', 'Busy', ${now}, ${now}, 1)
      `);
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 2000 });
      await renderer.start();
      await renderer.forcePoll();

      const state = renderer.getState();
      expect(state.agents).toHaveLength(1);
    });
  });

  describe('config', () => {
    it('returns config copy', () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 1000 });
      const config1 = renderer.getConfig();
      const config2 = renderer.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
