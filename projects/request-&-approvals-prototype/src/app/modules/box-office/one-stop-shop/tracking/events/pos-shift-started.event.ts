import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosShiftStartedData {
  cashierId: number;
  setupId: string;
  venueId: number;
}

export const posShiftStarted = defineEvent<PosShiftStartedData>('pos.shift.started');
