import { isEmptyObject } from '@fz-original/app/app/utils/ts/ts.util';
import { parseFzAssistantHtmlNumber } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-html-attribute-number.util';
import {
  isFzAssistantNumericKind,
  readFzAssistantNativeControlKind,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';

/**
 * The step grid a numeric control actually enforces.
 *
 * HTML anchors the grid at a base of its own (`min`, else `value`, else 0), so the grid is a base
 * *and* a step. JSON
 * Schema `multipleOf` is anchored at zero and cannot express an offset one, which is why the two
 * are kept apart here instead of collapsed into a single number.
 */
export interface FzAssistantNumericGrid {
  /** HTML's step base: the `min` attribute, else the `value` attribute, else 0. */
  base: number;
  /** Always greater than 0. */
  step: number;
}

export interface FzAssistantNumericConstraints {
  /** Absent when the control enforces no grid: `step="any"`, or a bare `number` with no `step`. */
  grid?: FzAssistantNumericGrid;
  maximum?: number;
  minimum?: number;
}

const RANGE_IMPLICIT_MINIMUM = 0;
const RANGE_IMPLICIT_MAXIMUM = 100;
const RANGE_IMPLICIT_STEP = 1;

/** What HTML anchors the grid at when neither `min` nor `value` declares a base. */
const DEFAULT_STEP_BASE = 0;

// `min` / `step` come off attributes as decimals, so exact division is not available: 0.3 / 0.1 is
// 2.9999999999999996. Wide enough to absorb that, far tighter than any grid an author declares.
const GRID_TOLERANCE = 1e-8;

/**
 * The single reading of a numeric control's declared constraints, for Discover and Act alike.
 *
 * The two sides used to decide independently whether a `step` was a constraint worth honouring, and
 * they disagreed: capture published `multipleOf` only for a grid that coincided with a zero-based
 * one, while the write path refused every declared step, offset grids included. The agent was then
 * refused on a grid it had never been told about. Reading the constraints once keeps the answers
 * aligned, whatever either side decides to do with them.
 *
 * `undefined` means "not a numeric control". A numeric control with nothing declared reads as an
 * empty set of constraints, which is not the same thing.
 */
export function readFzAssistantNumericConstraints(element: Element): FzAssistantNumericConstraints | undefined {
  if (!(element instanceof HTMLInputElement) || !isFzAssistantNumericKind(readFzAssistantNativeControlKind(element))) {
    return undefined;
  }

  const isRange = element.type.toLowerCase() === 'range';
  const declaredMinimum = readNumericAttribute(element, 'min');
  const minimum = declaredMinimum ?? (isRange ? RANGE_IMPLICIT_MINIMUM : undefined);
  const maximum = readNumericAttribute(element, 'max') ?? (isRange ? RANGE_IMPLICIT_MAXIMUM : undefined);
  const step = readEffectiveStep(element, isRange);

  return {
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
    ...(step !== undefined ? { grid: { base: readStepBase(element, declaredMinimum), step } } : {}),
  };
}

/** Whether `value` sits on the grid, by the same arithmetic that decides what Discover publishes. */
export function isFzAssistantOnNumericGrid(value: number, grid: FzAssistantNumericGrid): boolean {
  const quotient = (value - grid.base) / grid.step;
  if (!Number.isFinite(quotient)) {
    return false;
  }

  return Math.abs(quotient - Math.round(quotient)) <= GRID_TOLERANCE;
}

/**
 * Whether the control's current value satisfies the constraints, by the same reading Discover
 * published them from.
 *
 * Membership in the grid stays with `stepMismatch`: the browser owns the arithmetic that turns a
 * control `:invalid`, and reporting a fill it considers off-grid as a success would hand back a form
 * only the user can repair. Whether a declared `step` is a grid at all comes from the reader above,
 * so this cannot refuse a grid Discover left off the wire.
 */
export function satisfiesFzAssistantNumericConstraints(element: HTMLInputElement): boolean {
  const { rangeOverflow, rangeUnderflow, stepMismatch } = element.validity;
  if (rangeOverflow || rangeUnderflow) {
    return false;
  }

  return !stepMismatch || readFzAssistantNumericConstraints(element)?.grid === undefined;
}

/**
 * The constraints as JSON Schema keywords, so the agent can pick a legal value instead of retrying
 * blindly against a write path that refuses the illegal ones.
 *
 * A grid that contains zero is exactly a `multipleOf`. An offset one (`min="1"` `step="2"`) has no
 * keyword: `multipleOf: 2` would send the agent after 2, 4, 6 — every one of them refused — and
 * hide 1, 3, 5, which are accepted. It travels as `description` instead, because the constraint
 * still has to reach the agent that will be held to it.
 */
export function toFzAssistantNumericSchema(constraints: FzAssistantNumericConstraints | undefined): Record<string, unknown> | undefined {
  if (constraints === undefined) {
    return undefined;
  }

  const { grid, maximum, minimum } = constraints;
  const schema: Record<string, unknown> = {
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
  };

  if (grid !== undefined) {
    if (isFzAssistantOnNumericGrid(0, grid)) {
      schema['multipleOf'] = grid.step;
    } else {
      schema['description'] = `Accepted values are ${grid.base} plus any whole multiple of ${grid.step}.`;
    }
  }

  return isEmptyObject(schema) ? undefined : { type: 'number', ...schema };
}

/**
 * A `step` counts only where it is a constraint someone chose: an author-declared numeric one, or a
 * `range` whose implicit step is a real UI constraint the browser snaps the thumb to. `step="any"`
 * opts out of the grid on both. A bare `type="number"` also carries an implicit `step="1"`, but
 * decimal fields (prices, weights) routinely never override it, so honouring that default would
 * refuse every fractional fill — and, on the Discover side, advertise a grid the field does not want.
 */
function readEffectiveStep(element: HTMLInputElement, isRange: boolean): number | undefined {
  if (isHtmlStepAny(element)) {
    return undefined;
  }

  // A zero or negative `step` is one HTML rejects, and it falls back to the default rather than to no grid
  // at all - so on a `range` the implicit step still applies, and publishing nothing would hide a grid the
  // browser enforces. Read as absent, not as zero.
  const declaredStep = readNumericAttribute(element, 'step');

  return declaredStep !== undefined && declaredStep > 0 ? declaredStep : isRange ? RANGE_IMPLICIT_STEP : undefined;
}

/**
 * HTML's step base, in the order the spec resolves it: the `min` attribute, else the `value`
 * attribute, else 0. The `value` fallback is easy to miss and drifts exactly the way a missed `min`
 * does: `step="2" value="1"` accepts 1, 3, 5, so reading the base as 0 would publish `multipleOf: 2`
 * and send the agent after the values the browser refuses.
 *
 * Only the *attribute* counts, never the current `.value` property, which is what a fill moves. The
 * browser anchors the grid the same way, so the grid a control published stays the grid it enforces
 * however many times the agent writes to it.
 *
 * `minimum` is passed in rather than re-read so an implicit `range` bound cannot reach the base: 0
 * is the right answer for a bare `range`, but by way of the default base, not by way of a `min` the
 * author never wrote.
 */
function readStepBase(element: HTMLInputElement, minimum: number | undefined): number {
  return minimum ?? readNumericAttribute(element, 'value') ?? DEFAULT_STEP_BASE;
}

/**
 * The number the browser reads off the attribute, or `undefined` where it reads none, so no side
 * claims a constraint the control does not apply.
 *
 * `min`, `max`, `step` and the step base are all held to HTML's strict number grammar - see
 * `parseFzAssistantHtmlNumber` for the forms every engine ignores, and why `Number()` was not that
 * reading. Length attributes are the lenient half and live in the same file, next to this one.
 */
function readNumericAttribute(element: HTMLInputElement, attribute: 'min' | 'max' | 'step' | 'value'): number | undefined {
  const declared = element.getAttribute(attribute);
  return declared === null ? undefined : parseFzAssistantHtmlNumber(declared);
}

/**
 * `any` is matched as authored, not trimmed. HTML compares the attribute against `any` ASCII
 * case-insensitively and with no trimming, which Chromium, Firefox and WebKit all bear out: `ANY` opts
 * out, ` any ` and `any ` do not, and both fall back to the default step instead. So ` any ` is a grid
 * on a `range`, and trimming here opted a slider out of one the browser enforces - while the write path
 * reports an off-grid fill as applied wherever this reader says there is no grid to be off.
 *
 * On a `number` it stays no grid, by the same decision that ignores a bare `number`'s implicit step
 * (`readEffectiveStep`): this only settles what `any` means, not which steps count.
 */
function isHtmlStepAny(element: HTMLInputElement): boolean {
  const declared = element.getAttribute('step');
  return declared !== null && declared.toLowerCase() === 'any';
}
