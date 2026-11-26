export type KioskHomeStatus = 'loading' | 'ready' | 'stalled' | 'error';

export interface KioskHomeDiagnostics {
  isOnline: boolean;
  reason: string;
  serial: string;
}
