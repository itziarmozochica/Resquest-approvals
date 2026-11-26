import { Injectable } from '@angular/core';

import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { readFzAssistantNativeControlKind } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';

import { applyNativeCheckedState, coerceNativeBoolean } from './fz-assistant-native-control.util';
import { FzAssistantNativeValueWriter } from './fz-assistant-native-value-writer.model';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantCheckboxNativeValueWriterService implements FzAssistantNativeValueWriter {
  apply(element: Element, value: AssistantApplyValue): Element | undefined {
    if (!this.supports(element)) {
      return undefined;
    }

    const shouldCheck = coerceNativeBoolean(value);
    if (shouldCheck === null) {
      return undefined;
    }

    applyNativeCheckedState(element, shouldCheck);
    return element;
  }

  supports(element: Element): element is HTMLInputElement {
    return readFzAssistantNativeControlKind(element) === 'checkbox';
  }
}
