import type { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import type { FeverzoneDeviceType } from '@fz-original/app/shared/models/device/device.model';

/**
 * Why the hardware check let a payment through, or did not. Evaluated on every pay attempt
 * regardless of the feature flag, so the flag only separates `blocked` and `mismatchOverridable`
 * from `mismatchNotEnforced`.
 */
export enum PosHardwareCheckOutcome {
  /** The setup contradicts the device and enforcement is on. */
  blocked = 'blocked',
  /** A mobile POS, which has no `hardware_type` counterpart to compare against. */
  deviceNotEnforceable = 'device_not_enforceable',
  matched = 'matched',
  /** The setup contradicts the device, but the feature flag is off. */
  mismatchNotEnforced = 'mismatch_not_enforced',
  /** The setup contradicts the device, enforcement is on, and the override window is still open. */
  mismatchOverridable = 'mismatch_overridable',
  noActiveSetup = 'no_active_setup',
  /** `hardware_type` is `unknown` or was never set, which is every setup until it is configured. */
  setupHardwareUnknown = 'setup_hardware_unknown',
}

/** What the operator did with the block or the warning. */
export enum PosHardwareCheckResolution {
  cancelled = 'cancelled',
  override = 'override',
  selectOnsiteSetup = 'select_onsite_setup',
}

/** The `override` JSON variable of the enforcement flag. Read as `unknown`: Optimizely does not validate its shape. */
export interface PosHardwareOverrideVariable {
  until: string;
}

export interface PosHardwareCheckResult {
  deviceHardwareType: FeverzoneDeviceType;
  isEnforcementEnabled: boolean;
  onsiteSetupId: string | null;
  outcome: PosHardwareCheckOutcome;
  /** `override.until` as configured, while the override window is open; `null` when there is no window. */
  overrideDeadline: string | null;
  setupHardwareType: HardwareTypeEnum | null;
}

/** A result that opens the mismatch modal: the block or the warning, always with a setup hardware type. */
export interface PosHardwareMismatchCheckResult extends PosHardwareCheckResult {
  outcome: PosHardwareCheckOutcome.blocked | PosHardwareCheckOutcome.mismatchOverridable;
  setupHardwareType: HardwareTypeEnum;
}
