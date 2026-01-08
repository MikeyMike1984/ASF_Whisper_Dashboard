# Task 02: Default Configuration

## Category
Foundation

## Objective
Create default configuration values and config file template.

## Dependencies
- task-01 (Type Definitions)

## Deliverables
1. `src/launcher/config/defaults.ts` - Default configuration values
2. `asf-swarm.config.json` - Template config file at project root
3. `asf-swarm.schema.json` - JSON Schema for config validation

## Implementation

### defaults.ts
```typescript
import { LauncherConfig } from './types';

export const DEFAULT_CONFIG: LauncherConfig = {
  version: '1.0',
  dashboard: {
    enabled: true,
    pollInterval: 500,
    dbPath: '.asf/swarm_state.db'
  },
  agents: {
    count: 4,
    defaultRole: 'developer',
    quietMode: true,
    autoRestart: false,
    restartDelay: 5000,
    maxRestarts: 3
  },
  worktrees: [],
  tasks: [],
  shutdown: {
    gracePeriod: 10000,
    forceAfter: 15000
  }
};

export const DEFAULT_CONFIG_PATH = './asf-swarm.config.json';
export const DEFAULT_PID_PATH = '.asf/launcher.pid';
export const DEFAULT_DB_PATH = '.asf/swarm_state.db';
```

## Acceptance Criteria
- [ ] Default config is complete and valid
- [ ] JSON Schema validates the config structure
- [ ] Template config file created with comments
- [ ] Defaults are sensible for local development

## Test Specification
```typescript
describe('Default Configuration', () => {
  it('should have valid default config', () => {
    expect(DEFAULT_CONFIG.version).toBe('1.0');
    expect(DEFAULT_CONFIG.dashboard.enabled).toBe(true);
    expect(DEFAULT_CONFIG.agents.count).toBe(4);
  });

  it('should have reasonable shutdown timeouts', () => {
    expect(DEFAULT_CONFIG.shutdown.gracePeriod).toBeGreaterThanOrEqual(5000);
    expect(DEFAULT_CONFIG.shutdown.forceAfter).toBeGreaterThan(DEFAULT_CONFIG.shutdown.gracePeriod);
  });
});
```

## Estimated Effort
1 hour

## Notes
- Default agent count is 4 (conservative for development)
- Grace period of 10s should be enough for most agents to finish
