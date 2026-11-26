export interface DualScreenData {
  versionApp: string;
  deviceName?: string;
  hasNFC?: boolean;
  androidId?: string;
  entryPointClient?: string;
  /** Hardware serial number the Android app reads from the device; empty when it cannot read one. */
  serial?: string;
}
