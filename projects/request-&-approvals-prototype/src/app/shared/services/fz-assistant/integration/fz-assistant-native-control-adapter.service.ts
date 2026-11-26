import { inject, Injectable } from '@angular/core';

import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { FzAssistantNativeControlAdapter } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-integration.model';
import { isFzAssistantElementUnavailable } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-disabled-state.util';
import { isFzAssistantSecretField } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-secret-redaction.util';

import { focusNativeElement, isNativeCompositeValue, isNativeControlBlockedForWrite } from './native/fz-assistant-native-control.util';
import { FzAssistantNativeValueWriter } from './native/fz-assistant-native-value-writer.model';
import { FZ_ASSISTANT_NATIVE_VALUE_WRITERS } from './native/fz-assistant-native-value-writers.token';

/**
 * Best-effort Act write path for real `<input>` / `<select>` / `<textarea>` only.
 * Delegates fill semantics to an extensible ordered set of native value writers.
 * Ignite / shared leaves must go through `FzAssistantCapable` (contracts-first).
 * Click is dumb DOM `HTMLElement.click()` — capable has no click hook (§5.4).
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantNativeControlAdapterService implements FzAssistantNativeControlAdapter {
  readonly #writers = inject(FZ_ASSISTANT_NATIVE_VALUE_WRITERS);

  async applyValue(element: Element, value: AssistantApplyValue): Promise<Element | undefined> {
    const writer = this.#findWriter(element);
    // `null` is refused here rather than passed on: `AssistantApplyValue` excludes it, but the value
    // arrives as agent JSON, and `String(null)` would write the literal text "null". A clear is expressed
    // as the control's own empty value - `''`, `false` or `[]` - which is what the published schema names.
    if (writer === undefined || value === null || isNativeControlBlockedForWrite(element) || isNativeCompositeValue(value)) {
      return undefined;
    }

    // Focus follows the write, not the request: a cross-value radio fill selects a sibling, and leaving
    // focus on the addressed radio would put it somewhere the Partner's own click never leaves it.
    const writtenElement = writer.apply(element, value);
    if (writtenElement !== undefined) {
      focusNativeElement(writtenElement);
    }

    return writtenElement;
  }

  /**
   * `true` when the click was dispatched, `false` when it was refused - the caller's signal to report
   * `rejected` instead of `ok`.
   *
   * The refusal used to be swallowed by a `void` return, which left the caller unable to tell a refused
   * click from one that landed, so it reported `ok` for both. That is precisely what the guard below
   * exists to prevent, and `supports()` cannot stand in for it: no writer claims a button, so it answers
   * `false` for every clickable element whether or not the click would be honoured.
   */
  async click(element: Element): Promise<boolean> {
    // `isFzAssistantElementUnavailable`, not the native-only check: an `aria-disabled` tab or button
    // reaches the agent as `disabled` and the browser will still dispatch its click, so activating it
    // would report `ok` for a step the Partner could not have taken.
    if (!(element instanceof HTMLElement) || isFzAssistantElementUnavailable(element)) {
      return false;
    }

    focusNativeElement(element);
    element.click();

    return true;
  }

  supports(element: Element): boolean {
    return this.#findWriter(element) !== undefined;
  }

  #findWriter(element: Element): FzAssistantNativeValueWriter | undefined {
    if (isFzAssistantSecretField(element)) {
      return undefined;
    }

    return this.#writers.find(writer => writer.supports(element));
  }
}
