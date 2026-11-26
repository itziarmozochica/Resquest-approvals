import type { TrackingEvent, TrackingEventFactory } from './tracking-event';

/**
 * Creates a type-safe tracking event factory bound to a stable event id.
 *
 * The returned value is callable (`myEvent(data)`) and exposes a readonly `id` property
 * used by tracking adapters and mappers to route and transform the event.
 *
 * @example
 * ```ts
 * interface TabClickData { tab: string }
 * export const reviewsTabClick = defineEvent<TabClickData>('reviews.tab.click');
 * ```
 */
export const defineEvent = <Data = void, const Id extends string = string>(id: Id): TrackingEventFactory<Id, Data> => {
  const factory = (data: Data): TrackingEvent<Id, Data> => ({ data, id });
  return Object.assign(factory, { id } as const);
};
