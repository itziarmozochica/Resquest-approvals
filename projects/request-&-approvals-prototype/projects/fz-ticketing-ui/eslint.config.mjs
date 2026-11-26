import { defineConfig } from 'eslint/config';

import { angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';

/**
 * @fz/ticketing-ui lint boundary rules (B2BS-1449, smart-container tier B2BS-1655).
 *
 * Reusable, presentation-only ticketing UI. Components are dumb (view-model in,
 * intents out) so five different hosts (POS, kiosk, reservation, reschedule,
 * invitations) can render them with their own store, tracking and flags.
 *
 * Allowed imports from outside this project:
 *   ✅  @angular/*                              — the framework
 *   ✅  @fz/ticketing                           — the domain library this UI renders (one-way)
 *   ✅  @ignite/*                               — design-system primitives, icons, theme tokens
 *   ✅  @fortawesome/*                          — icon definitions used by the templates
 *   ✅  @fz/utils/*                             — shared pure utilities
 *   ✅  allow-listed legacy DS components       — the negated entries in fzLegacyBoundary below
 *
 * Forbidden imports (filesystem paths and tsconfig path aliases):
 *   ❌  @fz-original/**, any src/app path       — FZ legacy code, allow-listed DS components excepted
 *   ❌  @fz-*, projects/fz-* product aliases    — sibling FZ product projects
 *   ❌  @ngrx/*                                 — stores are host-owned (lifted inside src/lib/onsite-setup/**)
 *   ❌  moment / moment-timezone                — Intl only (labels are precomputed by the host anyway)
 *   ❌  @ngx-translate/core                     — strings arrive through the translations token
 *   ❌  @optimizely/**                          — host resolves flags, passes the outcome as data
 *   ❌  @fz/ticketing-ui                        — use relative paths inside the library
 *
 * `@fz-original/**` is banned outright, same as every other shared lib. The negated
 * entries below allow exactly the legacy design-system components this UI needs and
 * Ignite does not provide yet (see AGENTS.md hard rule 7). Importing any other legacy
 * DS component requires adding it here, in a reviewable diff — the exception cannot
 * grow silently, and each entry is deleted when its Ignite replacement ships.
 *
 * One folder is a "smart container" tier: `src/lib/onsite-setup/**` hosts
 * `fzt-onsite-setup-modal`, which injects the `@fz/ticketing` onsite-setup services and
 * composes their signal-store feature (B2BS-1655 locked decision "Modal layer"). Only the
 * `@ngrx/*` ban is lifted there, by the scoped override at the bottom of this file; every
 * other boundary — legacy code, product projects, tracking, flags, moment, ngx-translate —
 * still applies, and `date-selector/**` stays fully dumb.
 */

// FZ legacy code is off limits; the `!` entries are the component-level allow list.
// Patterns use gitignore semantics: a negation only takes effect when every ancestor
// segment is un-ignored too — hence the bare directory entries next to each `/**`, and
// no bare '@fz-original' entry (it would ignore the root segment, which gitignore
// forbids re-including under, silently disabling the whole allow list).
const fzLegacyBoundary = {
  group: [
    '@fz-original/**',
    '**/src/app/**',
    '@ignite/legacy/**',
    '!@ignite/legacy/components',
    '!@ignite/legacy/components/ignt-date-picker-input',
    '!@ignite/legacy/components/ignt-date-picker-input/**',
    '!@ignite/legacy/components/ignt-icon-button',
    '!@ignite/legacy/components/ignt-icon-button/**',
    '!@ignite/legacy/components/ignt-input-field',
    '!@ignite/legacy/components/ignt-input-field/**',
    '!@ignite/legacy/components/ignt-skeleton',
    '!@ignite/legacy/components/ignt-skeleton/**',
    '!@ignite/legacy/components/ignt-tabs',
    '!@ignite/legacy/components/ignt-tabs/**',
    '!@ignite/legacy/components/ignt-tag',
    '!@ignite/legacy/components/ignt-tag/**',
    '!@ignite/legacy/components/ignt-ui-tour',
    '!@ignite/legacy/components/ignt-ui-tour/**',
  ],
  message:
    '@fz/ticketing-ui must not import from FZ legacy code. Port shared code in, or extract it into a shared lib first. Legacy design-system components with no Ignite replacement are allow-listed one by one in this config (AGENTS.md hard rule 7).',
};

const fzProductBoundary = {
  group: [
    // Hyphenated product aliases, present and future (@fz-kiosk, @fz-shop-products,
    // @fz-*-playwright, …) — same glob as projects/channel, no list to maintain.
    '@fz-*',
    // @fz-original also matches the glob but is governed by fzLegacyBoundary above
    // (component allow list) — un-ignore it here so the two groups do not overlap.
    '!@fz-original',
    '!@fz-original/**',
    // Aliases the @fz-* glob does not catch.
    '@fz/fz-tracking',
    '@fz/fz-tracking/**',
    '@b2b-marketplace',
    '@b2b-marketplace/**',
    // Filesystem escapes into sibling product projects.
    '**/projects/fz-*/**',
    '**/projects/b2b-marketplace/**',
  ],
  message: '@fz/ticketing-ui must not import from FZ product projects. Reusable code belongs in a shared lib.',
};

// State is host-owned: this library takes a view-model input and emits intents.
// Lifted for the smart-container tier only — see the scoped override at the bottom.
const noStoreBoundary = {
  group: ['@ngrx', '@ngrx/*', '@ngrx/**'],
  message: '@fz/ticketing-ui is presentation-only — stores live in the host (e.g. PosAvailabilityStore). No @ngrx/* here.',
};

// Date/time formatting is Intl-based; hosts precompute the labels the view-model carries.
const noMomentBoundary = {
  group: ['moment', 'moment/**', 'moment-timezone', 'moment-timezone/**'],
  message: '@fz/ticketing-ui must not depend on moment — use Intl.',
};

// i18n arrives through FZT_DATE_SELECTOR_TRANSLATIONS, ignite-style.
const noNgxTranslateBoundary = {
  group: ['@ngx-translate/core', '@ngx-translate/**'],
  message: '@fz/ticketing-ui must not depend on ngx-translate — inject the translations token and let the host provide strings.',
};

const selfAliasBoundary = {
  group: ['@fz/ticketing-ui', '@fz/ticketing-ui/**'],
  message: 'use relative paths "../.." instead of the "@fz/ticketing-ui" public alias inside the library.',
};

// Hard rule 4: the host resolves flags and passes the outcome in as data.
const noFeatureFlagBoundary = {
  group: ['@optimizely/optimizely-sdk', '@optimizely/**'],
  message: '@fz/ticketing-ui must not depend on Optimizely — the host resolves the flag and passes the outcome as a parameter.',
};

const boundaryPatterns = [
  fzLegacyBoundary,
  fzProductBoundary,
  noStoreBoundary,
  noMomentBoundary,
  noNgxTranslateBoundary,
  noFeatureFlagBoundary,
  selfAliasBoundary,
];

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
      'no-restricted-imports': ['error', { patterns: boundaryPatterns }],
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
          prefix: ['fzt'],
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
  {
    files: ['**/src/lib/onsite-setup/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: boundaryPatterns.filter(pattern => pattern !== noStoreBoundary) }],
    },
  },
]);
