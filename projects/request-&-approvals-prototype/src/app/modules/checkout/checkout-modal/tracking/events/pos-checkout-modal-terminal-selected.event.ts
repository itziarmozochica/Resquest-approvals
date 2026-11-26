import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalTerminalSelectedData {
  checkoutSessionId: string;
  paymentMethod: string | null;
  terminalId: string;
}

export const posCheckoutModalTerminalSelected = defineEvent<PosCheckoutModalTerminalSelectedData>('pos.checkout.modal.terminal.selected');
