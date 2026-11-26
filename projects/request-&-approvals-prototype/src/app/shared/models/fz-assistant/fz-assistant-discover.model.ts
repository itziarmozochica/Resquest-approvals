import { FzAssistantCapable } from './fz-assistant-capable.model';
import { FzAssistantCapturedElement, FzAssistantTableSummary } from './fz-assistant-captured.model';
import { FzAssistantRegisteredHost } from './fz-assistant-host.model';
import { DescribeViewArgs, FzAssistantViewContext } from './fz-assistant-wire.model';

export type { FzAssistantTableSummary };

export const FZ_ASSISTANT_DESCRIBE_VIEW_TOOL = 'describe_view' as const;

export const FZ_ASSISTANT_REF_ATTRIBUTE = 'data-fz-assistant-ref' as const;

export const FZ_ASSISTANT_CAPTURE_ELEMENT_CAP = 200 as const;

/**
 * Reserved for a future table cell-sample revision (not emitted in V1).
 * Keep the constants so product/privacy can reopen sampling without reinventing bounds.
 * When samples return: cap rows, cap each cell string, and set `rows_truncated: true` whenever
 * `rows.length < row_count` so the agent cannot treat a partial sample as the full table.
 */
export const FZ_ASSISTANT_TABLE_ROW_CAP = 50 as const;
export const FZ_ASSISTANT_TABLE_CELL_CHAR_CAP = 120 as const;

export const FZ_ASSISTANT_OVERLAY_ROOT_SELECTORS = ['.cdk-overlay-container', 'ngb-modal-window'] as const;

export const FZ_ASSISTANT_TABLE_HOST_SELECTORS = ['table', 'ignt-table'] as const;

/**
 * Ignite (and similar) non-data row class names — fallback only.
 * Prefer `aria-hidden` / `aria-busy` on the row or an ancestor; keep these next to
 * {@link FZ_ASSISTANT_TABLE_HOST_SELECTORS} so DS renames are visible and overridable.
 */
export const FZ_ASSISTANT_TABLE_NON_DATA_ROW_CLASS_NAMES = ['ignt-table__row--skeleton', 'ignt-table__row--empty'] as const;

/**
 * Ignite interactive-row class names — fallback after semantic signals
 * (`role="button"|"link"`, non-`-1` `tabindex`).
 */
export const FZ_ASSISTANT_TABLE_INTERACTIVE_ROW_CLASS_NAMES = ['ignt-table__row--interactive', 'ignt-table__card--interactive'] as const;

/** Non-native interactive ARIA roles collected as capture candidates and used for tag-inferred names. */
export const FZ_ASSISTANT_INTERACTIVE_ARIA_ROLES = [
  'button',
  'link',
  'tab',
  'checkbox',
  'radio',
  'switch',
  'combobox',
  'listbox',
  'textbox',
  'searchbox',
  'spinbutton',
  'slider',
  'menuitem',
  'option',
] as const;

export type FzAssistantInteractiveAriaRole = (typeof FZ_ASSISTANT_INTERACTIVE_ARIA_ROLES)[number];

/**
 * Combobox / listbox hosts must keep descending so `[role=option]` nodes remain available for
 * option mapping. Other interactive ARIA hosts stay atomic to avoid double-emitting wrappers.
 */
export const FZ_ASSISTANT_COMPOSITE_SELECT_ARIA_ROLES = ['combobox', 'listbox'] as const;

export type FzAssistantCompositeSelectAriaRole = (typeof FZ_ASSISTANT_COMPOSITE_SELECT_ARIA_ROLES)[number];

export function isCompositeSelectAriaRole(role: string | null | undefined): role is FzAssistantCompositeSelectAriaRole {
  if (role === null || role === undefined) {
    return false;
  }

  const normalized = role.trim().toLowerCase();
  return (FZ_ASSISTANT_COMPOSITE_SELECT_ARIA_ROLES as readonly string[]).includes(normalized);
}

/** Builds a CSS selector from interactive ARIA roles — single source with {@link FZ_ASSISTANT_INTERACTIVE_ARIA_ROLES}. */
export function buildInteractiveAriaRoleSelector(roles: readonly string[] = FZ_ASSISTANT_INTERACTIVE_ARIA_ROLES): string {
  return roles.map(role => `[role="${role}"]`).join(', ');
}

/** Non-native interactive hosts (e.g. `<div role="button">`) collected alongside tag/tabindex candidates. */
export const FZ_ASSISTANT_INTERACTIVE_ARIA_ROLE_SELECTOR = buildInteractiveAriaRoleSelector();

export const FZ_ASSISTANT_NATIVE_CANDIDATE_SELECTOR =
  `input, textarea, select, button, a[href], [tabindex]:not([tabindex='-1']), ${FZ_ASSISTANT_INTERACTIVE_ARIA_ROLE_SELECTOR}` as const;

export const FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS = [
  'app-fz-assistant-chat-surface',
  // The Approve/Decline dialog renders into `cdk-overlay-container`, which §4.5.1 makes a capture
  // root. Without this entry the recapture that Act returns alongside `confirmation_required` would
  // describe the confirmation dialog's own buttons back to the agent as operable controls.
  'app-fz-assistant-confirmation-dialog',
  'app-fz-assistant-dialog',
  'app-fz-assistant-dock-lazy-host',
  'app-fz-assistant-layout-dock',
  'app-fz-assistant-notifications-dialog',
  'app-fz-assistant-top-bar-entry',
  'app-fz-assistant-view',
] as const;

export const FZ_ASSISTANT_COMPOSITE_LEAF_TAG_SELECTORS = ['app-typeahead', 'ignt-typeahead', 'ignt-rich-text-editor'] as const;

export const FZ_ASSISTANT_SECRET_AUTOCOMPLETE_TOKENS = [
  'cc-csc',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-number',
  'current-password',
  'new-password',
  'one-time-code',
] as const;

export type FzAssistantOverlayRootSelector = (typeof FZ_ASSISTANT_OVERLAY_ROOT_SELECTORS)[number];

export type FzAssistantTableHostSelector = (typeof FZ_ASSISTANT_TABLE_HOST_SELECTORS)[number];

export type FzAssistantChromeDenylistSelector = (typeof FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS)[number];

export type FzAssistantSecretAutocompleteToken = (typeof FZ_ASSISTANT_SECRET_AUTOCOMPLETE_TOKENS)[number];

export type FzAssistantDescribeViewTool = typeof FZ_ASSISTANT_DESCRIBE_VIEW_TOOL;

export interface DescribeViewResult {
  view_context: FzAssistantViewContext;
}

export interface FzAssistantCaptureConfig {
  elementCap: number;
  overlayRootSelectors: readonly string[];
  tableHostSelectors: readonly string[];
  /** Class-name fallbacks for skeleton/empty rows when ARIA busy/hidden is absent. */
  tableNonDataRowClassNames: readonly string[];
  /** Class-name fallbacks for clickable rows when role/tabindex is absent. */
  tableInteractiveRowClassNames: readonly string[];
  nativeCandidateSelector: string;
  /** Used to treat ARIA interactive hosts as atomic (no child descent) during capture. */
  interactiveAriaRoleSelector: string;
  denylistSelectors: readonly string[];
  capableTagSelectors: readonly string[];
  compositeLeafTagSelectors: readonly string[];
  refAttribute: typeof FZ_ASSISTANT_REF_ATTRIBUTE;
}

export const FZ_ASSISTANT_DEFAULT_CAPTURE_CONFIG: FzAssistantCaptureConfig = {
  elementCap: FZ_ASSISTANT_CAPTURE_ELEMENT_CAP,
  overlayRootSelectors: FZ_ASSISTANT_OVERLAY_ROOT_SELECTORS,
  tableHostSelectors: FZ_ASSISTANT_TABLE_HOST_SELECTORS,
  tableNonDataRowClassNames: FZ_ASSISTANT_TABLE_NON_DATA_ROW_CLASS_NAMES,
  tableInteractiveRowClassNames: FZ_ASSISTANT_TABLE_INTERACTIVE_ROW_CLASS_NAMES,
  nativeCandidateSelector: FZ_ASSISTANT_NATIVE_CANDIDATE_SELECTOR,
  interactiveAriaRoleSelector: FZ_ASSISTANT_INTERACTIVE_ARIA_ROLE_SELECTOR,
  denylistSelectors: FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS,
  capableTagSelectors: [],
  compositeLeafTagSelectors: FZ_ASSISTANT_COMPOSITE_LEAF_TAG_SELECTORS,
  refAttribute: FZ_ASSISTANT_REF_ATTRIBUTE,
};

export interface FzAssistantRefEntry {
  element: Element;
}

/**
 * Result of a `describe_view` capture attempt.
 * - No scope / empty scope / `scope: "current"` on a page with no host → success + baseline
 *   `{ route, title, elements: [] }` (study §4.9 — structured empty answer for non-instrumented pages).
 *   `"current"` is accepted as an alias for omit (agent/BE habit; not an AG-UI sentinel).
 * - Explicit scope (view id / CSS) that does not resolve → `no_match` so the agent can distinguish
 *   "scope missing" from "scope exists but has no interactives".
 */
export type FzAssistantDescribeViewBuildResult =
  | { ok: true; viewContext: FzAssistantViewContext }
  | { ok: false; error: 'no_match'; hint: string };

export interface FzAssistantDiscoverFacade {
  buildViewContext(options?: DescribeViewArgs): FzAssistantViewContext;
  /**
   * Chat-send / init payload. No host → `{ route, title }` only (no `elements`).
   * Active host → full capture (may still have `elements: []`).
   */
  buildViewContextForSend(): FzAssistantViewContext;
  tryBuildViewContext(options?: DescribeViewArgs): FzAssistantDescribeViewBuildResult;
}

export interface FzAssistantCaptureService {
  capture(roots: ParentNode[]): FzAssistantCapturedElement[];
  resolveRoots(hostElement?: Element | null): ParentNode[];
}

export interface FzAssistantHostRegistry {
  register(host: FzAssistantRegisteredHost): void;
  unregister(host: FzAssistantRegisteredHost): void;
  getActiveHost(): FzAssistantRegisteredHost | null;
}

export interface FzAssistantWidgetRegistry {
  register(element: Element, capable: FzAssistantCapable): void;
  unregister(element: Element): void;
  get(element: Element): FzAssistantCapable | undefined;
}

/**
 * What a ref resolves to, as one answer.
 *
 * `stale` and `missing` are different halts on the wire (`target_stale` vs `target_not_found`), and
 * they arrive together so no caller has to order two lookups to tell them apart - `get()` evicts a
 * disconnected node, which made any such pair order-dependent with nothing but a comment saying so.
 */
export type FzAssistantRefResolution =
  | { readonly status: 'found'; readonly entry: FzAssistantRefEntry }
  | { readonly status: 'stale' }
  | { readonly status: 'missing' };

export interface FzAssistantRefRegistry {
  stamp(element: Element): string;
  /** The whole answer in one call: found, stale (known, node gone) or missing (never in scope). */
  resolve(ref: string): FzAssistantRefResolution;
  get(ref: string): FzAssistantRefEntry | undefined;
  set(ref: string, entry: FzAssistantRefEntry): void;
  delete(ref: string): void;
  clearElement(element: Element): void;
  /** Clears ref mappings for `root` and every stamped descendant under it. Also prunes disconnected entries elsewhere in the map. */
  clearSubtree(root: Element): void;
  clear(): void;
}
