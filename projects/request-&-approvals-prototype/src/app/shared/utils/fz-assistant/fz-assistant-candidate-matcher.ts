import { FzAssistantCapable } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import {
  FZ_ASSISTANT_COMPOSITE_SELECT_ARIA_ROLES,
  FzAssistantCaptureConfig,
  isCompositeSelectAriaRole,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';
import { FzAssistantTableSummarizer } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-table-summarizer';

/** Single source with {@link FZ_ASSISTANT_COMPOSITE_SELECT_ARIA_ROLES} — do not hardcode role lists. */
const COMPOSITE_SELECT_HOST_SELECTOR = FZ_ASSISTANT_COMPOSITE_SELECT_ARIA_ROLES.map(role => `[role="${role}"]`).join(', ');

export type CaptureCandidateKind = 'table' | 'iframe' | 'capable' | 'native';

export interface CaptureCandidateMatch {
  kind: CaptureCandidateKind;
  descend: boolean;
}

export interface FzAssistantCandidateMatcherDeps {
  config: Pick<
    FzAssistantCaptureConfig,
    'nativeCandidateSelector' | 'interactiveAriaRoleSelector' | 'capableTagSelectors' | 'compositeLeafTagSelectors' | 'tableHostSelectors'
  >;
  isRegisteredCapable: (element: Element) => boolean;
  tableSummarizer: FzAssistantTableSummarizer;
}

export class FzAssistantCandidateMatcher {
  readonly #config: FzAssistantCandidateMatcherDeps['config'];
  readonly #isRegisteredCapable: FzAssistantCandidateMatcherDeps['isRegisteredCapable'];
  readonly #tableSummarizer: FzAssistantTableSummarizer;

  constructor(deps: FzAssistantCandidateMatcherDeps) {
    this.#config = deps.config;
    this.#isRegisteredCapable = deps.isRegisteredCapable;
    this.#tableSummarizer = deps.tableSummarizer;
  }

  match(element: Element): CaptureCandidateMatch | undefined {
    if (this.#tableSummarizer.matches(element)) {
      return { kind: 'table', descend: false };
    }

    if (isIframeElement(element)) {
      // Cross-origin frames are opaque; still emit the host + URL, never walk contentDocument.
      return { kind: 'iframe', descend: false };
    }

    if (this.#isCapableHost(element)) {
      return { kind: 'capable', descend: false };
    }

    if (this.#isCompositeLeafHost(element)) {
      // Shared filters (typeahead, …): one candidate for the host; walk light DOM in the mapper.
      return { kind: 'native', descend: false };
    }

    // Inner controls under shared leaf hosts are represented by the host candidate.
    if (this.#isRedundantUnderCompositeLeaf(element)) {
      return undefined;
    }

    // Options / nested search fields under combobox|listbox are represented by the composite host
    // (options mapped from `[role=option]` descendants). Skip them as separate candidates.
    if (this.#isRedundantUnderCompositeSelect(element)) {
      return undefined;
    }

    if (this.#isNativeControl(element)) {
      // Most ARIA interactive hosts are wrappers (role=button+button). Treat those as atomic.
      // Combobox / listbox keep descending so option nodes exist for mapper option extraction.
      const isAtomicAriaHost = this.#isInteractiveAriaRoleHost(element) && !this.#isCompositeSelectAriaHost(element);
      return { kind: 'native', descend: !isAtomicAriaHost };
    }

    return undefined;
  }

  #isCapableHost(element: Element): boolean {
    if (this.#isRegisteredCapable(element)) {
      return true;
    }

    return isFzAssistantKnownCapableTag(element, this.#config.capableTagSelectors);
  }

  #isCompositeLeafHost(element: Element): boolean {
    return matchesAnySelector(element, this.#config.compositeLeafTagSelectors);
  }

  #isRedundantUnderCompositeLeaf(element: Element): boolean {
    for (const selector of this.#config.compositeLeafTagSelectors) {
      if (selector.trim() === '') {
        continue;
      }

      try {
        const host = element.closest(selector);
        if (host !== null && host !== element) {
          return true;
        }
      } catch {
        // Invalid selector in config — skip.
      }
    }

    return false;
  }

  #isInteractiveAriaRoleHost(element: Element): boolean {
    return matchesSelector(element, this.#config.interactiveAriaRoleSelector);
  }

  #isCompositeSelectAriaHost(element: Element): boolean {
    return isCompositeSelectAriaRole(element.getAttribute('role'));
  }

  #isRedundantUnderCompositeSelect(element: Element): boolean {
    // Options and anything nested inside them (checkbox, button, …) are represented by the
    // composite host — do not emit them as separate candidates.
    const optionHost = element.closest('[role="option"]');
    if (optionHost !== null) {
      const selectHost =
        optionHost === element
          ? element.parentElement?.closest(COMPOSITE_SELECT_HOST_SELECTOR)
          : optionHost.parentElement?.closest(COMPOSITE_SELECT_HOST_SELECTOR);
      if (selectHost !== null && selectHost !== undefined) {
        return true;
      }
    }

    const compositeHost = element.parentElement?.closest(COMPOSITE_SELECT_HOST_SELECTOR);
    if (compositeHost === null || compositeHost === undefined) {
      return false;
    }

    const role = element.getAttribute('role')?.trim().toLowerCase() ?? '';

    // Nested popup / search field under combobox|listbox (closest may be the nested listbox).
    if (isCompositeSelectAriaRole(role) || role === 'textbox' || role === 'searchbox') {
      return true;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return true;
    }

    // Other interactives nested in the composite popup (buttons, switches, …).
    if (role === 'button' || role === 'checkbox' || role === 'radio' || role === 'switch') {
      return true;
    }

    if (element instanceof HTMLButtonElement) {
      return true;
    }

    return false;
  }

  #isNativeControl(element: Element): boolean {
    return matchesSelector(element, this.#config.nativeCandidateSelector);
  }
}

/**
 * A tag the catalog says should carry a contract — whether or not one is registered on it.
 *
 * One reader for both sides, for the same reason capture and Act share the disabled predicates:
 * capture publishes `capture_error: 'widget_not_capable'` off this answer, and Act halts on the same
 * code (§5.6). A leaf that reads as capable to one and unsupported to the other would tell the agent
 * two different things about one element, and would split the bridge-backlog signal §5.6.1 is
 * measured on across two error codes.
 */
export function isFzAssistantKnownCapableTag(element: Element, capableTagSelectors: readonly string[]): boolean {
  return matchesAnySelector(element, capableTagSelectors);
}

export function findNearestCapable(
  element: Element,
  lookup: (host: Element) => FzAssistantCapable | undefined,
): { element: Element; capable: FzAssistantCapable } | undefined {
  let current: Element | null = element;

  while (current !== null) {
    const capable = lookup(current);
    if (capable !== undefined) {
      return { capable, element: current };
    }

    current = current.parentElement;
  }

  return undefined;
}

function isIframeElement(element: Element): boolean {
  return element instanceof HTMLIFrameElement || element.tagName.toLowerCase() === 'iframe';
}

function matchesAnySelector(element: Element, selectors: readonly string[]): boolean {
  for (const selector of selectors) {
    if (selector.trim() === '') {
      continue;
    }

    if (matchesSelector(element, selector)) {
      return true;
    }
  }

  return false;
}

function matchesSelector(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}
