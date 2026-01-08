/**
 * State Store Tests
 */

import { StateStore } from '../StateStore';
import { DashboardAgent, Task } from '../../types';
import { TaskStatus, AgentStatus } from '../../../core/monitoring';

describe('StateStore', () => {
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore();
  });

  describe('initialization', () => {
    it('initializes with empty state', () => {
      const state = store.getState();
      expect(state.agents).toEqual([]);
      expect(state.tasks).toEqual([]);
      expect(state.logs).toEqual(new Map());
      expect(state.selectedAgentId).toBeNull();
      expect(state.lastPollTime).toBe(0);
    });

    it('initializes metrics with zeros', () => {
      const state = store.getState();
      expect(state.metrics.totalTokens).toBe(0);
      expect(state.metrics.totalCost).toBe(0);
      expect(state.metrics.activeAgents).toBe(0);
      expect(state.metrics.totalAgents).toBe(0);
    });
  });

  describe('setState', () => {
    it('updates state with partial data', () => {
      const agents: DashboardAgent[] = [createMockAgent('a1')];
      store.setState({ agents });

      const state = store.getState();
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('a1');
    });

    it('emits change event on state update', () => {
      const listener = jest.fn();
      store.on('change', listener);

      store.setState({ agents: [createMockAgent('a1')] });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        agents: expect.arrayContaining([expect.objectContaining({ id: 'a1' })]),
      }));
    });

    it('creates immutable state on updates', () => {
      const state1 = store.getState();
      store.setState({ agents: [createMockAgent('a1')] });
      const state2 = store.getState();

      expect(state1).not.toBe(state2);
    });

    it('preserves unmodified state properties', () => {
      store.setState({ selectedAgentId: 'a1' });
      store.setState({ agents: [createMockAgent('a2')] });

      const state = store.getState();
      expect(state.selectedAgentId).toBe('a1');
    });
  });

  describe('hasChanged', () => {
    it('returns true when agents change', () => {
      store.setState({ agents: [createMockAgent('a1')] });

      expect(store.hasChanged({ agents: [createMockAgent('a2')] })).toBe(true);
    });

    it('returns false when agents are equal', () => {
      const agents = [createMockAgent('a1')];
      store.setState({ agents });

      expect(store.hasChanged({ agents: [createMockAgent('a1')] })).toBe(false);
    });

    it('detects agent status changes', () => {
      const agent1 = createMockAgent('a1', { status: AgentStatus.Idle });
      store.setState({ agents: [agent1] });

      const agent2 = createMockAgent('a1', { status: AgentStatus.Busy });
      expect(store.hasChanged({ agents: [agent2] })).toBe(true);
    });

    it('detects agent progress changes', () => {
      const agent1 = createMockAgent('a1', { progress: 0 });
      store.setState({ agents: [agent1] });

      const agent2 = createMockAgent('a1', { progress: 50 });
      expect(store.hasChanged({ agents: [agent2] })).toBe(true);
    });

    it('returns true when tasks change', () => {
      store.setState({ tasks: [createMockTask('t1')] });

      expect(store.hasChanged({ tasks: [createMockTask('t2')] })).toBe(true);
    });

    it('returns true when metrics change', () => {
      store.setState({
        metrics: { totalTokens: 100, totalCost: 0.01, activeAgents: 1, totalAgents: 1 },
      });

      expect(
        store.hasChanged({
          metrics: { totalTokens: 200, totalCost: 0.02, activeAgents: 2, totalAgents: 2 },
        })
      ).toBe(true);
    });

    it('returns true when selectedAgentId changes', () => {
      store.setState({ selectedAgentId: 'a1' });

      expect(store.hasChanged({ selectedAgentId: 'a2' })).toBe(true);
    });

    it('always returns true for logs updates', () => {
      expect(store.hasChanged({ logs: new Map() })).toBe(true);
    });
  });

  describe('getAgentById', () => {
    it('returns agent when found', () => {
      store.setState({
        agents: [createMockAgent('a1'), createMockAgent('a2')],
      });

      const agent = store.getAgentById('a1');
      expect(agent?.id).toBe('a1');
    });

    it('returns undefined when not found', () => {
      store.setState({ agents: [createMockAgent('a1')] });

      expect(store.getAgentById('nonexistent')).toBeUndefined();
    });
  });

  describe('selectAgent', () => {
    it('sets selected agent ID', () => {
      store.selectAgent('a1');
      expect(store.getState().selectedAgentId).toBe('a1');
    });

    it('emits change event', () => {
      const listener = jest.fn();
      store.on('change', listener);

      store.selectAgent('a1');

      expect(listener).toHaveBeenCalled();
    });

    it('does not emit when selecting same agent', () => {
      store.selectAgent('a1');

      const listener = jest.fn();
      store.on('change', listener);

      store.selectAgent('a1');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearSelection', () => {
    it('clears selected agent ID', () => {
      store.selectAgent('a1');
      store.clearSelection();
      expect(store.getState().selectedAgentId).toBeNull();
    });
  });

  describe('getSelectedAgent', () => {
    it('returns selected agent when exists', () => {
      store.setState({ agents: [createMockAgent('a1')] });
      store.selectAgent('a1');

      const agent = store.getSelectedAgent();
      expect(agent?.id).toBe('a1');
    });

    it('returns undefined when no selection', () => {
      store.setState({ agents: [createMockAgent('a1')] });
      expect(store.getSelectedAgent()).toBeUndefined();
    });

    it('returns undefined when selected agent not in list', () => {
      store.selectAgent('nonexistent');
      expect(store.getSelectedAgent()).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('resets state to initial values', () => {
      store.setState({
        agents: [createMockAgent('a1')],
        selectedAgentId: 'a1',
        lastPollTime: 12345,
      });

      store.reset();

      const state = store.getState();
      expect(state.agents).toEqual([]);
      expect(state.selectedAgentId).toBeNull();
      expect(state.lastPollTime).toBe(0);
    });

    it('emits change event', () => {
      const listener = jest.fn();
      store.on('change', listener);

      store.reset();

      expect(listener).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAgent(
  id: string,
  overrides: Partial<DashboardAgent> = {}
): DashboardAgent {
  return {
    id,
    pid: 123,
    role: 'worker',
    status: AgentStatus.Idle,
    currentTaskId: null,
    lastSeen: Date.now(),
    worktreePath: '/path',
    createdAt: Date.now(),
    isActive: true,
    progress: 0,
    ...overrides,
  };
}

function createMockTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    status: TaskStatus.Pending,
    assignedAgentId: null,
    progressPercent: 0,
    dependencies: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}
