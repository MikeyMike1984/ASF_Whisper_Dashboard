# Task 10: ConfigLoader Implementation

## Category
Core Logic

## Objective
Implement configuration file loading with validation and merge with defaults.

## Dependencies
- task-01 (Type Definitions)
- task-02 (Default Config)
- task-11 (ConfigSchema) - can be parallel

## Deliverables
1. `src/launcher/config/ConfigLoader.ts` - Main config loader class
2. `src/launcher/config/ConfigLoader.test.ts` - Unit tests

## Implementation

### ConfigLoader.ts
```typescript
import { LauncherConfig } from './types';
import { DEFAULT_CONFIG, DEFAULT_CONFIG_PATH } from './defaults';
import { validateConfig } from './ConfigSchema';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigLoader {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || DEFAULT_CONFIG_PATH;
  }

  load(): LauncherConfig {
    if (!fs.existsSync(this.configPath)) {
      console.warn(`Config file not found at ${this.configPath}, using defaults`);
      return { ...DEFAULT_CONFIG };
    }

    const rawConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    const mergedConfig = this.mergeWithDefaults(rawConfig);

    const validation = validateConfig(mergedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    return mergedConfig;
  }

  private mergeWithDefaults(config: Partial<LauncherConfig>): LauncherConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      dashboard: { ...DEFAULT_CONFIG.dashboard, ...config.dashboard },
      agents: { ...DEFAULT_CONFIG.agents, ...config.agents },
      shutdown: { ...DEFAULT_CONFIG.shutdown, ...config.shutdown },
      worktrees: config.worktrees || DEFAULT_CONFIG.worktrees,
      tasks: config.tasks || DEFAULT_CONFIG.tasks
    };
  }

  static exists(configPath?: string): boolean {
    return fs.existsSync(configPath || DEFAULT_CONFIG_PATH);
  }
}
```

## Acceptance Criteria
- [ ] Loads config from file path
- [ ] Falls back to defaults if file missing
- [ ] Deep merges user config with defaults
- [ ] Validates config against schema
- [ ] Throws clear errors for invalid config
- [ ] 100% test coverage

## Test Specification
```typescript
describe('ConfigLoader', () => {
  it('should load config from file', () => {
    const loader = new ConfigLoader('./test-config.json');
    const config = loader.load();
    expect(config.version).toBe('1.0');
  });

  it('should use defaults when file missing', () => {
    const loader = new ConfigLoader('./nonexistent.json');
    const config = loader.load();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('should merge user config with defaults', () => {
    // Create temp config with partial values
    const config = loader.load();
    expect(config.agents.quietMode).toBe(true); // from defaults
  });

  it('should throw on invalid config', () => {
    // Create invalid config file
    expect(() => loader.load()).toThrow(/Invalid configuration/);
  });
});
```

## Estimated Effort
2 hours

## Notes
- Use deep merge for nested objects
- Warn but don't fail on missing config file
- Provide clear error messages for validation failures
