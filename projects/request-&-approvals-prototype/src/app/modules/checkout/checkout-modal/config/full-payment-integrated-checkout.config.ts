import type { CheckoutContext, CheckoutStepId } from '../models/checkout.model';
import { canConfirmCheckoutMethod } from '../utils/checkout-payment.util';
import { checkoutPaymentProgress } from '../utils/checkout-progress.util';
import { checkoutSteps, type CheckoutModalConfig } from './checkout-flow.shared';

function fullPaymentIntegratedInitialStepTarget(context: CheckoutContext): CheckoutStepId {
  return canConfirmCheckoutMethod(context) ? 'processing' : 'methodSelection';
}

export const fullPaymentIntegratedCheckoutConfig: CheckoutModalConfig = {
  initialStepId: fullPaymentIntegratedInitialStepTarget,
  progress: checkoutPaymentProgress,
  steps: {
    ...checkoutSteps,
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
