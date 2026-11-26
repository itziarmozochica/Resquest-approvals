import { AssistantApplyValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';

export interface FzAssistantNativeValueWriter {
  /**
   * The element the write landed on, or `undefined` when the writer refused it.
   *
   * The element rather than a boolean because it is not always the one addressed: a radio fill carrying a
   * sibling's value selects that sibling, and the caller reads `value_applied` back off whatever was
   * written. A boolean sent that read-back to the addressed radio, which is genuinely unchecked after a
   * cross-value fill, so an `ok` step reported `null` - indistinguishable from a write that never landed.
   */
  apply(element: Element, value: AssistantApplyValue): Element | undefined;
  supports(element: Element): boolean;
}
