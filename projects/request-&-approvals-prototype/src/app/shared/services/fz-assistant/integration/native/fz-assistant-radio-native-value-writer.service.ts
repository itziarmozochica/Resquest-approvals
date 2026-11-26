import { Injectable } from '@angular/core';

import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { readFzAssistantNativeControlKind } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';

import {
  applyNativeCheckedState,
  coerceNativeBoolean,
  findNativeRadioGroup,
  isNativeControlBlockedForWrite,
} from './fz-assistant-native-control.util';
import { FzAssistantNativeValueWriter } from './fz-assistant-native-value-writer.model';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantRadioNativeValueWriterService implements FzAssistantNativeValueWriter {
  apply(element: Element, value: AssistantApplyValue): Element | undefined {
    if (!this.supports(element)) {
      return undefined;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const target = this.#findRadioForValue(element, String(value));
      if (target !== undefined) {
        // A group member owns this value, so the fill is a selection - and stays one even when the
        // value reads "true"/"false". Refusing here rather than in the lookup is what keeps a blocked
        // option from reading as "no such value" and falling through to the boolean branch below,
        // which would clear the radio the agent addressed and report the refusal as a success.
        if (isNativeControlBlockedForWrite(target)) {
          return undefined;
        }

        applyNativeCheckedState(target, true);

        // The sibling, not the addressed radio: it is the one now holding the selection, so it is the one
        // the caller reads `value_applied` back from.
        return target;
      }
    }

    // Boolean fill expresses the desired state of this radio: `true` selects it, `false`
    // clears it even though a click cannot, so the group can be returned to no selection.
    const shouldCheck = coerceNativeBoolean(value);
    if (shouldCheck === null) {
      return undefined;
    }

    applyNativeCheckedState(element, shouldCheck);
    return element;
  }

  supports(element: Element): element is HTMLInputElement {
    return readFzAssistantNativeControlKind(element) === 'radio';
  }

  #findRadioForValue(element: HTMLInputElement, value: string): HTMLInputElement | undefined {
    // A radio whose own `value` is "true"/"false" is selected by value match, not toggled
    // by boolean coercion.
    if (element.value === value) {
      return element;
    }

    // Capture emits one ref per radio, so the agent may address the group through any of
    // them. A value owned by a sibling selects that sibling instead of failing.
    // Ownership only: whether that sibling may be written is the caller's question, because a blocked
    // owner has to refuse the fill outright, not read as an absent value.
    return findNativeRadioGroup(element).find(radio => radio.value === value);
  }
}
