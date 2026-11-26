import { type Provider } from '@angular/core';

import { manualPriceMixpanelMappers } from '@fz-original/app/modules/reservation/tracking/reservation.mixpanel.mappers';
import { provideTracking, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { oneStopShopMixpanelMappers } from './one-stop-shop.mixpanel.mappers';
import { TrackPosCartItemQuantityChangeService } from './services/track-pos-cart-item-quantity-change.service';
import { TrackPosCheckoutPromoCodesService } from './services/track-pos-checkout-promo-codes.service';
import { TrackPosConfigSetupChangedService } from './services/track-pos-config-setup-changed.service';
import { TrackPosShiftService } from './services/track-pos-shift.service';
import { TrackPosTimeSlotCalendarService } from './services/track-pos-time-slot-calendar.service';

export const oneStopShopTrackingProvider = (): Provider[] => [
  ...provideTracking(withMixpanel([...oneStopShopMixpanelMappers, ...manualPriceMixpanelMappers], { deferred: true })),
  TrackPosCartItemQuantityChangeService,
  TrackPosCheckoutPromoCodesService,
  TrackPosConfigSetupChangedService,
  TrackPosShiftService,
  TrackPosTimeSlotCalendarService,
];
