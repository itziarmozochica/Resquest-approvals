import { createJestConfig } from '../../../jest.base.mjs';

export default {
  ...createJestConfig({ repoRoot: '<rootDir>/../../..' }),
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
