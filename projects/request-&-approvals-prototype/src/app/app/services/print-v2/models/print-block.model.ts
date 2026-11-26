import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

export type PrintDeviceHardwareType = HardwareTypeEnum.desktop | HardwareTypeEnum.dual_screen;

export enum PrintBlockedReason {
  dual_screen_app_outdated = 'dual_screen_app_outdated',
  dual_screen_pdf_not_supported = 'dual_screen_pdf_not_supported',
  dual_screen_without_printer = 'dual_screen_without_printer',
  hardware_mismatch = 'hardware_mismatch',
  no_partner = 'no_partner',
  no_printable_orders = 'no_printable_orders',
}

export type PrintConfigurationBlockedReason = Exclude<PrintBlockedReason, PrintBlockedReason.hardware_mismatch>;

export interface PrintConfigurationBlock {
  reason: PrintConfigurationBlockedReason;
}

export interface PrintHardwareMismatchBlock {
  deviceHardwareType: PrintDeviceHardwareType;
  reason: PrintBlockedReason.hardware_mismatch;
  setupHardwareType: HardwareTypeEnum;
}

export type PrintBlock = PrintConfigurationBlock | PrintHardwareMismatchBlock;
