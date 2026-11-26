import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCartClearedSource = 'button' | 'leave_fz' | 'leave_pos';

export interface PosCartClearedData {
  planId: number | null;
  source: PosCartClearedSource;
}

export const posCartCleared = defineEvent<PosCartClearedData>('pos.cart.cleared');
