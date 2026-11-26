import { defineConfig } from 'eslint/config';

import { angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';

/**
 * @fz/ticketing lint boundary rules (B2BR-5361).
 *
 * Reusable booking-selector widget library. It must be consumable by any app
 * (b2b-marketplace first, FZ later) WITHOUT dragging in FeverZone application
 * code or depending back on its consumer.
 *
 * Allowed imports from outside this project:
 *   ✅  @angular/*        — the Angular layer only (components, services, provider); NOT in core/
 *   ✅  @ignite/*         — design-system primitives, icons, theme tokens
 *   ✅  @fz/http-models   — shared HTTP contract types (BaseResponse)
 *   ✅  @fz/utils         — shared pure utilities
 *   ✅  @fz/channel       — sales-channel enum (standalone lib; temporary home, see projects/channel/AGENTS.md)
 *   ✅  @fz/storage       — the STORAGE_SERVICE port the onsite-setup storage services persist through
 *   ✅  projects/workspace-* — tooling (resolved via workspace deps)
 *
 * Forbidden imports (filesystem paths and tsconfig path aliases):
 *   ❌  src/app/**, @fz-original/**            — FZ legacy application code (R2)
 *   ❌  @fz-*, projects/fz-* product aliases   — other FZ product projects (R2)
 *   ❌  @fz/ticketing-ui                        — the UI layer consumes this lib, never the reverse
 *   ❌  @b2b-marketplace/**                     — the consumer app (no inverted dependency)
 *   ❌  @angular/*  INSIDE src/lib/core/**      — core/ stays framework-agnostic (R4)
 */

// R2 — no reach into FeverZone app code or sibling product projects.
const fzAppBoundary = {
  group: ['@fz-original', '@fz-original/**', '**/src/app/**'],
  message: '@fz/ticketing must not import from FZ legacy src/app/. Port shared code in, or extract into projects/@fz/* libs first (R2).',
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
    // One-way dependency: @fz/ticketing-ui → @fz/ticketing, never the reverse.
    '@fz/ticketing-ui',
    '@fz/ticketing-ui/**',
    '@fz-guestlists',
    '@fz-guestlists/**',
    '@b2b-marketplace',
    '@b2b-marketplace/**',
    '@fz-ads-manager',
    '@fz-ads-manager/**',
    '**/projects/fz-kiosk/**',
    '**/projects/fz-retail/**',
    '**/projects/fz-original/**',
    '**/projects/fz-shop-products/**',
    '**/projects/fz-control-panel/**',
    '**/projects/fz-guestlists/**',
    '**/projects/fz-tracking/**',
    '**/projects/b2b-marketplace/**',
    '**/projects/fz-ads-manager/**',
    '**/projects/fz-ticketing-ui/**',
  ],
  message:
    '@fz/ticketing must not import from FZ product projects or its consumer (b2b-marketplace). Use shared libs in projects/@fz/* instead (R2).',
};

// Self-import: use relative paths inside the library, not the public alias.
const selfAliasBoundary = {
  group: ['@fz/ticketing', '@fz/ticketing/**'],
  message: 'use relative paths "../.." instead of the "@fz/ticketing" public alias inside the library.',
};

// R4 — the framework-free core layer must not import Angular.
const noAngularInCore = {
  group: ['@angular', '@angular/*', '@angular/**'],
  message:
    'src/lib/core/ must stay framework-agnostic — no @angular/* imports (R4). Keep Angular wiring in the components/services/provider layer.',
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
      // Wire models mirror the backend format (snake_case), so exempt object
      // property names from camelcase rather than disabling the rule for whole
      // folders/specs — identifiers (vars, params, functions) are still checked.
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
          prefix: ['ticketing'],
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
