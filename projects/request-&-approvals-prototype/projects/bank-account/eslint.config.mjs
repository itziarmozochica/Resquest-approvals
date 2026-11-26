import { defineConfig } from 'eslint/config';

import { angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';

/**
 * @fz/bank-account lint boundary rules (B2BR-6168).
 *
 * The payout-account domain FeverZone's Finance → Bank Account page and the B2B Marketplace profile
 * share. Consumable by both apps, so it must not reach into either one.
 *
 * Allowed imports from outside this project:
 *   ✅  @angular/*        — the Angular layer only (client, config, provider, forms/); NOT in core/
 *   ✅  @fz/http-models   — shared HTTP contract types (BaseResponse)
 *   ✅  projects/workspace-* — tooling (resolved via workspace deps)
 *
 * Forbidden imports (filesystem paths and tsconfig path aliases):
 *   ❌  src/app/**, @fz-original/**            — FZ application code
 *   ❌  @fz-*, projects/fz-* product aliases   — other FZ product projects
 *   ❌  @b2b-marketplace/**                     — the consumer app (no inverted dependency)
 *   ❌  @angular/*  INSIDE src/lib/core/**      — core/ stays framework-agnostic
 *
 * Spec: plans/B2BR/B2BR-6168_distributor-bank-account.md §10, WI-1.
 */

const fzAppBoundary = {
  group: ['@fz-original', '@fz-original/**', '**/src/app/**'],
  message:
    '@fz/bank-account must not import from FZ legacy src/app/. The partner id arrives as an argument, and the base URL through BANK_ACCOUNT_CONFIG.',
};

const fzProductBoundary = {
  group: [
    '@fz-kiosk',
    '@fz-kiosk/**',
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
    '**/fz-kiosk/**',
    '**/fz-original/**',
    '**/fz-shop-products/**',
    '**/fz-control-panel/**',
    '**/fz-guestlists/**',
    '**/fz-tracking/**',
    '**/b2b-marketplace/**',
    '**/fz-ads-manager/**',
  ],
  message: '@fz/bank-account must not import from FZ product projects or its consumers. Use shared libs in projects/@fz/* instead.',
};

const selfAliasBoundary = {
  group: ['@fz/bank-account', '@fz/bank-account/**'],
  message: 'use relative paths "../.." instead of the "@fz/bank-account" public alias inside the library.',
};

const noAngularInCore = {
  group: ['@angular', '@angular/*', '@angular/**'],
  message:
    'src/lib/core/ must stay framework-agnostic — no @angular/* imports. Keep Angular wiring in the client, provider and forms/, so the domain and the adapters are testable as plain functions.',
};

const boundaryPatterns = [fzAppBoundary, fzProductBoundary, selfAliasBoundary];

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
      'no-restricted-imports': ['error', { patterns: boundaryPatterns }],
      // Wire models mirror the backend format (snake_case): exempt object property names only.
      camelcase: ['error', { properties: 'never' }],
    },
  },
  {
    files: ['**/src/lib/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...boundaryPatterns, noAngularInCore] }],
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
  {
    files: ['**/src/**/*.ts'],
    extends: [angularStrictConfig, angularDeprecations],
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: ['bank-account'], style: 'kebab-case' }],
    },
  },
  {
    files: ['**/src/**/*.html'],
    extends: [htmlStrictConfig, htmlDeprecations],
  },
]);
