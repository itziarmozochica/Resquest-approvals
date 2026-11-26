import { createJestConfig } from '../../jest.base.mjs';

export default {
  ...createJestConfig({ repoRoot: '<rootDir>/../..' }),
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/**/src/**/*.ts', '!<rootDir>/**/*.spec.ts', '!<rootDir>/**/public-api.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 69,
      functions: 71,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['<rootDir>/**/src/**/*.spec.ts', '<rootDir>/**/testing/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/playwright/'],
};
