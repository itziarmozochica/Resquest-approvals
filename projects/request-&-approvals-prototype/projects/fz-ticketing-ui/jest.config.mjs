import { createJestConfig } from '../../jest.base.mjs';

export default {
  ...createJestConfig({ repoRoot: '<rootDir>/../..' }),
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/**/*.spec.ts',
    '!<rootDir>/**/public-api.ts',
    '!<rootDir>/**/index.ts',
    '!<rootDir>/**/__fixtures__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/playwright/'],
};
