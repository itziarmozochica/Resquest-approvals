import { CartAdjustmentPriceCalculation, CartAdjustmentPriceOperation } from '../../cart/models/cart-adjustment-price.model';
import { Money } from '../money.model';

/** How the staff member entered a manual price. `amount` is always per ticket: the change per ticket or the percentage. */
export interface CartSessionManualPriceEntry {
  amount: number;
  calculation: CartAdjustmentPriceCalculation;
  operation: CartAdjustmentPriceOperation;
}

export interface CartSessionManualPriceAuthor {
  id: number | null;
  name: string | null;
}

/** A manual price per ticket set on a ticket type of a reservation cart (GAME-1722). */
export interface CartSessionManualPrice {
  concept: string;
  /** Null when the backend holds an entry this client cannot edit (a `final` price set elsewhere). */
  entry: CartSessionManualPriceEntry | null;
  setBy: CartSessionManualPriceAuthor | null;
  unitPrice: Money;
}

export interface CartSessionManualPriceData {
  amount: number;
  calculation: string;
  catalog_ticket_price: Money | null;
  concept: string;
  operation: string | null;
  ticket_price: Money;
  set_at?: string | null;
  set_by?: { id: number | null; name: string | null } | null;
}

export interface CartManualPriceRequestBody {
  amount: number;
  calculation: CartAdjustmentPriceCalculation;
  concept: string;
  operation: CartAdjustmentPriceOperation;
  session_id: number;
}

export interface CartB2bEmployeeRequestBody {
  email: string;
  id: number;
  name: string;
  username: string;
}

/** A manual price as the editor applies it: the validated entry and the trimmed reason. */
export interface CartSessionManualPriceChange {
  concept: string;
  entry: CartSessionManualPriceEntry;
}

/** What the editor holds while the staff member types: the amount is empty until a number is typed. */
export interface CartSessionManualPriceDraft {
  amount: number | null;
  calculation: CartAdjustmentPriceCalculation;
  concept: string;
  operation: CartAdjustmentPriceOperation;
}

export enum ManualPriceEntryError {
  AmountAboveLimit = 'amountAboveLimit',
  AmountInvalid = 'amountInvalid',
  ConceptRequired = 'conceptRequired',
  PercentageAboveLimit = 'percentageAboveLimit',
  PriceAboveLimit = 'priceAboveLimit',
  ReductionAboveCatalogue = 'reductionAboveCatalogue',
}

export interface ManualPriceEntryErrors {
  amount: ManualPriceEntryError | null;
  concept: ManualPriceEntryError | null;
}

/** Backend bounds (fever2 GAME-1860): `amount` refused above this value (entry invalid, code 116). */
export const manualPriceAmountLimit = 9999999.99;

/** Backend bounds (fever2 GAME-1860): `manual_ticket_price` refused by the schema above this value. */
export const manualUnitPriceLimit = 99999999.99;

export const manualPriceDecimalPlaces = 2;

/**
 * Cart status codes (`24` cart, `01` create, `03` update, `08` prepare) of a refused manual price (fever2 GAME-1722 spec 6.2):
 * 114 channel not allowed, 115 mixed prices, 116 reason missing or entry invalid, 117 acting employee missing, 118 session type
 * not supported, 119 exclusive with the cart adjustment. The quote creation (`130` quote, `01` create, GAME-2062) answers the
 * same reasons 115 to 119.
 */
export const manualPriceRefusalCodes: readonly number[] = [
  24010114, 24010115, 24010116, 24010117, 24010118, 24030114, 24030115, 24030116, 24030117, 24030118, 24030119, 24080119, 130010115,
  130010116, 130010117, 130010118, 130010119,
];
