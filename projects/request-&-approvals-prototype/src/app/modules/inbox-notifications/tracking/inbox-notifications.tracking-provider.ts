import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { inboxNotificationsMixpanelMappers } from './inbox-notifications.mixpanel.mappers';

/**
 * Scoped Mixpanel adapter for the inbox notifications feature (global-header bell + proactive panel).
 *
 * Registered in `NotificationsButtonComponent.providers` (the feature root). The overlay service channels
 * that component's injector into both the desktop dropdown portal and the mobile sheet, so the panel and
 * its items resolve this same `FzTrackingService` adapter. Mixpanel is NOT registered globally, so this is
 * the only adapter in scope — no duplicate events nor raw-id passthrough (plan §4.1).
 *
 * `withContext(feverzoneContextFactory)` is re-declared here on purpose: this provider lives on a
 * component (`ElementInjector`), and `FzTrackingService` collects context by walking `injector.parent`,
 * which only traverses environment/route injectors — not component element injectors. Without this, the
 * app-level context registered in `AppModule` (partner/user/device) never reaches inbox events. This
 * mirrors the established feature pattern (`plan`, `inventory-pricing`).
 */
export const inboxNotificationsTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(inboxNotificationsMixpanelMappers));
