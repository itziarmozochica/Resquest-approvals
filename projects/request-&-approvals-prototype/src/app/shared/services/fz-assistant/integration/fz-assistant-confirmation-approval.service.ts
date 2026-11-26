import { Injectable } from '@angular/core';

import { ActionStep } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

/**
 * The one gated step a human has approved, for as long as the run carrying it is executing (§5.8.4).
 *
 * A holder both sides inject, rather than the controller subclassing the gate. The gate needs one piece
 * of controller state and the controller needs Act, so making the controller *be* the gate closed a DI
 * cycle that had to be broken with `Injector.get`, and left the whole control depending on a
 * `{ useExisting }` alias being registered somewhere. Nothing outside a spec registered it, so Approve
 * halted `confirmation_required` forever in the app while every spec passed. Composition needs no
 * wiring: `providedIn: 'root'` is the wiring, and there is no cycle left to break.
 *
 * The approval is keyed on the **step**, not on a flag. A flag is open for the duration of the approved
 * run, and a run is not instantaneous - a host `submit()` awaiting an HTTP POST leaves it open while the
 * chat poll can deliver another `act` TOOL_CALL, and that run's gated step would then commit with nobody
 * having approved it. Reference identity is exact and cannot be forged: the continuation runs the very
 * object the halt captured, and a step parsed from agent JSON is always a fresh one.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantConfirmationApprovalService {
  #approvedStep: ActionStep | null = null;

  /** Closes the gate again. Paired with {@link open} in a `finally`, so a throw cannot leave it ajar. */
  clear(): void {
    this.#approvedStep = null;
  }

  isApproved(step: ActionStep): boolean {
    return this.#approvedStep !== null && step === this.#approvedStep;
  }

  open(step: ActionStep): void {
    this.#approvedStep = step;
  }
}
