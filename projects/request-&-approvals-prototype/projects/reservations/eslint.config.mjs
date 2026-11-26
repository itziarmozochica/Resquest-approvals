import { defineConfig } from 'eslint/config';

import { angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';

/**
 * @fz/reservations lint boundary rules (B2BR-5377).
 *
 * The distributor-rooted capability and reservation calls, addressed by the pair
 * {distributorId, targetOrganizationId}. Consumable by FeverZone and B2B Marketplace, so it must not
 * reach into either app, and must not depend on how either one remembers what the person picked.
 *
 * Allowed imports from outside this project:
 *   ✅  @angular/*        — the Angular layer only (clients, provider, ui/); NOT in core/
 *   ✅  @ignite/*         — design-system primitives, for ui/
 *   ✅  @fz/http-models   — shared HTTP contract types (BaseResponse)
 *   ✅  @fz/utils         — shared pure utilities
 *   ✅  projects/workspace-* — tooling (resolved via workspace deps)
 *
 * Forbidden imports (filesystem paths and tsconfig path aliases):
 *   ❌  src/app/**, @fz-original/**            — FZ application code
 *   ❌  @fz-*, projects/fz-* product aliases   — other FZ product projects
 *   ❌  @b2b-marketplace/**                     — the consumer app (no inverted dependency)
 *   ❌  @fz/b2b-iam                             — a different service, and the target is an argument
 *   ❌  @fz/ticketing                           — the two libraries meet at a cartId, nothing more
 *   ❌  @angular/*  INSIDE src/lib/core/**      — core/ stays framework-agnostic
 *   ❌  core/, the models and the clients INSIDE src/lib/ui/** — the card takes a view model of strings
 *
 * Spec: plans/B2BR/B2BR-5377_distributor-entry-ui/spec.md §4.3, §4.4 and AC16 — lands with PR #12541.
 */

// No reach into FeverZone app code.
const fzAppBoundary = {
  group: ['@fz-original', '@fz-original/**', '**/src/app/**'],
  message:
    '@fz/reservations must not import from FZ legacy src/app/. The target arrives as a DistributorTarget argument, and the base URLs through RESERVATIONS_CONFIG (§4.3).',
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
    '**/fz-kiosk/**',
    '**/fz-original/**',
    '**/fz-shop-products/**',
    '**/fz-control-panel/**',
    '**/fz-guestlists/**',
    '**/fz-tracking/**',
    '**/b2b-marketplace/**',
    '**/fz-ads-manager/**',
  ],
  message: '@fz/reservations must not import from FZ product projects or its consumers. Use shared libs in projects/@fz/* instead.',
};

/**
 * AC16 — not the identity client.
 *
 * `@fz/b2b-iam` answers who the principal is and returns the distributor's `partner_configs[]`. This
 * library takes the two ids it needs as a call argument, so it never has to ask. Importing it would
 * make every reservation call depend on an auth session it does not use, and would give B2B
 * Marketplace a second reason to install it.
 */
const iamBoundary = {
  group: ['@fz/b2b-iam', '@fz/b2b-iam/**', '**/b2b-iam/**'],
  message:
    '@fz/reservations must not import @fz/b2b-iam (AC16). The distributor and partner ids arrive as a DistributorTarget argument — the host builds the pair from its own state (§4.3).',
};

/**
 * §4.4 — the cart is not this library's.
 *
 * `reserve` takes a `cartId`, and what went into that cart — plans, availability, selection — belongs
 * to ticketing. The two libraries meet at that id and share nothing else.
 */
const ticketingBoundary = {
  group: ['@fz/ticketing', '@fz/ticketing/**', '**/ticketing/**'],
  message:
    '@fz/reservations must not import @fz/ticketing (§4.4). The two meet at a cartId: this library commits a reservation, ticketing assembles what is being reserved.',
};

// Self-import: use relative paths inside the library, not the public alias.
const selfAliasBoundary = {
  group: ['@fz/reservations', '@fz/reservations/**'],
  message: 'use relative paths "../.." instead of the "@fz/reservations" public alias inside the library.',
};

/**
 * `lib/ui/` takes a pre-formatted view model, and nothing else.
 *
 * The card is drawn by two apps that disagree about money: FeverZone holds an amount as a `number` and
 * formats it with Angular's `currency` pipe; B2B Marketplace holds an exact decimal string and will not
 * put money in a `number` at all. Importing a domain model here would commit the shared card to one of
 * those positions. It takes strings instead, does no arithmetic and no formatting, and therefore cannot
 * disagree with the server about a total.
 *
 * The ban covers this library's own `core/` too — not just `@fz/ticketing`, which the whole library is
 * already barred from — and the injectable clients beside it, so a card cannot quietly acquire a
 * dependency on a call.
 *
 * **It bans reaching *out* of `ui/`, never moving *within* it.** The relative patterns lead with `..`
 * and let `**` absorb the remaining depth, rather than the bare `'..'` this rule carried in its previous
 * home: there, `..` was `cart/` and `../index` was a real barrel re-exporting the models, but
 * `no-restricted-imports` matches a bare `'..'` against *any* specifier containing a `..` segment.
 * Carried over unchanged it rejected `'../cart-card-view.model'` — the card's own view model — from one
 * directory deeper, with a message about domain models. So a component may grow an internal subfolder,
 * and `ui/` may grow a shared util, without tripping this.
 *
 * **Depth is absorbed, not enumerated** (raised by Leo Cadenas). An earlier pass anchored each pattern at
 * the two depths `ui/` happened to have, which left the very case the paragraph above anticipates: a file
 * added at `ui/format.ts` reaches out as `'../core'` and `'../reservations-client.service'`, matched
 * neither by the depth-2/3 patterns nor by the `lib/core` double-star glob — that one needs a literal
 * `lib` segment in the specifier, which a relative path does not have. Lint stayed green on exactly the
 * import this boundary exists to stop, and silently.
 *
 * The leading `..` is load-bearing and must not be dropped for a bare double-star `core` glob: that also matches
 * `@angular/core`, which bans Angular from the layer whose whole content is Angular components.
 */
const noModelsInUi = {
  group: ['**/lib/core', '**/lib/core/**', '../**/core', '../**/core/**', '../**/*.service'],
  message:
    'lib/ui/ takes a pre-formatted view model on purpose. Importing a domain model, a Money type or a client from here commits this shared card to one consumer’s money representation — pass strings in instead.',
};

// The framework-free core layer must not import Angular.
const noAngularInCore = {
  group: ['@angular', '@angular/*', '@angular/**'],
  message:
    'src/lib/core/ must stay framework-agnostic — no @angular/* imports. Keep Angular wiring in the client/provider layer, so the domain and the mappers are testable as plain functions (AC17).',
};

const boundaryPatterns = [fzAppBoundary, fzProductBoundary, iamBoundary, ticketingBoundary, selfAliasBoundary];

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
      // Wire models mirror the backend format (snake_case), so exempt object property names from
      // camelcase rather than disabling the rule for whole folders/specs — identifiers (vars,
      // params, functions) are still checked.
      camelcase: ['error', { properties: 'never' }],
    },
  },
  // Framework-free core/: keep the app boundaries AND ban @angular/*.
  {
    files: ['**/src/lib/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...boundaryPatterns, noAngularInCore] }],
    },
  },
  // Presentation-only ui/: keep the app boundaries AND ban this library's own models.
  {
    files: ['**/src/lib/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...boundaryPatterns, noModelsInUi] }],
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
          prefix: ['reservations'],
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
