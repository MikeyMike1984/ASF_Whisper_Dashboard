# Task 001: Project Setup & Dependencies

**Category**: Foundation (0-series)
**Estimated Time**: 1 hour
**Dependencies**: None
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Initialize the Node.js/TypeScript project structure with required dependencies.

## Acceptance Criteria
- [ ] `package.json` created with project metadata
- [ ] TypeScript configured with strict mode
- [ ] Jest configured for testing
- [ ] ESLint + Prettier configured
- [ ] Dependencies installed: `better-sqlite3`, `uuid`
- [ ] Dev dependencies installed: `typescript`, `jest`, `ts-jest`, `@types/*`
- [ ] `src/core/monitoring/` directory structure created
- [ ] `tsconfig.json` compiles without errors

## Implementation Steps
1. Initialize npm project: `npm init -y`
2. Install production deps: `npm install better-sqlite3 uuid`
3. Install dev deps: `npm install -D typescript ts-jest jest @types/node @types/jest @types/better-sqlite3 @types/uuid eslint prettier`
4. Create `tsconfig.json` with strict mode
5. Create `jest.config.js`
6. Create directory structure:
   ```
   src/
   └── core/
       └── monitoring/
           ├── db/
           └── __tests__/
   ```
7. Verify: `npx tsc --noEmit`

## Test Specification
```typescript
// Verification only - no unit tests for setup
// Run: npx tsc --noEmit && npm test (should pass with 0 tests)
```

---

**Blocked By**: None
**Blocks**: Task 002, 003, 004
