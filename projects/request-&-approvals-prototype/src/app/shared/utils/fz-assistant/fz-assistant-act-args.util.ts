import {
  ActionStep,
  FZ_ASSISTANT_ACT_OPS,
  FzAssistantActOp,
  FzAssistantWireValue,
  isFzAssistantActOp,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

export type FzAssistantParsedActArgs = { ok: true; steps: ActionStep[] } | { ok: false; hint: string };

/**
 * The §3.5 shape check for `act` tool arguments, at the boundary where agent JSON arrives.
 *
 * The runner's `default` branch refuses an unknown `op`, but that is a backstop, not validation: by the
 * time a malformed step reaches it the run has already started, and a step missing its `ref` reaches
 * `#resolveTarget` as `undefined` rather than being refused for what it is. `INVALID_TOOL_ARGS` with a
 * hint naming the offending index is something the agent can act on; `rejected` on step 3 of 5 is not.
 *
 * Steps are **rebuilt** rather than cast, so a field the agent invented cannot ride along into the
 * runner — the returned objects carry exactly the keys §3.5 defines for that op.
 *
 * Shared with the Appendix A contract spec on purpose: a fixture that this rejects is a fixture the
 * binder would reject, and the two cannot drift into disagreeing about the wire.
 */
export function parseFzAssistantActArgs(args: Record<string, unknown>): FzAssistantParsedActArgs {
  const rawSteps = args['steps'];
  if (!Array.isArray(rawSteps)) {
    return { hint: 'act requires a "steps" array', ok: false };
  }

  const steps: ActionStep[] = [];
  for (const [index, rawStep] of rawSteps.entries()) {
    const parsed = parseActionStep(rawStep, index);
    if (parsed.ok === false) {
      return parsed;
    }

    steps.push(parsed.step);
  }

  // An empty list is allowed. It runs no steps and returns `completed` with a fresh `view_context`,
  // which is a legal - if roundabout - way for the agent to re-read the screen. Refusing it would be a
  // rule §3.5 does not have.
  return { ok: true, steps };
}

type ParsedActionStep = { ok: true; step: ActionStep } | { ok: false; hint: string };

function parseActionStep(raw: unknown, index: number): ParsedActionStep {
  if (!isRecord(raw)) {
    return fail(index, 'must be an object');
  }

  const op: unknown = raw['op'];
  if (!isFzAssistantActOp(op)) {
    return fail(index, `has an unknown "op"; expected one of ${FZ_ASSISTANT_ACT_OPS.join(', ')}`);
  }

  const confirmation = readConfirmationMessage(raw);
  if (confirmation.ok === false) {
    return fail(index, confirmation.reason);
  }

  return buildStep(raw, op, confirmation.fields, index);
}

function buildStep(
  raw: Record<string, unknown>,
  op: FzAssistantActOp,
  confirmation: { confirmation_message?: string },
  index: number,
): ParsedActionStep {
  switch (op) {
    case 'fill':
    case 'select':
    case 'select_many': {
      const ref = readString(raw, 'ref');
      if (ref === undefined) {
        return fail(index, `requires a string "ref" for op "${op}"`);
      }
      if (!('value' in raw)) {
        return fail(index, `requires a "value" for op "${op}"`);
      }

      const value: unknown = raw['value'];
      if (!isFzAssistantWireValue(value)) {
        return fail(index, `has a "value" that is not a string, number, boolean, string[], object or null`);
      }

      return { ok: true, step: { op, ref, value, ...confirmation } };
    }
    case 'click': {
      const ref = readString(raw, 'ref');

      return ref === undefined ? fail(index, 'requires a string "ref" for op "click"') : { ok: true, step: { op, ref, ...confirmation } };
    }
    case 'submit': {
      // §3.5: the only op whose `ref` is optional — a host-level submit addresses the Pathway B facade,
      // not a control. Present-but-not-a-string is still a malformed step.
      if ('ref' in raw && readString(raw, 'ref') === undefined) {
        return fail(index, 'has a "ref" that is not a string');
      }

      const ref = readString(raw, 'ref');

      return { ok: true, step: { op, ...(ref !== undefined ? { ref } : {}), ...confirmation } };
    }
    case 'trigger': {
      const actionId = readString(raw, 'action_id');
      if (actionId === undefined) {
        return fail(index, 'requires a string "action_id" for op "trigger"');
      }
      if ('args' in raw && !isRecord(raw['args'])) {
        return fail(index, 'has "args" that is not an object');
      }

      const triggerArgs = raw['args'];

      return {
        ok: true,
        step: { action_id: actionId, op, ...(isRecord(triggerArgs) ? { args: triggerArgs } : {}), ...confirmation },
      };
    }
    case 'navigate': {
      const route = readString(raw, 'route');

      return route === undefined
        ? fail(index, 'requires a string "route" for op "navigate"')
        : { ok: true, step: { op, route, ...confirmation } };
    }
    default: {
      // `isFzAssistantActOp` has already narrowed `op` to the frozen union, so this is unreachable;
      // the assignment is what makes adding an op a compile error here rather than a runtime gap.
      const unsupportedOp: never = op;

      return fail(index, `has an unsupported "op": ${String(unsupportedOp)}`);
    }
  }
}

type ConfirmationRead = { ok: true; fields: { confirmation_message?: string } } | { ok: false; reason: string };

function readConfirmationMessage(raw: Record<string, unknown>): ConfirmationRead {
  if (!('confirmation_message' in raw)) {
    return { fields: {}, ok: true };
  }

  const message = readString(raw, 'confirmation_message');

  return message === undefined
    ? { ok: false, reason: 'has a "confirmation_message" that is not a string' }
    : { fields: { confirmation_message: message }, ok: true };
}

function fail(index: number, reason: string): { ok: false; hint: string } {
  return { hint: `act steps[${index}] ${reason}`, ok: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(raw: Record<string, unknown>, key: string): string | undefined {
  const value: unknown = raw[key];

  return typeof value === 'string' ? value : undefined;
}

function isFzAssistantWireValue(value: unknown): value is FzAssistantWireValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item: unknown) => typeof item === 'string');
  }

  return isRecord(value);
}
