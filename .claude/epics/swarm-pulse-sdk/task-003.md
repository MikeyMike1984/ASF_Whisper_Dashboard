# Task 003: Database Schema & Auto-Initialization

**Category**: Foundation (0-series)
**Estimated Time**: 2 hours
**Dependencies**: Task 001, Task 002
**Branch**: `feature/swarm-pulse-sdk`

---

## Objective
Implement SQLite database schema with auto-initialization and WAL mode.

## Acceptance Criteria
- [ ] `schema.ts` contains all CREATE TABLE statements
- [ ] Tables created: `agents`, `tasks`, `logs`, `metrics`
- [ ] All indexes created for query performance
- [ ] WAL mode enabled for concurrent writes
- [ ] `initializeDatabase()` function creates DB if missing
- [ ] `.asf/` directory auto-created if missing
- [ ] Schema is idempotent (safe to run multiple times)
- [ ] Unit tests verify table creation

## Implementation Steps
1. Create `src/core/monitoring/db/schema.ts`
2. Define SQL constants for each table
3. Create `initializeDatabase(dbPath: string): Database` function:
   - Create `.asf/` directory if needed
   - Open/create SQLite database
   - Enable WAL mode: `PRAGMA journal_mode=WAL`
   - Execute CREATE TABLE IF NOT EXISTS statements
   - Create indexes
   - Return database instance
4. Write unit tests

## Test Specification
```typescript
// schema.test.ts
describe('Database Schema', () => {
  let db: Database;
  const testDbPath = '.asf/test_swarm_state.db';

  beforeEach(() => {
    db = initializeDatabase(testDbPath);
  });

  afterEach(() => {
    db.close();
    fs.unlinkSync(testDbPath);
  });

  it('should create agents table with correct columns', () => {
    const info = db.prepare("PRAGMA table_info(agents)").all();
    expect(info.map(c => c.name)).toContain('id');
    expect(info.map(c => c.name)).toContain('status');
    // ... etc
  });

  it('should enable WAL mode', () => {
    const result = db.prepare("PRAGMA journal_mode").get();
    expect(result.journal_mode).toBe('wal');
  });

  it('should be idempotent', () => {
    // Call initializeDatabase twice, should not throw
    const db2 = initializeDatabase(testDbPath);
    db2.close();
  });
});
```

---

**Blocked By**: Task 001, Task 002
**Blocks**: Task 004, Task 005, Task 006, Task 007
