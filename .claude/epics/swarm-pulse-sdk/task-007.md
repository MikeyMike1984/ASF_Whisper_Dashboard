# Task 007: Progress & Task Tracking Methods

**Category**: Core Logic (1-series)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 005
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Implement task progress tracking methods.

## Acceptance Criteria
- [ ] `progress(taskId, percent, title?)` creates or updates task record
- [ ] Creates new task if `taskId` doesn't exist
- [ ] Updates `progress_percent` on existing task
- [ ] Sets `status` to `InProgress` when percent > 0 and < 100
- [ ] Sets `status` to `Complete` when percent = 100
- [ ] Updates `started_at` on first progress call
- [ ] Updates `completed_at` when reaching 100%
- [ ] Links task to current agent via `assigned_agent_id`
- [ ] Updates agent's `current_task_id`

## Implementation Steps
1. Add to `SwarmPulse.ts`:
   ```typescript
   progress(taskId: string, percent: number, title?: string): void {
     if (!this.agentId) throw new Error('Agent not registered');

     let task = this.repo.getTask(taskId);
     const now = Date.now();

     if (!task) {
       // Create new task
       this.repo.createTask({
         id: taskId,
         title: title || taskId,
         status: percent === 100 ? TaskStatus.Complete : TaskStatus.InProgress,
         assignedAgentId: this.agentId,
         progressPercent: percent,
         createdAt: now,
         startedAt: now,
         completedAt: percent === 100 ? now : undefined
       });
     } else {
       // Update existing task
       const updates: Partial<Task> = {
         progressPercent: percent,
         status: percent === 100 ? TaskStatus.Complete : TaskStatus.InProgress
       };
       if (!task.startedAt) updates.startedAt = now;
       if (percent === 100) updates.completedAt = now;
       this.repo.updateTask(taskId, updates);
     }

     // Update agent's current task
     this.repo.updateAgent(this.agentId, { currentTaskId: taskId });
   }
   ```
2. Write unit tests

## Test Specification
```typescript
// progress.test.ts
describe('Progress Tracking', () => {
  it('should create new task on first progress call', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.progress('task-123', 0, 'Implement feature');
    // Verify task created in DB
  });

  it('should update progress percent', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.progress('task-123', 25);
    pulse.progress('task-123', 50);
    // Verify progress_percent = 50
  });

  it('should mark task complete at 100%', () => {
    const pulse = SwarmPulse.getInstance();
    pulse.registerAgent('developer');
    pulse.progress('task-123', 100);
    // Verify status = Complete, completed_at set
  });

  it('should link task to agent', () => {
    const pulse = SwarmPulse.getInstance();
    const agentId = pulse.registerAgent('developer');
    pulse.progress('task-123', 50);
    // Verify task.assigned_agent_id = agentId
    // Verify agent.current_task_id = 'task-123'
  });
});
```

---

**Blocked By**: Task 005
**Blocks**: Task 009
