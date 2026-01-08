/**
 * Database Schema Definition and Initialization
 *
 * Defines the SQLite schema for SwarmPulse and handles auto-initialization.
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// SQL Schema Definitions
// ============================================================================

/**
 * SQL statements for table creation and indexes
 */
export const SCHEMA = {
  /**
   * Agents table - tracks active agents and their state
   */
  AGENTS_TABLE: `
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      pid INTEGER NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'Idle',
      current_task_id TEXT,
      last_seen INTEGER NOT NULL,
      worktree_path TEXT,
      created_at INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    )
  `,

  /**
   * Tasks table - tracks task queue and progress
   */
  TASKS_TABLE: `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      assigned_agent_id TEXT,
      progress_percent INTEGER DEFAULT 0,
      dependencies TEXT,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER
    )
  `,

  /**
   * Logs table - circular buffer of agent whisper logs
   */
  LOGS_TABLE: `
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      level TEXT DEFAULT 'Info',
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `,

  /**
   * Metrics table - time-series token/cost tracking
   */
  METRICS_TABLE: `
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0.0,
      timestamp INTEGER NOT NULL
    )
  `,

  /**
   * Index definitions for query performance
   */
  INDEXES: [
    'CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)',
    'CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON logs(agent_id)',
    'CREATE INDEX IF NOT EXISTS idx_metrics_agent_id ON metrics(agent_id)',
  ],
};

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize the SwarmPulse database
 *
 * Creates the database file and directory if they don't exist,
 * enables WAL mode for concurrent writes, and creates all required tables.
 *
 * @param dbPath - Path to the SQLite database file
 * @returns Initialized Database instance
 *
 * @example
 * ```typescript
 * const db = initializeDatabase('.asf/swarm_state.db');
 * // Database is now ready to use
 * ```
 */
export function initializeDatabase(dbPath: string): Database.Database {
  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Open or create the database
  const db = new Database(dbPath);

  // Enable WAL mode for concurrent writes
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(SCHEMA.AGENTS_TABLE);
  db.exec(SCHEMA.TASKS_TABLE);
  db.exec(SCHEMA.LOGS_TABLE);
  db.exec(SCHEMA.METRICS_TABLE);

  // Create indexes
  for (const indexSql of SCHEMA.INDEXES) {
    db.exec(indexSql);
  }

  return db;
}
