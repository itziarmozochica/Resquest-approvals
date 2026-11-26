import { computed, inject, Injectable, signal, type Signal } from '@angular/core';

import { ZendeskService } from '@fz-original/app/shared/services/script-loader/zendesk/zendesk.service';

import { ContactSupportBannerStorageService } from './contact-support-banner-storage.service';

/**
 * Decides whether the contact-support banner shows: on every page while the new Zendesk entry points
 * are on, which it points to, until the user dismisses it.
 */
@Injectable()
export class ContactSupportBannerFacade {
  readonly #storageService = inject(ContactSupportBannerStorageService);
  readonly #zendeskService = inject(ZendeskService);

  readonly #isDismissed = signal<boolean>(this.#storageService.isDismissed());

  readonly isVisible: Signal<boolean> = computed(() => this.#zendeskService.areNewEntryPointsEnabled() && !this.#isDismissed());

  dismiss(): void {
    this.#storageService.markDismissed();
    this.#isDismissed.set(true);
  }
}
