import { isEmptyObject } from '@fz-original/app/app/utils/ts/ts.util';
import { parseFzAssistantHtmlNonNegativeInteger } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-html-attribute-number.util';
import { readFzAssistantNativeControlKind } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';

/** The JSON Schema `format` an input type is exactly equivalent to. */
export type FzAssistantTextFormat = 'email' | 'uri';

/**
 * The textual constraints a control declares *and* the write path refuses on.
 *
 * Length is here because nothing else enforces it: `validity.tooLong` and `tooShort` are gated on the
 * dirty value flag, so a programmatic write past `maxlength` leaves the control `valid` and the fill
 * would be reported as a success. `pattern` and `format` are the browser's own verdict.
 */
export interface FzAssistantTextConstraints {
  format?: FzAssistantTextFormat;
  /** `type="email" multiple`: the value is a list, so no single-value `format` describes it. */
  isList?: true;
  maxLength?: number;
  minLength?: number;
  /** As authored. HTML anchors the expression, JSON Schema `pattern` does not — see the schema mapper. */
  pattern?: string;
}

const FORMAT_BY_INPUT_TYPE = new Map<string, FzAssistantTextFormat>([
  ['email', 'email'],
  ['url', 'uri'],
]);

/**
 * The single reading of a textual control's declared constraints, for Discover and Act alike.
 *
 * `undefined` means "not a textual control". A textual control with nothing declared reads as an empty
 * set of constraints, which is not the same thing.
 */
export function readFzAssistantTextConstraints(element: Element): FzAssistantTextConstraints | undefined {
  if (element instanceof HTMLTextAreaElement) {
    return readLengthConstraints(element);
  }

  // Kind `text`, not the `password` kind beside it: Act refuses secret fields outright, so nothing
  // about one is enforced and nothing about one may be published.
  if (!(element instanceof HTMLInputElement) || readFzAssistantNativeControlKind(element) !== 'text') {
    return undefined;
  }

  const inputType = element.type.toLowerCase();
  const pattern = readPattern(element);
  const isList = inputType === 'email' && element.hasAttribute('multiple');
  const format = isList ? undefined : FORMAT_BY_INPUT_TYPE.get(inputType);

  return {
    ...readLengthConstraints(element),
    ...(format !== undefined ? { format } : {}),
    ...(isList ? { isList: true as const } : {}),
    ...(pattern !== undefined ? { pattern } : {}),
  };
}

/**
 * Whether the control's current value satisfies the constraints, by the same reading Discover
 * published them from.
 *
 * `pattern` and `format` are delegated to the browser, which owns the arithmetic that turns a control
 * `:invalid`; both flags are set only by a declared constraint, so neither can refuse something
 * Discover left off the wire. Length is compared here, for the reason on
 * {@link FzAssistantTextConstraints}.
 */
export function satisfiesFzAssistantTextConstraints(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  const constraints = readFzAssistantTextConstraints(element);
  if (constraints === undefined) {
    return true;
  }

  const { patternMismatch, typeMismatch } = element.validity;
  if (patternMismatch || typeMismatch) {
    return false;
  }

  return isWithinDeclaredLength(element.value, constraints);
}

/**
 * The constraints as JSON Schema keywords, so the agent can pick a legal value instead of retrying
 * blindly against a write path that refuses the illegal ones.
 *
 * `pattern` is anchored on the way out: HTML matches the expression against the *whole* value, JSON
 * Schema matches anywhere in it. Publishing `[a-z]+` unanchored would advertise `A1b` as legal on a
 * control that refuses it.
 *
 * A list of addresses (`type="email" multiple`) has no keyword — `format: 'email'` describes one
 * address, not a comma-separated list of them — so it travels as `description`, the same fallback an
 * offset numeric grid uses.
 */
export function toFzAssistantTextSchema(constraints: FzAssistantTextConstraints | undefined): Record<string, unknown> | undefined {
  if (constraints === undefined) {
    return undefined;
  }

  const { format, isList, maxLength, minLength, pattern } = constraints;
  const schema: Record<string, unknown> = {
    ...(format !== undefined ? { format } : {}),
    ...(isList === true ? { description: 'Accepted values are email addresses, separated by commas.' } : {}),
    ...(maxLength !== undefined ? { maxLength } : {}),
    ...(minLength !== undefined ? { minLength } : {}),
    ...(pattern !== undefined ? { pattern: anchorPattern(pattern) } : {}),
  };

  return isEmptyObject(schema) ? undefined : { type: 'string', ...schema };
}

function isWithinDeclaredLength(value: string, constraints: FzAssistantTextConstraints): boolean {
  const { maxLength, minLength } = constraints;
  if (maxLength !== undefined && value.length > maxLength) {
    return false;
  }

  // HTML exempts an empty value from `minlength`, so a fill that clears the field is not a violation.
  return minLength === undefined || value.length === 0 || value.length >= minLength;
}

function readLengthConstraints(element: HTMLInputElement | HTMLTextAreaElement): FzAssistantTextConstraints {
  const maxLength = readLengthAttribute(element, 'maxlength');
  const minLength = readLengthAttribute(element, 'minlength');

  return {
    ...(maxLength !== undefined ? { maxLength } : {}),
    ...(minLength !== undefined ? { minLength } : {}),
  };
}

/**
 * Read from the attribute, never the `maxLength` property: the property reports the browser's own
 * default (524288) where the author declared nothing, which is not a constraint anyone chose.
 *
 * Parsed with HTML's lenient integer rules - see `parseFzAssistantHtmlNonNegativeInteger` - so
 * `maxlength="5px"` is the limit of 5 every engine applies rather than no limit at all. `Number()` read
 * `5px` and `2.5` as absent and `0x10` as 16, and that costs more here than a misread bound usually does:
 * `tooLong` and `tooShort` are gated on the dirty value flag, so this reading *is* the enforcement
 * (see {@link FzAssistantTextConstraints}). A limit read as absent is one the agent is invited past,
 * into a field the Partner could never have typed that much into.
 */
function readLengthAttribute(element: HTMLInputElement | HTMLTextAreaElement, attribute: 'maxlength' | 'minlength'): number | undefined {
  const declared = element.getAttribute(attribute);
  return declared === null ? undefined : parseFzAssistantHtmlNonNegativeInteger(declared);
}

/**
 * A `pattern` the browser cannot compile is one it ignores, so it reads as absent here too.
 *
 * HTML compiles it with the `v` flag, falling back to `u` in older engines, and the two reject different
 * expressions: `[[a-z]--[aeiou]]` compiles only under `v`, `[0-9()+-]` only under `u`. Trying both in that
 * order matches whichever the running browser used - testing one flag alone published patterns the browser
 * ignores, and dropped patterns it enforces.
 */
function readPattern(element: HTMLInputElement): string | undefined {
  const declared = element.getAttribute('pattern');
  if (declared === null || declared === '') {
    return undefined;
  }

  return isCompilablePattern(declared, 'v') || isCompilablePattern(declared, 'u') ? declared : undefined;
}

function isCompilablePattern(pattern: string, flag: 'u' | 'v'): boolean {
  try {
    new RegExp(pattern, flag);
    return true;
  } catch {
    return false;
  }
}

function anchorPattern(pattern: string): string {
  return `^(?:${pattern})$`;
}
