# Task 11: Configuration Schema Validation

## Category
Core Logic

## Objective
Implement JSON Schema validation for launcher configuration using AJV.

## Dependencies
- task-01 (Type Definitions)

## Deliverables
1. `src/launcher/config/ConfigSchema.ts` - Schema definition and validator
2. `src/launcher/config/ConfigSchema.test.ts` - Validation tests
3. `asf-swarm.schema.json` - JSON Schema file for IDE support

## Implementation

### ConfigSchema.ts
```typescript
import Ajv, { JSONSchemaType } from 'ajv';
import { LauncherConfig } from './types';

const ajv = new Ajv({ allErrors: true, verbose: true });

const schema: JSONSchemaType<LauncherConfig> = {
  type: 'object',
  properties: {
    version: { type: 'string' },
    dashboard: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        pollInterval: { type: 'number', minimum: 100, maximum: 5000 },
        dbPath: { type: 'string' }
      },
      required: ['enabled', 'pollInterval', 'dbPath']
    },
    agents: {
      type: 'object',
      properties: {
        count: { type: 'number', minimum: 1, maximum: 50 },
        defaultRole: { type: 'string' },
        quietMode: { type: 'boolean' },
        autoRestart: { type: 'boolean' },
        restartDelay: { type: 'number', minimum: 1000 },
        maxRestarts: { type: 'number', minimum: 0, maximum: 10 }
      },
      required: ['count', 'defaultRole', 'quietMode', 'autoRestart', 'restartDelay', 'maxRestarts']
    },
    worktrees: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          agents: { type: 'number', minimum: 1 },
          role: { type: 'string' }
        },
        required: ['path', 'agents', 'role']
      }
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          assignTo: { type: 'string' }
        },
        required: ['id', 'title', 'assignTo']
      }
    },
    shutdown: {
      type: 'object',
      properties: {
        gracePeriod: { type: 'number', minimum: 1000 },
        forceAfter: { type: 'number', minimum: 1000 }
      },
      required: ['gracePeriod', 'forceAfter']
    }
  },
  required: ['version', 'dashboard', 'agents', 'worktrees', 'tasks', 'shutdown']
};

const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateConfig(config: unknown): ValidationResult {
  const valid = validate(config);
  return {
    valid: !!valid,
    errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`) || []
  };
}

export { schema };
```

## Acceptance Criteria
- [ ] Schema validates all required fields
- [ ] Numeric ranges enforced (poll interval, agent count, etc.)
- [ ] Clear error messages for validation failures
- [ ] JSON Schema file generated for IDE autocomplete
- [ ] 100% test coverage for validation edge cases

## Test Specification
```typescript
describe('ConfigSchema', () => {
  it('should validate correct config', () => {
    const result = validateConfig(validConfig);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid poll interval', () => {
    const result = validateConfig({ ...validConfig, dashboard: { pollInterval: 50 } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringMatching(/pollInterval/));
  });

  it('should reject agent count > 50', () => {
    const result = validateConfig({ ...validConfig, agents: { count: 100 } });
    expect(result.valid).toBe(false);
  });

  it('should require shutdown.forceAfter > gracePeriod', () => {
    // Custom validation rule
  });
});
```

## Estimated Effort
2 hours

## Notes
- AJV provides detailed error messages
- Consider adding custom validation for forceAfter > gracePeriod
- Generate JSON Schema file for IDE support
