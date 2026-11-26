import { defineConfig } from 'eslint/config';

import { angularRecommendedConfig, angularStrictConfig } from '../workspace-lint/configs/angular-config.mjs';
import { esmStrictConfig } from '../workspace-lint/configs/esm-config.mjs';
import { htmlRecommendedConfig, htmlStrictConfig } from '../workspace-lint/configs/html-config.mjs';
import { tsRecommendedConfig, tsStrictConfig } from '../workspace-lint/configs/ts-config.mjs';
import angularDeprecations from '../workspace-lint/deprecations/angular/index.mjs';
import htmlDeprecations from '../workspace-lint/deprecations/html/index.mjs';
import { isEnforcementEnabled } from '../workspace-lint/utils.mjs';

/**
 * 👇 Suppressed rules
 *
 * These rules are 'error' by default in the recommended configs, but this project
 * currently has violations for them. We turn them to 'warn' because:
 *
 * 1. Angular CLI (`ng lint`) doesn't support ESLint's Bulk Suppress feature
 * 2. On `master`, we run `ng lint` (not our custom script), so violations would fail CI
 *
 * New violations are still caught via `lint:diff` (pre-commit + feature branch CI),
 * which uses ESLint directly with suppression files.
 *
 * @todo Remove rules from this list as violations are fixed in the codebase.
 * @see docs/scripts/lint/README.md for the full linting strategy
 */
const htmlSuppressedRules = {
  '@angular-eslint/template/elements-content': 'warn', // It is needed due to the way 'ignt-icon-button' component is implemented. We need to refactor that component to accept content projection and remove this rule.
  'fz-template/no-native-table': 'off',
  'fz-template/no-native-input': 'off',
  'fz-template/no-native-nav': 'off',
  'fz-template/no-native-select': 'off',
  'fz-template/no-native-textarea': 'off',
  'fz-template/no-native-button': 'off',
  'fz-template/no-aria-tabs': 'off',
  'fz-template/no-legacy-table-class': 'off', // `ignt-table*` is this project's own markup, not a FeverZone hand-written table.
};
/** 👆 */

const legacySuppressedRulesSeverity = isEnforcementEnabled() ? 'error' : 'warn';
const legacyTsSuppressedRules = {
  '@typescript-eslint/no-explicit-any': legacySuppressedRulesSeverity,
  '@typescript-eslint/no-unused-vars': legacySuppressedRulesSeverity,
  '@angular-eslint/no-output-native': legacySuppressedRulesSeverity,
};

export default defineConfig([
  { ignores: ['**/*.figma.ts'] },
  // TS
  {
    files: ['**/*.ts'],
    ignores: ['legacy/**'],
    extends: [tsStrictConfig],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lib.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {},
  },
  // ESM
  {
    files: ['**/*.mjs'],
    extends: [esmStrictConfig],
  },
  // Angular
  {
    files: ['**/src/**/*.ts', '**/testing/**/*.ts'],
    ignores: ['legacy/**'],
    extends: [angularStrictConfig, angularDeprecations],
    rules: {
      '@angular-eslint/use-component-view-encapsulation': 'warn',
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['ignt'],
          style: 'kebab-case',
        },
      ],
    },
  },
  /**
   * The icon registry renders its SVG from bundled FontAwesome definitions at build time, so the
   * markup is a compile-time constant with no untrusted input. Angular's sanitizer strips SVG
   * internals, which is why the bypass is required rather than convenient.
   */
  {
    files: ['**/icon/src/lib/ignt-icon.component.ts'],
    rules: {
      'fz/no-angular-sanitizer-bypass': 'off',
    },
  },
  /**
   * FIXME: Remove this once the fz/no-fz-original-message-modal rule is fixed and removed
   * This rule conflicts with the public API export by flagging the new message modal component as deprecated.
   */
  {
    files: ['**/common/src/public-api.ts'],
    rules: {
      'fz/no-fz-original-message-modal': 'off',
    },
  },

  // HTML
  {
    files: ['**/src/**/*.html', '**/testing/**/*.html'],
    ignores: ['legacy/**'],
    extends: [htmlStrictConfig, htmlDeprecations],
    rules: {
      ...htmlSuppressedRules,
    },
  },

  /**
   * `legacy/` is the old design-system home moved here from `src/libs/ignite-design-system`
   * (B2BP-1545). It keeps the recommended rule set it was linted with in the root app until each
   * component is replaced, instead of the strict set the rest of Ignite follows.
   */
  {
    files: ['legacy/**/*.ts'],
    extends: [tsRecommendedConfig, angularRecommendedConfig, angularDeprecations],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lib.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@angular-eslint/component-selector': ['warn', { type: 'element', prefix: ['ignt'], style: 'kebab-case' }],
      ...legacyTsSuppressedRules,
    },
  },
  {
    files: ['legacy/**/*.html'],
    extends: [htmlRecommendedConfig, htmlDeprecations],
    rules: {
      ...htmlSuppressedRules,
    },
  },
]);
