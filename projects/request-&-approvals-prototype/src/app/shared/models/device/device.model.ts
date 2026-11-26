export const enum DesktopOS {
  Linux = 'linux',
  MacOS = 'mac-os',
  Windows = 'windows',
  Unknown = 'unknown',
}

export const enum MobileOS {
  Android = 'android',
  iOS = 'ios',
  WindowsPhone = 'windows-phone',
  Unknown = 'unknown',
}

export type DeviceOS = DesktopOS | MobileOS;

export const enum DeviceType {
  Desktop = 'desktop',
  Tablet = 'tablet',
  Mobile = 'mobile',
  DualScreen = 'dual-screen',
  MobilePos = 'mobile-pos',
  Kiosk = 'kiosk',
}

export enum FeverzoneDeviceType {
  desktop = 'desktop',
  dual_screen = 'dual_screen',
  mobile_pos = 'mobile_pos',
}
