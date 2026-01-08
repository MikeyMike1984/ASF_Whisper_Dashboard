# Task 012: Keyboard Navigation & Integration Tests

**Category**: Testing (3-series)
**Dependencies**: Task 011
**Branch**: `feature/dashboard-renderer`

---

## Objective
Implement keyboard navigation handlers and comprehensive integration tests that verify the full dashboard rendering pipeline with real data.

## Acceptance Criteria
- [ ] 'q' key exits dashboard gracefully
- [ ] Arrow keys navigate agent grid selection
- [ ] 'Enter' focuses on selected agent's whisper log
- [ ] 'Esc' clears selection / unfocuses
- [ ] 'Tab' cycles between widgets
- [ ] 'r' forces immediate refresh
- [ ] '+' and '-' adjust poll interval
- [ ] Integration tests with real SQLite database
- [ ] Performance test: 60fps with 15 agents
- [ ] Stability test: No memory leak over extended run
- [ ] All unit tests pass with >80% coverage

## Implementation Steps
1. Add keyboard handlers to DashboardRenderer
2. Connect key events to widget methods
3. Write integration test suite with real DB
4. Add performance benchmarks
5. Verify coverage meets threshold
6. Final cleanup and documentation

## Test Specification
```typescript
// src/dashboard/__tests__/integration.test.ts
import { DashboardRenderer } from '../DashboardRenderer';
import { SwarmPulse } from '../../core/monitoring';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

describe('Dashboard Integration', () => {
  let tempDir: string;
  let dbPath: string;
  let renderer: DashboardRenderer;

  beforeEach(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'dashboard-integration-'));
    dbPath = resolve(tempDir, 'swarm_state.db');

    // Initialize with SwarmPulse schema
    const pulse = SwarmPulse.getInstance({ dbPath, agentId: 'test' });
    pulse.shutdown();
  });

  afterEach(async () => {
    if (renderer) {
      await renderer.stop();
    }
    rmSync(tempDir, { recursive: true });
  });

  describe('Full Pipeline', () => {
    it('renders agents written by SwarmPulse', async () => {
      // Write agent data via SwarmPulse
      const pulse = SwarmPulse.getInstance({ dbPath, agentId: 'A01' });
      pulse.heartbeat('Busy');
      pulse.progress(50);
      pulse.shutdown();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
      await renderer.start();
      await sleep(150);

      const state = renderer.getState();
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('A01');
      expect(state.agents[0].status).toBe('Busy');
    });

    it('updates when SwarmPulse writes new data', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
      await renderer.start();

      const pulse = SwarmPulse.getInstance({ dbPath, agentId: 'A01' });
      pulse.heartbeat('Busy');

      await sleep(150);

      pulse.heartbeat('Idle');

      await sleep(150);

      const state = renderer.getState();
      expect(state.agents[0].status).toBe('Idle');

      pulse.shutdown();
    });
  });

  describe('Keyboard Navigation', () => {
    it('q key triggers exit event', async () => {
      renderer = new DashboardRenderer({ dbPath });
      const exitListener = jest.fn();
      renderer.on('exit', exitListener);

      await renderer.start();

      // Simulate 'q' keypress
      renderer.simulateKeypress('q');

      expect(exitListener).toHaveBeenCalled();
    });

    it('arrow keys navigate agent selection', async () => {
      // Create multiple agents
      const db = new Database(dbPath);
      db.exec(`INSERT INTO agents VALUES ('A01', 1, 'worker', 'Idle', NULL, ${Date.now()}, '/path')`);
      db.exec(`INSERT INTO agents VALUES ('A02', 2, 'worker', 'Idle', NULL, ${Date.now()}, '/path')`);
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
      await renderer.start();
      await sleep(150);

      renderer.simulateKeypress('right');
      expect(renderer.getState().selectedAgentId).toBe('A01');

      renderer.simulateKeypress('right');
      expect(renderer.getState().selectedAgentId).toBe('A02');
    });

    it('r key forces immediate poll', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 10000 }); // Long interval
      await renderer.start();

      const pollSpy = jest.spyOn(renderer as any, 'forcePoll');
      renderer.simulateKeypress('r');

      expect(pollSpy).toHaveBeenCalled();
    });

    it('+/- keys adjust poll interval', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 500 });
      await renderer.start();

      renderer.simulateKeypress('+');
      expect(renderer.getConfig().pollInterval).toBe(750); // +250ms

      renderer.simulateKeypress('-');
      expect(renderer.getConfig().pollInterval).toBe(500); // -250ms
    });
  });

  describe('Performance', () => {
    it('maintains 60fps with 15 agents', async () => {
      // Seed 15 agents
      const db = new Database(dbPath);
      for (let i = 1; i <= 15; i++) {
        const id = `A${String(i).padStart(2, '0')}`;
        db.exec(`INSERT INTO agents VALUES ('${id}', ${i}, 'worker', 'Busy', NULL, ${Date.now()}, '/path')`);
      }
      db.close();

      renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
      await renderer.start();

      // Measure render time over multiple frames
      const renderTimes: number[] = [];
      for (let i = 0; i < 60; i++) {
        const start = performance.now();
        await renderer.forcePoll();
        renderTimes.push(performance.now() - start);
      }

      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const fps = 1000 / avgRenderTime;

      expect(fps).toBeGreaterThan(60);
    });

    it('update latency under 500ms', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 100 });
      await renderer.start();

      const db = new Database(dbPath);
      const writeTime = Date.now();
      db.exec(`INSERT INTO agents VALUES ('A99', 99, 'worker', 'Busy', NULL, ${writeTime}, '/path')`);
      db.close();

      // Wait for poll
      await sleep(150);

      const state = renderer.getState();
      const latency = Date.now() - writeTime;

      expect(state.agents.some(a => a.id === 'A99')).toBe(true);
      expect(latency).toBeLessThan(500);
    });
  });

  describe('Stability', () => {
    it('no memory leak over 100 poll cycles', async () => {
      renderer = new DashboardRenderer({ dbPath, pollInterval: 10 });
      await renderer.start();

      const initialMemory = process.memoryUsage().heapUsed;

      // Run 100 poll cycles
      await sleep(1100);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Allow up to 5MB growth (reasonable for test environment)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
    });
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Keyboard Handler Implementation
```typescript
// In DashboardRenderer.ts
private setupKeyboardHandlers(): void {
  this.screen.key(['q', 'Q'], () => {
    this.emit('exit');
    this.stop();
  });

  this.screen.key(['left', 'right', 'up', 'down'], (ch, key) => {
    switch (key.name) {
      case 'left': this.agentGrid.selectPrev(); break;
      case 'right': this.agentGrid.selectNext(); break;
      case 'up': this.agentGrid.selectUp(); break;
      case 'down': this.agentGrid.selectDown(); break;
    }
    this.store.selectAgent(this.agentGrid.getSelectedAgentId());
    this.render();
  });

  this.screen.key(['enter'], () => {
    this.whisperLog.focus();
  });

  this.screen.key(['escape'], () => {
    this.agentGrid.clearSelection();
    this.store.clearSelection();
    this.render();
  });

  this.screen.key(['tab'], () => {
    this.cycleFocus();
  });

  this.screen.key(['r', 'R'], async () => {
    await this.forcePoll();
  });

  this.screen.key(['+', '='], () => {
    this.adjustPollInterval(250);
  });

  this.screen.key(['-', '_'], () => {
    this.adjustPollInterval(-250);
  });
}
```

---

**Blocked By**: Task 011
**Blocks**: None (Final task)

---

## Final Checklist

- [ ] All 12 tasks completed
- [ ] All tests passing
- [ ] Coverage > 80%
- [ ] No TypeScript errors
- [ ] ESLint/Prettier clean
- [ ] Public API exported from `src/dashboard/index.ts`
- [ ] QA Engineer agent consulted
- [ ] activeContext.md updated
- [ ] Ready for merge to main
