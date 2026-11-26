import { DestroyRef, NgZone } from '@angular/core';

export class BatchFlushScheduler {
  readonly #document: Document;
  readonly #flush: (isPageExit: boolean) => void;
  readonly #ngZone: NgZone;
  #timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly #flushOnPageExit = (): void => this.flushNow(true);
  readonly #flushWhenHidden = (): void => {
    if (this.#document.visibilityState === 'hidden') {
      this.flushNow(true);
    }
  };

  constructor(ngZone: NgZone, document: Document, destroyRef: DestroyRef, flush: (isPageExit: boolean) => void) {
    this.#document = document;
    this.#flush = flush;
    this.#ngZone = ngZone;
    const view = document.defaultView;
    ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', this.#flushWhenHidden);
      view?.addEventListener('pagehide', this.#flushOnPageExit);
    });
    destroyRef.onDestroy(() => {
      this.cancel();
      document.removeEventListener('visibilitychange', this.#flushWhenHidden);
      view?.removeEventListener('pagehide', this.#flushOnPageExit);
    });
  }

  cancel(): void {
    if (this.#timeoutId !== null) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
  }

  flushNow(isPageExit: boolean): void {
    this.cancel();
    this.#flush(isPageExit);
  }

  schedule(delayMs: number): void {
    if (this.#timeoutId !== null) {
      if (delayMs > 0) {
        return;
      }
      clearTimeout(this.#timeoutId);
    }
    this.#timeoutId = this.#ngZone.runOutsideAngular(() => setTimeout(() => this.flushNow(false), delayMs));
  }
}
