/**
 * Configuration file loader with validation and defaults merging
 */

import * as fs from 'fs';
import * as path from 'path';
import { LauncherConfig } from './types';
import { DEFAULT_CONFIG, DEFAULT_CONFIG_PATH } from './defaults';
import { validateConfig, formatValidationErrors } from './ConfigSchema';

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Loads and validates launcher configuration from files
 */
export class ConfigLoader {
  private configPath: string;

  /**
   * Creates a new ConfigLoader
   * @param configPath - Path to configuration file (defaults to ./asf-swarm.config.json)
   */
  constructor(configPath?: string) {
    this.configPath = configPath || DEFAULT_CONFIG_PATH;
  }

  /**
   * Loads configuration from file, merging with defaults
   * @returns Complete, validated configuration
   * @throws ConfigurationError if config is invalid
   */
  load(): LauncherConfig {
    if (!fs.existsSync(this.configPath)) {
      console.warn(`Config file not found at ${this.configPath}, using defaults`);
      return this.cloneConfig(DEFAULT_CONFIG);
    }

    try {
      const rawContent = fs.readFileSync(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(rawContent) as Partial<LauncherConfig>;
      const mergedConfig = this.mergeWithDefaults(rawConfig);

      const validation = validateConfig(mergedConfig);
      if (!validation.valid) {
        throw new ConfigurationError(formatValidationErrors(validation));
      }

      return mergedConfig;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new ConfigurationError(`Invalid JSON in config file: ${error.message}`);
      }
      throw new ConfigurationError(`Failed to load config: ${(error as Error).message}`);
    }
  }

  /**
   * Deep merges a partial config with defaults
   * @param config - Partial configuration to merge
   * @returns Complete configuration with defaults filled in
   */
  private mergeWithDefaults(config: Partial<LauncherConfig>): LauncherConfig {
    return {
      version: config.version || DEFAULT_CONFIG.version,
      dashboard: {
        ...DEFAULT_CONFIG.dashboard,
        ...config.dashboard,
      },
      agents: {
        ...DEFAULT_CONFIG.agents,
        ...config.agents,
      },
      worktrees: config.worktrees || DEFAULT_CONFIG.worktrees,
      tasks: config.tasks || DEFAULT_CONFIG.tasks,
      shutdown: {
        ...DEFAULT_CONFIG.shutdown,
        ...config.shutdown,
      },
    };
  }

  /**
   * Creates a deep clone of a configuration
   * @param config - Configuration to clone
   * @returns Deep clone of the configuration
   */
  private cloneConfig(config: LauncherConfig): LauncherConfig {
    return JSON.parse(JSON.stringify(config)) as LauncherConfig;
  }

  /**
   * Checks if a configuration file exists
   * @param configPath - Path to check (defaults to instance path)
   * @returns True if file exists
   */
  static exists(configPath?: string): boolean {
    return fs.existsSync(configPath || DEFAULT_CONFIG_PATH);
  }

  /**
   * Gets the resolved absolute path to the config file
   * @returns Absolute path to config file
   */
  getConfigPath(): string {
    return path.resolve(this.configPath);
  }
}
