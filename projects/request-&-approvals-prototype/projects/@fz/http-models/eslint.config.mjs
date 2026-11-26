import { defineConfig } from 'eslint/config';

import { esmStrictConfig } from '../../workspace-lint/configs/esm-config.mjs';
import { tsStrictConfig } from '../../workspace-lint/configs/ts-config.mjs';

/**
 * @fz/http-models lint config (B2BR-5291 · WI-1).
 *
 * A framework-free, types-only shared lib — lint the TS sources with the
 * workspace strict TS config (type-aware, so it needs `tsconfig.lib.json`), and
 * lint this config file itself with the ESM config.
 */
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
  },
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
]);
