#!/usr/bin/env node

/**
 * ASF Swarm Launcher - Binary Entry Point
 *
 * Usage: asf-swarm <command> [options]
 *
 * Commands:
 *   start    Launch dashboard and agent swarm
 *   stop     Stop all running processes
 *   status   Show swarm status
 *   logs     View launcher/agent logs
 */

import { runCLI } from '../launcher/cli';

runCLI().catch((error: Error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
