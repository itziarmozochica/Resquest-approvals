import { DestroyRef, inject, Injectable, NgZone, signal } from '@angular/core';

import {
  MAIN_SCREEN_ACTIVITY_CHANNEL,
  MAIN_SCREEN_BUSY_MESSAGE,
  MOSAIC_IDLE_DELAY_MS,
} from '@fz-original/app/shared/models/dual-screen/main-screen-activity.model';

/**
 * Whether the main screen of a dual-screen terminal reported input recently, through the channel
 * `MainScreenActivityBroadcastService` posts on. The second screen pauses its stand-by motion while it is busy.
 * Provide it in the component that reads it, so the channel closes with that component.
 */
@Injectable()
export class MainScreenBusyService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBusy = signal(false);
  readonly #ngZone = inject(NgZone);

  readonly isBusy = this.#isBusy.asReadonly();

  constructor() {
    this.#listen();
  }

  #listen(): void {
    const channel = new BroadcastChannel(MAIN_SCREEN_ACTIVITY_CHANNEL);
    let idleTimeout: ReturnType<typeof setTimeout> | undefined;

    this.#ngZone.runOutsideAngular(() => {
      channel.onmessage = (event: MessageEvent<unknown>): void => {
        if (event.data !== MAIN_SCREEN_BUSY_MESSAGE) {
          return;
        }
        this.#isBusy.set(true);
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          this.#isBusy.set(false);
        }, MOSAIC_IDLE_DELAY_MS);
      };
    });

    this.#destroyRef.onDestroy(() => {
      clearTimeout(idleTimeout);
      channel.close();
    });
  }
}
