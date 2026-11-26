export interface KioskState {
  isKioskRoute: boolean;
  kioskDataReady: boolean;
  // B2BO-7917: set by the kiosk date selector; read by the order confirmation to stay consistent.
  hideSingleSessionStartTime: boolean;
}
