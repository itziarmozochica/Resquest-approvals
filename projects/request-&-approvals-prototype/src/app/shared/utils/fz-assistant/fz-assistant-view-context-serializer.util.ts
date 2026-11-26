import { isEmptyObject } from '@fz-original/app/app/utils/ts/ts.util';

import { FzAssistantCapturedElement, FzAssistantCapturedViewContext } from '../../models/fz-assistant/fz-assistant-captured.model';
import { FzAssistantElement, FzAssistantHostAction, FzAssistantViewContext } from '../../models/fz-assistant/fz-assistant-wire.model';
import { deriveAvailableActions } from './fz-assistant-actions.util';
import { isFzAssistantDeclaredConstraintSchema } from './fz-assistant-declared-constraints.util';

export function serializeViewContext(capture: FzAssistantCapturedViewContext): FzAssistantViewContext {
  const viewContext: FzAssistantViewContext = {
    route: capture.route,
    title: capture.title,
    elements: capture.elements.map(serializeElement),
  };

  assignDefined(viewContext, [
    ['view', capture.view !== '' ? capture.view : undefined],
    ['view_state', capture.view_state !== undefined && !isEmptyObject(capture.view_state) ? capture.view_state : undefined],
    ['form_valid', capture.form_valid],
    ['actions', capture.actions !== undefined && capture.actions.length > 0 ? capture.actions.map(serializeHostAction) : undefined],
  ]);

  return viewContext;
}

export function serializeElement(capture: FzAssistantCapturedElement): FzAssistantElement {
  const element: FzAssistantElement = {
    ref: capture.ref,
    type: capture.type,
    label: capture.label,
  };

  assignDefined(element, [
    ['value', capture.value],
    // Sole wire omission for options. Capture stays faithful (`[]` = options element with none
    // loaded yet; omit = not an options element). Lean payload collapses both on the wire.
    ['options', capture.options !== undefined && capture.options.length > 0 ? capture.options : undefined],
    ['required', capture.isRequired === true ? true : undefined],
    ['disabled', capture.isDisabled === true ? true : undefined],
    ['readonly', capture.isReadonly === true ? true : undefined],
    ['selected', capture.isSelected === true ? true : undefined],
    ['requires_confirmation', capture.isConfirmationRequired === true ? true : undefined],
    // Sole wire omission for available_actions. Capture stays faithful (full supported set, or
    // `[]` when none); do not pre-strip in the mapper — deriveAvailableActions lives only here.
    ['available_actions', deriveAvailableActions(capture.type, capture.available_actions)],
    [
      'value_schema',
      allowsValueSchema(capture) && capture.value_schema !== undefined && !isEmptyObject(capture.value_schema)
        ? capture.value_schema
        : undefined,
    ],
    ['capture_error', capture.capture_error],
  ]);
  // `table_summary` is capture-only (may grow cell samples later). Wire tables use lean `value`
  // only — never forward `table_summary` / `rows` to the agent.

  return element;
}

/**
 * Composites need a schema to describe their object payload, so theirs travels whatever shape it is.
 *
 * A leaf's travels only when it *is* a set of declared constraints, which is what the Act write path
 * refuses fills against — the agent has to be told them to pick a legal value instead of retrying
 * blindly. Anything else on a leaf stays off the wire, so a widget snapshot cannot smuggle arbitrary
 * JSON onto it.
 *
 * The test is the schema's shape, never the element's kind: `type === 'number'` would drop every
 * textual leaf's constraints (a `maxlength` leaf is wire type `text`) while accepting any JSON at all
 * on a numeric one, and enforcing a constraint the wire dropped is the one thing this contract
 * forbids.
 */
function allowsValueSchema(capture: FzAssistantCapturedElement): boolean {
  return capture.isComposite === true || isFzAssistantDeclaredConstraintSchema(capture.value_schema);
}

function serializeHostAction(action: FzAssistantHostAction): FzAssistantHostAction {
  const serialized: FzAssistantHostAction = {
    id: action.id,
  };

  assignDefined(serialized, [
    ['enabled', action.enabled],
    ['disabled_reason', action.disabled_reason !== '' ? action.disabled_reason : undefined],
    ['args_schema', action.args_schema !== undefined && !isEmptyObject(action.args_schema) ? action.args_schema : undefined],
    ['requires_confirmation', action.requires_confirmation === true ? true : undefined],
  ]);

  return serialized;
}

function assignDefined<TTarget extends object>(
  target: TTarget,
  entries: ReadonlyArray<readonly [keyof TTarget, TTarget[keyof TTarget] | undefined]>,
): void {
  for (const [key, value] of entries) {
    if (value !== undefined) {
      target[key] = value;
    }
  }
}
