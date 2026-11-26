import { Injectable, signal } from '@angular/core';

import { ContactInformationDraft } from './contact-information-draft.model';

/**
 * The contact details typed in the current sale, so a failed cart or a second Pay reopens the contact modal
 * filled in. In memory only: the Point of Sale clears it when the sale completes or the selection is emptied.
 */
@Injectable({
  providedIn: 'root',
})
export class ContactInformationDraftService {
  readonly #draft = signal<ContactInformationDraft | null>(null);
  readonly draft = this.#draft.asReadonly();

  clear(): void {
    this.#draft.set(null);
  }

  save(details: ContactInformationDraft): void {
    const isEmpty = !details.firstName && !details.lastName && !details.email && !details.phoneNumber;
    this.#draft.set(isEmpty ? null : { ...details });
  }
}
