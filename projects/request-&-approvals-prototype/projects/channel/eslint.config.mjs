import { defineConfig } from 'eslint/config';

import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';

/**
 * @fz/channel lint config (B2BS-1449 · Part 2a).
 *
 * A framework-free, types-only shared lib holding the sales-channel enum. It
 * imports nothing: no @angular/*, no app code, no sibling projects. Lint the TS
 * sources with the workspace strict TS config (type-aware, so it needs
 * `tsconfig.lib.json`) and this config file itself with the ESM config.
 */
const noExternalImports = {
  group: [
    '@angular',
    '@angular/**',
    '@fz-original',
    '@fz-original/**',
    // Hyphenated product aliases (@fz-kiosk, @fz-shop-products, …).
    '@fz-*',
    // Slash-scoped workspace libs (@fz/ticketing, @fz/http-models, …) — `@fz-*`
    // does not match these, and a reverse import would create a cycle.
    '@fz/*',
    '@fz/*/**',
    '@ignite/*',
    '@ignite/*/**',
    '@b2b-marketplace/**',
    '**/src/app/**',
    '**/projects/**',
  ],
  message: '@fz/channel is a standalone enum package — it must not import anything outside itself.',
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
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
]);
