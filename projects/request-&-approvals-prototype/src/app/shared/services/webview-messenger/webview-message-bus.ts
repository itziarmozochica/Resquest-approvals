import { concat, defer, filter, from, Observable, Subject } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

export interface ObserveOptions {
  /** Also deliver the last message of this type that arrived while nobody was listening for it. */
  includeUnconsumed?: boolean;
}

interface BusMessage {
  data: unknown;
  type: string;
}

/**
 * Routes bridge messages by type. A message published while nobody listens to its type is kept
 * (the last one per type) until a subscriber asks for it with `includeUnconsumed`.
 */
export class WebViewMessageBus {
  #listenerCount = new Map<string, number>();
  #messages = new Subject<BusMessage>();
  #unconsumed = new Map<string, unknown>();

  discardUnconsumed(type: string): void {
    this.#unconsumed.delete(type);
  }

  observe<T>(type: string, { includeUnconsumed = false }: ObserveOptions = {}): Observable<T> {
    return defer(() => {
      this.#changeListenerCount(type, 1);
      const pending = includeUnconsumed ? this.#takeUnconsumed<T>(type) : [];
      const live = this.#messages.pipe(
        filter(message => message.type === type),
        map(message => message.data as T),
      );
      return concat(from(pending), live).pipe(finalize(() => this.#changeListenerCount(type, -1)));
    });
  }

  publish(type: string, data: unknown): void {
    if ((this.#listenerCount.get(type) ?? 0) === 0) {
      this.#unconsumed.set(type, data);
      return;
    }
    this.#unconsumed.delete(type);
    this.#messages.next({ type, data });
  }

  #changeListenerCount(type: string, delta: number): void {
    this.#listenerCount.set(type, (this.#listenerCount.get(type) ?? 0) + delta);
  }

  #takeUnconsumed<T>(type: string): T[] {
    if (!this.#unconsumed.has(type)) {
      return [];
    }
    const data = this.#unconsumed.get(type) as T;
    this.#unconsumed.delete(type);
    return [data];
  }
}
