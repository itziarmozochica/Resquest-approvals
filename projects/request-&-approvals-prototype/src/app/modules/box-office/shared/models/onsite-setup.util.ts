import { OnsiteSetupDTO, SessionAvailabilityCacheStrategyEnum } from './onsite-setup';

export interface ResolvedSessionCacheStrategy {
  strategy: SessionAvailabilityCacheStrategyEnum;
  timeout?: number;
}

export interface EffectiveCacheConfig {
  cacheTimeoutInSeconds: number;
  useCacheEnabled: boolean;
  useCacheSwrEnabled: boolean;
}

/**
 * Resolves the effective session availability cache strategy for a plan.
 *
 * Returns `null` when neither a per-plan override nor a setup-level strategy is
 * configured on the onsite setup. Note that `no_cache` is a valid explicit
 * strategy and is returned as `{ strategy: no_cache }`, not `null`.
 */
export function resolveSessionCacheStrategy(
  planId: number,
  onsiteSetup: OnsiteSetupDTO | null | undefined,
): ResolvedSessionCacheStrategy | null {
  const planOverride = onsiteSetup?.session_availability_plan_configs?.find(config => config.plan_id === planId);
  if (planOverride) {
    return {
      strategy: planOverride.strategy,
      timeout: planOverride.timeout_in_seconds,
    };
  }

  const strategy = onsiteSetup?.session_availability_cache_strategy;
  if (strategy) {
    return {
      strategy,
      timeout: onsiteSetup?.session_availability_cache_timeout_in_seconds,
    };
  }

  return null;
}

/**
 * Returns the effective cache configuration (three booleans/number) that the
 * ticketing components apply to `SessionAvailabilityService` calls.
 *
 * The onsite setup strategy is the sole source of truth. `no_cache` (whether
 * explicit or the backend default) and a missing strategy both map to cache off.
 */
export function computeEffectiveCacheConfig(params: {
  onsiteSetup: OnsiteSetupDTO | null | undefined;
  planId: number;
}): EffectiveCacheConfig {
  const resolved = resolveSessionCacheStrategy(params.planId, params.onsiteSetup);
  return {
    cacheTimeoutInSeconds: resolved?.strategy === SessionAvailabilityCacheStrategyEnum.time_to_live ? (resolved.timeout ?? 0) : 0,
    useCacheEnabled: resolved !== null && resolved.strategy !== SessionAvailabilityCacheStrategyEnum.no_cache,
    useCacheSwrEnabled: resolved?.strategy === SessionAvailabilityCacheStrategyEnum.stale_while_revalidate,
  };
}
