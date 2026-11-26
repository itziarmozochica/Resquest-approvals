import { CartAdjustmentPriceOperation } from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { SeatInfo } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seat-info.model';

export interface SessionItemData {
  session_id: number;
  ticket_number: number;
  seats?: Array<{
    label: string;
    reference: string;
  }>;
}

export interface SessionAdjustment {
  amount: number;
  calculation: string;
  operation: CartAdjustmentPriceOperation;
  concept: string;
}

export class SessionItem {
  constructor(
    public sessionId: number,
    public ticketNumber: number,
    public seats?: SeatInfo[],
  ) {}

  clone(): SessionItem {
    return new SessionItem(this.sessionId, this.ticketNumber, this.seats);
  }
}
