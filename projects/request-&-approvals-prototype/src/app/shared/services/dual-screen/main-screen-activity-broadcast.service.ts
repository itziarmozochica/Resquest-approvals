import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { RoutePrimaryPath } from '@fz-original/app/app/enums/route.enum';
import {
  MAIN_SCREEN_ACTIVITY_CHANNEL,
  MAIN_SCREEN_ACTIVITY_EVENTS,
  MAIN_SCREEN_ACTIVITY_LISTENER_OPTIONS,
  MAIN_SCREEN_ACTIVITY_THROTTLE_MS,
  MAIN_SCREEN_BUSY_MESSAGE,
} from '@fz-original/app/shared/models/dual-screen/main-screen-activity.model';

/**
 * On the dual-screen terminal both screens' WebViews share one renderer process, so the
 * second screen's stand-by animation competes with the main screen for frames. The main
 * screen announces its input on a same-origin BroadcastChannel and the second screen
 * pauses the animation until the main screen has been idle for a while.
 */
@Injectable({
  providedIn: 'root',
})
export class MainScreenActivityBroadcastService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  readonly #ngZone = inject(NgZone);
  readonly #router = inject(Router);
  readonly #secondScreenUrl = `/${RoutePrimaryPath[RoutePrimaryPath['obo-second-screen']]}`;

  #isStarted = false;
  #lastBroadcastAt = Number.NEGATIVE_INFINITY;

  start(): void {
    if (this.#isStarted) {
      return;
    }
    this.#isStarted = true;
    const channel = new BroadcastChannel(MAIN_SCREEN_ACTIVITY_CHANNEL);
    const onActivity = (): void => {
      this.#broadcastActivity(channel);
    };

    this.#ngZone.runOutsideAngular(() => {
      for (const type of MAIN_SCREEN_ACTIVITY_EVENTS) {
        this.#document.addEventListener(type, onActivity, MAIN_SCREEN_ACTIVITY_LISTENER_OPTIONS);
      }
    });

    this.#destroyRef.onDestroy(() => {
      for (const type of MAIN_SCREEN_ACTIVITY_EVENTS) {
        this.#document.removeEventListener(type, onActivity, MAIN_SCREEN_ACTIVITY_LISTENER_OPTIONS);
      }
      channel.close();
    });
  }

  #broadcastActivity(channel: BroadcastChannel): void {
    if (this.#router.url.startsWith(this.#secondScreenUrl)) {
      return;
    }
    const now = Date.now();
    if (now - this.#lastBroadcastAt < MAIN_SCREEN_ACTIVITY_THROTTLE_MS) {
      return;
    }
    this.#lastBroadcastAt = now;
    channel.postMessage(MAIN_SCREEN_BUSY_MESSAGE);
  }
}
