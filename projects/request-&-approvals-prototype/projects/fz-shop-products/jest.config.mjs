import { createJestConfig } from '../../jest.base.mjs';

export default {
  ...createJestConfig({ repoRoot: '<rootDir>/../..' }),
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/**/*.spec.ts', '!<rootDir>/**/public-api.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 84,
      functions: 92,
      lines: 94,
      statements: 93,
    },
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/playwright/'],
};
