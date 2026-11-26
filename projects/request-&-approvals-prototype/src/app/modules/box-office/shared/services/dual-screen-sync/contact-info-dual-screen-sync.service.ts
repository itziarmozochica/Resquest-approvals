import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { assertIsDefined } from '@fz/utils/assert-is-defined';

import {
  CONTACT_INFO_DUAL_SCREEN_IS_HOST,
  contactInfoDualScreenBroadcastChannel,
  contactInfoDualScreenInitialState,
  contactInfoDualScreenInitialVisibility,
  type ContactInfoDualScreenHostVisibleFields,
  type FieldName,
  type SyncPayload,
} from '../../models/dual-screen-sync/contact-info-dual-screen-sync.model';
import type { ContactInformationOrderableFieldEnum } from '../../models/onsite-setup';

@Injectable()
export class ContactInfoDualScreenSyncService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #channel = new BroadcastChannel(contactInfoDualScreenBroadcastChannel);
  readonly #isHostSyncContext = inject(CONTACT_INFO_DUAL_SCREEN_IS_HOST, { optional: true }) === true;

  readonly sharedContactInfoState = signal<Record<FieldName, string>>(contactInfoDualScreenInitialState());
  readonly activeEditField = signal<FieldName | null>(null);
  readonly showConsent = signal(contactInfoDualScreenInitialVisibility().showConsent);
  readonly showEmail = signal(contactInfoDualScreenInitialVisibility().showEmail);
  readonly showPhoneNumber = signal(contactInfoDualScreenInitialVisibility().showPhoneNumber);
  readonly fieldsOrder = signal(contactInfoDualScreenInitialVisibility().fieldsOrder);
  readonly visibilityResolved = signal(false);

  readonly #hostVisibleField = signal<ContactInfoDualScreenHostVisibleFields | null>(null);
  readonly #pendingGuestVisibleFields = signal(false);

  constructor() {
    this.#channel.onmessage = (event: MessageEvent<SyncPayload>): void => {
      this.#onChannelMessage(event.data);
    };

    this.#destroyRef.onDestroy((): void => {
      this.#channel.close();
    });
  }

  broadcast(payload: SyncPayload): void {
    this.#channel.postMessage(payload);
  }

  pushCloseEditControl(): void {
    this.activeEditField.set(null);
    this.broadcast({ type: 'CLOSE_EDIT_CONTROL' });
  }

  pushInputChange(field: FieldName, value: string): void {
    this.sharedContactInfoState.update((prev: Record<FieldName, string>) => ({
      ...prev,
      [field]: value,
    }));
    this.broadcast({ field, type: 'INPUT_CHANGE', value });
  }

  pushOpenEditControl(field: FieldName): void {
    this.activeEditField.set(field);
    this.broadcast({ field, type: 'OPEN_EDIT_CONTROL' });
  }

  requestVisibleFields(): void {
    this.broadcast({ type: 'REQUEST_VISIBLE_FIELDS' });
  }

  resetContactInfoStateSync(): void {
    this.sharedContactInfoState.set(contactInfoDualScreenInitialState());
    this.activeEditField.set(null);
    this.#hostVisibleField.set(null);
    this.#pendingGuestVisibleFields.set(false);
    this.#resetVisibilitySignals();
    this.broadcast({ fullSyncReset: true, type: 'CLOSE_EDIT_CONTROL' });
  }

  setHostVisibleFields(
    showEmail: boolean,
    showPhoneNumber: boolean,
    showConsent: boolean,
    fieldsOrder: ContactInformationOrderableFieldEnum[] | null = null,
  ): void {
    if (!this.#isHostSyncContext) {
      return;
    }
    this.#hostVisibleField.set({ fieldsOrder, showConsent, showEmail, showPhoneNumber });
    this.showConsent.set(showConsent);
    this.showEmail.set(showEmail);
    this.showPhoneNumber.set(showPhoneNumber);
    this.fieldsOrder.set(fieldsOrder);
    this.visibilityResolved.set(true);
    if (this.#pendingGuestVisibleFields()) {
      this.#pendingGuestVisibleFields.set(false);
      this.#pushVisibleFields();
    }
  }

  #applyVisibleFields(data: SyncPayload): void {
    if (data.type !== 'APPLY_VISIBLE_FIELDS') {
      return;
    }
    if (this.#isHostSyncContext) {
      return;
    }
    const { fieldsOrder, showConsent, showEmail, showPhoneNumber } = contactInfoDualScreenInitialVisibility();
    this.showConsent.set(data.showConsent ?? showConsent);
    this.showEmail.set(data.showEmail ?? showEmail);
    this.showPhoneNumber.set(data.showPhoneNumber ?? showPhoneNumber);
    this.fieldsOrder.set(data.fieldsOrder ?? fieldsOrder);
    this.visibilityResolved.set(true);
  }

  #checkCloseEditControl(data: SyncPayload): void {
    if (data.type !== 'CLOSE_EDIT_CONTROL') {
      return;
    }
    if (data.fullSyncReset === true) {
      this.sharedContactInfoState.set(contactInfoDualScreenInitialState());
      this.activeEditField.set(null);
      this.#hostVisibleField.set(null);
      this.#pendingGuestVisibleFields.set(false);
      this.#resetVisibilitySignals();
      return;
    }
    this.activeEditField.set(null);
  }

  #checkInputChange(data: SyncPayload): void {
    const { field, type, value } = data;
    if (type === 'INPUT_CHANGE' && field !== undefined) {
      this.sharedContactInfoState.update((prev: Record<FieldName, string>) => ({
        ...prev,
        [field]: String(value ?? ''),
      }));
      return;
    }
  }

  #checkOpenEditControl(data: SyncPayload): void {
    const { field, type } = data;
    if (type !== 'OPEN_EDIT_CONTROL' || field === undefined) {
      return;
    }
    this.activeEditField.set(field);
  }

  #checkRequestVisibleFields(data: SyncPayload): void {
    if (data.type !== 'REQUEST_VISIBLE_FIELDS') {
      return;
    }
    if (!this.#isHostSyncContext) {
      return;
    }
    if (this.#hostVisibleField() === null) {
      this.#pendingGuestVisibleFields.set(true);
      return;
    }
    this.#pushVisibleFields();
  }

  #onChannelMessage(data: SyncPayload | null | undefined): void {
    assertIsDefined(data);
    this.#checkInputChange(data);
    this.#checkOpenEditControl(data);
    this.#checkRequestVisibleFields(data);
    this.#applyVisibleFields(data);
    this.#checkCloseEditControl(data);
  }

  #pushVisibleFields(): void {
    const hostVisibleField = this.#hostVisibleField();
    if (hostVisibleField === null) {
      return;
    }
    this.broadcast({
      fieldsOrder: hostVisibleField.fieldsOrder,
      showConsent: hostVisibleField.showConsent,
      showEmail: hostVisibleField.showEmail,
      showPhoneNumber: hostVisibleField.showPhoneNumber,
      type: 'APPLY_VISIBLE_FIELDS',
    });
  }

  #resetVisibilitySignals(): void {
    const { fieldsOrder, showConsent, showEmail, showPhoneNumber } = contactInfoDualScreenInitialVisibility();
    this.showConsent.set(showConsent);
    this.showEmail.set(showEmail);
    this.showPhoneNumber.set(showPhoneNumber);
    this.fieldsOrder.set(fieldsOrder);
    this.visibilityResolved.set(false);
  }
}
