import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MembershipsData } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';

import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosCartService } from '../cart/pos-cart.service';
import { PosMemberAccountService } from '../member-account/pos-member-account.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';

/**
 * The POS half of the identify-member flow: the gate, the two entry points and the cart
 * recompute that follows a change. The member itself lives in `MembershipsIdentificationService`,
 * which OSS and POS each provide for their own flow.
 *
 * It is a **lego domain service**, not an 11th facade service: `PointOfSaleComponent` injects it
 * directly and `TicketingStrategy` never learns about it. See `docs/guidelines/ticketing-rearchitect.md`.
 */
@Injectable()
export class PosMembershipsService {
  readonly #cart = inject(PosCartService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #memberAccount = inject(PosMemberAccountService);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #state = inject(PosTicketingState);
  readonly #toast = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #user = inject(UserService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /**
   * `plan` is a plain field, so this predicate is only reactive through its `partner` leg. Callers
   * that live inside a `computed()` must read `activePlan()` themselves — see the header action menu
   * in `PointOfSaleComponent`.
   */
  canIdentifyMember(): boolean {
    return (
      this.#user.hasPermission(Permissions.CAN_MANAGE_MEMBERSHIPS) &&
      !!this.#state.partner?.hasMemberships &&
      this.#state.plan?.id != null &&
      !this.#state.multiPlanCartEnabled &&
      !this.#memberAccount.canIdentifyMemberAccount()
    );
  }

  identifyMembershipsMember(): void {
    const partnerId = this.#state.partner?.id;
    const planId = this.#state.plan?.id;
    if (!this.canIdentifyMember() || partnerId == null || planId == null) {
      return;
    }

    if (this.#rejectIdentifyForCoupon()) {
      return;
    }

    this.#memberships
      .identify$(partnerId, planId, () => !this.#rejectIdentifyForCoupon())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#refreshAfterMemberChange());
  }

  get membershipsData(): MembershipsData {
    return this.#memberships.data();
  }

  removeMembershipsMember(): void {
    this.#memberships
      .remove$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#refreshAfterMemberChange());
  }

  #rejectIdentifyForCoupon(): boolean {
    if (this.#state.coupon == null && this.#state.combinedCoupons.length === 0) {
      return false;
    }

    this.#toast.addError(this.#translate.instant('boxOffice.memberships.identifyMember.blockedByCoupon'));
    return true;
  }

  #refreshAfterMemberChange(): void {
    this.#cart.updateCartTotalImmediate();
    this.#viewUpdate.markForCheck();
  }
}
