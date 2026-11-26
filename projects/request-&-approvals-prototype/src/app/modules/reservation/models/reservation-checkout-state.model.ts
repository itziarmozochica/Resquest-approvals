import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

import { PaymentOption } from './payment-option.enum';
import { ReservationCheckoutFlowTypeEnum } from './reservation-checkout-flow-type.enum';
import { Reservation } from './reservation.model';

export interface ReservationCheckoutState {
  flowType: ReservationCheckoutFlowTypeEnum;
  loadingCheckout: boolean;
  plan: Plan | null;
  reservation: Reservation | null;
  reservationCart: Cart | null;
  selectedPaymentOption: PaymentOption | null;
  paymentDone: boolean;
  externalReservationId: string | null;
}
