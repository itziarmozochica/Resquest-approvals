import { createJestConfig } from '../../jest.base.mjs';

export default {
  ...createJestConfig({ repoRoot: '<rootDir>/../..' }),
  collectCoverage: true,
  // Pure re-export files (the public API and the per-domain barrels) hold no logic to cover.
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/**/*.spec.ts', '!<rootDir>/**/public-api.ts', '!<rootDir>/**/index.ts'],
  coverageDirectory: '<rootDir>/coverage',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/playwright/'],
};
