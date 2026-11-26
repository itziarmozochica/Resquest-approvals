import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosShiftEndedData {
  /**
   * Whether a person actually counted the drawer, i.e. the end-shift modal asked for a final
   * amount and they answered. `false` when the cashless flow closed the shift at 0 on their behalf.
   *
   * Without this, an attested zero and an auto-closed zero are byte-identical downstream, and a
   * cash discrepancy months later cannot be narrowed to the shifts nobody counted.
   */
  cashCounted: boolean;
  durationMinutes: number;
  transactionCount: number;
}

export const posShiftEnded = defineEvent<PosShiftEndedData>('pos.shift.ended');
