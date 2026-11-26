import { defineConfig } from 'eslint/config';

import { esmStrictConfig } from '../../workspace-lint/configs/esm-config.mjs';
import { tsStrictConfig } from '../../workspace-lint/configs/ts-config.mjs';

/**
 * @fz/storage lint config (B2BR-5291 · WI-3b).
 *
 * A small shared lib (the `StoragePort` contract + `STORAGE_SERVICE` token) —
 * lint the TS sources with the workspace strict TS config (type-aware, so it
 * needs `tsconfig.lib.json`) and lint this config file itself with the ESM config.
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
    rules: {
      // StoragePort mirrors FeverZone's extracted contract (R6). Its get<T>/set<T>
      // generics are deliberate — they let call-sites annotate the value type
      // (e.g. `storage.get<number>('userId')`), so they intentionally appear once.
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
]);
