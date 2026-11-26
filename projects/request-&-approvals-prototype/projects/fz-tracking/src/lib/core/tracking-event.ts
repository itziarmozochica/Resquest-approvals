/**
 * Compile-time event branding via string literal ids.
 *
 * When {@link defineEvent} is called with a literal id (e.g. `'click.panel'`), TypeScript
 * preserves that literal on {@link TrackingEventFactory} instead of widening to `string`.
 * Adapters and mappers can then associate each id with a specific payload shape and enforce
 * it at compile time.
 */
export interface EventBrand<Id extends string = string> {
  readonly id: Id;
}

export interface TrackingEvent<Id extends string = string, Data = unknown> extends EventBrand<Id> {
  readonly data: Data;
}

export interface TrackingEventFactory<Id extends string, Data> extends EventBrand<Id> {
  (data: Data): TrackingEvent<Id, Data>;
}
