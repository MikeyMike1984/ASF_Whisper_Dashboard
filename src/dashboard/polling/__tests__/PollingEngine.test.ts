/**
 * Polling Engine Tests
 */

import { PollingEngine } from '../PollingEngine';
import { DashboardRepository } from '../../db/DashboardRepository';
import { StateStore } from '../StateStore';
import { initializeDatabase } from '../../../core/monitoring/db/schema';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

describe('PollingEngine', () => {
  let tempDir: string;
  let dbPath: string;
  let repo: DashboardRepository;
  let store: StateStore;
  let engine: PollingEngine;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'polling-engine-test-'));
    dbPath = resolve(tempDir, 'test.db');

    // Initialize database with schema
    const db = initializeDatabase(dbPath);
    db.close();

    repo = new DashboardRepository(dbPath, 30000);
    store = new StateStore();
    engine = new PollingEngine(repo, store, { interval: 100 });
  });

  afterEach(() => {
    engine.stop();
    repo.close();
    rmSync(tempDir, { recursive: true });
  });

  describe('start', () => {
    it('starts polling', async () => {
      engine.start();
      expect(engine.isRunning()).toBe(true);
      await sleep(50);
    });

    it('does initial poll immediately', async () => {
      const updateListener = jest.fn();
      engine.on('update', updateListener);

      engine.start();
      await sleep(50);

      expect(updateListener).toHaveBeenCalled();
    });

    it('polls at configured interval', async () => {
      const updateListener = jest.fn();
      engine.on('update', updateListener);

      engine.start();
      await sleep(250); // Allow 2-3 polls at 100ms interval

      expect(updateListener.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('is idempotent (multiple starts)', () => {
      engine.start();
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops polling', async () => {
      engine.start();
      await sleep(50);

      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('stops further polls', async () => {
      const updateListener = jest.fn();
      engine.on('update', updateListener);

      engine.start();
      await sleep(50);
      const callsBeforeStop = updateListener.mock.calls.length;

      engine.stop();
      await sleep(200);

      expect(updateListener.mock.calls.length).toBe(callsBeforeStop);
    });

    it('is idempotent (multiple stops)', () => {
      engine.start();
      engine.stop();
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });
  });

  describe('forcePoll', () => {
    it('triggers immediate poll', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active)
        VALUES ('a1', 123, 'worker', 'Busy', ${now}, ${now}, 1)
      `);
      db.close();

      await engine.forcePoll();

      const state = store.getState();
      expect(state.agents).toHaveLength(1);
    });

    it('works without starting engine', async () => {
      await engine.forcePoll();
      expect(store.getState().lastPollTime).toBeGreaterThan(0);
    });
  });

  describe('updates state store', () => {
    it('updates agents in store', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO agents (id, pid, role, status, last_seen, created_at, is_active)
        VALUES ('a1', 123, 'worker', 'Busy', ${now}, ${now}, 1)
      `);
      db.close();

      engine.start();
      await sleep(150);

      const state = store.getState();
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('a1');
    });

    it('updates tasks in store', async () => {
      const db = new Database(dbPath);
      const now = Date.now();
      db.exec(`
        INSERT INTO tasks (id, title, status, progress_percent, created_at)
        VALUES ('t1', 'Test Task', 'InProgress', 50, ${now})
      `);
      db.close();

      engine.start();
      await sleep(150);

      const state = store.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].progressPercent).toBe(50);
    });

    it('updates metrics in store', async () => {
      const db = new Database(dbPath);
      db.exec(`
        INSERT INTO metrics (agent_id, tokens_used, estimated_cost, timestamp)
        VALUES ('a1', 1000, 0.05, 0)
      `);
      db.close();

      engine.start();
      await sleep(150);

      const state = store.getState();
      expect(state.metrics.totalTokens).toBe(1000);
    });

    it('updates logs for selected agent', async () => {
      const db = new Database(dbPath);
      db.exec(`
        INSERT INTO logs (agent_id, level, message, timestamp)
        VALUES ('a1', 'Info', 'Test message', ${Date.now()})
      `);
      db.close();

      store.selectAgent('a1');
      engine.start();
      await sleep(150);

      const state = store.getState();
      expect(state.logs.get('a1')).toHaveLength(1);
    });
  });

  describe('events', () => {
    it('emits update event when state changes', async () => {
      const updateListener = jest.fn();
      engine.on('update', updateListener);

      engine.start();
      await sleep(150);

      expect(updateListener).toHaveBeenCalled();
    });

    it('emits error event on repository failure', async () => {
      const errorListener = jest.fn();
      engine.on('error', errorListener);

      // Close repo to cause error
      repo.close();

      engine.start();
      await sleep(150);

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('interval management', () => {
    it('returns current interval', () => {
      expect(engine.getInterval()).toBe(100);
    });

    it('allows changing interval', () => {
      engine.setInterval(500);
      expect(engine.getInterval()).toBe(500);
    });

    it('applies new interval to running engine', async () => {
      const updateListener = jest.fn();
      engine.on('update', updateListener);

      engine.start();
      await sleep(150);
      const callsAfterStart = updateListener.mock.calls.length;

      engine.setInterval(500);
      await sleep(200);

      // Should have fewer calls due to longer interval
      const callsAfterChange = updateListener.mock.calls.length - callsAfterStart;
      expect(callsAfterChange).toBeLessThanOrEqual(1);
    });
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
