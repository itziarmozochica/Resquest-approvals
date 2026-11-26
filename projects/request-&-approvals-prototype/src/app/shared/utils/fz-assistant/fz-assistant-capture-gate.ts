import { FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';

import { matchesAssistantChrome } from './fz-assistant-denylist.util';

export type CaptureExclusionReason = 'chrome' | 'hidden' | 'offscreen';

export interface CaptureExclusionRule {
  readonly reason: CaptureExclusionReason;
  excludes(element: Element): boolean;
}

export class FzAssistantCaptureGate {
  static create(denylistSelectors: readonly string[] = FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS): FzAssistantCaptureGate {
    return new FzAssistantCaptureGate([
      new AssistantChromeExclusion(denylistSelectors),
      new CssHiddenExclusion(),
      new OffscreenExclusion(),
    ]);
  }

  readonly #rules: readonly CaptureExclusionRule[];

  constructor(rules: readonly CaptureExclusionRule[]) {
    this.#rules = rules;
  }

  excludes(element: Element): boolean {
    for (const rule of this.#rules) {
      if (rule.excludes(element)) {
        return true;
      }
    }

    return false;
  }

  includes(element: Element): boolean {
    return !this.excludes(element);
  }
}

export class AssistantChromeExclusion implements CaptureExclusionRule {
  readonly reason = 'chrome' as const;
  readonly #selectors: readonly string[];

  constructor(selectors: readonly string[]) {
    this.#selectors = selectors;
  }

  excludes(element: Element): boolean {
    return matchesAssistantChrome(element, this.#selectors);
  }
}

export class CssHiddenExclusion implements CaptureExclusionRule {
  readonly reason = 'hidden' as const;

  excludes(element: Element): boolean {
    if (element.closest('[hidden]') !== null || element.closest('[aria-hidden="true"]') !== null) {
      return true;
    }

    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.style.display === 'none' || element.style.visibility === 'hidden') {
      return true;
    }

    const computed = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (computed === undefined) {
      return false;
    }

    return computed.display === 'none' || computed.visibility === 'hidden';
  }
}

export class OffscreenExclusion implements CaptureExclusionRule {
  readonly reason = 'offscreen' as const;

  excludes(element: Element): boolean {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.hasAttribute('inert') || element.closest('[inert]') !== null) {
      return true;
    }

    if (typeof element.checkVisibility === 'function' && !element.checkVisibility()) {
      return true;
    }

    return isFarOffscreenOffset(element.style.left) || isFarOffscreenOffset(element.style.top);
  }
}

function isFarOffscreenOffset(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) && pixels <= -10000;
}
