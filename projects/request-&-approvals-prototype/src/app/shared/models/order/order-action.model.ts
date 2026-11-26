import { OrderAction } from '@fz-original/app/shared/enums/order-action.enum';

export interface OrderActionEvent {
  action: OrderAction;
  data?: {
    cartId?: string;
    codeIds?: number[];
    codes?: string[];
    noteCreatedAt?: string;
    noteDescription?: string;
    noteTitle?: string;
    orderId?: number;
    originalTicketEmail?: string;
    paymentGateway?: string;
    profileIds?: string[];
    recipientEmail?: string;
    reservationId?: string;
    serializedNoteMessage?: string;
    setupId?: string | null;
    ticketCount?: number;
    ticketId?: number;
  };
}
