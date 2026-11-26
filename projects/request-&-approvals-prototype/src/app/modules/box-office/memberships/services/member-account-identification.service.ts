import { computed, inject, Injectable, Signal, signal } from '@angular/core';

import { IgntDialogService } from '@ignite/common';
import { filter, map, Observable, take, tap } from 'rxjs';

import {
  IdentifyMemberAccountModalComponent,
  IdentifyMemberAccountModalData,
  IdentifyMemberAccountModalResult,
} from '../components/identify-member-account-modal/identify-member-account-modal.component';
import { RemoveConfirmationMemberAccountModalComponent } from '../components/remove-confirmation-member-account-modal/remove-confirmation-member-account-modal.component';
import { MemberAccountBenefit, MemberAccountIdentification, MemberAccountMembership } from '../models/member-account.model';

const NO_BENEFITS: ReadonlyMap<number, MemberAccountBenefit> = new Map();

@Injectable()
export class MemberAccountIdentificationService {
  readonly #dialog = inject(IgntDialogService);

  readonly #benefits = signal<ReadonlyMap<number, MemberAccountBenefit>>(NO_BENEFITS);
  readonly #identification = signal<MemberAccountIdentification | null>(null);

  readonly benefits: Signal<ReadonlyMap<number, MemberAccountBenefit>> = this.#benefits.asReadonly();
  readonly identification: Signal<MemberAccountIdentification | null> = this.#identification.asReadonly();
  readonly memberships: Signal<Array<MemberAccountMembership>> = computed(() => this.#identification()?.memberships ?? []);
  readonly hasIdentification: Signal<boolean> = computed(() => this.#identification() !== null);
  readonly lockedSessionTypeIds: Signal<ReadonlySet<number>> = computed(
    () =>
      new Set(
        [...this.#benefits().values()]
          .filter((benefit: MemberAccountBenefit) => benefit.state === 'locked')
          .map((benefit: MemberAccountBenefit) => benefit.sessionTypeId),
      ),
  );

  clear(): void {
    if (this.#identification() === null) {
      return;
    }
    this.#identification.set(null);
  }

  clearBenefits(): void {
    if (this.#benefits().size === 0) {
      return;
    }
    this.#benefits.set(NO_BENEFITS);
  }

  identify$(partnerId: number, canApply: () => boolean = () => true): Observable<MemberAccountIdentification> {
    const dialogRef = this.#dialog.openModal<IdentifyMemberAccountModalResult, IdentifyMemberAccountModalData>(
      IdentifyMemberAccountModalComponent,
      { data: { memberships: this.memberships(), partnerId }, size: 'sm' },
    );

    return dialogRef.closed$.pipe(
      take(1),
      filter((identification): identification is MemberAccountIdentification => identification != null),
      filter(() => canApply()),
      tap((identification: MemberAccountIdentification) => {
        this.clearBenefits();
        this.#identification.set(identification);
      }),
    );
  }

  remove$(): Observable<void> {
    const dialogRef = this.#dialog.openModal<boolean>(RemoveConfirmationMemberAccountModalComponent, { size: 'sm' });

    return dialogRef.closed$.pipe(
      take(1),
      filter((confirmed): confirmed is true => confirmed === true),
      map((): void => this.clear()),
    );
  }

  setBenefits(benefits: ReadonlyMap<number, MemberAccountBenefit>): void {
    this.#benefits.set(benefits);
  }
}
