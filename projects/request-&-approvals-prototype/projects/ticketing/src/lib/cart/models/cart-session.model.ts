import type { Money } from '../../core/models/money/money.model';
import type { CartSessionAdjustmentPrice } from './cart-adjustment-price.model';

export interface CartSessionType {
  readonly id: number;
  readonly isEntryPass?: boolean;
  readonly isShopProduct?: boolean;
  readonly label?: string;
  readonly ticketReceiptLabel?: string | null;
}

export interface CartSession {
  readonly sessionId: number;
  readonly units: number;
  readonly bundleDiscount?: Money | null;
  readonly hasSeating?: boolean;
  readonly isAddOn?: boolean;
  readonly isPack?: boolean;
  readonly isShopProduct?: boolean;
  readonly mainPlanId?: number;
  readonly overridePrices?: CartSessionAdjustmentPrice;
  readonly placeId?: number;
  readonly price?: Money | null;
  readonly seats?: readonly string[] | null;
  readonly sessionName?: string;
  readonly sessionNameWithoutFormat?: string;
  readonly sessionStartAt?: string;
  readonly sessionTimezone?: string;
  readonly sessionType?: CartSessionType;
  readonly sourceSessionTypeId?: number | null;
  readonly surchargePerTicket?: Money | null;
  readonly totalStrikethroughPrice?: Money;
  readonly totalSurchargePerTicket?: Money | null;
  readonly unitPrice?: Money | null;
  readonly userConfirmationMessages?: readonly string[] | null;
}
