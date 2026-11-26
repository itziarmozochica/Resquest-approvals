import { inject, Injectable } from '@angular/core';

import {
  ConfirmationRequest,
  FzAssistantConfirmationController as FzAssistantConfirmationControllerContract,
  readActionStepRef,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-integration.model';
import { ExecutionResult, StepResult } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

import { FzAssistantDiscoverFacade } from '../discover/fz-assistant-discover.facade';
import { FzAssistantActService } from './fz-assistant-act.service';
import { FzAssistantConfirmationApprovalService } from './fz-assistant-confirmation-approval.service';

/**
 * The index the continuation numbers its one step at.
 *
 * A continuation is a run of exactly one step, so Act numbers it `0` — and `approve()` returns what Act
 * returns. `decline()` synthesizes its result instead of running anything, so it has to choose the same
 * number: the alternative reported the step's index in the *original* plan, and the same pending step
 * then came back as index 1 when declined and index 0 when approved.
 */
const CONTINUATION_STEP_INDEX = 0;

/**
 * Holds the gated step Act halted on, until a human approves, declines, or walks away (§5.8, §5.11).
 *
 * Act itself stays request-scoped: the halt ends the run and returns, so nothing on the server is left
 * waiting. What lives here is only the descriptor needed to start the **new** run §5.8.4 asks for.
 *
 * The gate is reached through `FzAssistantConfirmationApprovalService`, not by subclassing it. That
 * holder is where the reasoning for the split lives; the short version is that it needs no DI wiring to
 * take effect and leaves no cycle to break, and that the approval it holds is scoped to one step rather
 * than to one stretch of time.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantConfirmationController implements FzAssistantConfirmationControllerContract {
  readonly #act = inject(FzAssistantActService);
  readonly #approval = inject(FzAssistantConfirmationApprovalService);
  readonly #discover = inject(FzAssistantDiscoverFacade);
  #pending: ConfirmationRequest | null = null;

  /**
   * Runs the gated step on its own, with the gate open for exactly that step (§5.8.4).
   *
   * Approving nothing applies nothing and says so. `halted` rather than `completed`: an empty
   * `completed` run is what `act([])` returns, and an agent reading it after an Approve would take it
   * for the commit landing. Nothing reaches an agent from here yet (INT-B.5), which is exactly why the
   * shape has to be right before it does.
   *
   * The pending step is dropped **before** the run, not after: a second Approve on the same descriptor
   * would otherwise commit twice.
   */
  async approve(): Promise<ExecutionResult> {
    const pending = this.#pending;
    if (pending === null) {
      return this.#appliedNothing();
    }

    this.#pending = null;
    this.#approval.open(pending.step);
    try {
      // Only the gated step. The steps before it already applied on the halted run, and §5.8.1 has the
      // Partner looking at that state on the live form while they decide — replaying them would apply
      // each one twice.
      return await this.#act.act([pending.step]);
    } finally {
      // Closed whatever happened, including a throw. An approval left open would let a later run commit
      // without anyone approving it, which is the one failure this control exists to prevent.
      this.#approval.clear();
    }
  }

  /** §5.8.5 — the pending gated step is `rejected` and nothing is applied. */
  async decline(): Promise<ExecutionResult> {
    const pending = this.#pending;
    this.#pending = null;

    return pending === null ? this.#appliedNothing() : this.declineRequest(pending);
  }

  /**
   * Refuses one gated step **without touching whatever is pending**.
   *
   * The re-entrant case needs exactly this. A second halt can arrive while a dialog is still on screen —
   * the halted result went back to the agent unawaited, so the agent is free to replan and halt again —
   * and answering it through `decline()` would report the *on-screen* step's ref for this request and
   * clear it, leaving the Partner looking at a dialog with nothing behind it. Approving that dialog then
   * applied nothing at all.
   */
  declineRequest(request: ConfirmationRequest): Promise<ExecutionResult> {
    return Promise.resolve({
      halted_at: CONTINUATION_STEP_INDEX,
      status: 'halted' as const,
      steps: [toDeclinedStepResult(request)],
      view_context: this.#readViewContext(),
    });
  }

  /**
   * Records the halt so a human can act on it. A second halt replaces the first: Act halts on the first
   * failing step and returns, so two pending steps cannot both be live, and keeping the older one would
   * offer the Partner a step from a run that has already ended.
   */
  present(request: ConfirmationRequest): void {
    this.#pending = request;
  }

  /** A run that applied nothing, said in the shape §3.5 has for it. */
  #appliedNothing(): ExecutionResult {
    return { status: 'halted', steps: [], view_context: this.#readViewContext() };
  }

  /** Never throws: a caller owed an `ExecutionResult` must get one even if capture cannot describe the screen. */
  #readViewContext(): ExecutionResult['view_context'] {
    try {
      return this.#discover.buildViewContextForSend();
    } catch {
      return this.#discover.buildBaselineViewContext();
    }
  }
}

function toDeclinedStepResult(request: ConfirmationRequest): StepResult {
  const ref = readActionStepRef(request.step);

  return {
    error: 'rejected',
    index: CONTINUATION_STEP_INDEX,
    op: request.step.op,
    ...(ref !== undefined ? { ref } : {}),
    status: 'rejected',
  };
}
