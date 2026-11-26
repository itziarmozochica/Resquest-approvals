import { inject, Injectable } from '@angular/core';

import { FzAssistantConfirmationDialogData } from '@fz-original/app/shared/components/fz-assistant-confirmation/models/fz-assistant-confirmation-dialog-data.model';
import { ConfirmationRequest, readActionStepRef } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-integration.model';
import { ActionStep, ExecutionResult, FzAssistantWireValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { FzAssistantRefRegistryService } from '@fz-original/app/shared/services/fz-assistant/discover/fz-assistant-ref-registry.service';
import { FzAssistantConfirmationController } from '@fz-original/app/shared/services/fz-assistant/integration/fz-assistant-confirmation-controller.service';
import { FzAssistantA11yReader } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-a11y-reader';
import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { FzAssistantConfirmationDialogComponent } from '../components/fz-assistant-confirmation-dialog/fz-assistant-confirmation-dialog.component';

/**
 * Presents the gated step and turns the Partner's answer into an Act outcome (§5.8 step 3).
 *
 * Host-agnostic on purpose. The gate is Act core and fires for any screen with a mounted host, so this
 * lives in `shared/components` rather than inside the assistant dock — a Partner can be gated on a
 * screen where the dock was never opened.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantConfirmationDialogService {
  readonly #a11yReader = new FzAssistantA11yReader();
  readonly #controller = inject(FzAssistantConfirmationController);
  readonly #dialog = inject(IgntDialogService);
  readonly #refs = inject(FzAssistantRefRegistryService);
  readonly #translate = inject(TranslateService);
  #isOpen = false;

  /**
   * Shows the dialog for a halted gated step and resolves with what Act did about it.
   *
   * `disableCloseShortcuts` so the shell cannot dismiss the modal on Escape or a backdrop click: either
   * would leave the controller holding a pending step with the surface gone. The dialog maps Escape to
   * Decline itself, so the key still works — it just resolves the gate instead of abandoning it.
   */
  present(request: ConfirmationRequest): Promise<ExecutionResult> {
    if (this.#isOpen) {
      // A second gate arrived while one is on screen. Act halts on the first failure, so this is not a
      // second step from the same run: the halted result went back to the agent unawaited, and the agent
      // replanned and halted again while the Partner was still reading.
      //
      // `declineRequest`, not `decline()`. Declining refuses whatever is *pending*, which is the step the
      // Partner is looking at - so it answered this request with the other step's `ref`, cleared it, and
      // left the open dialog with nothing behind it. Approving that dialog then applied nothing and
      // reported a completed run.
      return this.#controller.declineRequest(request);
    }

    this.#controller.present(request);
    this.#isOpen = true;

    let dialogRef: IgntDialogRef<boolean>;
    try {
      dialogRef = this.#dialog.openModal<boolean, FzAssistantConfirmationDialogData>(FzAssistantConfirmationDialogComponent, {
        data: this.#buildDialogData(request),
        disableCloseShortcuts: true,
        size: 'sm',
      });
    } catch {
      // Opening the modal reaches Ignite and the CDK overlay, so a throw is a realistic outcome, and one
      // the Partner can do nothing about: there is no surface to answer. Declining is the fail-closed
      // answer, and `#isOpen` has to come back down with it - left standing it declined every later gated
      // step for the rest of the session without ever opening a dialog, so the Partner saw nothing and the
      // agent saw a screen it could never commit on.
      this.#isOpen = false;

      return this.#controller.decline();
    }

    return new Promise<ExecutionResult>(resolve => {
      dialogRef.closed$.pipe(take(1)).subscribe((isApproved: boolean | undefined) => {
        this.#isOpen = false;
        // `undefined` is the shell closing without an answer. It cannot happen while shortcuts are
        // disabled and the shell renders no close control of its own, but a closed dialog that left the
        // gate pending would be worse than a decline.
        resolve(isApproved === true ? this.#controller.approve() : this.#controller.decline());
      });
    });
  }

  #buildDialogData(request: ConfirmationRequest): FzAssistantConfirmationDialogData {
    const targetLabel = this.#readTargetName(request.step);
    const proposedValue = this.#readProposedValue(request.step);

    return {
      confirmationMessage: request.confirmationMessage,
      op: request.step.op,
      ...(proposedValue !== undefined ? { proposedValue } : {}),
      ...(targetLabel !== undefined ? { targetLabel } : {}),
    };
  }

  /**
   * The wire value as the text interpolated into `chatbot.confirmation.action.setValue`.
   *
   * The empty cases are translated rather than written in English: this is Partner-facing copy on the
   * commit gate, and it is composed by `translate` into another key, so it is resolved with `instant`
   * the same way the dialog resolves its fallback target.
   *
   * `''` is grouped with `null` on purpose. A gated fill can legitimately clear a field, and rendered
   * literally the summary read "Set Capacity to " with nothing after it — the Partner could not tell
   * what they were approving.
   */
  #formatWireValue(value: FzAssistantWireValue): string | undefined {
    if (value === null || value === '') {
      return this.#translate.instant('chatbot.confirmation.value.empty');
    }
    if (Array.isArray(value)) {
      return value.length === 0 ? this.#translate.instant('chatbot.confirmation.value.nothingSelected') : value.join(', ');
    }
    if (typeof value === 'object') {
      // A composite (a date range, say). Its own shape is the widget's business, so it is shown as the
      // structure the agent sent rather than prose this service would have to invent per widget.
      return Object.entries(value)
        .map(([key, entry]: [string, unknown]) => `${key}: ${String(entry)}`)
        .join(', ');
    }

    return String(value);
  }

  /** The step's value as display text, or nothing when the op writes no value. */
  #readProposedValue(step: ActionStep): string | undefined {
    if (step.op !== 'fill' && step.op !== 'select' && step.op !== 'select_many') {
      return undefined;
    }

    return this.#formatWireValue(step.value);
  }

  /**
   * The field's accessible name, read the same way Discover reads it.
   *
   * A raw `ref` is a UUID and means nothing to the Partner, and the summary is the whole point of the
   * dialog — "Set Capacity to 250" is a decision they can make, "Set 550e8400-… to 250" is not. Omitted
   * rather than guessed when the ref no longer resolves.
   */
  #readTargetLabel(step: ActionStep): string | undefined {
    const ref = readActionStepRef(step);
    if (ref === undefined) {
      return undefined;
    }

    const resolution = this.#refs.resolve(ref);
    if (resolution.status !== 'found') {
      return undefined;
    }

    const name = this.#a11yReader.read(resolution.entry.element).name.trim();

    return name === '' ? undefined : name;
  }

  /**
   * What the step addresses, named the way the Partner would recognise it.
   *
   * A `ref` is only one of the three ways §3.5 lets a step name its target. A gated `trigger` carries an
   * `action_id` and no ref, so reading the ref alone left the target unnamed and the summary fell through
   * to "Run this screen" — in front of a Partner about to approve a host action the dialog then never
   * named. `requireConfirmationFor: new Set(['cancelSession'])` is the reachable case.
   */
  #readTargetName(step: ActionStep): string | undefined {
    if (step.op === 'trigger') {
      return step.action_id;
    }

    if (step.op === 'navigate') {
      return step.route;
    }

    return this.#readTargetLabel(step);
  }
}
