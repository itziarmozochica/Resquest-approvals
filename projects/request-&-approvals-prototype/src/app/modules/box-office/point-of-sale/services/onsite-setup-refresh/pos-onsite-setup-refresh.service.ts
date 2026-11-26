import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { Subject, Subscription } from 'rxjs';

import { OSSConfigStorageService } from '../../../one-stop-shop/services/oss-config-storage.service';
import { OnsiteSetupsStorageService } from '../../../shared/services/onsite-setups/onsite-setups-storage.service';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { hasOnsiteSetupChanged, isOnsiteSetupRemoved } from '../../utils/pos-onsite-setup-update.util';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/**
 * Checks a setup applied from storage against the backend, and reloads the page when the backend
 * removed or changed it. `PosSetupService` starts and cancels the check; `PointOfSaleComponent`
 * opens the modals on `removed$` / `updated$`, closes them on `cancelled$` and calls the reloads.
 *
 * It is a **lego domain service**, not an 11th facade service: `TicketingStrategy` never learns about it.
 */
@Injectable()
export class PosOnsiteSetupRefreshService {
  readonly #configStorage = inject(OSSConfigStorageService);
  readonly #core = inject(TicketingCoreService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #onsiteSetupsStorage = inject(OnsiteSetupsStorageService);
  readonly #state = inject(PosTicketingState);

  /** A modal opened for a previous check is about a setup that is no longer being resolved. */
  readonly cancelled$ = new Subject<void>();

  readonly removed$ = new Subject<string>();

  readonly updated$ = new Subject<OnsiteSetup>();

  #check: Subscription | null = null;

  cancel(): void {
    this.#check?.unsubscribe();
    this.#check = null;
    this.cancelled$.next();
  }

  /** `toActiveOnsiteSetup` turns the backend answer into what the active setup would be, so both compare alike. */
  check(onsiteSetupId: string, toActiveOnsiteSetup: (latestOnsiteSetup: OnsiteSetup) => OnsiteSetup): void {
    this.cancel();
    this.#check = this.#core
      .getOnsiteSetup(onsiteSetupId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: BaseErrorResponse) => this.#announceRemoved(onsiteSetupId, error),
        next: latestOnsiteSetup => this.#announceUpdated(onsiteSetupId, toActiveOnsiteSetup(latestOnsiteSetup)),
      });
  }

  reloadWithLatestOnsiteSetup(latestOnsiteSetup: OnsiteSetup): void {
    this.#onsiteSetupsStorage.setConfiguration(latestOnsiteSetup);
    window.location.reload();
  }

  /** Storage is shared with other tabs, so a setup another tab stored after the 404 is kept. */
  reloadWithoutOnsiteSetup(removedOnsiteSetupId: string): void {
    if (this.#configStorage.getConfiguration()?.onsiteSetup?.id === removedOnsiteSetupId) {
      this.#configStorage.removeConfiguration();
    }
    if (this.#onsiteSetupsStorage.getConfiguration()?.id === removedOnsiteSetupId) {
      this.#onsiteSetupsStorage.removeConfiguration();
    }
    window.location.reload();
  }

  #announceRemoved(onsiteSetupId: string, error: BaseErrorResponse): void {
    if (!isOnsiteSetupRemoved(error) || this.#state.activeOnsiteSetup()?.id !== onsiteSetupId) {
      return;
    }
    this.removed$.next(onsiteSetupId);
  }

  #announceUpdated(onsiteSetupId: string, latestOnsiteSetup: OnsiteSetup): void {
    const activeOnsiteSetup = this.#state.activeOnsiteSetup();
    if (activeOnsiteSetup?.id !== onsiteSetupId || !hasOnsiteSetupChanged(activeOnsiteSetup, latestOnsiteSetup)) {
      return;
    }
    this.updated$.next(latestOnsiteSetup);
  }
}
