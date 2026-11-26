import { inject, Injectable } from '@angular/core';

import { AssistantWidgetState } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { isGatedActionStep, readActionStepRef } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-integration.model';
import { ActionStep, FzAssistantActErrorCode } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { isFzAssistantFormSubmitControl } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-form-submit.util';

import { FzAssistantHostRegistryService } from '../host/fz-assistant-host-registry.service';
import { FzAssistantConfirmationApprovalService } from './fz-assistant-confirmation-approval.service';

export type FzAssistantConfirmationGateDecision =
  | 'allowed'
  | Extract<FzAssistantActErrorCode, 'confirmation_message_required' | 'confirmation_required'>;

/**
 * Study §5.8 — confirm-on-submit is enforced in **Act core**, not left as a host opt-in.
 *
 * A step is gated when it commits: every `submit`, every `click` on a control that submits a form,
 * every host `requireConfirmationFor` extra (`action_id` or `ref`), and any target whose widget state
 * reports `isConfirmationRequired` (the same value Discover publishes as `requires_confirmation`).
 * Hosts may add gates; they cannot remove the submit one, so a feature team that forgets its extras
 * still cannot commit unattended.
 *
 * A pure function of the step, the widget state and the resolved element Act hands it: the snapshot is
 * read once per step, by Act, before the operability refusal that precedes this gate. The one piece of
 * state it does not compute is whether a human has approved the step in front of it, which it reads from
 * `FzAssistantConfirmationApprovalService` — a holder rather than a subclass hook, so no DI wiring has to
 * be remembered for the gate to see an approval.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantConfirmationGateService {
  readonly #approval = inject(FzAssistantConfirmationApprovalService);
  readonly #hosts = inject(FzAssistantHostRegistryService);

  /**
   * `allowed` only when the step is not gated, or when it **is** the gated step a human just approved.
   * Otherwise Act must halt **before** applying anything (§5.8.2).
   *
   * `target` is the resolved element, when the op has one. Passing it is what lets the gate see a
   * `click` that commits a form; a caller that cannot resolve an element passes nothing and the
   * element-shaped gates simply do not fire.
   */
  evaluate(step: ActionStep, state?: AssistantWidgetState, target?: Element): FzAssistantConfirmationGateDecision {
    if (!this.#isGatedTarget(step, state, target)) {
      return 'allowed';
    }

    if (!isGatedActionStep(step)) {
      return 'confirmation_message_required';
    }

    return this.#approval.isApproved(step) ? 'allowed' : 'confirmation_required';
  }

  #isGatedTarget(step: ActionStep, state: AssistantWidgetState | undefined, target: Element | undefined): boolean {
    // Core gate: a submit commits the form, so it is always gated.
    if (step.op === 'submit') {
      return true;
    }

    // The same commit, addressed as a click. Act cannot see every button a feature wired to a save
    // handler - that is what `requireConfirmationFor` is for - but a form-submitting control is one the
    // platform names outright, and letting it through would make the core gate a matter of which op
    // string the agent chose. Discover does not publish `requires_confirmation` for it, so the first
    // such click is answered with `confirmation_message_required`, which the agent corrects in one turn;
    // that is the same round trip a host-level `submit` has always taken.
    if (step.op === 'click' && target !== undefined && isFzAssistantFormSubmitControl(target)) {
      return true;
    }

    if (this.#isHostDeclaredGate(step)) {
      return true;
    }

    // The state, not the contract: `getAssistantSnapshot()` is widget code running on every fill, select
    // and click that resolves to a capable, and Act has already read it once to decide the target is
    // operable. Reading it again here could disagree with the read the refusal was based on, and doubles
    // what a widget is asked to compute per step. Act owns the read, and owns failing closed when it
    // throws.
    //
    // The host config read above is still feature-owned code behind a live getter, so this method is not
    // throw-free - `#executeStepSafely` is what keeps that from costing the run.
    return state?.isConfirmationRequired === true;
  }

  #isHostDeclaredGate(step: ActionStep): boolean {
    const declared = this.#hosts.getActiveHost()?.config.requireConfirmationFor;
    if (declared === undefined) {
      return false;
    }

    const targetId = step.op === 'trigger' ? step.action_id : readActionStepRef(step);

    return targetId !== undefined && declared.has(targetId);
  }
}
