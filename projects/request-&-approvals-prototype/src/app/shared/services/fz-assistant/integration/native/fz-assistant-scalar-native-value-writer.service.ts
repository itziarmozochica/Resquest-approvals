import { Injectable } from '@angular/core';

import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { satisfiesFzAssistantDeclaredConstraints } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-declared-constraints.util';
import {
  isFzAssistantNumericKind,
  isFzAssistantScalarKind,
  isFzAssistantTemporalKind,
  readFzAssistantNativeControlKind,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';

import { dispatchNativeInputAndChange } from './fz-assistant-native-control.util';
import { FzAssistantNativeValueWriter } from './fz-assistant-native-value-writer.model';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantScalarNativeValueWriterService implements FzAssistantNativeValueWriter {
  apply(element: Element, value: AssistantApplyValue): Element | undefined {
    if (!this.supports(element) || Array.isArray(value)) {
      return undefined;
    }

    if (isFzAssistantNumericKind(readFzAssistantNativeControlKind(element)) && element instanceof HTMLInputElement) {
      return this.#applyNumericValue(element, value) ? element : undefined;
    }

    // A boolean belongs to the checkbox and radio writers, which have their own. Coercing it here would
    // write the word "true" into a text field, the same way `String(null)` would write "null".
    if (typeof value === 'boolean') {
      return undefined;
    }

    return this.#commitValue(element, String(value)) ? element : undefined;
  }

  supports(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
    return isFzAssistantScalarKind(readFzAssistantNativeControlKind(element));
  }

  #applyNumericValue(element: HTMLInputElement, value: AssistantApplyValue): boolean {
    if (typeof value === 'boolean') {
      return false;
    }

    // Capture reports an empty numeric field as `null`, so clearing has to be writable: a writer that
    // refuses a state capture publishes on read leaves the agent unable to undo its own fill. Same rule
    // that makes `[]` a clear-all on a multi select and `false` an uncheck on a radio.
    if (typeof value === 'string' && value.trim() === '') {
      return this.#commitValue(element, '');
    }

    // Asked of the control's own grammar before coercing: see `#isHtmlNumberString`.
    if (typeof value === 'string' && !this.#isHtmlNumberString(element, value.trim())) {
      return false;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) {
      return false;
    }

    return this.#commitValue(element, String(numericValue));
  }

  /**
   * Whether HTML's own number grammar accepts the string as authored.
   *
   * `Number()` is looser than that grammar and the gap is not cosmetic: it reads `0x10` as 16, `0b101` as
   * 5 and `+5` as 5, none of which the control's value sanitization keeps. Coercing first and committing
   * the result applied a number the agent never asked for, on a control that would have refused the
   * request - the one thing every other branch of this writer avoids by letting the browser decide.
   *
   * Asked of a detached probe rather than written and rolled back, the same way
   * `readFzAssistantTemporalConstraints` asks about a bound. The probe is always `number`, whatever the
   * element is: `number` and `range` share one value grammar, and a `range` probe cannot answer because
   * it snaps the thumb to a default instead of emptying. Asking the browser rather than restating the
   * grammar here also keeps the answer the running engine's own.
   */
  #isHtmlNumberString(element: HTMLInputElement, value: string): boolean {
    const probe = element.ownerDocument.createElement('input');
    probe.type = 'number';
    probe.value = value;

    return probe.value !== '';
  }

  #commitValue(element: HTMLInputElement | HTMLTextAreaElement, nextValue: string): boolean {
    const previousValue = element.value;
    element.value = nextValue;

    if (this.#isAcceptedValue(element, nextValue)) {
      // Nothing actually changed: re-applying the value a control already holds should not dirty a
      // pristine form or fire tracking, the same way `applyNativeCheckedState` and the select writer
      // stay quiet. Compared after assignment, so a value the browser sanitized counts as a change.
      if (element.value !== previousValue) {
        dispatchNativeInputAndChange(element);
      }

      return true;
    }

    element.value = previousValue;
    return false;
  }

  /**
   * A fill counts only when the control ends up holding the requested value *and* that value
   * satisfies the constraints the control declares, because the two halves catch different
   * substitutions: `range` silently rewrites the request (clamping to min/max, and snapping to
   * `step` in browsers though not in jsdom), while `number` and `text` keep an illegal value and
   * merely turn `:invalid`. Reporting either as a success hands the agent a form only the user can
   * repair, so both are refused and the previous value is restored.
   *
   * One documented exception: a temporal `step` is neither enforced nor disclosed - see
   * `fz-assistant-temporal-constraints.util.ts` for why - so `<input type="time" step="900">` filled with
   * `10:07` is reported as applied while the control is `:invalid` on `stepMismatch`.
   *
   * The constraint half is `satisfiesFzAssistantDeclaredConstraints`, which is also what capture
   * publishes each leaf's `value_schema` from - so this path can only ever refuse a constraint the
   * agent was given. Everything outside that set (`required`, `setCustomValidity`, server-side
   * rules) is app policy the agent was never told about, and no fill is refused for it.
   */
  #isAcceptedValue(element: HTMLInputElement | HTMLTextAreaElement, requestedValue: string): boolean {
    return this.#holdsRequestedValue(element, requestedValue) && satisfiesFzAssistantDeclaredConstraints(element);
  }

  #holdsRequestedValue(element: HTMLInputElement | HTMLTextAreaElement, requestedValue: string): boolean {
    return element.value === requestedValue || this.#isSanitizedValue(element, requestedValue);
  }

  /**
   * The control holds something other than the request, and that is still a success.
   *
   * Three cases, each a different question. `colour` compares case-insensitively, because that is the only
   * difference the browser is allowed to introduce there - a value it cannot read becomes `#000000`, which
   * is black rather than a normalization of the request, so it must stay a refusal. A temporal control
   * either parsed the request or emptied itself. Text-like controls normalize silently - stripping CR/LF,
   * trimming whitespace, closing the space after a comma in `type="email" multiple` - and refusing those
   * meant refusing `"a@b.com, c@d.com"` on a control whose own published prose invites it.
   *
   * The text case is settled by asking the browser what it would make of the request, rather than listing
   * its normalizations here. `value_applied` reports what landed, so the agent is told the truth either way.
   */
  #isSanitizedValue(element: HTMLInputElement | HTMLTextAreaElement, requestedValue: string): boolean {
    const kind = readFzAssistantNativeControlKind(element);

    if (kind === 'text') {
      return this.#matchesBrowserNormalization(element, requestedValue);
    }

    if (!(element instanceof HTMLInputElement)) {
      return false;
    }

    if (kind === 'color') {
      return element.value.toLowerCase() === requestedValue.trim().toLowerCase();
    }

    return isFzAssistantTemporalKind(kind) && element.value.length > 0;
  }

  /**
   * Whether what landed is the request with only a semantics-preserving change made to it.
   *
   * Asking the browser what it would make of the request cannot answer this: it has already made it, so a
   * probe computes the same sanitization and agrees with itself. That earlier version accepted any request
   * whose sanitization was non-empty, which meant a multi-line address on a single-line input was welded
   * into one line and reported as applied.
   *
   * So the accepted changes are named instead. Trimming the edges and rewriting CRLF to LF keep the value
   * the agent asked for; closing the space after a comma is how `type="email" multiple` stores a list.
   * Destroying newlines in a single-line input is not on the list, because the words either side of them
   * end up joined - the agent asked for something that control cannot hold, and should be told so.
   */
  #matchesBrowserNormalization(element: HTMLInputElement | HTMLTextAreaElement, requestedValue: string): boolean {
    const appliedValue = element.value;
    if (appliedValue === '') {
      return false;
    }

    return this.#semanticallyEqualForms(element, requestedValue).includes(appliedValue);
  }

  /**
   * Every form of the request that means the same thing to this particular control.
   *
   * The line-ending rewrite covers a lone `\r` as well as `\r\n`, because HTML normalizes both to `\n`
   * in a textarea's API value. The comma form is `type="email" multiple`'s own sanitization and is offered
   * to nothing else: trimming around commas generally would weld the newlines either side of one, so
   * `"Calle Mayor 1,\nMadrid"` would have been accepted as applied on a single-line input.
   */
  #semanticallyEqualForms(element: HTMLInputElement | HTMLTextAreaElement, requestedValue: string): string[] {
    const withUnixLineEndings = requestedValue.replace(/\r\n?/g, '\n');
    const forms = [requestedValue.trim(), withUnixLineEndings, withUnixLineEndings.trim()];

    if (element instanceof HTMLInputElement && element.multiple && element.type.toLowerCase() === 'email') {
      forms.push(
        requestedValue
          .split(',')
          .map(part => part.trim())
          .join(','),
      );
    }

    return forms;
  }
}
