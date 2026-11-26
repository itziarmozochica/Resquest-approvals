import { inject, Injectable } from '@angular/core';

import { FzAssistantConfirmationDialogService } from '@fz-original/app/shared/components/fz-assistant-confirmation/services/fz-assistant-confirmation-dialog.service';
import { ChatbotClientToolCall, ChatbotClientToolError } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import {
  ConfirmationRequest,
  FZ_ASSISTANT_ACT_TOOL,
  isGatedActionStep,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-integration.model';
import { ActionStep, ExecutionResult } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import {
  ChatbotClientToolFulfillmentService,
  ChatbotClientToolHandlerResult,
} from '@fz-original/app/shared/services/chatbot/chatbot-client-tool-fulfillment.service';
import { parseFzAssistantActArgs } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-act-args.util';
import * as Sentry from '@sentry/angular';

import { FzAssistantActService } from './fz-assistant-act.service';

/**
 * Registers `act` with the client-tool fulfillment map at bootstrap, mirroring
 * `FzAssistantDescribeViewBinder`: lifecycle lives here, not in the poll loop, so any caller that
 * fulfills tool calls finds the handler without coupling to `ChatbotFacade`.
 *
 * Registration is unconditional; the **flag is read per call** (see `#isActEnabled`). Act is the write
 * tool, so it also owns what Discover never needed: refusing malformed agent JSON, and opening the
 * Approve / Decline surface when a run halts waiting on a human.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantActBinder {
  readonly #act = inject(FzAssistantActService);
  readonly #confirmationDialog = inject(FzAssistantConfirmationDialogService);
  readonly #fulfillment = inject(ChatbotClientToolFulfillmentService);
  readonly #optimizely = inject(OptimizelyService);

  constructor() {
    this.#fulfillment.register(FZ_ASSISTANT_ACT_TOOL, (toolCall: ChatbotClientToolCall) => this.#handle(toolCall));
  }

  async #handle(toolCall: ChatbotClientToolCall): Promise<ChatbotClientToolHandlerResult> {
    if (!this.#isActEnabled()) {
      return {
        error: ChatbotClientToolError.UNKNOWN_TOOL,
        hint: 'act is not enabled for this session',
        success: false,
      };
    }

    const parsedArgs = parseFzAssistantActArgs(toolCall.args);
    if (parsedArgs.ok === false) {
      // Malformed steps must not reach the runner. It would start the run, refuse the bad step partway
      // through, and hand back a `rejected` on step n - where the agent needs to be told its plan was
      // never valid. Same posture as `describe_view`'s scope parse.
      return {
        error: ChatbotClientToolError.INVALID_TOOL_ARGS,
        hint: parsedArgs.hint,
        success: false,
      };
    }

    // `submit` is no longer withheld: `FzAssistantConfirmationController` can now answer a
    // `confirmation_required` halt, so an approved submit completes on the continuation run. The refusal
    // that stood here from PRD-4606 existed only while nothing could.
    //
    // This is the first point at which Act can commit anything at all, and the layers §5.8.1 puts *under*
    // the confirm gate are not built yet: no screen or action allowlist (PRD-4610) and no irreversible-op
    // denylist (PRD-4611), so today a refund or publish submit is confirm-and-run, which §5.8.1 says it
    // must never be. `ENABLE_FZ_ASSISTANT_DI_ACT` is what holds that line; both must land before the flag
    // goes on for any route.
    const result = await this.#act.act(parsedArgs.steps);
    this.#presentGatedStep(parsedArgs.steps, result);

    return toHandlerResult(result);
  }

  /**
   * Read at **handle** time, not at registration.
   *
   * `isFeatureEnabled` returns `true`, `false`, **or `null`** while the Optimizely SDK is still
   * initialising and no `?ofeat=` override is set. Gating registration on that would let SDK init race
   * this constructor and lose the tool for the whole session, with no way back — the handler map is
   * written once at bootstrap. Reading per call costs a map lookup and is correct whenever the flag
   * flips.
   *
   * `null` is treated as off. This is the write path: an unproven "maybe" must not mutate a Partner's
   * screen.
   *
   * `FzAssistantActService.act()` refuses the same flag independently, and neither check is redundant.
   * This one owes the *agent* an answer - `UNKNOWN_TOOL`, so it stops planning `act` calls at all - which
   * is a protocol answer and not a run result. That one covers every caller of the runner, including the
   * continuation run Approve starts, which never reaches this method.
   */
  #isActEnabled(): boolean {
    return this.#optimizely.isFeatureEnabled(FeatureFlags.ENABLE_FZ_ASSISTANT_DI_ACT) === true;
  }

  /**
   * Opens the Approve / Decline surface for a halt that is waiting on a human — **without awaiting it**.
   *
   * That is the whole of §5.8's "halt + continuation across turns": the halted result goes back to the
   * agent now, and the Partner answers on their own time. Awaiting the dialog here would hold the tool
   * call open until somebody clicked, which is exactly the paused TOOL_CALL the V2 transport must not
   * have.
   *
   * The approved run's own `ExecutionResult` therefore has nowhere to go yet — reporting it to the agent
   * is INT-B.5, on the backend, and is not in this stack. Until that lands the write still happens and
   * the Partner still sees it; the agent simply is not told, and will read it from the next
   * `view_context` it asks for.
   *
   * A `try` around the call and a `.catch()` on its promise, because the two catch different things and
   * only one of them was here. `present()` is not `async`: anything it throws before its first `await`
   * throws *synchronously*, past `.catch()` and out of `#handle`, where the fulfillment service turns the
   * well-formed halted result into `TOOL_EXECUTION_FAILED` — dropping `manifest` and every step result
   * after the writes had already landed. That is the outcome this comment used to claim it prevented.
   */
  #presentGatedStep(steps: readonly ActionStep[], result: ExecutionResult): void {
    const request = readConfirmationRequest(steps, result);
    if (request === undefined) {
      return;
    }

    try {
      // Swallowed on purpose: the tool result is already computed and correct, and a failure to open a
      // dialog must not turn a well-formed halt into a failed tool call.
      void this.#confirmationDialog.present(request).catch((error: unknown) => this.#reportDialogFailure(error));
    } catch (error: unknown) {
      this.#reportDialogFailure(error);
    }
  }

  /**
   * The confirmation surface failing is not something the agent can act on, but it is something an
   * engineer must see: the Partner has no way to approve anything, so every gated step from here on halts
   * and the screen looks to the agent like one it can never commit on. Same posture as
   * `FzAssistantActService#reportStepThrow` — error level per §10.2, no field values per §10.1.
   */
  #reportDialogFailure(error: unknown): void {
    const message = '[FzAssistantAct] The confirmation dialog could not be presented; the gated step was refused';

    console.error(message, error);
    Sentry.captureException(error, { extra: { message }, level: 'error' });
  }
}

/**
 * The gated step a run halted on, when that halt is one a human can answer.
 *
 * Only `confirmation_required`. A `confirmation_message_required` halt is the agent's own omission —
 * there is no message to show a Partner, and the agent has to replan with one. Every other halt code is
 * a refusal nobody can approve their way past.
 */
function readConfirmationRequest(steps: readonly ActionStep[], result: ExecutionResult): ConfirmationRequest | undefined {
  const haltedAt = result.halted_at;
  if (result.status !== 'halted' || haltedAt === undefined) {
    return undefined;
  }

  if (result.steps[haltedAt]?.error !== 'confirmation_required') {
    return undefined;
  }

  const step = steps[haltedAt];
  // The gate only reaches `confirmation_required` for a step carrying a non-empty message, so this
  // narrows rather than defends — but it is what gives the dialog a message it can render.
  if (step === undefined || !isGatedActionStep(step)) {
    return undefined;
  }

  return { confirmationMessage: step.confirmation_message, step };
}

/**
 * `ExecutionResult` split across the two fields the action-results body has for it.
 *
 * `manifest` keeps the meaning it already has for `describe_view` — the current screen — so a backend
 * that only reads `manifest` still gets fresh state out of an act run. The rest rides in `act`, which
 * backend may ignore. See `ChatbotActionResult.act`.
 *
 * `success: true` on a halted run is deliberate: the tool ran and answered. `success: false` is for a
 * call that could not run at all, which is why the halt lives in `act.status` and not here.
 */
function toHandlerResult(result: ExecutionResult): ChatbotClientToolHandlerResult {
  return {
    act: {
      status: result.status,
      steps: result.steps,
      ...(result.halted_at !== undefined ? { halted_at: result.halted_at } : {}),
    },
    manifest: result.view_context,
    success: true,
  };
}
