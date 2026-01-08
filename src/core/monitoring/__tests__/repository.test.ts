import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from '../db/schema';
import { SwarmRepository } from '../db/repository';
import { AgentStatus, TaskStatus, LogLevel } from '../types';

describe('SwarmRepository', () => {
  const testDir = '.asf-test-repo';
  const testDbPath = path.join(testDir, 'test_repository.db');
  let repo: SwarmRepository;

  beforeEach(() => {
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

    const db = initializeDatabase(testDbPath);
    repo = new SwarmRepository(db);
  });

  afterEach(() => {
    repo.close();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Agent Operations', () => {
    it('should create an agent and return its ID', () => {
      const id = repo.createAgent({
        id: 'agent-123',
        pid: 1234,
        role: 'developer',
        status: AgentStatus.Idle,
        currentTaskId: null,
        lastSeen: Date.now(),
        worktreePath: 'feature/auth',
        createdAt: Date.now(),
        isActive: true,
      });

      expect(id).toBe('agent-123');
    });

    it('should retrieve an agent by ID', () => {
      const now = Date.now();
      repo.createAgent({
        id: 'agent-456',
        pid: 5678,
        role: 'qa',
        status: AgentStatus.Busy,
        currentTaskId: 'task-1',
        lastSeen: now,
        worktreePath: 'feature/tests',
        createdAt: now,
        isActive: true,
      });

      const agent = repo.getAgent('agent-456');
      expect(agent).toBeDefined();
      expect(agent?.pid).toBe(5678);
      expect(agent?.role).toBe('qa');
      expect(agent?.status).toBe(AgentStatus.Busy);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = repo.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });

    it('should update agent fields', () => {
      repo.createAgent({
        id: 'agent-789',
        pid: 9999,
        role: 'developer',
        status: AgentStatus.Idle,
        currentTaskId: null,
        lastSeen: Date.now(),
        worktreePath: null,
        createdAt: Date.now(),
        isActive: true,
      });

      repo.updateAgent('agent-789', {
        status: AgentStatus.Busy,
        currentTaskId: 'task-abc',
      });

      const agent = repo.getAgent('agent-789');
      expect(agent?.status).toBe(AgentStatus.Busy);
      expect(agent?.currentTaskId).toBe('task-abc');
    });

    it('should deactivate an agent', () => {
      repo.createAgent({
        id: 'agent-deactivate',
        pid: 1111,
        role: 'developer',
        status: AgentStatus.Idle,
        currentTaskId: null,
        lastSeen: Date.now(),
        worktreePath: null,
        createdAt: Date.now(),
        isActive: true,
      });

      repo.deactivateAgent('agent-deactivate');

      const agent = repo.getAgent('agent-deactivate');
      expect(agent?.isActive).toBe(false);
    });
  });

  describe('Task Operations', () => {
    it('should create a task', () => {
      const id = repo.createTask({
        id: 'task-123',
        title: 'Implement feature',
        status: TaskStatus.Pending,
        assignedAgentId: null,
        progressPercent: 0,
        dependencies: null,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
      });

      expect(id).toBe('task-123');
    });

    it('should retrieve a task by ID', () => {
      const now = Date.now();
      repo.createTask({
        id: 'task-456',
        title: 'Write tests',
        status: TaskStatus.InProgress,
        assignedAgentId: 'agent-1',
        progressPercent: 50,
        dependencies: '["task-123"]',
        createdAt: now,
        startedAt: now,
        completedAt: null,
      });

      const task = repo.getTask('task-456');
      expect(task).toBeDefined();
      expect(task?.title).toBe('Write tests');
      expect(task?.progressPercent).toBe(50);
    });

    it('should update task fields', () => {
      repo.createTask({
        id: 'task-789',
        title: 'Review PR',
        status: TaskStatus.Pending,
        assignedAgentId: null,
        progressPercent: 0,
        dependencies: null,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
      });

      const now = Date.now();
      repo.updateTask('task-789', {
        status: TaskStatus.Complete,
        progressPercent: 100,
        completedAt: now,
      });

      const task = repo.getTask('task-789');
      expect(task?.status).toBe(TaskStatus.Complete);
      expect(task?.progressPercent).toBe(100);
    });
  });

  describe('Log Operations', () => {
    it('should insert a log entry', () => {
      repo.insertLog('agent-1', 'Test message', LogLevel.Info);

      const logs = repo.getLogsForAgent('agent-1');
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].level).toBe(LogLevel.Info);
    });

    it('should retrieve logs for a specific agent', () => {
      repo.insertLog('agent-1', 'Message 1', LogLevel.Info);
      repo.insertLog('agent-2', 'Message 2', LogLevel.Warn);
      repo.insertLog('agent-1', 'Message 3', LogLevel.Error);

      const logs = repo.getLogsForAgent('agent-1');
      expect(logs.length).toBe(2);
    });

    it('should limit returned logs', () => {
      for (let i = 0; i < 20; i++) {
        repo.insertLog('agent-1', `Message ${i}`, LogLevel.Info);
      }

      const logs = repo.getLogsForAgent('agent-1', 5);
      expect(logs.length).toBe(5);
    });

    it('should prune old logs maintaining max entries', () => {
      for (let i = 0; i < 50; i++) {
        repo.insertLog('agent-1', `Message ${i}`, LogLevel.Info);
      }

      repo.pruneOldLogs('agent-1', 10);

      const logs = repo.getLogsForAgent('agent-1');
      expect(logs.length).toBe(10);
    });
  });

  describe('Metric Operations', () => {
    it('should insert a metric entry', () => {
      repo.insertMetric('agent-1', 1500, 0.05);

      const metrics = repo.getMetricsForAgent('agent-1');
      expect(metrics.length).toBe(1);
      expect(metrics[0].tokensUsed).toBe(1500);
      expect(metrics[0].estimatedCost).toBe(0.05);
    });

    it('should retrieve metrics for a specific agent', () => {
      repo.insertMetric('agent-1', 1000, 0.03);
      repo.insertMetric('agent-2', 2000, 0.06);
      repo.insertMetric('agent-1', 500, 0.02);

      const metrics = repo.getMetricsForAgent('agent-1');
      expect(metrics.length).toBe(2);
    });
  });
});
