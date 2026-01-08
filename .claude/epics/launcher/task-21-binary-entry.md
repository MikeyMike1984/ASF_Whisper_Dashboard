# Task 21: Binary Entry Point

## Category
Integration

## Objective
Create the executable binary entry point for the asf-swarm command.

## Dependencies
- task-20 (CLI Setup)

## Deliverables
1. `src/bin/asf-swarm.ts` - Binary entry point
2. Update `package.json` with bin field
3. Shebang and executable permissions

## Implementation

### src/bin/asf-swarm.ts
```typescript
#!/usr/bin/env node

import { runCLI } from '../launcher/cli';

runCLI().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
```

### package.json updates
```json
{
  "bin": {
    "asf-swarm": "./dist/bin/asf-swarm.js"
  },
  "scripts": {
    "build": "tsc",
    "start:launcher": "node dist/bin/asf-swarm.js",
    "asf-swarm": "npx ts-node src/bin/asf-swarm.ts"
  }
}
```

### tsconfig.json update (if needed)
Ensure `src/bin` is included in compilation.

## Acceptance Criteria
- [ ] Binary is executable after `npm run build`
- [ ] `npx asf-swarm --help` works
- [ ] Shebang present for Unix systems
- [ ] Error handling for uncaught exceptions
- [ ] Works with npm link for local development

## Test Specification
```typescript
describe('Binary Entry Point', () => {
  it('should be executable', async () => {
    const result = await execa('node', ['dist/bin/asf-swarm.js', '--version']);
    expect(result.exitCode).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid command
    const result = await execa('node', ['dist/bin/asf-swarm.js', 'invalid'], {
      reject: false
    });
    expect(result.exitCode).not.toBe(0);
  });
});
```

## Estimated Effort
1 hour

## Notes
- Shebang (`#!/usr/bin/env node`) is essential for Unix
- TypeScript compiles to dist/bin/asf-swarm.js
- Use `npm link` during development for testing
