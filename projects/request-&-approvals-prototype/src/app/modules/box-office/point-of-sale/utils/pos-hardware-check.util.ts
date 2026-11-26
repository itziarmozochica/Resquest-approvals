import {
  PosHardwareCheckOutcome,
  type PosHardwareCheckResult,
  type PosHardwareMismatchCheckResult,
  type PosHardwareOverrideVariable,
} from '../models/pos-hardware-check.model';

/**
 * `override.until` while `now` is before it. A missing variable, a missing `until` or a value `Date`
 * cannot parse means no window, and so does the deadline itself: the window is closed at that instant.
 */
export function resolveOpenHardwareOverrideDeadline(override: unknown, now: number): string | null {
  if (!isHardwareOverrideVariable(override)) {
    return null;
  }
  const until = Date.parse(override.until);
  return !Number.isNaN(until) && now < until ? override.until : null;
}

export function isHardwareMismatch(hardwareCheck: PosHardwareCheckResult): hardwareCheck is PosHardwareMismatchCheckResult {
  return (
    (hardwareCheck.outcome === PosHardwareCheckOutcome.blocked || hardwareCheck.outcome === PosHardwareCheckOutcome.mismatchOverridable) &&
    hardwareCheck.setupHardwareType !== null
  );
}

function isHardwareOverrideVariable(override: unknown): override is PosHardwareOverrideVariable {
  return typeof override === 'object' && override !== null && 'until' in override && typeof override.until === 'string';
}
