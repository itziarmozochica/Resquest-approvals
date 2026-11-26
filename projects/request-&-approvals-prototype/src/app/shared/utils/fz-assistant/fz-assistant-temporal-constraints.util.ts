import {
  isFzAssistantTemporalKind,
  readFzAssistantNativeControlKind,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';

/**
 * The bounds a temporal control declares *and* the write path refuses on.
 *
 * Bounds only. HTML's `step` on these types is a grid whose unit changes per type - seconds for
 * `time`, months for `month`, days for `date` - and `week` anchors it at 1970-01-05 rather than at
 * `min`. Enforcing that would oblige us to describe it correctly to the agent, so both the
 * enforcement and the disclosure are left out together: consistent, and honest about the gap.
 */
export interface FzAssistantTemporalConstraints {
  /** As authored, in the control's own value syntax. */
  maximum?: string;
  minimum?: string;
}

/**
 * The single reading of a temporal control's declared bounds, for Discover and Act alike.
 *
 * `undefined` means "not a temporal control". One with nothing declared reads as an empty set of
 * constraints, which is not the same thing.
 */
export function readFzAssistantTemporalConstraints(element: Element): FzAssistantTemporalConstraints | undefined {
  if (!(element instanceof HTMLInputElement)) {
    return undefined;
  }

  const inputType = element.type.toLowerCase();
  if (!isFzAssistantTemporalKind(readFzAssistantNativeControlKind(element))) {
    return undefined;
  }

  const minimum = readTemporalAttribute(element, inputType, 'min');
  const maximum = readTemporalAttribute(element, inputType, 'max');

  return {
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
  };
}

/**
 * Whether the control's current value sits inside the declared bounds.
 *
 * The browser owns the comparison - date arithmetic across five value syntaxes is not worth
 * reimplementing - and it reports these two flags for every temporal type, so a fill that would
 * leave the control `:invalid` is refused here exactly as it is on `number`.
 */
export function satisfiesFzAssistantTemporalConstraints(element: HTMLInputElement): boolean {
  const { rangeOverflow, rangeUnderflow } = element.validity;

  return !rangeOverflow && !rangeUnderflow;
}

/**
 * The bounds as prose, because JSON Schema has no keyword for them: `minimum` / `maximum` are numeric
 * comparisons, and the value here is a string. `format` is left off too - the wire `type` already
 * says `date` or `time`, and `date-time` would advertise the RFC 3339 offset that a
 * `datetime-local` control refuses.
 */
export function toFzAssistantTemporalSchema(constraints: FzAssistantTemporalConstraints | undefined): Record<string, unknown> | undefined {
  if (constraints === undefined) {
    return undefined;
  }

  const { maximum, minimum } = constraints;
  const description = describeBounds(minimum, maximum);

  return description === undefined ? undefined : { type: 'string', description };
}

function describeBounds(minimum: string | undefined, maximum: string | undefined): string | undefined {
  if (minimum !== undefined && maximum !== undefined) {
    return `Accepted values run from ${minimum} to ${maximum}.`;
  }

  if (minimum !== undefined) {
    return `Accepted values are ${minimum} or later.`;
  }

  return maximum !== undefined ? `Accepted values are ${maximum} or earlier.` : undefined;
}

/**
 * A bound the browser cannot parse is one it ignores, so it reads as absent here too - and the only
 * reliable parser for five value syntaxes is the browser itself, which sanitizes a value it cannot read
 * to the empty string.
 *
 * What comes back is the browser's *sanitized* form, and that is what travels: `datetime-local` trims a
 * trailing `:00`, so requiring the raw attribute to round-trip would drop a bound the control still
 * enforces through `rangeUnderflow` - Act refusing a constraint Discover never disclosed, which is the
 * one thing this pairing exists to prevent. The normalized form is also the one the agent should send.
 */
function readTemporalAttribute(element: HTMLInputElement, inputType: string, attribute: 'min' | 'max'): string | undefined {
  const declared = element.getAttribute(attribute);
  if (declared === null || declared.trim() === '') {
    return undefined;
  }

  const probe = element.ownerDocument.createElement('input');
  probe.type = inputType;
  probe.value = declared;

  return probe.value === '' ? undefined : probe.value;
}
