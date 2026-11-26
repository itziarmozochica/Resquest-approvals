import { DestroyRef, DOCUMENT, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, type Event as RouterEvent } from '@angular/router';

import { filter, take } from 'rxjs';

import { SpinnerService } from '../../shared/layout/spinner/spinner.service';

/**
 * Hands the page over to the Odoo till lock, with the loader up so the operator never sees Feverzone meanwhile.
 *
 * How the hand-over ends depends on the kiosk app:
 * - With a single WebView, Odoo replaces this page and nothing here runs again.
 * - With kept-alive Odoo and Feverzone WebViews, the app cancels the navigation and shows the Odoo WebView. This page
 *   stays alive behind it (still reported as visible), and the hand-over lasts until the router completes its next
 *   navigation: the operator coming back through the Odoo hand-off. Meanwhile a stray redirect to `/login` is only
 *   held, so the page never locks the till again from the background.
 *
 * There is no fallback when Odoo does not take over: the page is handed to Odoo, and Odoo owns what happens next.
 */
@Injectable({
  providedIn: 'root',
})
export class OdooTillLockRedirectService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  #isHandingOver = false;
  readonly #router = inject(Router);
  readonly #spinnerService = inject(SpinnerService);

  /** Returns `false` when there is no window to replace, and nothing was done. */
  leaveFor(lockLink: string): boolean {
    const window = this.#document.defaultView;

    if (window === null) {
      return false;
    }

    if (this.#isHandingOver) {
      return true;
    }

    this.#isHandingOver = true;
    this.#spinnerService.show();
    window.location.replace(lockLink);

    this.#router.events
      .pipe(
        filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#isHandingOver = false;
        this.#spinnerService.hide();
      });

    return true;
  }
}
