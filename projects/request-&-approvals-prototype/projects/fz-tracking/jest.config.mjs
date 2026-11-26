import { createJestConfig } from '../../jest.base.mjs';

export default {
  ...createJestConfig({ repoRoot: '<rootDir>/../..' }),
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/**/*.spec.ts', '!<rootDir>/**/public-api.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 89,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/playwright/'],
};
