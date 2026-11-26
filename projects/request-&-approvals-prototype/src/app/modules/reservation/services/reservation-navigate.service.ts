import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Router } from '@angular/router';

import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentFlowFeatureService } from '@fz-original/app/modules/box-office/shared/services/payment-flow-feature/payment-flow-feature.service';
import { OnsiteSetupModalDialogComponent } from '@fz-original/app/modules/box-office/ticketing/components/onsite-setup-modal-dialog/onsite-setup-modal-dialog.component';
import { reservationSettlementMode } from '@fz-original/app/modules/reservation-settlement/models/reservation-settlement-session.model';
import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
// MessageModalComponent still uses NgbActiveModal; use NgbModal until that component is migrated to CDK Dialog
// eslint-disable-next-line no-restricted-imports -- B2BP: migration pending MessageModalComponent
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { EditReservationAction } from '../models/edit-reservation-action.enum';
import { ReservationFlowTypeEnum } from '../models/reservation_flow_type.enum';
import { Reservation } from '../models/reservation.model';

export interface NavigateToBoxOfficeCheckoutParams {
  cartId: string;
  cityId: number;
  placeId: number;
  planId: number;
  reservationId: string;
  cart?: Cart | null;
  plan?: Plan | null;
}

export interface NavigateToPayReservationParams {
  reservationId: string;
  cart?: Cart | null;
  cartId?: string | null;
  cityId?: number | null;
  paymentOption?: 'full_payment' | 'deposit';
  placeId?: number | null;
  plan?: Plan | null;
  planId?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationNavigateService {
  #destroyRef = inject(DestroyRef);
  #dialog = inject(Dialog);
  #modal = inject(NgbModal);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  #router = inject(Router);
  #translateService = inject(TranslateService);
  #userService = inject(UserService);

  getCreateOnBehalfBusinessCommands(businessId: string): (string | number)[] {
    return this.isMultiPlanReservationFlowEnabled()
      ? ['/reservations/multi/create-on-behalf', businessId]
      : ['/reservations/create-on-behalf', businessId];
  }

  getCreateOnBehalfUrl(): string {
    return this.isMultiPlanReservationFlowEnabled() ? '/reservations/multi/create-on-behalf' : '/reservations/create-on-behalf';
  }

  getMakeReservationUrl(): string {
    const isMultiPlan = this.isMultiPlanReservationFlowEnabled();

    if (this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.on_behalf) {
      return isMultiPlan ? '/reservations/multi/create-on-behalf' : '/reservations/create-on-behalf';
    }

    if (this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.as_business) {
      return isMultiPlan ? '/reservations/multi/create' : '/reservations/create';
    }

    return '';
  }

  getModifyReservationItems(reservation: Reservation, action: EditReservationAction): string {
    const actionPath = action === EditReservationAction.MODIFY_RESERVATION ? 'modify' : '';

    return `${this.getReservationListUrl()}/${reservation.id}/${actionPath}`;
  }

  getReservationListUrl(): string {
    if (this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.on_behalf) {
      return '/reservations/list';
    }

    if (this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.as_business) {
      return '/reservations/user-list';
    }

    return '/reservations/list';
  }

  isMultiPlanReservationFlowEnabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.B2B_MULTIPLAN_RESERVATION_FLOW,
        team: 'b2b-resellers',
      }) === true
    );
  }

  navigateToBoxOfficeCheckout(params: NavigateToBoxOfficeCheckoutParams): void {
    const selectedOnsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    if (selectedOnsiteSetup) {
      this.#navigateToBoxOfficeRoute(selectedOnsiteSetup, params);
    } else {
      this.#showOnsiteSetupModalAndNavigate(params);
    }
  }

  navigateToPayReservation(params: NavigateToPayReservationParams): void {
    const { cart, cartId, cityId, paymentOption = 'full_payment', placeId, plan, reservationId } = params;
    const planId = params.planId ?? plan?.id ?? null;

    if (
      this.#userService.hasPermission(Permissions.CAN_PAY_RESERVATION) ||
      this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF)
    ) {
      this.#navigateToReservationCheckout(reservationId, paymentOption);
      return;
    }

    if (this.#userService.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE)) {
      if (cartId != null && planId != null && placeId != null && cityId != null) {
        this.navigateToBoxOfficeCheckout({ cart, cartId, cityId, placeId, plan, planId, reservationId });
      } else {
        this.#showMissingCheckoutDataModal();
      }
      return;
    }

    this.#showNoPermissionModal();
  }

  toMakeReservation(): void {
    this.#router.navigate([this.getMakeReservationUrl()], { queryParamsHandling: 'merge' });
  }

  toModifyReservationItems(reservation: Reservation, action: EditReservationAction): void {
    const navigationExtras: NavigationExtras = {
      queryParams: { cityId: reservation.cityId, planId: reservation.planId, venueId: reservation.placeId },
    };

    this.#router.navigate([this.getModifyReservationItems(reservation, action)], navigationExtras);
  }

  toReservationDetails(reservation: Reservation): void {
    this.#router.navigate([this.getReservationListUrl(), reservation.id], {
      queryParams: { cityId: reservation.cityId, planId: reservation.planId, venueId: reservation.placeId },
    });
  }

  toReservationList(): void {
    this.#router.navigate([this.getReservationListUrl()]);
  }

  #isReservationSettlementInBoxOfficeEnabled(): boolean {
    return this.#paymentFlowFeatureService.isNewPaymentFlowEnabled();
  }

  #navigateToBoxOfficeRoute(onsiteSetup: OnsiteSetup, params: NavigateToBoxOfficeCheckoutParams): void {
    const { cart, cartId, cityId, placeId, plan, planId, reservationId } = params;

    const state: NavigationExtras['state'] = {
      onsiteSetupId: onsiteSetup.id,
    };

    if (cart != null) {
      state.cart = cart;
    }

    if (plan != null) {
      state.plan = plan;
    }

    if (this.#isReservationSettlementInBoxOfficeEnabled()) {
      this.#router.navigate(['/box-office'], {
        queryParams: {
          cityId,
          mode: reservationSettlementMode,
          planId,
          reservation_cart_id: cartId,
          reservation_id: reservationId,
          venueId: placeId,
        },
        queryParamsHandling: 'merge',
        state,
      });
      return;
    }

    this.#router.navigate(['/box-office/checkout', cartId, reservationId], {
      queryParams: { cityId, planId, venueId: placeId },
      queryParamsHandling: 'merge',
      state,
    });
  }

  #navigateToReservationCheckout(reservationId: string, paymentOption: 'full_payment' | 'deposit'): void {
    const checkoutBaseUrl = this.#userService.isBusiness() ? '/reservations/list' : this.getReservationListUrl();

    this.#router.navigate([`${checkoutBaseUrl}/${reservationId}/checkout/`], {
      queryParams: { paymentOption },
      queryParamsHandling: 'merge',
    });
  }

  #showMissingCheckoutDataModal(): void {
    const modal = this.#modal.open(MessageModalComponent);
    modal.componentInstance.title = this.#translateService.instant('common.errorTitle');
    modal.componentInstance.messages = [this.#translateService.instant('errors.generic')];
  }

  #showNoPermissionModal(): void {
    const modal = this.#modal.open(MessageModalComponent);
    modal.componentInstance.title = this.#translateService.instant('common.errorTitle');
    modal.componentInstance.messages = [this.#translateService.instant('reservation.pay.noPermissionToPay')];
  }

  #showOnsiteSetupModalAndNavigate(params: NavigateToBoxOfficeCheckoutParams): void {
    const dialogRef: DialogRef<OnsiteSetup | null, OnsiteSetupModalDialogComponent> = this.#dialog.open(OnsiteSetupModalDialogComponent, {
      disableClose: false,
      maxWidth: '90vw',
      width: '500px',
    });
    dialogRef.closed.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((onsiteSetup: OnsiteSetup | null | undefined) => {
      if (onsiteSetup) {
        this.#onsiteSetupsStorageService.setConfiguration(onsiteSetup);
        this.#navigateToBoxOfficeRoute(onsiteSetup, params);
      }
    });
  }
}
