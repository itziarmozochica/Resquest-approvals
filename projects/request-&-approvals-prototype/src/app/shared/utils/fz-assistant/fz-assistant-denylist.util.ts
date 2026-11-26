import { FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';

export function matchesAssistantChrome(element: Element, selectors: readonly string[] = FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS): boolean {
  for (const selector of selectors) {
    if (selector.trim() === '') {
      continue;
    }

    if (element.closest(selector) !== null) {
      return true;
    }
  }

  return false;
}

export function omitAssistantChrome(
  candidates: readonly Element[],
  selectors: readonly string[] = FZ_ASSISTANT_CHROME_DENYLIST_SELECTORS,
): Element[] {
  return candidates.filter(element => !matchesAssistantChrome(element, selectors));
}
