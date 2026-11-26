export const FZ_ASSISTANT_ELEMENT_TYPES = [
  'text',
  'select',
  'select_many',
  'number',
  'boolean',
  'date',
  'time',
  'tab',
  'button',
  'link',
  'iframe',
] as const;

export type FzAssistantElementType = (typeof FZ_ASSISTANT_ELEMENT_TYPES)[number];

/** Study §3.5 ops. */
export const FZ_ASSISTANT_ACT_OPS = ['fill', 'select', 'select_many', 'click', 'navigate', 'submit', 'trigger'] as const;

export type FzAssistantActOp = (typeof FZ_ASSISTANT_ACT_OPS)[number];

/** Study §3.6 frozen error codes. */
export const FZ_ASSISTANT_ACT_ERROR_CODES = [
  'target_not_found',
  'target_stale',
  'fill_not_supported',
  'widget_not_capable',
  'confirmation_message_required',
  'confirmation_required',
  'no_match',
  'ambiguous_match',
  'rejected',
] as const;

export type FzAssistantActErrorCode = (typeof FZ_ASSISTANT_ACT_ERROR_CODES)[number];

/** Capture-time failures only — act-time codes must not appear on describe/view_context elements. */
export type FzAssistantCaptureErrorCode = Extract<FzAssistantActErrorCode, 'widget_not_capable'>;

export const FZ_ASSISTANT_EXECUTION_STATUSES = ['completed', 'halted'] as const;

export type FzAssistantExecutionStatus = (typeof FZ_ASSISTANT_EXECUTION_STATUSES)[number];

export const FZ_ASSISTANT_STEP_STATUSES = ['ok', 'halt', 'rejected'] as const;

export type FzAssistantStepStatus = (typeof FZ_ASSISTANT_STEP_STATUSES)[number];

export type FzAssistantWireValue = string | number | boolean | string[] | Record<string, unknown> | null;

export interface FzAssistantOptionObject {
  id: string;
  label: string;
}

export type FzAssistantElementOptions = string[] | FzAssistantOptionObject[];

/** Capped table metadata for Discover V1 — agent wire field (not capture-only).
 *
 * V1 deliberately omits cell samples (`rows`) so Attendees/Orders/Reservations
 * personal data is not shipped to the model provider. A future revision may add a
 * capped, redacted sample after privacy/legal sign-off.
 */
export interface FzAssistantTableSummary {
  headers: string[];
  /** Full visible data-row count (skeleton/empty/busy rows excluded). */
  row_count: number;
  has_interactive_rows?: true;
}

export interface FzAssistantHostAction {
  id: string;
  enabled?: boolean;
  disabled_reason?: string;
  args_schema?: Record<string, unknown>;
  /**
   * Emit only when `true` (host `requireConfirmationFor`).
   *
   * Advisory on the Discover wire: tells the agent a confirmation is expected. Act must enforce —
   * halt / `confirmation_required` when the step targets this action without `confirmation_message`
   * (`isGatedActionStep`). See `FzAssistantHostConfig.requireConfirmationFor`.
   */
  requires_confirmation?: true;
}

export interface FzAssistantElementBase {
  type: FzAssistantElementType;
  label?: string;
  value?: FzAssistantWireValue;
  options?: FzAssistantElementOptions;
  /**
   * Field name is frozen by §3.4 (`available_actions`); do not rename to `extra_actions`.
   *
   * Agent wire: omit ops the agent MUST assume from `type` alone (see `IMPLIED_ACTIONS_BY_TYPE` /
   * `deriveAvailableActions` in `fz-assistant-actions.util.ts` — single source of truth). Present
   * only when non-empty after that omission — `serializeElement` is the sole omission site.
   *
   * Widget snapshots / internal capture may list the full supported set (including implied
   * ops) so act can check capabilities before the wire boundary strips them. Use `[]` when the
   * widget supports none of the type's implied ops (e.g. read-only `text`); omit the field when
   * capabilities are unspecified and act should fall back to `getImpliedActionsForType`.
   */
  available_actions?: FzAssistantActOp[];
  /**
   * Composites: the shape of the object payload `applyAssistantValue` takes.
   *
   * Leaves: the constraints the Act write path refuses fills against - `minimum` / `maximum` /
   * `multipleOf`, `maxLength` / `minLength`, `format`, `pattern`, or `description` prose where JSON
   * Schema has no keyword for the grid or list in question. Exactly that set, no more: a constraint
   * act enforces has to be here or the agent is refused on a rule it never saw, and one act does not
   * enforce must not be, or the agent self-limits against a rule nothing applies. `required` is its
   * own field above and never appears here.
   *
   * Produced by `toFzAssistantValueSchema`, enforced by `satisfiesFzAssistantDeclaredConstraints`,
   * and gated onto the wire by `isFzAssistantDeclaredConstraintSchema` - all three in
   * `fz-assistant-declared-constraints.util.ts`, so the three cannot drift.
   */
  value_schema?: Record<string, unknown>;
}

export interface FzAssistantElement extends FzAssistantElementBase {
  ref: string;
  label: string;
  capture_error?: FzAssistantCaptureErrorCode;
  required?: true;
  disabled?: true;
  readonly?: true;
  selected?: true;
  requires_confirmation?: true;
}

export interface FzAssistantViewContextBase {
  route: string;
  title: string;
  view?: string;
  view_state?: Record<string, unknown>;
  form_valid?: boolean;
  actions?: FzAssistantHostAction[];
}

export interface FzAssistantViewContext extends FzAssistantViewContextBase {
  /**
   * Operable elements under the capture root.
   * - Present (including `[]`): capture ran; empty means “no interactives on this host/scope”.
   * - Omitted: no host / no capture (chat-send on a non-instrumented page). Prefer this over
   *   `elements: []` so the agent does not treat “no context” as “screen is empty”.
   */
  elements?: FzAssistantElement[];
}

export interface DescribeViewArgs {
  /**
   * Capture root. Omit, `""`, or `"current"` = active host (+ open overlays).
   * Otherwise a host `viewId` or CSS selector.
   */
  scope?: string;
}

interface ActionStepConfirmation {
  confirmation_message?: string;
}

/** Study §3.5: `fill` / `select` / `select_many` require `ref` + `value`. */
export interface FzAssistantFillActionStep extends ActionStepConfirmation {
  op: 'fill' | 'select' | 'select_many';
  ref: string;
  value: FzAssistantWireValue;
}

/** Study §3.5: `click` requires `ref`. */
export interface FzAssistantClickActionStep extends ActionStepConfirmation {
  op: 'click';
  ref: string;
}

/** Study §3.5: `submit` may omit `ref` for host-level submit. */
export interface FzAssistantSubmitActionStep extends ActionStepConfirmation {
  op: 'submit';
  ref?: string;
}

/** Study §3.5: `trigger` requires `action_id`; optional `args`. */
export interface FzAssistantTriggerActionStep extends ActionStepConfirmation {
  op: 'trigger';
  action_id: string;
  args?: Record<string, unknown>;
}

/** Study §3.5: `navigate` requires `route`. */
export interface FzAssistantNavigateActionStep extends ActionStepConfirmation {
  op: 'navigate';
  route: string;
}

export type ActionStep =
  | FzAssistantFillActionStep
  | FzAssistantClickActionStep
  | FzAssistantSubmitActionStep
  | FzAssistantTriggerActionStep
  | FzAssistantNavigateActionStep;

/** Tool input for `act` (§3.1). */
export interface ActArgs {
  steps: ActionStep[];
}

/** Study §3.5 StepResult. */
export interface StepResult {
  index: number;
  op: FzAssistantActOp;
  ref?: string;
  status: FzAssistantStepStatus;
  value_applied?: FzAssistantWireValue;
  error?: FzAssistantActErrorCode;
}

/** Study §3.5 ExecutionResult — `view_context` is always present. */
export interface ExecutionResult {
  status: FzAssistantExecutionStatus;
  steps: StepResult[];
  halted_at?: number;
  view_context: FzAssistantViewContext;
}

export function isFzAssistantActErrorCode(value: unknown): value is FzAssistantActErrorCode {
  return typeof value === 'string' && (FZ_ASSISTANT_ACT_ERROR_CODES as readonly string[]).includes(value);
}

export function isFzAssistantActOp(value: unknown): value is FzAssistantActOp {
  return typeof value === 'string' && (FZ_ASSISTANT_ACT_OPS as readonly string[]).includes(value);
}
