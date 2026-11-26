import { checkoutPaymentProgress } from '../utils/checkout-progress.util';
import { checkoutSteps, type CheckoutModalConfig } from './checkout-flow.shared';

export const fullPaymentCheckoutConfig: CheckoutModalConfig = {
  initialStepId: 'methodSelection',
  progress: checkoutPaymentProgress,
  steps: {
    ...checkoutSteps,
    methodSelection: {
      ...checkoutSteps.methodSelection,
      actions: checkoutSteps.methodSelection.actions.filter(action => action.id !== 'back'),
    },
  },
};
