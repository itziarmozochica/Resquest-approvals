import { Injectable } from '@angular/core';

import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { isFzAssistantOptionUnavailable } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-disabled-state.util';

import { dispatchNativeInputAndChange } from './fz-assistant-native-control.util';
import { FzAssistantNativeValueWriter } from './fz-assistant-native-value-writer.model';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantSelectNativeValueWriterService implements FzAssistantNativeValueWriter {
  apply(element: Element, value: AssistantApplyValue): Element | undefined {
    if (!this.supports(element) || typeof value === 'boolean') {
      return undefined;
    }

    if (element.multiple) {
      return this.#applyMultipleValue(element, value) ? element : undefined;
    }

    if (Array.isArray(value)) {
      return undefined;
    }

    return this.#applySingleValue(element, String(value)) ? element : undefined;
  }

  supports(element: Element): element is HTMLSelectElement {
    return element instanceof HTMLSelectElement;
  }

  #applyMultipleValue(element: HTMLSelectElement, value: AssistantApplyValue): boolean {
    // Empty array is a valid `select_many` payload: capture uses `[]` when nothing is
    // selected, and a multi select can be cleared through the UI.
    const requestedValues = (Array.isArray(value) ? value : [String(value)]).map(String);
    const options = Array.from(element.options);
    const availableValues = new Set(options.filter(option => !isFzAssistantOptionUnavailable(option)).map(option => option.value));

    // An unavailable option that is *already selected* is the only unavailable value the agent can have
    // read: capture reports it in `value` while omitting it from `options`, because the wire has no
    // per-option disabled field. An unavailable option that is not selected appears nowhere, so naming
    // one is a request to select what the Partner cannot - and stays a refusal.
    const lockedSelectedValues = new Set(
      options.filter(option => isFzAssistantOptionUnavailable(option) && option.selected).map(option => option.value),
    );

    // Naming a value that is neither on offer nor already locked in is a refusal: a choice this control
    // does not have, where guessing at what was meant is how an agent fills the wrong thing.
    if (requestedValues.some(selectedValue => !availableValues.has(selectedValue) && !lockedSelectedValues.has(selectedValue))) {
      return false;
    }

    // A locked-in value survives the payload as a no-op - the block below leaves its option alone either
    // way. Refusing it instead broke the only round-trip the agent has: adding one selection to the list
    // it was handed sent back a value it was never offered, and the refusal was unrecoverable, because
    // reading the control again after a fill that omits the value returns it again, with nothing on the
    // wire to say which entry to drop.
    const selectedValues = new Set(requestedValues.filter(selectedValue => availableValues.has(selectedValue)));

    // An unavailable option keeps whatever state it already had. Deriving its state from the requested
    // values instead would silently deselect a disabled-and-selected option on every unrelated fill - a
    // mutation the Partner could not make and the agent never asked for.
    const desiredSelection = options.map(option =>
      isFzAssistantOptionUnavailable(option) ? option.selected : selectedValues.has(option.value),
    );
    const wasAlreadySelected = options.every((option, index) => option.selected === desiredSelection[index]);
    for (const [index, option] of options.entries()) {
      option.selected = desiredSelection[index] === true;
    }

    // Already in the requested state: see `applyNativeCheckedState`. Re-selecting the same options
    // is a fill that changed nothing, and dispatching anyway dirties a pristine form and fires
    // tracking for it.
    if (!wasAlreadySelected) {
      dispatchNativeInputAndChange(element);
    }

    return true;
  }

  #applySingleValue(element: HTMLSelectElement, value: string): boolean {
    // Already holding the requested value is a success, even where the option holding it is one the
    // Partner could not choose: `<option disabled selected value="">` is the standard placeholder, and
    // capture publishes its value while omitting it from `options`. Searching first refused the agent's
    // echo of what it had just read, for a fill that would have changed nothing - the same round-trip
    // `#applyMultipleValue` has to survive, and the same quiet no-op every other writer here reports.
    if (element.value === value) {
      return true;
    }

    const option = Array.from(element.options).find(candidate => candidate.value === value && !isFzAssistantOptionUnavailable(candidate));
    if (option === undefined) {
      return false;
    }

    // No `if (option.selected) return true` guard here. `option.selected` can be true on an option that
    // is not the selection: with a `<option disabled selected>` placeholder ahead of it, an option reads
    // as selected while `selectedIndex` and `value` both still point at the placeholder. Trusting it
    // reported the fill as applied and wrote nothing. The idempotent case is already answered above, from
    // `element.value` - the one reading capture publishes, so Act cannot disagree with Discover about
    // what this control currently holds.
    option.selected = true;
    dispatchNativeInputAndChange(element);
    return true;
  }
}
