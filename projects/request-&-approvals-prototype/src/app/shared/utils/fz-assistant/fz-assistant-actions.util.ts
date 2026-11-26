import { FzAssistantActOp, FzAssistantElementType } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

/** Ops the agent may assume from `type` alone — omit these from wire `available_actions`. */
export const IMPLIED_ACTIONS_BY_TYPE: Readonly<Record<FzAssistantElementType, readonly FzAssistantActOp[]>> = {
  text: ['fill'],
  number: ['fill'],
  // checkbox/switch: idempotent fill; radio: click. Unsupported fill fails at runtime via fill_not_supported.
  boolean: ['fill', 'click'],
  date: ['fill'],
  time: ['fill'],
  select: ['select'],
  select_many: ['select_many'],
  tab: ['click'],
  button: ['click'],
  link: ['click'],
  // Capture-only embed — no agent act ops implied from type.
  iframe: [],
};

/**
 * Wire-boundary helper: returns only actions not implied by `type`. Empty / fully-implied
 * lists become `undefined` so the agent payload can omit the field. Capture keeps the
 * widget-reported list intact for act capability checks.
 */
export function deriveAvailableActions(
  type: FzAssistantElementType,
  actions?: readonly FzAssistantActOp[],
): FzAssistantActOp[] | undefined {
  if (actions === undefined || actions.length === 0) {
    return undefined;
  }

  const implied = new Set<FzAssistantActOp>(IMPLIED_ACTIONS_BY_TYPE[type]);
  const extras = new Set<FzAssistantActOp>();

  for (const action of actions) {
    if (!implied.has(action)) {
      extras.add(action);
    }
  }

  return extras.size > 0 ? [...extras] : undefined;
}

/**
 * Ops the agent may assume from `type` when capture omits `available_actions` (natives /
 * unspecified widgets). Capture still keeps the full supported set when a snapshot provides
 * one — this is not "strip at capture; act always reconstructs".
 */
export function getImpliedActionsForType(type: FzAssistantElementType): readonly FzAssistantActOp[] {
  return IMPLIED_ACTIONS_BY_TYPE[type] ?? [];
}
