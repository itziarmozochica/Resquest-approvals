import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';
import { PaymentMethodSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

export interface KioskTransaction extends PaymentCheckoutTransaction {
  cart: Cart;
  partnerId: number;
  planId: number;
  planPlaceId: number;
}

export interface KioskCreateFreeOrderParams {
  cart: Cart;
  partnerId: number;
  planId: number;
  planPlaceId: number;
}

export interface KioskCreateOrderParams extends KioskCreateFreeOrderParams {
  paymentMethodSelected: PaymentMethodSetup;
}
