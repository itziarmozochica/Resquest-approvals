import { defineConfig } from 'eslint/config';

import { esmStrictConfig } from '../../workspace-lint/configs/esm-config.mjs';
import { tsStrictConfig } from '../../workspace-lint/configs/ts-config.mjs';

const noExternalImports = {
  group: [
    '@angular',
    '@angular/**',
    '@fz-original',
    '@fz-original/**',
    '@fz-*',
    '@fz/*',
    '@fz/*/**',
    '@ignite/*',
    '@ignite/*/**',
    '@b2b-marketplace/**',
    '**/src/app/**',
    '**/projects/**',
  ],
  message: '@fz/version-check is a framework-free package: it must not import anything outside itself.',
};

export default defineConfig([
  {
    files: ['**/*.ts'],
    extends: [tsStrictConfig],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lib.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-restricted-imports': ['error', { patterns: [noExternalImports] }],
      camelcase: ['error', { properties: 'never' }],
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
]);
