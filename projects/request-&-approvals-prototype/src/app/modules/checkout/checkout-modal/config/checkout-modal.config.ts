import { checkoutPaymentProgress } from '../utils/checkout-progress.util';
import { checkoutSteps, type CheckoutModalConfig } from './checkout-flow.shared';

export const checkoutModalConfig: CheckoutModalConfig = {
  initialStepId: 'flowSelection',
  progress: checkoutPaymentProgress,
  steps: checkoutSteps,
};
