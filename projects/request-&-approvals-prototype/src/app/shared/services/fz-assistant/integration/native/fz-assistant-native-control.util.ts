import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import {
  isFzAssistantElementReadonly,
  isFzAssistantElementUnavailable,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-disabled-state.util';

export function applyNativeCheckedState(element: HTMLInputElement, shouldCheck: boolean): void {
  // `indeterminate` is script-only state the wire never carries: capture publishes `checked`, so an
  // indeterminate checkbox reaches the agent as unchecked. Leaving the flag set after a fill left the
  // control rendering a dash while its value said checked - a state no click can produce, since
  // activating an indeterminate checkbox always clears it. The tri-state "select all" header in a table
  // is the case that hits this.
  //
  // Cleared before the comparison, and counted as a change: the displayed state moves from a dash to a
  // tick or a blank even where `checked` does not, and a host that drives the flag from its own state
  // needs the events to hear that its dash is gone.
  const wasIndeterminate = element.indeterminate;
  element.indeterminate = false;

  // A control already in the requested state needs no write: dispatching `change` anyway
  // would dirty a pristine form and fire tracking for a fill that changed nothing.
  if (element.checked === shouldCheck && !wasIndeterminate) {
    return;
  }

  element.checked = shouldCheck;
  dispatchNativeInputAndChange(element);
}

export function coerceNativeBoolean(value: AssistantApplyValue): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return null;
}

export function dispatchNativeInputAndChange(element: Element): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function findNativeRadioGroup(element: HTMLInputElement): HTMLInputElement[] {
  if (element.name === '') {
    return [];
  }

  const root = element.getRootNode();
  const scope = root instanceof Document || root instanceof DocumentFragment ? root : element.ownerDocument;

  return Array.from(scope.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
    radio => radio.name === element.name && radio.form === element.form,
  );
}

export function focusNativeElement(element: Element): void {
  if (element instanceof HTMLElement) {
    element.focus();
  }
}

/**
 * A structured payload only a capable contract can apply.
 *
 * `null` is excluded because it is not one - `typeof null === 'object'` would otherwise class a clear as an
 * object payload, and the type predicate would claim it was a `Record`. The adapter refuses `null` before
 * this is reached, so the exclusion is not load-bearing there; it is here so the predicate is true of any
 * caller, including the type it asserts.
 */
export function isNativeCompositeValue(value: AssistantApplyValue): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Both halves read exactly what Discover publishes as `disabled` and `readonly`, so Act cannot refuse
 * a state the agent was never shown - nor write to one it was. `aria-disabled` and `aria-readonly`
 * count: they are the only signal a widget that must stay focusable can give, the browser dispatches
 * its events anyway, and script assignment ignores `readOnly` entirely.
 */
export function isNativeControlBlockedForWrite(element: Element): boolean {
  return isFzAssistantElementUnavailable(element) || isFzAssistantElementReadonly(element);
}
