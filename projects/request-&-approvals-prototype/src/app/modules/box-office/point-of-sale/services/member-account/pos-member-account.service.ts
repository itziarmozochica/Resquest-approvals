import { computed, DestroyRef, effect, inject, Injectable, Injector, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MemberAccountBenefit, MemberAccountMembership } from '@fz-original/app/modules/box-office/memberships/models/member-account.model';
import { MemberAccountAutoApplyService } from '@fz-original/app/modules/box-office/memberships/services/member-account-auto-apply.service';
import { MemberAccountBenefitsService } from '@fz-original/app/modules/box-office/memberships/services/member-account-benefits.service';
import { MemberAccountIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/member-account-identification.service';
import {
  MemberBenefitsNotAppliedError,
  memberBenefitsNotAppliedMessage,
} from '@fz-original/app/modules/box-office/memberships/services/member-benefits-not-applied.error';
import {
  buildMemberAccountAutoApplyTarget,
  MemberAccountAutoApplyTarget,
} from '@fz-original/app/modules/box-office/memberships/utils/member-account-auto-apply.util';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, tap, throwError } from 'rxjs';

import { PosTicketingState } from '../../state/pos-ticketing.state';
import { POS_TICKET_SELECTOR_REARCHITECT } from '../../tokens/pos-ticket-selector-rearchitect.token';
import { isPartyMembersMode } from '../../utils/pos-party-members.util';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';

const NO_LOCKED_SESSION_TYPE_IDS: ReadonlySet<number> = new Set<number>();

@Injectable()
export class PosMemberAccountService {
  readonly #autoApply = inject(MemberAccountAutoApplyService);
  readonly #benefits = inject(MemberAccountBenefitsService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #isTicketSelectorRearchitectEnabled = inject(POS_TICKET_SELECTOR_REARCHITECT);
  readonly #memberAccount = inject(MemberAccountIdentificationService);
  readonly #state = inject(PosTicketingState);
  readonly #toast = inject(IgntToastService);
  readonly #translate = inject(TranslateService);
  readonly #user = inject(UserService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  readonly #activePlanId = computed<number | null>(() => this.#state.activePlan()?.id ?? null);
  readonly #partnerHasMemberAccounts = computed<boolean>(() => this.#state.partner?.hasMemberAccounts === true);

  #benefitsRequestId = 0;

  constructor() {
    effect(() => {
      const planId = this.#activePlanId();
      const partnerHasMemberAccounts = this.#partnerHasMemberAccounts();
      const memberships = this.#memberAccount.memberships();

      untracked(() => this.#loadBenefits(planId, partnerHasMemberAccounts, memberships));
    });
  }

  #benefitsAppliedTo: { cartId: string; loyaltyProvider: string } | null = null;

  applyBenefitsToCart$(cartId: string): Observable<void> {
    const partnerId = this.#state.partner?.id;
    if (partnerId == null || this.#state.partner?.hasMemberAccounts !== true) {
      return of(void 0);
    }

    const memberships = this.#memberAccount.memberships();
    const identified = buildMemberAccountAutoApplyTarget(memberships);
    if (identified === null && memberships.length > 0) {
      return throwError(() => new MemberBenefitsNotAppliedError(memberBenefitsNotAppliedMessage));
    }

    const target = identified ?? this.#undoTarget(cartId);
    if (target === null) {
      return of(void 0);
    }

    return this.#autoApply
      .autoApply$(partnerId, cartId, target.loyaltyProvider, target.providerAccountIds)
      .pipe(tap(() => this.#rememberBenefitsApplied(cartId, target)));
  }

  canIdentifyMemberAccount(): boolean {
    return (
      this.#user.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE) && !!this.#state.partner?.hasMemberAccounts && this.#state.plan?.id != null
    );
  }

  get hasIdentification(): boolean {
    return this.#memberAccount.hasIdentification();
  }

  identifyMemberAccount(): void {
    const partnerId = this.#state.partner?.id;
    if (!this.canIdentifyMemberAccount() || partnerId == null) {
      return;
    }

    if (this.#rejectIdentifyForCart()) {
      return;
    }

    this.#memberAccount
      .identify$(partnerId, () => !this.#rejectIdentifyForCart())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#viewUpdate.markForCheck());
  }

  get lockedSessionTypeIds(): ReadonlySet<number> {
    return this.#isMemberLockingApplicable() ? this.#memberAccount.lockedSessionTypeIds() : NO_LOCKED_SESSION_TYPE_IDS;
  }

  get memberships(): Array<MemberAccountMembership> {
    return this.#memberAccount.memberships();
  }

  removeMemberAccount(): void {
    this.#memberAccount
      .remove$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#viewUpdate.markForCheck());
  }

  #dropCartLinesLockedForMember(): void {
    const dropped = this.#ticketSelection.dropSelectedTicketsOfSessionTypes(this.lockedSessionTypeIds);

    if (dropped === 0) {
      return;
    }

    this.#toast.info(
      this.#translate.instant(
        dropped === 1 ? 'boxOffice.memberAccount.droppedCartLines.single' : 'boxOffice.memberAccount.droppedCartLines.several',
        { count: dropped },
      ),
    );
  }

  #isCartEmpty(): boolean {
    return (
      this.#state.selectedTicketsBySessionId.size === 0 &&
      this.#state.selectedTicketsBySessionType.size === 0 &&
      (this.#state.nonConfirmedCart?.getNumberOfTicketAndProductCounts() ?? 0) === 0
    );
  }

  #isMemberLockingApplicable(): boolean {
    return !this.#purchase.isModifyOrderMode() && !this.#purchase.isReservationSettlementMode() && !this.#isPartyMembersMode();
  }

  #isPartyMembersMode(): boolean {
    return isPartyMembersMode({
      isFreeSeatingMap: this.#state.manageAsFreeSeatingMap,
      isRearchitectEnabled: this.#isTicketSelectorRearchitectEnabled,
      ticketSelectorType: this.#state.activeOnsiteSetup()?.ticket_selector_type ?? null,
    });
  }

  #loadBenefits(planId: number | null, partnerHasMemberAccounts: boolean, memberships: ReadonlyArray<MemberAccountMembership>): void {
    this.#benefitsRequestId += 1;
    const requestId = this.#benefitsRequestId;
    const partnerId = this.#state.partner?.id;

    this.#memberAccount.clearBenefits();

    if (!this.#isTicketSelectorRearchitectEnabled || planId === null || partnerId == null || !partnerHasMemberAccounts) {
      return;
    }

    this.#benefits
      .search$(partnerId, planId, memberships)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {},
        next: (response: BaseResponse<ReadonlyMap<number, MemberAccountBenefit>>) => {
          if (requestId !== this.#benefitsRequestId) {
            return;
          }

          this.#memberAccount.setBenefits(response.data ?? new Map());
          this.#dropCartLinesLockedForMember();
          this.#viewUpdate.markForCheck();
        },
      });
  }

  get #purchase(): PosPurchaseService {
    return this.#injector.get(PosPurchaseService);
  }

  #rejectIdentifyForCart(): boolean {
    if (!this.#isMemberLockingApplicable() || this.#isCartEmpty()) {
      return false;
    }

    this.#toast.danger(this.#translate.instant('boxOffice.memberAccount.identify.blockedByCart'));
    return true;
  }

  #rememberBenefitsApplied(cartId: string, target: MemberAccountAutoApplyTarget): void {
    this.#benefitsAppliedTo = target.providerAccountIds.length === 0 ? null : { cartId, loyaltyProvider: target.loyaltyProvider };
  }

  get #ticketSelection(): PosTicketSelectionService {
    return this.#injector.get(PosTicketSelectionService);
  }

  #undoTarget(cartId: string): MemberAccountAutoApplyTarget | null {
    const applied = this.#benefitsAppliedTo;
    if (applied === null || applied.cartId !== cartId) {
      return null;
    }

    return { loyaltyProvider: applied.loyaltyProvider, providerAccountIds: [] };
  }
}
