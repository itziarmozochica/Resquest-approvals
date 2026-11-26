import type { EventBrand, TrackingEventFactory } from '../../core/tracking-event';
import type { MixpanelMapperEntry } from './mixpanel.adapter';

export type MixpanelProperties<Data> = null | ((data: Data) => Readonly<Record<string, unknown>>);

export type MixpanelMapperConfig<F extends EventBrand> =
  F extends TrackingEventFactory<string, infer Data>
    ? {
        readonly event: F;
        readonly name: string;
        readonly properties: MixpanelProperties<Data>;
      }
    : never;

type MixpanelMapperConfigs<Fs extends readonly EventBrand[]> = {
  readonly [I in keyof Fs]: MixpanelMapperConfig<Fs[I]>;
};

/**
 * Builds typed Mixpanel mapper entries from event factories and Mixpanel event names.
 *
 * Throws when two configs target the same event id. Set `properties` to `null` to pass
 * event data through as Mixpanel properties (objects only); otherwise provide a mapper function.
 *
 * @example
 * ```ts
 * export const myMappers = mixpanelMapper([
 *   {
 *     event: reviewsTabClick,
 *     name: 'Reviews|Tab_Click',
 *     properties: data => ({ tab: data.tab }),
 *   },
 * ]);
 * ```
 */
export const mixpanelMapper = <const Fs extends readonly EventBrand[]>(
  configs: MixpanelMapperConfigs<Fs>,
): readonly MixpanelMapperEntry[] => {
  const seen = new Set<string>();
  return (configs as unknown as readonly { event: { id: string }; name: string; properties: MixpanelProperties<unknown> }[]).map(config => {
    if (seen.has(config.event.id)) {
      throw new Error(`[fz-tracking] Duplicate Mixpanel mapper for event "${config.event.id}"`);
    }
    seen.add(config.event.id);
    return {
      id: config.event.id,
      map:
        typeof config.properties === 'function'
          ? (data: unknown) => (config.properties as (d: unknown) => Readonly<Record<string, unknown>>)(data)
          : null,
      name: config.name,
    };
  });
};
