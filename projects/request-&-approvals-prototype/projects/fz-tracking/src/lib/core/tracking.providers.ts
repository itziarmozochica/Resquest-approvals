import { InjectionToken, type Injector, type Provider } from '@angular/core';

import { FzTrackingService } from '../service/fz-tracking.service';
import type { TrackingAdapter } from './tracking-adapter';

export const TRACKING_ADAPTERS = new InjectionToken<readonly TrackingAdapter[]>('TRACKING_ADAPTERS');

export const TRACKING_CONTEXT = new InjectionToken<readonly (() => Record<string, unknown>)[]>('TRACKING_CONTEXT');

interface InjectorWithParent extends Injector {
  readonly parent?: Injector | null;
}

const getParentInjector = (injector: Injector): Injector | null => (injector as InjectorWithParent).parent ?? null;

/**
 * Collects multi-provider values from the injector chain (root → leaf).
 *
 * Angular resolves a child multi-provider token only on that injector, so route-level
 * `provideTracking(withContext(...))` would otherwise miss app-level context factories.
 */
export const collectHierarchicalMultiProviders = <T>(injector: Injector, token: InjectionToken<readonly T[]>): readonly T[] => {
  const chain: Injector[] = [];
  let current: Injector | null = injector;

  while (current) {
    chain.unshift(current);
    current = getParentInjector(current);
  }

  const collected: T[] = [];
  for (const inj of chain) {
    const local = inj.get(token, null, { optional: true, self: true });
    if (local !== null && local.length > 0) {
      collected.push(...local);
    }
  }

  return collected;
};

export interface TrackingFeature {
  readonly providers: Provider[];
}

/**
 * Registers a context factory merged into every `track()` in the same injector scope.
 *
 * The Feverzone app registers baseline context in `AppModule` via
 * `feverzoneContextFactory` (partner/user/device from core services). That context
 * applies to every adapter event. Prefer additional factories on **route** `providers`;
 * component-level registration is only for exceptional smart containers.
 *
 * Multiple factories can be registered; later values override earlier ones for duplicate keys.
 */
export const withContext = (context: () => Record<string, unknown>): TrackingFeature => ({
  providers: [
    {
      multi: true,
      provide: TRACKING_CONTEXT,
      useValue: context,
    },
  ],
});

/**
 * Root Angular providers for `@fz/fz-tracking`.
 *
 * Merges providers from tracking features such as
 * {@link withMixpanel} and {@link withContext}.
 *
 * @example
 * ```ts
 * providers: [
 *   provideTracking(
 *     withMixpanel(myMixpanelMappers),
 *     withContext(() => ({ partnerId: partner.id })),
 *   ),
 * ]
 * ```
 */
export const provideTracking = (...features: TrackingFeature[]): Provider[] => {
  const providers: Provider[] = [FzTrackingService];
  for (const feature of features) {
    providers.push(...feature.providers);
  }
  return providers;
};
