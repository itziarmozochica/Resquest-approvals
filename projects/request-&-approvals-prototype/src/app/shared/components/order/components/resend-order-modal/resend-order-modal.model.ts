import { CartSession } from '../../../../models/cart/cart-session.model';

export interface ResendOrderModalData {
  canEditEmail: boolean;
  orderEmail: string;
  ticketSessions: CartSession[];
}

export interface ResendOrderModalResult {
  recipientEmail: string;
}
