import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';

import { PrintDeviceHardwareType } from './print-block.model';

export enum PrintRouteType {
  legacy = 'legacy',
  revamped = 'revamped',
  skipped = 'skipped',
}

export enum PrintLegacyReason {
  device_not_migrated = 'device_not_migrated',
  flag_disabled = 'flag_disabled',
  flag_not_initialised = 'flag_not_initialised',
  plan_not_resolved = 'plan_not_resolved',
  printer_not_migrated = 'printer_not_migrated',
}

export interface PrintLegacyRoute {
  reason: PrintLegacyReason;
  type: PrintRouteType.legacy;
}

export interface PrintRevampedRoute {
  type: PrintRouteType.revamped;
}

export interface PrintSkippedRoute {
  type: PrintRouteType.skipped;
}

export type PrintRoute = PrintLegacyRoute | PrintRevampedRoute | PrintSkippedRoute;

export type PrintRouteFlag = FeatureFlags | Readonly<Partial<Record<PrintDeviceHardwareType, FeatureFlags>>>;
