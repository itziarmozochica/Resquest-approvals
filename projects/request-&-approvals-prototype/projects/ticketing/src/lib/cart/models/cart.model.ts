import type { Money } from '../../core/models/money/money.model';
import type { CartAdjustmentPrice } from './cart-adjustment-price.model';
import type { CartSessionItemLine } from './cart-session-item-line.model';
import type { CartSession } from './cart-session.model';
import type { CartTaxItem } from './cart-tax-item.model';

/** Key `sessionItemsByDatetime` groups shop-product lines under: they carry no session datetime. */
export const PRODUCTS_GROUP_KEY = 'products';

export interface Cart {
  readonly hasSeating: boolean;
  readonly hasSessionsInFuture: boolean;
  readonly sessionItemsByDatetime: ReadonlyMap<string, readonly CartSession[]>;
  readonly adjustment?: CartAdjustmentPrice | null;
  readonly confirmedAt?: string | null;
  readonly createdAt?: string | null;
  readonly id?: string;
  readonly isFlexibleBundle?: boolean;
  readonly locale?: string;
  readonly numberOfTickets?: number;
  readonly preparedAt?: string | null;
  readonly sessionItemLines?: readonly CartSessionItemLine[];
  readonly taxItems?: readonly CartTaxItem[];
  readonly timezone?: string;
  readonly total?: Money | null;
  readonly totalBundleDiscount?: Money | null;
  readonly totalSurcharge?: Money | null;
  readonly totalSurchargePerTicket?: Money | null;
  readonly totalTaxBase?: Money;
  readonly totalTicketsWithoutDiscounts?: Money | null;
  readonly totalWithoutDiscount?: Money | null;
  readonly totalWithoutOverride?: Money | null;
  readonly userConfirmationMessages?: readonly string[] | null;
}
