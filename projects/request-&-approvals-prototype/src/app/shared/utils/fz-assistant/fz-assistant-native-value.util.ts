import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { FzAssistantWireValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

import {
  isFzAssistantNumericKind,
  isFzAssistantTemporalKind,
  readFzAssistantNativeControlKind,
} from './fz-assistant-native-control-kind.util';

/**
 * The value that empties a native control, in the shape its write path takes.
 *
 * Capture publishes `null` for an empty numeric field and an unchecked radio, so `null` is what the agent
 * reads and will send back to clear - but `AssistantApplyValue` excludes it, and `String(null)` would write
 * the text "null". This is the translation, per kind, and the reason it lives beside the reader: the two
 * have to agree about what "empty" means for each control.
 *
 * `undefined` means the control has no empty state to reach: a slider puts the thumb back, a colour input
 * turns `''` into `#000000`, and a single `<select>` has no empty option unless the author wrote one.
 */
export function readFzAssistantNativeClearValue(element: Element): AssistantApplyValue | undefined {
  const kind = readFzAssistantNativeControlKind(element);

  if (kind === 'checkbox' || kind === 'radio') {
    return false;
  }

  if (kind === 'select') {
    return element instanceof HTMLSelectElement && element.multiple ? [] : undefined;
  }

  if (kind === 'numeric' || kind === 'text' || isFzAssistantTemporalKind(kind)) {
    return '';
  }

  return undefined;
}

/**
 * The canonical value of a native control, in the shape the wire uses.
 *
 * Read by capture to publish `value`, and by the write path to report `value_applied`. One reader for
 * both, so the two agree about any given element: the adapter can land something other than the request -
 * a radio group selects a sibling, a select resolves an option, a number is normalised - and echoing the
 * request back would state the agent's intent as a fact.
 *
 * Agreement is per element, not per ref. Act reads back off the element the write landed on, which for a
 * cross-value radio fill is a sibling of the one the ref names - so that step's `value_applied` is the
 * group's selection, while the next `view_context` still publishes `null` for the ref itself. Both
 * readings are this function's, and both are true of the element they describe.
 *
 * `undefined` means "no value to report" (a push button, or a non-control). `null` is a real value:
 * an unchecked radio and an empty numeric field both read as empty rather than as a string.
 */
export function readFzAssistantNativeValue(element: Element): FzAssistantWireValue | undefined {
  const kind = readFzAssistantNativeControlKind(element);

  if (element instanceof HTMLInputElement) {
    if (kind === 'checkbox') {
      return element.checked;
    }

    if (kind === 'radio') {
      return element.checked ? element.value : null;
    }

    if (isFzAssistantNumericKind(kind)) {
      return element.value === '' ? null : element.valueAsNumber;
    }

    // A push button carries no value. `file` and `password` carry one that must not travel: a file input
    // reports `C:\fakepath\...`, the Partner's own filesystem, and a secret is redacted at the wire
    // boundary anyway.
    if (kind === 'button' || kind === 'file' || kind === 'password') {
      return undefined;
    }

    return element.value;
  }

  if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  if (element instanceof HTMLSelectElement) {
    return element.multiple ? Array.from(element.selectedOptions, option => option.value) : element.value;
  }

  return undefined;
}
