# Task 12: PID File Manager

## Category
Core Logic

## Objective
Implement PID file management for cross-terminal swarm control.

## Dependencies
- task-01 (Type Definitions)

## Deliverables
1. `src/launcher/pid/PidFileManager.ts` - PID file operations
2. `src/launcher/pid/PidFileManager.test.ts` - Unit tests

## Implementation

### PidFileManager.ts
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { ManagedProcess } from '../types';
import { DEFAULT_PID_PATH } from '../config/defaults';

export interface PidFileData {
  launcherPid: number;
  startedAt: number;
  processes: ManagedProcess[];
}

export class PidFileManager {
  private pidPath: string;

  constructor(pidPath?: string) {
    this.pidPath = pidPath || DEFAULT_PID_PATH;
  }

  write(launcherPid: number, processes: ManagedProcess[]): void {
    const dir = path.dirname(this.pidPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: PidFileData = {
      launcherPid,
      startedAt: Date.now(),
      processes
    };

    fs.writeFileSync(this.pidPath, JSON.stringify(data, null, 2));
  }

  read(): PidFileData | null {
    if (!fs.existsSync(this.pidPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.pidPath, 'utf-8');
      return JSON.parse(content) as PidFileData;
    } catch {
      return null;
    }
  }

  remove(): void {
    if (fs.existsSync(this.pidPath)) {
      fs.unlinkSync(this.pidPath);
    }
  }

  exists(): boolean {
    return fs.existsSync(this.pidPath);
  }

  isStale(): boolean {
    const data = this.read();
    if (!data) return false;

    // Check if launcher process is still running
    try {
      process.kill(data.launcherPid, 0);
      return false; // Process exists
    } catch {
      return true; // Process doesn't exist, PID file is stale
    }
  }

  getPath(): string {
    return this.pidPath;
  }
}
```

## Acceptance Criteria
- [ ] Writes JSON PID file with process metadata
- [ ] Reads and parses PID file correctly
- [ ] Detects stale PID files (process no longer running)
- [ ] Creates .asf directory if missing
- [ ] Removes PID file on cleanup
- [ ] 100% test coverage

## Test Specification
```typescript
describe('PidFileManager', () => {
  let manager: PidFileManager;
  const testPath = '/tmp/test-launcher.pid';

  beforeEach(() => {
    manager = new PidFileManager(testPath);
  });

  afterEach(() => {
    manager.remove();
  });

  it('should write and read PID file', () => {
    manager.write(12345, []);
    const data = manager.read();
    expect(data?.launcherPid).toBe(12345);
  });

  it('should return null for missing file', () => {
    expect(manager.read()).toBeNull();
  });

  it('should detect stale PID file', () => {
    manager.write(99999999, []); // Non-existent PID
    expect(manager.isStale()).toBe(true);
  });

  it('should detect active PID file', () => {
    manager.write(process.pid, []); // Current process
    expect(manager.isStale()).toBe(false);
  });

  it('should remove PID file', () => {
    manager.write(12345, []);
    manager.remove();
    expect(manager.exists()).toBe(false);
  });
});
```

## Estimated Effort
1-2 hours

## Notes
- JSON format allows storing process metadata
- Stale detection uses `process.kill(pid, 0)` which doesn't actually kill
- Must handle corrupted PID files gracefully
