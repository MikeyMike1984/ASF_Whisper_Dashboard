# Task 001: Dependencies & Project Config

**Category**: Foundation (0-series)
**Dependencies**: None
**Branch**: `feature/dashboard-renderer`

---

## Objective
Add TUI dependencies (neo-blessed, blessed-contrib) to the existing project and configure dashboard-specific build settings.

## Acceptance Criteria
- [ ] `neo-blessed` ^0.1.0 installed as production dependency
- [ ] `blessed-contrib` ^4.10.1 installed as production dependency
- [ ] `@types/blessed` installed as dev dependency
- [ ] `src/dashboard/` directory structure created
- [ ] TypeScript compiles dashboard module without errors
- [ ] Basic smoke test confirms blessed can create a screen

## Implementation Steps
1. Install TUI dependencies:
   ```bash
   npm install neo-blessed blessed-contrib
   npm install -D @types/blessed
   ```
2. Create directory structure:
   ```
   src/
   └── dashboard/
       ├── index.ts
       ├── db/
       ├── polling/
       └── widgets/
   ```
3. Create placeholder `src/dashboard/index.ts` exporting empty module
4. Verify TypeScript compilation: `npx tsc --noEmit`
5. Write smoke test for blessed screen creation

## Test Specification
```typescript
// src/dashboard/__tests__/smoke.test.ts
import blessed from 'neo-blessed';

describe('Dashboard Smoke Test', () => {
  it('can create a blessed screen', () => {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Test',
      fullUnicode: true,
    });
    expect(screen).toBeDefined();
    screen.destroy();
  });
});
```

---

**Blocked By**: None
**Blocks**: Task 002, 003
