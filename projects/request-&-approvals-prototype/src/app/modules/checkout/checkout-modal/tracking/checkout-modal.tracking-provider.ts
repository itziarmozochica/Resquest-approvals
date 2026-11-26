import { type Provider } from '@angular/core';

import { provideTracking, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { checkoutModalMixpanelMappers } from './checkout-modal.mixpanel.mappers';
import { CheckoutModalTrackingService } from './services/checkout-modal-tracking.service';

export const checkoutModalTrackingProvider = (): Provider[] => [
  ...provideTracking(withMixpanel(checkoutModalMixpanelMappers, { deferred: true })),
  CheckoutModalTrackingService,
];
