/**
 * Tests for CLI
 */

import { createCLI } from './cli';

describe('CLI', () => {
  describe('createCLI', () => {
    it('should create a commander program', () => {
      const program = createCLI();

      expect(program.name()).toBe('asf-swarm');
    });

    it('should have start command', () => {
      const program = createCLI();
      const startCmd = program.commands.find((cmd) => cmd.name() === 'start');

      expect(startCmd).toBeDefined();
    });

    it('should have stop command', () => {
      const program = createCLI();
      const stopCmd = program.commands.find((cmd) => cmd.name() === 'stop');

      expect(stopCmd).toBeDefined();
    });

    it('should have status command', () => {
      const program = createCLI();
      const statusCmd = program.commands.find((cmd) => cmd.name() === 'status');

      expect(statusCmd).toBeDefined();
    });

    it('should have logs command', () => {
      const program = createCLI();
      const logsCmd = program.commands.find((cmd) => cmd.name() === 'logs');

      expect(logsCmd).toBeDefined();
    });
  });

  describe('start command options', () => {
    it('should accept --agents option', () => {
      const program = createCLI();
      const startCmd = program.commands.find((cmd) => cmd.name() === 'start');

      const agentsOpt = startCmd?.options.find(
        (opt) => opt.short === '-a' || opt.long === '--agents'
      );
      expect(agentsOpt).toBeDefined();
    });

    it('should accept --config option', () => {
      const program = createCLI();
      const startCmd = program.commands.find((cmd) => cmd.name() === 'start');

      const configOpt = startCmd?.options.find(
        (opt) => opt.short === '-c' || opt.long === '--config'
      );
      expect(configOpt).toBeDefined();
    });

    it('should accept --no-dashboard option', () => {
      const program = createCLI();
      const startCmd = program.commands.find((cmd) => cmd.name() === 'start');

      const dashboardOpt = startCmd?.options.find((opt) => opt.long === '--no-dashboard');
      expect(dashboardOpt).toBeDefined();
    });

    it('should accept --verbose option', () => {
      const program = createCLI();
      const startCmd = program.commands.find((cmd) => cmd.name() === 'start');

      const verboseOpt = startCmd?.options.find(
        (opt) => opt.short === '-v' || opt.long === '--verbose'
      );
      expect(verboseOpt).toBeDefined();
    });
  });

  describe('stop command options', () => {
    it('should accept --force option', () => {
      const program = createCLI();
      const stopCmd = program.commands.find((cmd) => cmd.name() === 'stop');

      const forceOpt = stopCmd?.options.find((opt) => opt.long === '--force');
      expect(forceOpt).toBeDefined();
    });
  });

  describe('version', () => {
    it('should have version set', () => {
      const program = createCLI();

      // Commander stores version in _version
      expect(program.version()).toBeDefined();
    });
  });
});
