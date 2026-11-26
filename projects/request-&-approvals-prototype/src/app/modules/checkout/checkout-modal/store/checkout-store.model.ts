import type { MultiStepNavigationState } from '@fz-original/app/shared/multi-step-modal/store/multi-step-navigation.model';

import { DEFAULT_CHECKOUT_FLOW_TYPES, type CheckoutContext, type CheckoutStepId } from '../models/checkout.model';

export interface CheckoutStoreState extends MultiStepNavigationState<CheckoutStepId> {
  context: CheckoutContext;
}

export const initialCheckoutState: CheckoutStoreState = {
  context: {
    activePaymentResend: false,
    availableFlowTypes: DEFAULT_CHECKOUT_FLOW_TYPES,
    availableMethods: [],
    availableTerminals: [],
    cancelFailureReason: null,
    calculatorReceivedAmount: null,
    cartItems: [],
    cartTotal: null,
    cashCaptureMode: 'optional',
    currentSplitIndex: 0,
    flowType: null,
    legInFlight: false,
    locale: 'en-US',
    paidAmount: null,
    paidItemIds: [],
    paymentFailureReason: null,
    paymentLink: null,
    paymentLinkDuration: '',
    paymentLinkErrorKey: null,
    paymentLinkSelected: false,
    paymentStarted: false,
    payRemaining: false,
    pendingReturnStepId: null,
    resendRequested: false,
    selectedItemIds: [],
    selectedMethod: null,
    selectedMethodDelegated: null,
    selectedTerminalId: null,
    sessionPaidAmount: null,
    splitAmountOverride: null,
    splitCount: 0,
    tapToPay: false,
    tapToPayCancelRequested: false,
    transactions: [],
  },
  currentStepId: null,
  history: [],
};
