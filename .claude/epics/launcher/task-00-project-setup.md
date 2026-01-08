# Task 00: Launcher Project Setup

## Category
Foundation

## Objective
Set up the launcher module structure with required dependencies and TypeScript configuration.

## Dependencies
- None (entry point task)

## Deliverables
1. Install new dependencies: `commander`, `execa`, `ajv`, `tree-kill`, `chalk`, `ora`
2. Create `src/launcher/` directory structure
3. Create `src/launcher/index.ts` public exports
4. Create `src/bin/asf-swarm.ts` binary entry point stub
5. Update `package.json` with `bin` field for `asf-swarm`

## Acceptance Criteria
- [ ] All dependencies installed and in package.json
- [ ] `src/launcher/` directory exists with index.ts
- [ ] `src/bin/asf-swarm.ts` exists and is executable
- [ ] `npm run build` succeeds
- [ ] TypeScript compiles without errors

## Test Specification
```typescript
describe('Launcher Project Setup', () => {
  it('should have launcher directory structure', () => {
    expect(fs.existsSync('src/launcher/index.ts')).toBe(true);
    expect(fs.existsSync('src/bin/asf-swarm.ts')).toBe(true);
  });

  it('should export from launcher index', () => {
    const launcher = require('../src/launcher');
    expect(launcher).toBeDefined();
  });
});
```

## Estimated Effort
1-2 hours

## Notes
- Use `execa` v8+ for ESM-compatible process spawning
- `tree-kill` is essential for Windows compatibility
- Binary should be registered as `asf-swarm` in package.json bin field
