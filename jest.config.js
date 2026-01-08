/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/bin/**',
    '!src/launcher/cli.ts', // Exclude CLI from coverage due to ESM deps
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageDirectory: 'coverage',
  verbose: true,
  // Handle ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|cli-spinners|log-symbols|is-unicode-supported|ansi-styles)/)'
  ],
  moduleNameMapper: {
    '^chalk$': '<rootDir>/src/__mocks__/chalk.ts',
    '^ora$': '<rootDir>/src/__mocks__/ora.ts',
  }
};
