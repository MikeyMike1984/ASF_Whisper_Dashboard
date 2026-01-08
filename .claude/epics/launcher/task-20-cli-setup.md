# Task 20: CLI Setup with Commander.js

## Category
Integration

## Objective
Implement the CLI interface using Commander.js for argument parsing and command structure.

## Dependencies
- task-00 (Project Setup)
- task-16 (SwarmLauncher)

## Deliverables
1. `src/launcher/cli.ts` - CLI command definitions
2. `src/launcher/cli.test.ts` - CLI integration tests

## Implementation

### cli.ts
```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SwarmLauncher } from './SwarmLauncher';
import { PidFileManager } from './pid/PidFileManager';
import { version } from '../../package.json';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('asf-swarm')
    .description('ASF Swarm Launcher - Orchestrate dashboard and agent processes')
    .version(version);

  // Start command
  program
    .command('start')
    .description('Launch dashboard and agent swarm')
    .option('-a, --agents <n>', 'Number of agents to launch', parseInt)
    .option('-c, --config <path>', 'Path to config file')
    .option('--no-dashboard', 'Launch agents without dashboard')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options) => {
      const spinner = ora('Starting ASF Swarm...').start();

      try {
        const launcher = new SwarmLauncher({
          configPath: options.config,
          agentCountOverride: options.agents,
          noDashboard: !options.dashboard
        });

        launcher.on('processStart', (p) => {
          if (options.verbose) {
            spinner.text = `Started ${p.type}: ${p.id} (PID: ${p.pid})`;
          }
        });

        launcher.on('ready', () => {
          spinner.succeed(chalk.green('ASF Swarm is running'));
          const status = launcher.getStatus();
          console.log(chalk.cyan(`  Dashboard: ${status.processes.find(p => p.type === 'dashboard') ? 'Active' : 'Disabled'}`));
          console.log(chalk.cyan(`  Agents: ${status.processes.filter(p => p.type === 'agent').length}`));
          console.log(chalk.gray('\nPress Ctrl+C to stop'));
        });

        await launcher.start();
      } catch (error) {
        spinner.fail(chalk.red(`Failed to start: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // Stop command
  program
    .command('stop')
    .description('Stop all running processes')
    .option('--force', 'Force kill processes')
    .action(async (options) => {
      const spinner = ora('Stopping ASF Swarm...').start();

      try {
        const pidManager = new PidFileManager();
        const pidData = pidManager.read();

        if (!pidData) {
          spinner.info('No running swarm found');
          return;
        }

        // Send shutdown signal to launcher process
        process.kill(pidData.launcherPid, options.force ? 'SIGKILL' : 'SIGTERM');

        spinner.succeed(chalk.green('Stop signal sent'));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to stop: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // Status command
  program
    .command('status')
    .description('Show swarm status')
    .action(async () => {
      const pidManager = new PidFileManager();
      const pidData = pidManager.read();

      if (!pidData || pidManager.isStale()) {
        console.log(chalk.yellow('No running swarm'));
        return;
      }

      console.log(chalk.bold('ASF Swarm Status'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`Launcher PID: ${chalk.cyan(pidData.launcherPid)}`);
      console.log(`Started: ${chalk.cyan(new Date(pidData.startedAt).toLocaleString())}`);
      console.log();

      console.log(chalk.bold('Processes:'));
      for (const proc of pidData.processes) {
        const statusColor = proc.status === 'running' ? chalk.green :
                           proc.status === 'crashed' ? chalk.red : chalk.yellow;
        console.log(`  ${proc.id.padEnd(12)} ${statusColor(proc.status.padEnd(10))} PID: ${proc.pid}`);
      }
    });

  // Logs command (placeholder for v1)
  program
    .command('logs [agent-id]')
    .description('View launcher/agent logs')
    .action((agentId) => {
      console.log(chalk.yellow('Log viewing not implemented in v1'));
      console.log(chalk.gray('Logs are written to .asf/swarm_state.db'));
    });

  return program;
}

export async function runCLI(args: string[] = process.argv): Promise<void> {
  const program = createCLI();
  await program.parseAsync(args);
}
```

## Acceptance Criteria
- [ ] `asf-swarm start` command works with all options
- [ ] `asf-swarm stop` command sends proper signal
- [ ] `asf-swarm status` shows process information
- [ ] `asf-swarm --help` shows usage information
- [ ] `asf-swarm --version` shows package version
- [ ] Exit codes reflect success/failure
- [ ] Colorized output with chalk
- [ ] Spinner feedback with ora
- [ ] 100% test coverage

## Test Specification
```typescript
describe('CLI', () => {
  it('should show help', async () => {
    const program = createCLI();
    const output = await captureOutput(() => program.parse(['node', 'asf-swarm', '--help']));
    expect(output).toContain('asf-swarm');
    expect(output).toContain('start');
    expect(output).toContain('stop');
  });

  it('should parse --agents option', async () => {
    const program = createCLI();
    program.parse(['node', 'asf-swarm', 'start', '--agents', '8']);
    // Verify option was parsed
  });

  it('should show status when no swarm running', async () => {
    const program = createCLI();
    const output = await captureOutput(() => program.parse(['node', 'asf-swarm', 'status']));
    expect(output).toContain('No running swarm');
  });
});
```

## Estimated Effort
3 hours

## Notes
- Commander.js handles argument parsing elegantly
- ora provides nice spinner feedback for async operations
- chalk colorizes output for better UX
- Exit codes: 0 = success, 1 = error
