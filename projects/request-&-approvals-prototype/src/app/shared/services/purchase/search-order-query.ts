import { ValidationTypeEnum } from '../../../modules/validation/enums/validation-type.enum';

export interface SearchOrderQuery {
  partnerId: number;
  cartId?: string;
  channelId?: string;
  cityId?: number;
  code?: string;
  cursor?: string;
  email?: string;
  externalOrderId?: string;
  fullName?: string;
  hideFeverDiscount?: boolean;
  includeCancellableItems?: boolean;
  includeNotes?: boolean;
  includeOrderItems?: boolean;
  includePaymentNotes?: boolean;
  includePerItemTax?: boolean;
  includePhoneNumber?: boolean;
  includeReschedules?: boolean;
  includeReservationChannel?: boolean;
  includeUserCancellationRecords?: boolean;
  isScanned?: boolean;
  itemsPerPage?: number;
  orderId?: number;
  paymentCardNumberLast4Digits?: string;
  phoneNumber?: string;
  planId?: number;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  reservationId?: string;
  sessionDateFrom?: string;
  sessionDateTo?: string;
  ticketId?: number;
  ticketTypeSearch?: string;
  validationType?: ValidationTypeEnum;
  venueId?: number;
}
