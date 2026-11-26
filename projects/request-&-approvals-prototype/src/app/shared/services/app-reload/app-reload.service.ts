import { DOCUMENT, inject, Injectable } from '@angular/core';

export const reloadDelayMs = 3000;

@Injectable({
  providedIn: 'root',
})
export class AppReloadService {
  readonly #window: Window | null = inject(DOCUMENT).defaultView;

  forceReload(): void {
    const windowRef: Window | null = this.#window;
    if (windowRef === null) {
      return;
    }
    // Fire the service-worker cleanup in the background — its outcome must
    // not delay the reload. A refusal to enumerate registrations only costs
    // us the SW cleanup, not the actionable half of the recovery.
    this.#unregisterServiceWorkers(windowRef);
    windowRef.setTimeout(() => {
      windowRef.location.reload();
    }, reloadDelayMs);
  }

  reloadNow(): void {
    const windowRef: Window | null = this.#window;
    if (windowRef === null) {
      return;
    }
    let hasReloaded = false;
    const reload = (): void => {
      if (hasReloaded) {
        return;
      }
      hasReloaded = true;
      windowRef.location.reload();
    };
    windowRef.setTimeout(reload, reloadDelayMs);
    this.#unregisterServiceWorkers(windowRef).finally(reload);
  }

  #unregisterServiceWorkers(windowRef: Window): Promise<void> {
    // Guard against non-secure contexts (and jsdom) where `serviceWorker` may
    // be missing at runtime even though the TS lib type declares it required.
    const sw: ServiceWorkerContainer | undefined = (windowRef.navigator as { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    if (sw === undefined) {
      return Promise.resolve();
    }
    return sw
      .getRegistrations()
      .then((registrations: readonly ServiceWorkerRegistration[]) =>
        Promise.all(registrations.map((registration: ServiceWorkerRegistration) => registration.unregister())),
      )
      .then((): undefined => undefined)
      .catch(() => {
        // Non-fatal; see forceReload.
      });
  }
}
