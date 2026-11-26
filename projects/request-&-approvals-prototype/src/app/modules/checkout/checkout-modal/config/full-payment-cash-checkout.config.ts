import type { CheckoutContext, CheckoutStepId } from '../models/checkout.model';
import { requiresCashTenderedCapture } from '../utils/checkout-cash-tendered.util';
import { canConfirmCheckoutMethod } from '../utils/checkout-payment.util';
import { checkoutPaymentProgress } from '../utils/checkout-progress.util';
import { checkoutSteps, hasNoRecordedPayments, type CheckoutModalConfig } from './checkout-flow.shared';

function fullPaymentCashInitialStepTarget(context: CheckoutContext): CheckoutStepId {
  if (!canConfirmCheckoutMethod(context)) {
    return 'methodSelection';
  }
  return requiresCashTenderedCapture(context) ? 'cashCapture' : 'processing';
}

export const fullPaymentCashCheckoutConfig: CheckoutModalConfig = {
  initialStepId: fullPaymentCashInitialStepTarget,
  progress: checkoutPaymentProgress,
  steps: {
    ...checkoutSteps,
    cashCapture: {
      ...checkoutSteps.cashCapture,
      actions: [
        {
          id: 'cancel',
          intent: 'cancel',
          kind: 'secondary',
          labelKey: 'common.cancel',
          placement: 'leading',
          sentiment: 'danger',
          visibleWhen: hasNoRecordedPayments,
        },
        ...checkoutSteps.cashCapture.actions.filter(action => action.id !== 'back'),
      ],
    },
    methodSelection: {
      ...checkoutSteps.methodSelection,
      actions: [
        { id: 'cancel', intent: 'cancel', kind: 'secondary', labelKey: 'common.cancel', placement: 'leading' },
        {
          enabledWhen: canConfirmCheckoutMethod,
          id: 'confirm',
          intent: 'confirm',
          kind: 'primary',
          labelKey: 'checkout.split.confirmPayment',
        },
      ],
    },
    paymentFailed: {
      ...checkoutSteps.paymentFailed,
      actions: checkoutSteps.paymentFailed.actions.filter(action => action.id !== 'back'),
    },
  },
};
