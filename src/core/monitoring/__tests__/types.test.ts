import {
  AgentStatus,
  TaskStatus,
  LogLevel,
  Agent,
  Task,
  LogEntry,
  MetricEntry,
  SwarmPulseConfig,
  DEFAULT_CONFIG,
} from '../types';

describe('Types', () => {
  describe('AgentStatus enum', () => {
    it('should have Idle status', () => {
      expect(AgentStatus.Idle).toBe('Idle');
    });

    it('should have Busy status', () => {
      expect(AgentStatus.Busy).toBe('Busy');
    });

    it('should have Error status', () => {
      expect(AgentStatus.Error).toBe('Error');
    });
  });

  describe('TaskStatus enum', () => {
    it('should have Pending status', () => {
      expect(TaskStatus.Pending).toBe('Pending');
    });

    it('should have InProgress status', () => {
      expect(TaskStatus.InProgress).toBe('InProgress');
    });

    it('should have Complete status', () => {
      expect(TaskStatus.Complete).toBe('Complete');
    });

    it('should have Failed status', () => {
      expect(TaskStatus.Failed).toBe('Failed');
    });
  });

  describe('LogLevel enum', () => {
    it('should have Info level', () => {
      expect(LogLevel.Info).toBe('Info');
    });

    it('should have Warn level', () => {
      expect(LogLevel.Warn).toBe('Warn');
    });

    it('should have Error level', () => {
      expect(LogLevel.Error).toBe('Error');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have default dbPath', () => {
      expect(DEFAULT_CONFIG.dbPath).toBe('.asf/swarm_state.db');
    });

    it('should have default heartbeatInterval of 5000ms', () => {
      expect(DEFAULT_CONFIG.heartbeatInterval).toBe(5000);
    });

    it('should have default maxLogEntries of 1000', () => {
      expect(DEFAULT_CONFIG.maxLogEntries).toBe(1000);
    });
  });

  describe('Interface type checking', () => {
    it('should allow valid Agent object', () => {
      const agent: Agent = {
        id: 'agent-123',
        pid: 1234,
        role: 'developer',
        status: AgentStatus.Idle,
        currentTaskId: null,
        lastSeen: Date.now(),
        worktreePath: 'feature/auth',
        createdAt: Date.now(),
        isActive: true,
      };
      expect(agent.id).toBe('agent-123');
      expect(agent.status).toBe(AgentStatus.Idle);
    });

    it('should allow valid Task object', () => {
      const task: Task = {
        id: 'task-123',
        title: 'Implement feature',
        status: TaskStatus.Pending,
        assignedAgentId: null,
        progressPercent: 0,
        dependencies: null,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
      };
      expect(task.id).toBe('task-123');
      expect(task.status).toBe(TaskStatus.Pending);
    });

    it('should allow valid LogEntry object', () => {
      const log: LogEntry = {
        id: 1,
        agentId: 'agent-123',
        level: LogLevel.Info,
        message: 'Test message',
        timestamp: Date.now(),
      };
      expect(log.level).toBe(LogLevel.Info);
    });

    it('should allow valid MetricEntry object', () => {
      const metric: MetricEntry = {
        id: 1,
        agentId: 'agent-123',
        tokensUsed: 1500,
        estimatedCost: 0.05,
        timestamp: Date.now(),
      };
      expect(metric.tokensUsed).toBe(1500);
    });

    it('should allow valid SwarmPulseConfig object', () => {
      const config: SwarmPulseConfig = {
        dbPath: '.asf/custom.db',
        heartbeatInterval: 3000,
        maxLogEntries: 500,
      };
      expect(config.dbPath).toBe('.asf/custom.db');
    });

    it('should allow partial SwarmPulseConfig', () => {
      const config: Partial<SwarmPulseConfig> = {
        heartbeatInterval: 3000,
      };
      expect(config.heartbeatInterval).toBe(3000);
      expect(config.dbPath).toBeUndefined();
    });
  });
});
