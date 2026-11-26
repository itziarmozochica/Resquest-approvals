import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { immersiveContentPlanMixpanelMappers } from './immersive-content-plan.mixpanel.mappers';

/**
 * Scoped Mixpanel adapter for the immersive content plan layout editor.
 *
 * Registered in `ImmersiveContentPlanEditorComponent.providers` (the feature root), so the store and
 * every module panel below it resolve this same `FzTrackingService` adapter.
 *
 * `withContext(feverzoneContextFactory)` is re-declared here on purpose: this provider lives on a
 * component (`ElementInjector`), and `FzTrackingService` collects context by walking `injector.parent`,
 * which only traverses environment/route injectors — not component element injectors. Without this, the
 * app-level context registered in `AppModule` (partner/user/device) never reaches publish events and
 * they arrive at Mixpanel with `context: {}`, unsegmentable by partner. `tracking-context-scope.spec.ts`
 * pins that platform limitation; this mirrors the established feature pattern (`inbox-notifications`,
 * `fz-assistant`).
 */
export const immersiveContentPlanTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(immersiveContentPlanMixpanelMappers));
