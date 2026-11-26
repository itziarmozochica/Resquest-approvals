import { computed, inject, Injectable } from '@angular/core';

import { DistributorRouteService } from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { BaseResponse } from '../../../shared/models/base-response';
import { FeatureFlags } from '../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { OnBehalfScopeStore } from '../../../shared/services/distributor/on-behalf-scope.store';
import { OnBehalfTargetService } from '../../../shared/services/distributor/on-behalf-target.service';
import { Balance } from '../../settings/shared/models/balance.model';
import { BusinessPaymentTypeEnum } from '../../settings/shared/models/business-payment-type.enum';
import { Business } from '../../settings/shared/models/business.model';
import { PaymentSettings } from '../../settings/shared/models/payment-settings.model';
import { BalanceQuery } from '../../settings/shared/services/balance-query';
import { BalanceService } from '../../settings/shared/services/balance.service';
import { BusinessPaymentSettingsService } from '../../settings/shared/services/business-payment-settings.service';
import { BusinessService } from '../../settings/shared/services/business.service';
import { PaymentMethod, PaymentMethodOption } from '../models/payment-methods.enum';
import { PaymentOption } from '../models/payment-option.enum';
import { ReservationCheckoutStateService } from './reservation-checkout-state/reservation-checkout-state.service';

const BALANCES_PAGE_SIZE = 100;

const paymentMethodsOrder: PaymentMethod[] = [
  PaymentMethod.CARD,
  PaymentMethod.PAYMENT_LINK,
  PaymentMethod.BALANCE,
  PaymentMethod.BOX_OFFICE,
  PaymentMethod.MARK_AS_PAID,
];

@Injectable()
export class GetAvailablePaymentMethodsService {
  #balance: Balance | null = null;
  #balanceService = inject(BalanceService);
  #businessPaymentSettingsService = inject(BusinessPaymentSettingsService);
  #businessService = inject(BusinessService);
  #distributorRoute = inject(DistributorRouteService);
  readonly #onBehalfScope = inject(OnBehalfScopeStore);
  readonly #onBehalfTarget = inject(OnBehalfTargetService);
  #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  #toastService = inject(ToastService);
  #translateService = inject(TranslateService);
  #userService = inject(UserService);
  currentReservation = computed(() => this.#reservationCheckoutStateService.state().reservation);
  selectedCart = computed(() => this.#reservationCheckoutStateService.state().reservationCart);

  getAvailablePaymentMethods(): Observable<PaymentMethodOption[]> {
    const hasDepositConfigured = !!this.#reservationCheckoutStateService.state().reservationCart?.deposit;
    const isDepositSelected =
      hasDepositConfigured && this.#reservationCheckoutStateService.state().selectedPaymentOption === PaymentOption.DEPOSIT;

    if (this.#isCardPaymentRestricted()) {
      return this.#getResellerRestrictedPaymentMethods(isDepositSelected);
    }

    const availablePaymentMethods: PaymentMethodOption[] = [];

    availablePaymentMethods.push({
      value: PaymentMethod.PAYMENT_LINK,
      label: this.#translateService.instant('reservation.checkout.paymentSelector.paymentLink.paymentMethod.title'),
    });

    if (this.#userService.hasPermission('can_view_box_office') && !isDepositSelected) {
      availablePaymentMethods.push({
        value: PaymentMethod.BOX_OFFICE,
        label: this.#translateService.instant('reservation.checkout.paymentSelector.payAtBoxOffice.paymentMethod.title'),
      });
    }

    if (this.#userService.hasPermission('can_mark_as_paid_reservation')) {
      availablePaymentMethods.push({
        value: PaymentMethod.MARK_AS_PAID,
        label: this.#translateService.instant('reservation.checkout.paymentSelector.markAsPaid.paymentMethod.title'),
      });

      availablePaymentMethods.unshift({
        value: PaymentMethod.CARD,
        label: this.#translateService.instant('reservation.checkout.paymentSelector.card.paymentMethod.title'),
      });
    }

    return this.#getBusinessPaymentMethods(isDepositSelected).pipe(
      switchMap(businessPaymentMethods => {
        const paymentMethods = [...businessPaymentMethods, ...availablePaymentMethods];
        if (!paymentMethods.some(paymentMethod => paymentMethod.value === PaymentMethod.CARD)) {
          paymentMethods.unshift({
            value: PaymentMethod.CARD,
            label: this.#translateService.instant('reservation.checkout.paymentSelector.card.paymentMethod.title'),
          });
        }

        return of(this.#getPaymentMethodsOrdered(paymentMethods));
      }),
      catchError(() => {
        return of(this.#getPaymentMethodsOrdered(availablePaymentMethods));
      }),
    );
  }

  getAvailablePaymentMethodsToPayNow(): Observable<PaymentMethodOption[]> {
    if (this.#isCardPaymentRestricted()) {
      return this.#getResellerRestrictedPaymentMethods(false);
    }

    const availablePaymentMethods: PaymentMethodOption[] = [];

    if (this.#userService.hasPermission('can_mark_as_paid_reservation')) {
      availablePaymentMethods.push({
        value: PaymentMethod.MARK_AS_PAID,
        label: this.#translateService.instant('reservation.checkout.paymentSelector.markAsPaid.paymentMethod.title'),
      });

      availablePaymentMethods.unshift({
        value: PaymentMethod.CARD,
        label: this.#translateService.instant('reservation.checkout.paymentSelector.card.paymentMethod.title'),
      });
    }

    return this.#getBusinessPaymentMethods(false).pipe(
      switchMap(businessPaymentMethods => {
        const paymentMethods = [...businessPaymentMethods, ...availablePaymentMethods];
        if (!paymentMethods.some(paymentMethod => paymentMethod.value === PaymentMethod.CARD)) {
          paymentMethods.unshift({
            value: PaymentMethod.CARD,
            label: this.#translateService.instant('reservation.checkout.paymentSelector.card.paymentMethod.title'),
          });
        }

        return of(this.#getPaymentMethodsOrdered(paymentMethods));
      }),
      catchError(() => {
        return of(this.#getPaymentMethodsOrdered(availablePaymentMethods));
      }),
    );
  }

  getBalance(): Balance | null {
    return this.#balance;
  }

  #buildPrepaidResellerMethods(): PaymentMethodOption[] {
    const methods: PaymentMethodOption[] = [
      {
        value: PaymentMethod.CARD,
        label: this.#translateService.instant('reservation.checkout.paymentSelector.card.paymentMethod.title'),
      },
    ];

    methods.push({
      value: PaymentMethod.PAYMENT_LINK,
      label: this.#translateService.instant('reservation.checkout.paymentSelector.paymentLink.paymentMethod.title'),
    });

    return methods;
  }

  #fetchBalance(): Observable<Balance | null> {
    const reservation = this.currentReservation();
    const businessId = reservation?.businessId ?? this.#userService.getUser()?.business?.id;

    if (this.#distributorRoute.pairTarget() !== null) {
      const partnerId = this.#settlingPartnerId();
      if (partnerId === undefined) {
        return of(null);
      }

      return this.#balanceService.getDistributorBalances({ itemsPerPage: BALANCES_PAGE_SIZE, page: 1 }).pipe(
        map(response => {
          const balance = response?.data?.balances.find(candidate => candidate.partnerId === partnerId);
          return balance === undefined || balance.amount === null || balance.currency === null
            ? null
            : new Balance(balance.amount, balance.currency);
        }),
        catchError(() => of(null)),
      );
    }

    const servedDistributorId = this.#servedDistributorId();
    if (servedDistributorId !== null) {
      return this.#balanceService.getDistributorBalance({ distributorOrganizationId: servedDistributorId }).pipe(
        map(response => response?.data ?? null),
        catchError(() => of(null)),
      );
    }

    if (!businessId || !this.#userService.getUser() || !this.#partnerService.getPartner()?.id) {
      return of(null);
    }

    const userId = this.#userService.isBusiness() ? this.#userService.getUser()!.id : null;
    const partnerId = this.#partnerService.getPartner()!.id;

    const balanceQuery: BalanceQuery = {
      partnerId,
      businessId,
      userId,
    };

    return this.#balanceService.getBalance(balanceQuery).pipe(
      map(response => response?.data || null),
      catchError(() => {
        return of(null);
      }),
    );
  }

  #getBusinessPaymentMethods(forDeposit: boolean): Observable<PaymentMethodOption[]> {
    const availablePaymentMethods: PaymentMethodOption[] = [];

    return this.#getPaymentSettings().pipe(
      switchMap(paymentSettings => {
        if (paymentSettings?.error) {
          this.#toastService.add({
            message: this.#translateService.instant('reservation.checkout.paymentSelector.errorGettingPaymentSettings'),
            type: ToastType.ERROR,
          });
        }

        if (!paymentSettings) {
          return of(availablePaymentMethods);
        }

        if (paymentSettings.data?.paymentType === BusinessPaymentTypeEnum.BALANCE) {
          return this.#fetchBalance().pipe(
            map(balance => {
              this.#balance = balance;

              const cart = this.selectedCart();
              const amountToPay = forDeposit && cart?.deposit?.calculatedAmount ? cart.deposit.calculatedAmount : cart?.total;

              let description = '';
              if ((amountToPay?.amount ?? 0) > (this.#balance?.amount ?? 0)) {
                description = this.#translateService.instant(
                  'reservation.checkout.paymentSelector.balance.paymentMethod.insufficientBalance',
                );
              }
              if (amountToPay?.currency !== this.#balance?.currency) {
                description = this.#translateService.instant(
                  'reservation.checkout.paymentSelector.balance.paymentMethod.differentCurrency',
                );
              }

              availablePaymentMethods.push({
                value: PaymentMethod.BALANCE,
                label: this.#translateService.instant('reservation.checkout.paymentSelector.balance.paymentMethod.title'),
                description,
              });
            }),
            map(() => availablePaymentMethods),
          );
        }

        return of(availablePaymentMethods);
      }),
      catchError(() => {
        return of(availablePaymentMethods);
      }),
    );
  }

  #getResellerRestrictedPaymentMethods(isDepositSelected: boolean): Observable<PaymentMethodOption[]> {
    return this.#getPaymentSettings().pipe(
      switchMap(paymentSettings => {
        if (paymentSettings?.error) {
          this.#toastService.add({
            message: this.#translateService.instant('reservation.checkout.paymentSelector.errorGettingPaymentSettings'),
            type: ToastType.ERROR,
          });
        }

        if (paymentSettings?.data?.paymentType === BusinessPaymentTypeEnum.BALANCE) {
          return this.#fetchBalance().pipe(
            map(balance => {
              this.#balance = balance;

              const cart = this.selectedCart();
              const amountToPay = isDepositSelected && cart?.deposit?.calculatedAmount ? cart.deposit.calculatedAmount : cart?.total;

              let description = '';
              if ((amountToPay?.amount ?? 0) > (this.#balance?.amount ?? 0)) {
                description = this.#translateService.instant(
                  'reservation.checkout.paymentSelector.balance.paymentMethod.insufficientBalance',
                );
              }
              if (amountToPay?.currency !== this.#balance?.currency) {
                description = this.#translateService.instant(
                  'reservation.checkout.paymentSelector.balance.paymentMethod.differentCurrency',
                );
              }

              return [
                {
                  value: PaymentMethod.BALANCE,
                  label: this.#translateService.instant('reservation.checkout.paymentSelector.balance.paymentMethod.title'),
                  description,
                },
              ];
            }),
          );
        }

        return of(this.#buildPrepaidResellerMethods());
      }),
      catchError(() => of(this.#buildPrepaidResellerMethods())),
    );
  }

  #isCardPaymentRestricted(): boolean {
    const isBypassEnabled =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.RESELLER_CARD_PAYMENT_BYPASS_ON_BEHALF,
        team: 'b2b-resellers',
      }) ?? false;
    if (isBypassEnabled && this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF)) {
      return false;
    }
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.RESELLER_HIDE_CARD_PAYMENT) ?? false;
  }

  #getPaymentMethodsOrdered(paymentMethods: PaymentMethodOption[]): PaymentMethodOption[] {
    return paymentMethods.sort(
      (a, b) => paymentMethodsOrder.indexOf(a.value as PaymentMethod) - paymentMethodsOrder.indexOf(b.value as PaymentMethod),
    );
  }

  #settlingPartnerId(): number | undefined {
    return this.currentReservation()?.partnerId ?? this.#distributorRoute.pairTarget()?.targetOrganizationId;
  }

  #getPaymentSettings(): Observable<BaseResponse<PaymentSettings | null> | null> {
    const reservation = this.currentReservation();

    if (this.#distributorRoute.pairTarget() !== null) {
      const partnerId = this.#settlingPartnerId();
      if (partnerId === undefined) {
        return of(null);
      }

      return this.#businessPaymentSettingsService.getDistributorPartnerPaymentSettings({ partnerId });
    }

    // Before the business guard below: on Buy Now there is no reservation and the acting partner has no
    // business of its own, so that guard would answer null for a journey the distributor can serve.
    const servedDistributorId = this.#servedDistributorId();
    if (servedDistributorId !== null) {
      return this.#paymentSettingsThroughDistributor(servedDistributorId);
    }

    const businessId = reservation?.businessId ?? this.#userService.getUser()?.business?.id;

    if (!businessId || !this.#partnerService.getPartner()?.id || !this.#userService.getUserId()) {
      return of(null);
    }

    const getBusiness = this.#userService.isBusiness() ? this.#businessService.getMyBusiness : this.#businessService.getBusiness;

    return getBusiness
      .call(this.#businessService, {
        businessId,
        organizationId: this.#partnerService.getPartner()!.id,
        userId: this.#userService.isBusiness() ? this.#userService.getUserId()! : undefined,
      })
      .pipe(
        switchMap((response: BaseResponse<Business | null>) => {
          if (!response.data) {
            return of(new BaseResponse<PaymentSettings | null>(null, response.error));
          }

          return this.#businessPaymentSettingsService.getBusinessPaymentSettings({
            userId: response.data.userId,
            partnerId: this.#partnerService.getPartner()!.id,
          });
        }),
        map((paymentSettings: BaseResponse<PaymentSettings | null> | null) => paymentSettings),
      );
  }

  /**
   * The distributor this checkout is serving, from the cart the session opened or, failing that, from
   * the reservation. Buy Now has no reservation yet, so the cart is the only thing that answers there.
   */
  #servedDistributorId(): number | null {
    const state = this.#reservationCheckoutStateService.state();
    const fromCart = this.#onBehalfScope.forCart(state.reservationCart?.id)?.distributorId ?? null;
    if (fromCart !== null) {
      return fromCart;
    }

    return this.#onBehalfTarget.actsOnBehalf() ? (state.reservation?.distributorId ?? null) : null;
  }

  #paymentSettingsThroughDistributor(distributorOrganizationId: number): Observable<BaseResponse<PaymentSettings | null>> {
    return this.#businessPaymentSettingsService.getDistributorPaymentSettings({ distributorOrganizationId });
  }
}
