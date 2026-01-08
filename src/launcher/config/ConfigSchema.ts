/**
 * JSON Schema validation for launcher configuration
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import { LauncherConfig } from './types';

const ajv = new Ajv({ allErrors: true, verbose: true });

/**
 * JSON Schema for LauncherConfig validation
 */
export const launcherConfigSchema: JSONSchemaType<LauncherConfig> = {
  type: 'object',
  properties: {
    version: { type: 'string' },
    dashboard: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        pollInterval: { type: 'number', minimum: 100, maximum: 5000 },
        dbPath: { type: 'string', minLength: 1 },
      },
      required: ['enabled', 'pollInterval', 'dbPath'],
      additionalProperties: false,
    },
    agents: {
      type: 'object',
      properties: {
        count: { type: 'number', minimum: 1, maximum: 50 },
        defaultRole: { type: 'string', minLength: 1 },
        quietMode: { type: 'boolean' },
        autoRestart: { type: 'boolean' },
        restartDelay: { type: 'number', minimum: 1000 },
        maxRestarts: { type: 'number', minimum: 0, maximum: 10 },
      },
      required: ['count', 'defaultRole', 'quietMode', 'autoRestart', 'restartDelay', 'maxRestarts'],
      additionalProperties: false,
    },
    worktrees: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', minLength: 1 },
          agents: { type: 'number', minimum: 1 },
          role: { type: 'string', minLength: 1 },
        },
        required: ['path', 'agents', 'role'],
        additionalProperties: false,
      },
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          assignTo: { type: 'string', minLength: 1 },
        },
        required: ['id', 'title', 'assignTo'],
        additionalProperties: false,
      },
    },
    shutdown: {
      type: 'object',
      properties: {
        gracePeriod: { type: 'number', minimum: 1000 },
        forceAfter: { type: 'number', minimum: 1000 },
      },
      required: ['gracePeriod', 'forceAfter'],
      additionalProperties: false,
    },
  },
  required: ['version', 'dashboard', 'agents', 'worktrees', 'tasks', 'shutdown'],
  additionalProperties: false,
};

/**
 * Compiled validator function
 */
const validateFn: ValidateFunction<LauncherConfig> = ajv.compile(launcherConfigSchema);

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Array of validation error messages */
  errors: string[];
}

/**
 * Validates a configuration object against the schema
 * @param config - Configuration object to validate
 * @returns Validation result with errors if invalid
 */
export function validateConfig(config: unknown): ValidationResult {
  const valid = validateFn(config);

  if (valid) {
    // Additional custom validations
    const typedConfig = config as LauncherConfig;

    // Ensure forceAfter > gracePeriod
    if (typedConfig.shutdown.forceAfter <= typedConfig.shutdown.gracePeriod) {
      return {
        valid: false,
        errors: ['shutdown.forceAfter must be greater than shutdown.gracePeriod'],
      };
    }

    return { valid: true, errors: [] };
  }

  const errors =
    validateFn.errors?.map((e) => {
      const path = e.instancePath || 'root';
      return `${path}: ${e.message}`;
    }) || [];

  return { valid: false, errors };
}

/**
 * Formats validation errors for CLI display
 * @param result - Validation result to format
 * @returns Formatted error string
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return '';
  }
  return `Configuration validation failed:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`;
}
