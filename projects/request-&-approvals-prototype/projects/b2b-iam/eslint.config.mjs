import { defineConfig } from 'eslint/config';

import { angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';

/**
 * @fz/b2b-iam lint boundary rules (B2BR-5291 · WI-2).
 *
 * This is an extract-only client library for the b2b-iam backend. It must be
 * consumable by any app (B2BM today, FZ later) WITHOUT dragging in FeverZone
 * application code.
 *
 * Allowed imports from outside this project:
 *   ✅  @angular/*        — the Angular layer only (facade, provider, default store)
 *   ✅  @fz/http-models   — shared HTTP contract types (IBaseResponse interface + normalizeError; no class, no AdapterInterface)
 *   ✅  projects/workspace-* — tooling (resolved via workspace deps)
 *
 * Forbidden imports (filesystem paths and tsconfig path aliases):
 *   ❌  src/app/**, @fz-original/**            — FZ legacy application code (R2)
 *   ❌  @fz-*, projects/fz-* product aliases   — other FZ product projects (R2)
 *   ❌  @angular/*  INSIDE src/lib/core/**      — core/ stays framework-agnostic (R4)
 */

// R2 — no reach into FeverZone app code or sibling product projects.
const fzAppBoundary = {
  group: ['@fz-original', '@fz-original/**', '**/src/app/**'],
  message: '@fz/b2b-iam must not import from FZ legacy src/app/. Extract shared code into projects/@fz/* libs first (R2).',
};

const fzProductBoundary = {
  group: [
    '@fz-kiosk',
    '@fz-kiosk/**',
    '@fz-kiosk-playwright',
    '@fz-kiosk-playwright/**',
    '@fz-original-playwright',
    '@fz-original-playwright/**',
    '@fz-shop-products',
    '@fz-shop-products/**',
    '@fz-control-panel',
    '@fz-control-panel/**',
    '@fz/fz-tracking',
    '@fz/fz-tracking/**',
    '@fz-guestlists',
    '@fz-guestlists/**',
    '@b2b-marketplace',
    '@b2b-marketplace/**',
    '@fz-ads-manager',
    '@fz-ads-manager/**',
    '@fz-reporting',
    '@fz-reporting/**',
    '@fz-pricing-experiments',
    '@fz-pricing-experiments/**',
    '@fz-pricing-intelligence',
    '@fz-pricing-intelligence/**',
    '@fz-crm-campaigns',
    '@fz-crm-campaigns/**',
    '**/projects/fz-kiosk/**',
    '**/projects/fz-retail/**',
    '**/projects/fz-original/**',
    '**/projects/fz-shop-products/**',
    '**/projects/fz-control-panel/**',
    '**/projects/fz-guestlists/**',
    '**/projects/fz-tracking/**',
    '**/projects/b2b-marketplace/**',
    '**/projects/fz-ads-manager/**',
    '**/projects/fz-reporting/**',
    '**/projects/fz-pricing-experiments/**',
    '**/projects/fz-pricing-intelligence/**',
    '**/projects/fz-crm-campaigns/**',
  ],
  message: '@fz/b2b-iam must not import from other FZ product projects. Use shared libs in projects/@fz/* instead (R2).',
};

// Self-import: use relative paths inside the library, not the public alias.
const selfAliasBoundary = {
  group: ['@fz/b2b-iam', '@fz/b2b-iam/**'],
  message: 'use relative paths "../.." instead of the "@fz/b2b-iam" public alias inside the library.',
};

// R4 — the framework-free core layer must not import Angular.
const noAngularInCore = {
  group: ['@angular', '@angular/*', '@angular/**'],
  message: 'src/lib/core/ must stay framework-agnostic — no @angular/* imports (R4). Keep Angular wiring in the facade/provider layer.',
};

const boundaryPatterns = [fzAppBoundary, fzProductBoundary, selfAliasBoundary];

export default defineConfig([
  // TS — repo-wide boundary rules for the whole library.
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
      'no-restricted-imports': ['error', { patterns: boundaryPatterns }],
      // Payloads mirror the b2b-iam wire format (snake_case), so exempt object
      // property names from camelcase rather than disabling the rule for whole
      // folders/specs — identifiers (vars, params, functions) are still checked.
      // (Quoting keys as strings isn't viable: prettier's quoteProps:"as-needed"
      // strips the quotes, so camelcase would flag them again.)
      camelcase: ['error', { properties: 'never' }],
    },
  },
  // R4 — framework-free core/: keep the app boundaries AND ban @angular/*.
  {
    files: ['**/src/lib/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...boundaryPatterns, noAngularInCore] }],
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
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['b2b-iam'],
          style: 'kebab-case',
        },
      ],
    },
  },
  // HTML
  {
    files: ['**/src/**/*.html'],
    extends: [htmlStrictConfig, htmlDeprecations],
  },
]);
