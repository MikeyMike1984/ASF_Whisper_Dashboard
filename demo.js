/**
 * Demo script for ASF Whisper Dashboard
 * Creates test data and launches the TUI
 */

const { SwarmPulse, AgentStatus, TaskStatus, LogLevel } = require('./dist/core/monitoring/index.js');
const { DashboardRenderer } = require('./dist/dashboard/index.js');

async function runDemo() {
  console.log('=== ASF Whisper Dashboard Demo ===\n');

  // Initialize SwarmPulse with test database
  const pulse = SwarmPulse.getInstance({
    dbPath: '.asf/demo_state.db',
    heartbeatInterval: 2000
  });

  // Register as a test agent
  const agentId = pulse.registerAgent('Demo Agent', 'demo-worker');
  console.log(`Registered agent: ${agentId}`);

  // Set status
  pulse.setStatus(AgentStatus.Busy);
  console.log('Status: Busy');

  // Start a task
  pulse.progress('demo-task-001', 'Demo Task', 25);
  console.log('Task started: demo-task-001 (25%)');

  // Write some logs
  pulse.capture('Starting demo workflow...', LogLevel.Info);
  pulse.capture('Processing data...', LogLevel.Info);
  console.log('Logs captured');

  // Report metrics
  pulse.reportTokens(1500);
  pulse.reportCost(0.05);
  console.log('Metrics reported: 1500 tokens, $0.05');

  console.log('\n=== Data written to .asf/demo_state.db ===');
  console.log('\nTo view in dashboard, run:');
  console.log('  node -e "require(\'./dist/dashboard\').DashboardRenderer({dbPath:\'.asf/demo_state.db\'}).start()"');

  // Clean up
  await pulse.shutdown();
  console.log('\nDemo complete!');
}

runDemo().catch(console.error);
