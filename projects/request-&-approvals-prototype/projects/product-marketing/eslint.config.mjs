import { defineConfig } from 'eslint/config';

import { angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';

export default defineConfig([
  // TS
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
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['product-marketing', 'product-marketing/**'],
              message: 'use relative paths "../.." instead of "product-marketing/.."',
            },
          ],
        },
      ],
    },
  },
  // ESM
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
  // Angular
  {
    files: ['**/src/**/*.ts'],
    extends: [angularStrictConfig, angularDeprecations],
  },
  // HTML
  {
    files: ['**/src/**/*.html'],
    extends: [htmlStrictConfig, htmlDeprecations],
  },
]);
