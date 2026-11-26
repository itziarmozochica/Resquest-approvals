import { FilterDateRange } from '@fz-original/app/shared/layout/filters/date-range/date-range.interface';

export interface OrderFiltersPanelState {
  channel?: string | null;
  channelType?: string | null;
  eventDateRange?: FilterDateRange | null;
  fullName?: string | null;
  orderId?: number | null;
  paymentCardNumberLast4Digits?: string | null;
  purchaseDateRange?: FilterDateRange | null;
  seatLabelSearch?: string | null;
  ticketTypeSearch?: string | null;
}
