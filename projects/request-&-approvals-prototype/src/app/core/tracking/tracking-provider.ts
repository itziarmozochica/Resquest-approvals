import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { TrackingContext, TrackingGlobalProperties } from './tracking-context';
import { TrackingEvent } from './tracking-event';
import { TrackingMapper } from './tracking-mapper';

export abstract class TrackingProvider {
  protected enabled = true;

  private allowedEvents: Array<string>;

  constructor(protected mappers: Map<string, TrackingMapper<any, any>> = new Map()) {
    this.allowedEvents = Array.from(this.mappers.keys());
  }

  abstract id(): string;

  subscribe(observable: Observable<TrackingContext<any>>): void {
    let obs = this.beforeTransform(
      observable.pipe(
        filter(() => this.enabled),
        filter((context: TrackingContext<unknown>): boolean => {
          if ((!context.include && !context.exclude) || (context.include.length === 0 && context.exclude.length === 0)) {
            return true;
          }

          if (context.include) {
            return context.include.includes(this.id());
          }

          if (context.exclude) {
            return !context.exclude.includes(this.id());
          }

          return true;
        }),
        filter(context => this.allowedEvents.includes(context.event.id)),
      ),
    );

    obs = obs.pipe(map(context => this.transform(context.event, context.global)));

    this.afterTransform(obs).subscribe(event => this.track(event));
  }

  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  protected beforeTransform(observable: Observable<TrackingContext<any>>): Observable<TrackingContext<any>> {
    return observable;
  }

  protected afterTransform(observable: Observable<any>): Observable<any> {
    return observable;
  }

  protected transform(event: TrackingEvent<any>, global: TrackingGlobalProperties): any {
    return this.mappers.get(event.id)?.map(event, global);
  }

  protected abstract track(event: any): void;
}
