#!/usr/bin/env node
/**
 * Start the ASF Whisper Dashboard TUI
 */
const { DashboardRenderer } = require('./dist/dashboard/index.js');

const dashboard = new DashboardRenderer({
  dbPath: '.asf/demo_state.db',
  pollInterval: 500
});

dashboard.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  dashboard.stop();
  process.exit(0);
});
