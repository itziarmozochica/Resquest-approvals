/** Normalize a configured step quantity to a safe positive integer step (defaults to 1). */
export function safeStepQuantity(stepQuantity: number | null | undefined): number {
  const step = stepQuantity ?? 1;
  return step > 0 ? step : 1;
}

/**
 * Largest quantity of the form `minimum + k * step` that does not exceed `maximum`.
 * Returns `Infinity` when there is no finite maximum.
 *
 * These functions are a verbatim port of `src/app/shared/utils/ticket-step.util.ts` and validate no
 * input, so two preconditions belong to the caller (both pinned in the spec):
 * - `step` must be positive — normalise it with `safeStepQuantity` first. A `0` step makes the
 *   arithmetic `NaN`, so the result falls back to `minimum` and `stepUp` can never advance.
 * - `minimum <= maximum` — with an inverted pair `maximum` wins the final clamp, so the result is
 *   below `minimum` with no signal.
 */
export function stepAlignedMax(minimum: number, maximum: number | null | undefined, step: number): number {
  if (typeof maximum !== 'number' || !Number.isFinite(maximum)) {
    return Number.POSITIVE_INFINITY;
  }
  const result = minimum + step * Math.floor((maximum - minimum) / step);
  const safeResult = Number.isFinite(result) ? result : minimum;
  return Math.min(maximum, Math.max(minimum, safeResult));
}

/** Snap an arbitrary value to the nearest valid multiple within `[minimum, stepAlignedMax]`. */
export function snapToStep(value: number, minimum: number, maximum: number | null | undefined, step: number): number {
  const clamped = Math.max(minimum, Math.min(stepAlignedMax(minimum, maximum, step), value));
  const steps = Math.round((clamped - minimum) / step);
  const result = minimum + steps * step;
  return Number.isFinite(result) ? result : minimum;
}

/**
 * Next quantity when incrementing: from below the minimum jump to the minimum, otherwise snap any
 * off-step value to a valid multiple and add one step, clamped to the step-aligned maximum.
 */
export function stepUp(current: number, minimum: number, maximum: number | null | undefined, step: number): number {
  const snapped = current <= 0 ? 0 : snapToStep(current, minimum, maximum, step);
  const next = current < minimum ? minimum : snapped + step;
  return Math.min(next, stepAlignedMax(minimum, maximum, step));
}

/**
 * Next quantity when decrementing: snap any off-step value to a valid multiple then subtract one step,
 * collapsing to 0 once at or below the minimum.
 */
export function stepDown(current: number, minimum: number, maximum: number | null | undefined, step: number): number {
  const snapped = current <= 0 ? 0 : snapToStep(current, minimum, maximum, step);
  const next = snapped - step;
  return snapped <= minimum || next < minimum ? 0 : next;
}
