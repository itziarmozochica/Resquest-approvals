import { ReservationCheckoutFlowTypeEnum } from '../../models/reservation-checkout-flow-type.enum';
import { ReservationCheckoutState } from '../../models/reservation-checkout-state.model';

export const reservationCheckoutStateInitial: ReservationCheckoutState = {
  reservationCart: null,
  selectedPaymentOption: null,
  plan: null,
  reservation: null,
  loadingCheckout: false,
  flowType: ReservationCheckoutFlowTypeEnum.BuyExistingReservation,
  paymentDone: false,
  externalReservationId: null,
};
