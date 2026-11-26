import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalSessionSnapshotData {
  checkoutSessionId: string;
  durationMs: number;
  flowType: string | null;
  intents: string[];
  legsCompleted: number;
  methodSequence: string[];
  outcome: 'completed' | 'abandoned' | 'payment_link_sent' | 'session_cancelled';
  path: string;
}

export const posCheckoutModalSessionSnapshot = defineEvent<PosCheckoutModalSessionSnapshotData>('pos.checkout.modal.session.snapshot');
