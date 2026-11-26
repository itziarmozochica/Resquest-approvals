import { CodeType } from './code-type.model';
import { OrderChannelType } from './order-channel-type.model';
import { Order } from './order.model';
import { TicketTimeGranularity } from './ticket-time-granularity.enum';

export const folioZeroCode = 'FOLIO0';

export interface PrintOrderInput {
  order: Order;
  isHidePriceEnabled?: boolean;
  isUnifiedTicket?: boolean;
}

export interface ResolvedPrintOrderInput {
  isHidePriceEnabled: boolean;
  isUnifiedTicket: boolean;
  order: Order;
}

export interface OnsitePlan {
  id: number;
  name: string;
  sessionSelectorType: string;
  termsAndConditionsQrImage: string;
}

export interface PrinterPricing {
  totalFirstRow: string;
  totalSecondRow: string;
}

export interface PrinterTicket {
  label: string;
  numberOfTickets: number;
  seats: string[];
  timeGranularity: TicketTimeGranularity | null;
  expiryDate?: string;
  holderName?: string;
  session_label?: string;
}

export interface PrinterSession {
  address: string;
  isoCountryCode: string;
  name: string;
  startsAtDate: string;
  startsAtDateShortFormat: string;
  startsAtTime: string;
  openGatesAt?: string | null;
  placeName?: string;
  timezone?: string;
}

export interface PrinterOrder {
  code: string;
  codeType: CodeType;
  createdAt: string;
  orderId: string;
  plan: OnsitePlan;
  pricing: PrinterPricing;
  session: PrinterSession;
  tickets: PrinterTicket[];
  totalOfTickets: number;
  channel?: OrderChannelType;
  placeId?: number;
  position?: number;
  ticketId?: number;
}

export interface PrinterOrderLabels {
  invitation: string;
  locale: string;
  surcharge: string;
  total: string;
  totalIncludedInPrice: string;
  vat: string;
  formatLoyaltyPoints: (points: number) => string;
}
