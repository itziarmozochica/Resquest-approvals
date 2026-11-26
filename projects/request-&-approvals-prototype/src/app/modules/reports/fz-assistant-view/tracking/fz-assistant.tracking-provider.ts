import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { chatbotMixpanelMappers } from './fz-assistant.mixpanel.mappers';

/**
 * Scoped Mixpanel adapter for every Fz Assistant surface that fires chatbot events:
 * the full-page `/reports/fz-assistant` route and the dialog / dock / notifications overlays.
 *
 * Each of these registers this provider in its own DI scope (the route via its `providers`,
 * the overlays via their component `providers`). The reports routes are flat siblings, so the
 * assistant route does NOT inherit `reportsMixpanelMappers`; it needs its own adapter here.
 * Only chatbot events fire within these scopes, so there is no overlap with other feature adapters.
 *
 * `withContext(feverzoneContextFactory)` is required because three of the four registrations live on
 * components (`ElementInjector`), and `FzTrackingService` collects context by walking `injector.parent`,
 * which only traverses environment/route injectors — not component element injectors. Without this, the
 * app-level context registered in `AppModule` (partner/user/device) never reached overlay-fired events,
 * which landed in Mixpanel with `user_email` / `partner_*` unset. Redundant but harmless on the route
 * registration: the same factory is collected twice and merged over itself with identical values.
 * This mirrors the established feature pattern (`inbox-notifications`, `plan`, `inventory-pricing`).
 */
export const fzAssistantTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(chatbotMixpanelMappers));
