import { DOCUMENT, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { EntryPointClientService } from '@fz-original/app/shared/services/entry-point-client/entry-point-client.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { catchError, EMPTY, filter, fromEvent, merge, switchMap } from 'rxjs';

import { OdooTillLockLinkService } from './odoo-till-lock-link.service';

/**
 * Resolves the till lock link while the session is still valid, so the Feverzone login can send the operator back
 * to the till lock after a logout or an expired session, when Shops can no longer be asked.
 *
 * It refreshes whenever the answer can change: the entry point turns `odoo`, a partner is selected, or the onsite
 * setup changes. A failed refresh keeps the last link, except a 404, which drops it.
 */
@Injectable({ providedIn: 'root' })
export class OdooTillLockLinkPrefetchService {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #document = inject(DOCUMENT);
  readonly #odooTillLockLinkService = inject(OdooTillLockLinkService);
  readonly #partnerService = inject(PartnerService);
  readonly #entryPointClientService = inject(EntryPointClientService);

  constructor() {
    const window = this.#document.defaultView;
    const onsiteSetupChanged = window
      ? fromEvent<StorageEvent>(window, 'storage').pipe(filter((event: StorageEvent) => event.key === StorageKey.onsiteSetupConfig))
      : EMPTY;

    merge(toObservable(this.#entryPointClientService.entryPointClient), this.#partnerService.observePartner(), onsiteSetupChanged)
      .pipe(
        filter(
          () => this.#entryPointClientService.entryPointClient() === EntryPointClient.Odoo && this.#authenticationService.isLoggedIn(),
        ),
        switchMap(() => this.#odooTillLockLinkService.getLockLink().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
