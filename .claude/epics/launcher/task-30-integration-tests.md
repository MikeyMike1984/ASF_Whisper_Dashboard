# Task 30: Integration Tests

## Category
Testing

## Objective
Create comprehensive integration tests for the full launcher lifecycle.

## Dependencies
- task-16 (SwarmLauncher)
- task-20 (CLI Setup)
- task-21 (Binary Entry)

## Deliverables
1. `src/launcher/__tests__/integration.test.ts` - Full lifecycle tests
2. `src/launcher/__tests__/cli.integration.test.ts` - CLI integration tests
3. Test fixtures and helpers

## Test Scenarios

### 1. Full Lifecycle Test
```typescript
describe('Launcher Integration', () => {
  let launcher: SwarmLauncher;

  afterEach(async () => {
    if (launcher) {
      await launcher.stop(true);
    }
  });

  it('should complete full start-run-stop cycle', async () => {
    launcher = new SwarmLauncher({
      config: {
        ...DEFAULT_CONFIG,
        agents: { ...DEFAULT_CONFIG.agents, count: 2 }
      }
    });

    const events: string[] = [];
    launcher.on('processStart', (p) => events.push(`start:${p.id}`));
    launcher.on('processStop', (p) => events.push(`stop:${p.id}`));
    launcher.on('ready', () => events.push('ready'));
    launcher.on('shutdown', () => events.push('shutdown'));

    // Start
    await launcher.start();
    expect(launcher.getStatus().status).toBe('running');
    expect(events).toContain('ready');

    // Verify processes
    const processes = launcher.getProcesses();
    expect(processes.find(p => p.type === 'dashboard')).toBeDefined();
    expect(processes.filter(p => p.type === 'agent')).toHaveLength(2);

    // Stop
    await launcher.stop();
    expect(launcher.getStatus().status).toBe('stopped');
    expect(events).toContain('shutdown');
  });

  it('should handle graceful shutdown on SIGTERM', async () => {
    launcher = new SwarmLauncher({ config: minimalConfig });
    await launcher.start();

    // Simulate SIGTERM
    process.emit('SIGTERM');

    // Wait for shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(launcher.getStatus().status).toBe('stopped');
  });

  it('should prevent double launch', async () => {
    launcher = new SwarmLauncher({ config: minimalConfig });
    await launcher.start();

    const launcher2 = new SwarmLauncher({ config: minimalConfig });
    await expect(launcher2.start()).rejects.toThrow(/already running/);
  });

  it('should clean up stale PID file', async () => {
    // Create stale PID file
    const pidManager = new PidFileManager();
    pidManager.write(99999999, []); // Non-existent PID

    launcher = new SwarmLauncher({ config: minimalConfig });
    await launcher.start(); // Should succeed after cleaning stale file

    expect(launcher.getStatus().status).toBe('running');
  });
});
```

### 2. CLI Integration Tests
```typescript
describe('CLI Integration', () => {
  it('should start and stop via CLI', async () => {
    // Start in background
    const startProcess = execa('node', ['dist/bin/asf-swarm.js', 'start', '--agents', '1'], {
      detached: true
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check status
    const status = await execa('node', ['dist/bin/asf-swarm.js', 'status']);
    expect(status.stdout).toContain('running');

    // Stop
    const stop = await execa('node', ['dist/bin/asf-swarm.js', 'stop']);
    expect(stop.exitCode).toBe(0);

    startProcess.kill();
  });

  it('should show status when no swarm running', async () => {
    const result = await execa('node', ['dist/bin/asf-swarm.js', 'status']);
    expect(result.stdout).toContain('No running swarm');
  });

  it('should show help', async () => {
    const result = await execa('node', ['dist/bin/asf-swarm.js', '--help']);
    expect(result.stdout).toContain('start');
    expect(result.stdout).toContain('stop');
    expect(result.stdout).toContain('status');
  });
});
```

### 3. Cross-Platform Tests
```typescript
describe('Cross-Platform', () => {
  it('should handle Ctrl+C gracefully', async () => {
    // This test simulates Ctrl+C behavior
  });

  it('should use tree-kill on Windows', async () => {
    // Verify tree-kill is used for process termination
  });
});
```

## Acceptance Criteria
- [ ] Full lifecycle test passes
- [ ] CLI integration tests pass
- [ ] Signal handling tests pass
- [ ] Stale PID cleanup works
- [ ] Double-launch prevention works
- [ ] All tests run in CI
- [ ] Test coverage >80%

## Test Fixtures
```typescript
// test/fixtures/configs.ts
export const minimalConfig: LauncherConfig = {
  version: '1.0',
  dashboard: { enabled: false, pollInterval: 500, dbPath: '.asf/test.db' },
  agents: { count: 1, defaultRole: 'test', quietMode: true, autoRestart: false, restartDelay: 1000, maxRestarts: 0 },
  worktrees: [],
  tasks: [],
  shutdown: { gracePeriod: 2000, forceAfter: 3000 }
};
```

## Estimated Effort
4 hours

## Notes
- Integration tests need cleanup after each test
- Use short timeouts for faster tests
- Consider mocking actual agent processes for speed
- CI should run tests on Windows, macOS, Linux
