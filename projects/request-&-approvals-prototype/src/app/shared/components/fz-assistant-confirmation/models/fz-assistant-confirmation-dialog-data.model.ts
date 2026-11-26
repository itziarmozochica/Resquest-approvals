import { FzAssistantActOp } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

/**
 * What the Partner is shown before a gated step commits (§5.8 step 3).
 *
 * Built by `FzAssistantConfirmationDialogService`, not by the dialog: resolving a `ref` to a field name
 * needs the ref registry and the a11y reader, and a dialog that reached for those would be doing
 * capture's job from inside a modal.
 */
export interface FzAssistantConfirmationDialogData {
  /** The agent's own words for why it wants this. Untrusted text — rendered as text, never as markup. */
  confirmationMessage: string;
  op: FzAssistantActOp;
  /** The value the step would write, already stringified for display. Absent for click / submit. */
  proposedValue?: string;
  /**
   * What the step addresses, in the Partner's terms: the accessible name of the element a `ref` resolved
   * to, the `action_id` of a `trigger`, or the `route` of a `navigate`. Absent when a ref no longer
   * resolves, and for a host-level `submit`, which addresses no target at all.
   */
  targetLabel?: string;
}
