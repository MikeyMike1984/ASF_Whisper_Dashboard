/**
 * CLI interface for ASF Swarm Launcher
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SwarmLauncher } from './SwarmLauncher';
import { PidFileManager } from './pid/PidFileManager';
import { ManagedProcess } from './types';

// Package version - will be injected during build
const VERSION = '0.1.0';

/**
 * Creates the CLI program with all commands
 * @returns Configured Commander program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('asf-swarm')
    .description('ASF Swarm Launcher - Orchestrate dashboard and agent processes')
    .version(VERSION);

  // Start command
  program
    .command('start')
    .description('Launch dashboard and agent swarm')
    .option('-a, --agents <n>', 'Number of agents to launch', parseInt)
    .option('-c, --config <path>', 'Path to config file')
    .option('--no-dashboard', 'Launch agents without dashboard')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options: {
      agents?: number;
      config?: string;
      dashboard: boolean;
      verbose?: boolean;
    }) => {
      const spinner = ora('Starting ASF Swarm...').start();

      try {
        const launcher = new SwarmLauncher({
          configPath: options.config,
          agentCountOverride: options.agents,
          noDashboard: !options.dashboard,
          verbose: options.verbose,
        });

        launcher.on('processStart', (p: ManagedProcess) => {
          if (options.verbose) {
            spinner.text = `Started ${p.type}: ${p.id} (PID: ${p.pid})`;
          }
        });

        launcher.on('ready', () => {
          spinner.succeed(chalk.green('ASF Swarm is running'));
          const status = launcher.getStatus();
          const dashboard = status.processes.find((p) => p.type === 'dashboard');
          const agents = status.processes.filter((p) => p.type === 'agent');

          console.log(chalk.cyan(`  Dashboard: ${dashboard ? 'Active' : 'Disabled'}`));
          console.log(chalk.cyan(`  Agents: ${agents.length}`));
          console.log(chalk.gray('\nPress Ctrl+C to stop'));
        });

        await launcher.start();

        // Keep the process running
        await new Promise(() => {});
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
    .action(async (options: { force?: boolean }) => {
      const spinner = ora('Stopping ASF Swarm...').start();

      try {
        const pidManager = new PidFileManager();
        const pidData = pidManager.read();

        if (!pidData) {
          spinner.info(chalk.yellow('No running swarm found'));
          return;
        }

        if (pidManager.isStale()) {
          spinner.info(chalk.yellow('Cleaning up stale PID file...'));
          pidManager.remove();
          return;
        }

        // Send shutdown signal to launcher process
        const signal = options.force ? 'SIGKILL' : 'SIGTERM';
        try {
          process.kill(pidData.launcherPid, signal);
          spinner.succeed(chalk.green(`Stop signal (${signal}) sent to launcher`));
        } catch (killError) {
          if ((killError as NodeJS.ErrnoException).code === 'ESRCH') {
            spinner.info(chalk.yellow('Launcher process not found, cleaning up PID file...'));
            pidManager.remove();
          } else {
            throw killError;
          }
        }
      } catch (error) {
        spinner.fail(chalk.red(`Failed to stop: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // Status command
  program
    .command('status')
    .description('Show swarm status')
    .action(() => {
      const pidManager = new PidFileManager();
      const pidData = pidManager.read();

      if (!pidData) {
        console.log(chalk.yellow('No running swarm'));
        return;
      }

      if (pidManager.isStale()) {
        console.log(chalk.yellow('Stale PID file found (launcher not running)'));
        console.log(chalk.gray('Run "asf-swarm stop" to clean up'));
        return;
      }

      console.log(chalk.bold('ASF Swarm Status'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.gray('Launcher PID:')} ${chalk.cyan(pidData.launcherPid)}`);
      console.log(
        `${chalk.gray('Started:')} ${chalk.cyan(new Date(pidData.startedAt).toLocaleString())}`
      );
      console.log();

      console.log(chalk.bold('Processes:'));
      if (pidData.processes.length === 0) {
        console.log(chalk.gray('  No processes registered'));
      } else {
        for (const proc of pidData.processes) {
          const statusColor =
            proc.status === 'running'
              ? chalk.green
              : proc.status === 'crashed'
              ? chalk.red
              : chalk.yellow;
          console.log(
            `  ${chalk.white(proc.id.padEnd(14))} ${statusColor(proc.status.padEnd(10))} ${chalk.gray('PID:')} ${proc.pid}`
          );
        }
      }
    });

  // Logs command (placeholder for v1)
  program
    .command('logs')
    .argument('[agent-id]', 'Optional agent ID to filter logs')
    .description('View launcher/agent logs')
    .action((agentId?: string) => {
      console.log(chalk.yellow('Log viewing not implemented in v1'));
      console.log(chalk.gray('Logs are written to .asf/swarm_state.db'));
      if (agentId) {
        console.log(chalk.gray(`Filter requested for: ${agentId}`));
      }
    });

  return program;
}

/**
 * Runs the CLI with the given arguments
 * @param args - Command line arguments (defaults to process.argv)
 */
export async function runCLI(args: string[] = process.argv): Promise<void> {
  const program = createCLI();
  await program.parseAsync(args);
}
