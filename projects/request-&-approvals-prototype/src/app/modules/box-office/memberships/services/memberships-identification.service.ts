import { computed, inject, Injectable, Signal, signal } from '@angular/core';

import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, Observable, take, tap } from 'rxjs';

import { posCheckoutMembershipsMemberIdentified } from '../../one-stop-shop/tracking/events/pos-checkout-memberships-member-identified.event';
import { posCheckoutMembershipsMemberRemoved } from '../../one-stop-shop/tracking/events/pos-checkout-memberships-member-removed.event';
import {
  MembershipsIdentifyMemberModalComponent,
  MembershipsIdentifyMemberModalData,
  MembershipsIdentifyMemberModalResult,
} from '../components/identify-member-modal/identify-member-modal.component';
import { MembershipsRemoveConfirmationMemberModalComponent } from '../components/remove-confirmation-member-modal/remove-confirmation-member-modal.component';
import { MembershipsData } from '../models/memberships.model';
import { emptyMembershipsData } from '../utils/memberships.utils';

/**
 * Owns the identified member for one selling flow: the state, the two modals and the tracking
 * and toast that go with them.
 *
 * Provided per flow, never in root — OSS and POS run side by side in the same app and must not
 * see each other's member. Callers keep only what is theirs: the feature gate, which reads their
 * own partner/plan state, and the cart recompute that follows a change.
 */
@Injectable()
export class MembershipsIdentificationService {
  readonly #dialog = inject(IgntDialogService);
  readonly #toast = inject(ToastService);
  readonly #tracking = inject(FzTrackingService);
  readonly #translate = inject(TranslateService);

  readonly #data = signal<MembershipsData>(emptyMembershipsData());

  readonly data: Signal<MembershipsData> = this.#data.asReadonly();
  readonly hasIdentifiedMember: Signal<boolean> = computed(() => this.#data().member !== null);
  readonly hasActivePerks: Signal<boolean> = computed(() => this.#data().planDiscounts.length > 0);

  /** Drops the member without asking and without tracking a removal — for state resets. */
  clear(): void {
    const { member, memberCode } = this.#data();
    if (member === null && memberCode === null) {
      return;
    }
    this.#data.set(emptyMembershipsData());
  }

  identify$(partnerId: number, planId: number, canApply: () => boolean = () => true): Observable<MembershipsData> {
    const dialogRef = this.#dialog.openModal<MembershipsIdentifyMemberModalResult, MembershipsIdentifyMemberModalData>(
      MembershipsIdentifyMemberModalComponent,
      { data: { partnerId, planId }, size: 'sm' },
    );

    return dialogRef.closed$.pipe(
      take(1),
      filter((membershipsData): membershipsData is MembershipsData => membershipsData != null),
      filter(() => canApply()),
      tap((membershipsData: MembershipsData) => this.#apply(membershipsData)),
    );
  }

  /** Opens the remove-confirmation modal. Emits once, and only when the operator confirmed. */
  remove$(): Observable<void> {
    const dialogRef = this.#dialog.openModal<boolean>(MembershipsRemoveConfirmationMemberModalComponent, { size: 'sm' });

    return dialogRef.closed$.pipe(
      take(1),
      filter((confirmed): confirmed is true => confirmed === true),
      map((): void => {
        this.#tracking.track(posCheckoutMembershipsMemberRemoved({ hadPerks: this.hasActivePerks() }));
        this.clear();
      }),
    );
  }

  #apply(membershipsData: MembershipsData): void {
    this.#data.set(membershipsData);
    this.#tracking.track(
      posCheckoutMembershipsMemberIdentified({
        discountsCount: membershipsData.planDiscounts.length,
        hasPerks: membershipsData.planDiscounts.length > 0,
      }),
    );
    this.#toast.addSuccess(
      this.#translate.instant('boxOffice.memberships.discounts.alert.message'),
      this.#translate.instant('boxOffice.memberships.discounts.alert.title'),
    );
  }
}
