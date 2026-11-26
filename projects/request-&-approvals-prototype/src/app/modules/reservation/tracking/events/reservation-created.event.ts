import {
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceCalculationFinal,
  CartAdjustmentPriceOperation,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReservationCreatedData {
  emailProvided: boolean;
  /** Sent only with the manual price flag on, like the two fields below. */
  hasManualPrices?: boolean;
  hasOverride: boolean;
  itemsCount: number;
  manualPricedTicketTypes?: number;
  /** Catalogue total minus manual total of the lines with a manual price. */
  manualReductionTotal?: number;
  overrideAmount?: number;
  overrideOperation: CartAdjustmentPriceOperation | null;
  overrideType: CartAdjustmentPriceCalculation | CartAdjustmentPriceCalculationFinal | null;
  reservationExpirationDate: string | null;
  roundingAmount?: number;
  valueWithOverride?: number;
  valueWithoutOverride?: number;
}

export const reservationCreated = defineEvent<ReservationCreatedData>('reservation.created');
