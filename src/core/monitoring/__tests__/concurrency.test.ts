/**
 * Concurrency & Load Testing for SwarmPulse SDK
 * Task 009
 *
 * Verifies that 15 concurrent agents can write without deadlock.
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../db/schema';
import { SwarmRepository } from '../db/repository';
import { AgentStatus, LogLevel, TaskStatus } from '../types';

describe('Concurrency & Load Testing', () => {
  const testDir = '.asf-test-concurrent';
  let testDbCounter = 0;

  function getTestDbPath(): string {
    testDbCounter++;
    return path.join(testDir, `test_concurrent_${testDbCounter}.db`);
  }

  beforeAll(() => {
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up - add small delay to ensure all handles are released
    setTimeout(() => {
      if (fs.existsSync(testDir)) {
        try {
          fs.rmSync(testDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors in CI
        }
      }
    }, 100);
  });

  /**
   * Simulates an agent's workflow
   */
  async function simulateAgent(
    id: number,
    db: Database.Database,
    iterations: number = 10
  ): Promise<{ agentId: string; operations: number }> {
    const repo = new SwarmRepository(db);
    const agentId = `agent-sim-${id}-${Date.now()}`;
    const now = Date.now();

    // Register agent
    repo.createAgent({
      id: agentId,
      pid: process.pid + id,
      role: `agent-${id}`,
      status: AgentStatus.Idle,
      currentTaskId: null,
      lastSeen: now,
      worktreePath: `worktree-${id}`,
      createdAt: now,
      isActive: true,
    });

    let operations = 1; // createAgent

    // Simulate work
    for (let i = 0; i < iterations; i++) {
      // Update status
      repo.updateAgent(agentId, {
        status: AgentStatus.Busy,
        lastSeen: Date.now(),
      });
      operations++;

      // Create/update task
      const taskId = `task-${id}-${i}-${Date.now()}`;
      repo.createTask({
        id: taskId,
        title: `Task ${i} for agent ${id}`,
        status: TaskStatus.InProgress,
        assignedAgentId: agentId,
        progressPercent: 0,
        dependencies: null,
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: null,
      });
      operations++;

      // Update progress
      for (let p = 25; p <= 100; p += 25) {
        repo.updateTask(taskId, {
          progressPercent: p,
          status: p === 100 ? TaskStatus.Complete : TaskStatus.InProgress,
          completedAt: p === 100 ? Date.now() : null,
        });
        operations++;

        // Capture log
        repo.insertLog(agentId, `Agent ${id} at ${p}%`, LogLevel.Info);
        operations++;
      }

      // Small delay to simulate real work
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    // Report metrics
    repo.insertMetric(agentId, 1000 + id * 100, 0.01 * id);
    operations++;

    // Deactivate
    repo.deactivateAgent(agentId);
    operations++;

    return { agentId, operations };
  }

  it('should handle 15 concurrent agents without deadlock', async () => {
    const testDbPath = getTestDbPath();
    // Initialize shared database
    const db = initializeDatabase(testDbPath);

    // Launch 15 agents concurrently
    const agentPromises = Array.from({ length: 15 }, (_, i) =>
      simulateAgent(i, db, 5) // 5 iterations each for faster test
    );

    // All should complete without throwing
    const results = await Promise.all(agentPromises);

    // Verify all agents completed
    expect(results.length).toBe(15);
    results.forEach((result) => {
      expect(result.agentId).toBeDefined();
      expect(result.operations).toBeGreaterThan(0);
    });

    db.close();
  }, 30000); // 30s timeout

  it('should write all data without corruption', async () => {
    const testDbPath = getTestDbPath();
    // Initialize fresh database for this test
    const db = initializeDatabase(testDbPath);

    // Launch 10 agents with unique prefix
    const agentPromises = Array.from({ length: 10 }, (_, i) => simulateAgent(i + 100, db, 3));

    await Promise.all(agentPromises);

    // Verify data integrity - count all agents (should be exactly 10)
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
    expect(agentCount.count).toBe(10);

    // Verify tasks were created (3 iterations * 10 agents = 30 tasks)
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
    expect(taskCount.count).toBe(30);

    // Verify logs were written (4 progress updates * 3 iterations * 10 agents = 120 logs)
    const logCount = db.prepare('SELECT COUNT(*) as count FROM logs').get() as { count: number };
    expect(logCount.count).toBe(120);

    // Verify metrics were recorded (1 metric per agent = 10)
    const metricCount = db.prepare('SELECT COUNT(*) as count FROM metrics').get() as {
      count: number;
    };
    expect(metricCount.count).toBe(10);

    db.close();
  }, 30000);

  it('should maintain acceptable latency under load', async () => {
    const testDbPath = getTestDbPath();
    // Initialize database
    const db = initializeDatabase(testDbPath);
    const repo = new SwarmRepository(db);

    const latencies: number[] = [];
    const agentId = `agent-latency-${Date.now()}`;
    const now = Date.now();

    // Register agent
    repo.createAgent({
      id: agentId,
      pid: process.pid,
      role: 'latency-test',
      status: AgentStatus.Idle,
      currentTaskId: null,
      lastSeen: now,
      worktreePath: null,
      createdAt: now,
      isActive: true,
    });

    // Measure heartbeat latency
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      repo.updateAgent(agentId, { lastSeen: Date.now() });
      latencies.push(performance.now() - start);
    }

    // Calculate p99 latency
    latencies.sort((a, b) => a - b);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p99Latency = latencies[p99Index];

    // p99 should be under 50ms
    expect(p99Latency).toBeLessThan(50);

    // Average should be well under 10ms
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    expect(avgLatency).toBeLessThan(10);

    repo.close();
  });

  it('should handle rapid sequential operations', async () => {
    const testDbPath = getTestDbPath();
    const db = initializeDatabase(testDbPath);
    const repo = new SwarmRepository(db);

    const agentId = `agent-rapid-${Date.now()}`;
    const now = Date.now();

    // Register
    repo.createAgent({
      id: agentId,
      pid: process.pid,
      role: 'rapid-test',
      status: AgentStatus.Idle,
      currentTaskId: null,
      lastSeen: now,
      worktreePath: null,
      createdAt: now,
      isActive: true,
    });

    // Rapid-fire 1000 log entries
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      repo.insertLog(agentId, `Rapid log ${i}`, LogLevel.Info);
    }
    const duration = performance.now() - startTime;

    // Should complete 1000 inserts in under 2 seconds
    expect(duration).toBeLessThan(2000);

    // Verify all logs were written
    const count = db
      .prepare('SELECT COUNT(*) as count FROM logs WHERE agent_id = ?')
      .get(agentId) as { count: number };
    expect(count.count).toBe(1000);

    repo.close();
  });
});
