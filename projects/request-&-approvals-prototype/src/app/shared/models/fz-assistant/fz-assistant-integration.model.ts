import { AssistantApplyValue } from './fz-assistant-capable.model';
import { ActionStep, ExecutionResult } from './fz-assistant-wire.model';

export const FZ_ASSISTANT_ACT_TOOL = 'act' as const;

export type FzAssistantActTool = typeof FZ_ASSISTANT_ACT_TOOL;

export interface ConfirmationRequest {
  confirmationMessage: string;
  step: ActionStep;
}

/**
 * Bounds on the end-of-run recapture wait (§5.2).
 *
 * Deliberately small. This is a settle — enough for the routed view's first change detection, where
 * `[fzAssistantHost]` registers — not the global HTTP-quiescence wait §5.10 rules out.
 */
export interface FzAssistantActSettleConfig {
  /** Render waits spent looking for the arrived host before reading the screen anyway. */
  maxRenderWaits: number;
  /** Ceiling on one render wait, so a view that never renders cannot stall the run. */
  renderTimeoutMs: number;
}

export interface FzAssistantActService {
  act(steps: ActionStep[]): Promise<ExecutionResult>;
}

export interface FzAssistantConfirmationController {
  present(request: ConfirmationRequest): void;
  approve(): Promise<ExecutionResult>;
  decline(): Promise<ExecutionResult>;
  /**
   * Refuses a gated step other than the pending one, for the re-entrant halt — see the implementation.
   * Beyond §5.4's three methods, and the only addition to them: a `getPending()` accessor lived here
   * with no production caller, which is how the pending descriptor came to be read by nobody and
   * mutated by two paths.
   */
  declineRequest(request: ConfirmationRequest): Promise<ExecutionResult>;
}

export interface FzAssistantNativeControlAdapter {
  supports(element: Element): boolean;
  /**
   * The element the value landed on, or `undefined` when the write was refused, so the caller can read
   * `value_applied` back from what was actually written rather than from what it addressed. A radio fill
   * carrying a sibling's value is the case the distinction exists for.
   */
  applyValue(element: Element, value: AssistantApplyValue): Promise<Element | undefined>;
  /**
   * `false` when the element is one the Partner could not have activated, so the caller can report
   * `rejected` (§3.6) rather than `ok`. Not `void`: a swallowed refusal is indistinguishable from a
   * click that landed, which is the outcome the refusal exists to prevent.
   */
  click(element: Element): Promise<boolean>;
}

export type FzAssistantGatedActionStep = ActionStep & {
  confirmation_message: string;
};

/**
 * True when the agent included a non-empty `confirmation_message` on the step.
 * That is the Act-time gate for presenting confirmation UI. Separately, when a host
 * advertised `requires_confirmation` / `requireConfirmationFor`, Act must halt gated
 * steps that fail this check with `confirmation_message_required`, and gated steps that
 * pass it with `confirmation_required` until the Partner approves (§5.8) — Discover
 * alone does not enforce.
 */
export function isGatedActionStep(step: ActionStep): step is FzAssistantGatedActionStep {
  return 'confirmation_message' in step && typeof step.confirmation_message === 'string' && step.confirmation_message.trim().length > 0;
}

/**
 * `ref` when the op carries one: required by `fill` / `select` / `select_many` / `click`, optional
 * on `submit` (host-level submit has no ref), absent on `trigger` / `navigate`.
 */
export function readActionStepRef(step: ActionStep): string | undefined {
  return 'ref' in step ? step.ref : undefined;
}
