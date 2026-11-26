import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { clickCancelPayReservation } from '@fz-original/app/modules/reservation/tracking/events/click-cancel-pay-reservation.event';
import { depositPaymentOptionSelected } from '@fz-original/app/modules/reservation/tracking/events/deposit-payment-option-selected.event';
import { depositTrackingContextFromCart } from '@fz-original/app/modules/reservation/tracking/models/deposit-tracking-context.model';
import { Balance } from '@fz-original/app/modules/settings/shared/models/balance.model';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { NavigationService } from '@fz-original/app/shared/services/navigation/navigation.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntDividerComponent } from '@ignite/legacy/components/ignt-divider/ignt-divider.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, take, timeout } from 'rxjs/operators';

import { BreakpointStateService } from '../../../../app/services/breakpoint/breakpoint-state.service';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { Permissions } from '../../../../shared/services/user/permissions';
import { isDepositInFinalStateUtil } from '../../../../shared/utils/deposit.util';
import { isPlaceholderEmail } from '../../../../shared/utils/placeholder-email.util';
import { PaymentMethod, PaymentMethodOption } from '../../models/payment-methods.enum';
import { PaymentOption } from '../../models/payment-option.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../models/reservation-checkout-flow-type.enum';
import { GetAvailablePaymentMethodsService } from '../../services/get-available-payment-methods.service';
import { ReservationCheckoutStateService } from '../../services/reservation-checkout-state/reservation-checkout-state.service';
import { ReservationCountdownService } from '../../services/reservation-countdown.service';
import { ReservationNavigateService } from '../../services/reservation-navigate.service';
import { ReservationPaymentOptionService } from '../../services/reservation-payment-option.service';
import { ReservationsService } from '../../services/reservations.service';
import { resolveExpirationCountdownDeadlineLabelKey } from '../../utils/resolve-expiration-countdown-deadline-label-key.util';
import { DepositInfoModalComponent } from '../deposit-info-modal/deposit-info-modal.component';
import { DepositStatusBadgeComponent } from '../deposit-status-badge/deposit-status-badge.component';
import { PaymentMethodBalanceComponent } from '../reservation-checkout-payments/payment-method-balance/payment-method-balance.component';
import { PaymentMethodCardComponent } from '../reservation-checkout-payments/payment-method-card/payment-method-card.component';
import { PaymentMethodMarkAsPaidComponent } from '../reservation-checkout-payments/payment-method-mark-as-paid/payment-method-mark-as-paid.component';
import { PaymentMethodPayAtBoxOfficeComponent } from '../reservation-checkout-payments/payment-method-pay-at-box-office/payment-method-pay-at-box-office.component';
import { PaymentMethodPaymentLinkComponent } from '../reservation-checkout-payments/payment-method-payment-link/payment-method-payment-link.component';
import { PaymentMethodZeroAmountComponent } from '../reservation-checkout-payments/payment-method-zero-amount/payment-method-zero-amount.component';
import { DepositTermsCheckboxComponent } from '../reservation-checkout-payments/shared/deposit-terms-checkbox/deposit-terms-checkbox.component';
import { ReservationExpirationCountdownAlertComponent } from '../reservation-expiration-countdown-alert/reservation-expiration-countdown-alert.component';

export const EXTERNAL_RESERVATION_ID_PERSIST_TIMEOUT_MS = 10_000;

@Component({
  selector: 'app-reservation-checkout-payment-selector',
  templateUrl: './reservation-checkout-payment-selector.component.html',
  styleUrls: ['./reservation-checkout-payment-selector.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ReservationCountdownService],
  imports: [
    TranslateModule,
    CurrencyPipe,
    NgTemplateOutlet,
    IgntRadioGroupComponent,
    IgntListItemComponent,
    IgntRadioComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    ReactiveFormsModule,
    FormsModule,
    PaymentMethodPaymentLinkComponent,
    PaymentMethodBalanceComponent,
    PaymentMethodPayAtBoxOfficeComponent,
    PaymentMethodMarkAsPaidComponent,
    PaymentMethodCardComponent,
    PipesModule,
    DepositStatusBadgeComponent,
    DepositTermsCheckboxComponent,
    PaymentMethodZeroAmountComponent,
    IgntSkeletonComponent,
    IgntSkeletonBaseComponent,
    IgntWrapperCardComponent,
    IgntDividerComponent,
    ReservationExpirationCountdownAlertComponent,
    SharedComponentsModule,
  ],
})
export class ReservationCheckoutPaymentSelectorComponent implements OnInit, OnDestroy {
  #breakpointStateService = inject(BreakpointStateService);
  #countdownService = inject(ReservationCountdownService);
  #destroyRef = inject(DestroyRef);
  #formBuilder = inject(FormBuilder);
  #getAvailablePaymentMethodsService = inject(GetAvailablePaymentMethodsService);
  #modalService = inject(NgbModal);
  #navigationService = inject(NavigationService);
  #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #reservationPaymentOptionService = inject(ReservationPaymentOptionService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  #reservationNavigateService = inject(ReservationNavigateService);
  #reservationsService = inject(ReservationsService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #toastService = inject(ToastService);
  readonly #fzTracking = inject(FzTrackingService);
  #translateService = inject(TranslateService);
  #userService = inject(UserService);
  activeCart = computed(() => this.#reservationCheckoutStateService.state().reservationCart);
  agreeToTerms = signal<boolean>(false);

  agreeToTermsValue = computed(() => {
    if (this.isDepositInFinalState()) {
      return true;
    }
    return this.agreeToTerms();
  });
  backButtonLabel = computed(() => {
    if (!this.currentReservation()?.id) {
      return 'reservation.checkout.paymentSelector.payLater.back';
    }
    return 'reservation.checkout.paymentSelector.back';
  });
  balance = signal<Balance | null>(null);
  currentPlan = computed(() => this.#reservationCheckoutStateService.state().plan);
  currentReservation = computed(() => this.#reservationCheckoutStateService.state().reservation);
  hasPlaceholderEmail = computed(() => isPlaceholderEmail(this.currentReservation()?.ownerEmail));
  depositCheckoutTranslationsEnabled = computed(
    () => this.#optimizelyService.isFeatureEnabled(FeatureFlags.DEPOSIT_CHECKOUT_TRANSLATIONS) === true,
  );
  currentDeposit = computed(() => this.currentReservation()?.deposit ?? this.reservationCart()?.deposit ?? null);
  depositExpirationDateFormatted = computed(() => {
    const deposit = this.currentDeposit();
    const plan = this.currentPlan();
    if (!deposit?.expirationDate || !plan?.timezone || isDepositInFinalStateUtil(deposit)) {
      return null;
    }
    if (this.#countdownService.isReservationExpired(deposit.expirationDate, plan.timezone)) {
      return null;
    }
    return this.#countdownService.formatExpirationDate(deposit.expirationDate, plan.timezone);
  });
  expirationDateFormatted = computed(() => {
    const reservation = this.currentReservation();
    const plan = this.currentPlan();
    if (!reservation?.expirationDate || !plan?.timezone) {
      return null;
    }
    return this.#countdownService.formatExpirationDate(reservation.expirationDate, plan.timezone);
  });

  expirationDateFormattedForDepositContext = computed(() => {
    const deposit = this.currentDeposit();
    const reservation = this.currentReservation();
    const plan = this.currentPlan();
    if (!plan?.timezone) {
      return this.depositExpirationDateFormatted() ?? this.expirationDateFormatted();
    }

    const depositActive =
      !!deposit?.expirationDate &&
      !isDepositInFinalStateUtil(deposit) &&
      !this.#countdownService.isReservationExpired(deposit.expirationDate, plan.timezone);
    const reservationActive =
      !!reservation?.expirationDate && !this.#countdownService.isReservationExpired(reservation.expirationDate, plan.timezone);

    if (depositActive && reservationActive) {
      const earliest =
        new Date(deposit!.expirationDate!) <= new Date(reservation!.expirationDate!)
          ? deposit!.expirationDate!
          : reservation!.expirationDate!;
      return this.#countdownService.formatExpirationDate(earliest, plan.timezone);
    }
    return this.depositExpirationDateFormatted() ?? this.expirationDateFormatted();
  });
  checkoutExpirationCountdownDeadlineLabelKey = computed(() =>
    resolveExpirationCountdownDeadlineLabelKey(this.reservationCart()?.deposit ?? this.currentDeposit()),
  );
  flowType = this.#reservationCheckoutStateService.getStateProp('flowType');
  isBalanceInBadState = computed(() => {
    if (this.selectedPaymentMethod() !== PaymentMethod.BALANCE) {
      return false;
    }
    const balance = this.balance();
    const cart = this.activeCart();
    const forDeposit = this.isDepositSelected();
    const amountToPay = forDeposit && cart?.deposit?.calculatedAmount ? cart.deposit.calculatedAmount : cart?.total;
    const balanceCurrency = balance?.currency;
    const amountToPayCurrency = amountToPay?.currency;
    const isBalanceDifferentCurrency = balanceCurrency != null && amountToPayCurrency != null && balanceCurrency !== amountToPayCurrency;
    const isBalanceInsufficient = (balance?.amount ?? 0) < (amountToPay?.amount ?? 0);
    return isBalanceDifferentCurrency || isBalanceInsufficient;
  });
  isBuyNowFlow = computed(() => this.flowType() === ReservationCheckoutFlowTypeEnum.BuyNow);
  reservationCart = computed(() => this.#reservationCheckoutStateService.state().reservationCart);
  isDepositInFinalState = computed(() => {
    const deposit = this.reservationCart()?.deposit;
    return isDepositInFinalStateUtil(deposit);
  });
  isDepositOptionAvailable = computed(() => {
    const cart = this.reservationCart();
    const deposit = cart?.deposit;
    if (!deposit?.calculatedAmount?.amount) {
      return false;
    }
    if (isDepositInFinalStateUtil(deposit)) {
      return false;
    }
    const remaining = cart?.total?.amount ?? 0;
    return remaining > deposit.calculatedAmount.amount;
  });
  isDepositSelected = computed(() => {
    const deposit = this.reservationCart()?.deposit;
    const selectedPaymentOption = this.#reservationCheckoutStateService.state().selectedPaymentOption;
    const depositInFinalStateValue = isDepositInFinalStateUtil(deposit);

    if (depositInFinalStateValue) {
      return false;
    }

    return selectedPaymentOption === PaymentOption.DEPOSIT;
  });
  isPaymentLinkLoading = signal<boolean>(false);
  isPersistingExternalReservationId = signal<boolean>(false);
  selectedPaymentMethod = signal<PaymentMethod | null>(null);
  showTermsCheckbox = computed(() => {
    return !!this.reservationCart()?.deposit?.termsAndConditionsUrl;
  });
  isConfirmButtonDisabled = computed(() => {
    const termsNotAgreed =
      !this.isDepositInFinalState() && this.isDepositSelected() && this.showTermsCheckbox() && !this.agreeToTermsValue();
    const paymentLinkLoading = this.selectedPaymentMethod() === PaymentMethod.PAYMENT_LINK && this.isPaymentLinkLoading();
    return termsNotAgreed || paymentLinkLoading || this.isPersistingExternalReservationId();
  });
  isExpired = computed(() => this.#countdownService.isExpired());
  isLoadingPaymentMethods = signal<boolean>(false);
  isLoadingCheckout = computed(() => this.#reservationCheckoutStateService.state().loadingCheckout || this.isLoadingPaymentMethods());
  isTablet = computed(
    () => this.#breakpointStateService.getStateProp('isTablet')() || this.#breakpointStateService.getStateProp('isMobile')(),
  );
  isTermsCheckboxDisabled = computed(() => {
    return !this.isDepositSelected() || this.isBalanceInBadState();
  });
  noPaymentOptionsTemplate = computed(() => {
    const isExpiredValue = this.isExpired();
    return isExpiredValue ? 'expiredReservationTemplate' : 'zeroAmountTemplate';
  });
  paymentForm: UntypedFormGroup;
  paymentMethods = signal<PaymentMethodOption[]>([]);
  protected readonly paymentMethodsEnum = PaymentMethod;
  protected readonly paymentOption = PaymentOption;
  paymentOptionForm: UntypedFormGroup;
  remainingAmountConfig = computed(() => {
    const deposit = this.reservationCart()?.deposit;

    switch (deposit?.status) {
      case 'paid':
        return {
          titleKey: 'reservation.checkout.payRemainingAmount',
          descriptionKey: 'reservation.checkout.payRemainingAmountDescription',
        };
      case 'skipped':
        return {
          titleKey: 'reservation.checkout.payTotalAmount',
          descriptionKey: 'reservation.checkout.payTotalAmountDescription',
        };
      default:
        return null;
    }
  });
  shouldShowPaymentOptions = computed(() => {
    const isExpiredValue = this.isExpired();
    const totalAmount = this.reservationCart()?.total?.amount ?? 0;
    return !isExpiredValue && totalAmount > 0;
  });
  showCoupon = computed(() => {
    return !this.isDepositSelected();
  });
  showTermsError = signal<boolean>(false);
  termsAndConditionsUrl = computed(() => {
    return this.reservationCart()?.deposit?.termsAndConditionsUrl || null;
  });
  timeLeftCountdown = computed(() => this.#countdownService.timeLeftCountdown());

  triggerBalanceConfirm = new Subject<void>();
  triggerCardConfirm = new Subject<void>();
  triggerFreeConfirm = new Subject<void>();
  triggerMarkAsPaidConfirm = new Subject<void>();
  triggerPayAtBoxOfficeConfirm = new Subject<void>();
  triggerPaymentLinkConfirm = new Subject<void>();

  constructor() {
    this.paymentForm = this.#formBuilder.group({
      paymentMethod: '',
    });
    this.paymentOptionForm = this.#formBuilder.group({
      paymentOption: null,
    });

    const loadTrigger = computed(() => ({
      depositInFinalState: this.isDepositInFinalState(),
      depositSelected: this.isDepositSelected(),
      reservation: this.currentReservation(),
      reservationCheckoutFlowType: this.flowType(),
    }));

    toObservable(loadTrigger)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#loadPaymentMethods());

    effect(() => {
      const reservation = this.currentReservation();
      const plan = this.currentPlan();
      const deposit = this.currentDeposit();

      const reservationExpiration = reservation?.expirationDate;
      const depositExpirationRaw = deposit?.expirationDate && !isDepositInFinalStateUtil(deposit) ? deposit.expirationDate : undefined;
      const depositExpirationForCountdown =
        depositExpirationRaw && plan?.timezone && !this.#countdownService.isReservationExpired(depositExpirationRaw, plan.timezone)
          ? depositExpirationRaw
          : undefined;
      const reservationExpirationForCountdown =
        reservationExpiration && plan?.timezone && !this.#countdownService.isReservationExpired(reservationExpiration, plan.timezone)
          ? reservationExpiration
          : undefined;

      const expirationForCountdown =
        depositExpirationForCountdown && reservationExpirationForCountdown
          ? new Date(depositExpirationForCountdown) <= new Date(reservationExpirationForCountdown)
            ? depositExpirationForCountdown
            : reservationExpirationForCountdown
          : (depositExpirationForCountdown ?? reservationExpirationForCountdown);

      if (expirationForCountdown && plan?.timezone) {
        this.#countdownService.initializeCountdown(expirationForCountdown, plan.timezone);
      } else if (
        reservationExpiration &&
        plan?.timezone &&
        this.#countdownService.isReservationExpired(reservationExpiration, plan.timezone)
      ) {
        this.#countdownService.initializeCountdown(reservationExpiration, plan.timezone);
      } else {
        this.#countdownService.resetCountdown();
      }
    });

    effect(() => {
      if (!this.isDepositOptionAvailable() && this.isDepositSelected()) {
        this.#reservationPaymentOptionService.switchToPaymentOption(PaymentOption.FULL_PAYMENT);
      }
    });
  }

  getConfirmButtonLabel(): string {
    const method = this.selectedPaymentMethod();
    if (method === PaymentMethod.BALANCE && this.isDepositSelected()) {
      return 'reservation.checkout.paymentSelector.balance.secureItNow';
    }
    if (method === PaymentMethod.BALANCE) {
      return 'reservation.checkout.paymentSelector.balance.payWithBalance';
    }
    if (method === PaymentMethod.MARK_AS_PAID) {
      return 'reservation.checkout.paymentSelector.markAsPaid.markAsPaid';
    }
    if (method === PaymentMethod.PAYMENT_LINK) {
      return 'reservation.checkout.paymentSelector.paymentLink.sendPaymentLink';
    }
    if (method === PaymentMethod.BOX_OFFICE) {
      return 'reservation.checkout.paymentSelector.payAtBoxOffice.payAtTheBoxOffice';
    }
    return 'reservation.checkout.paymentSelector.card.confirm';
  }

  goBack(): void {
    this.isPersistingExternalReservationId.set(true);
    this.#persistExternalReservationId()
      .pipe(finalize(() => this.isPersistingExternalReservationId.set(false)))
      .subscribe(() => this.#navigateBack());
  }

  #navigateBack(): void {
    const previousUrl = this.#navigationService.previousUrl;
    const hasMakeReservationInPreviousUrl = /\/make-reservation(?:\/|\?|$)/.test(previousUrl || '');
    const hasModifyReservationInPreviousUrl = /\/(?:reschedule|modify|reduce|increase)(?:\/|\?|$)/.test(previousUrl || '');
    if (this.currentReservation()) {
      const depositContext = depositTrackingContextFromCart(this.reservationCart());
      this.#fzTracking.track(
        clickCancelPayReservation({
          ...depositContext,
          cartId: this.reservationCart()?.id ?? '',
          channelId: this.reservationCart()?.channel?.id ?? '',
          paymentOption: this.#reservationCheckoutStateService.state().selectedPaymentOption ?? PaymentOption.FULL_PAYMENT,
          planId: this.currentPlan()?.id ?? -1,
          reservationFlowType: this.#userService.getReservationFlowType(),
          reservationId: this.currentReservation()?.id ?? '',
        }),
      );
    }
    if (hasMakeReservationInPreviousUrl || hasModifyReservationInPreviousUrl || previousUrl === undefined) {
      const reservation = this.currentReservation();

      if (reservation !== null) {
        this.#reservationNavigateService.toReservationDetails(reservation);
      } else {
        this.#router.navigateByUrl(this.#reservationNavigateService.getReservationListUrl());
      }
    } else {
      this.#navigationService.back();
    }
  }

  handlePaymentConfirm(): void {
    const method = this.selectedPaymentMethod();
    if (!method) {
      return;
    }

    const requiresTermsAcceptance =
      !this.isDepositInFinalState() && this.isDepositSelected() && this.showTermsCheckbox() && !this.agreeToTermsValue();

    if (requiresTermsAcceptance) {
      this.showTermsError.set(true);
      return;
    }

    this.isPersistingExternalReservationId.set(true);
    this.#persistExternalReservationId()
      .pipe(finalize(() => this.isPersistingExternalReservationId.set(false)))
      .subscribe(() => {
        switch (method) {
          case PaymentMethod.CARD:
            this.triggerCardConfirm.next();
            break;
          case PaymentMethod.BALANCE:
            this.triggerBalanceConfirm.next();
            break;
          case PaymentMethod.PAYMENT_LINK:
            this.triggerPaymentLinkConfirm.next();
            break;
          case PaymentMethod.MARK_AS_PAID:
            this.triggerMarkAsPaidConfirm.next();
            break;
          case PaymentMethod.BOX_OFFICE:
            this.triggerPayAtBoxOfficeConfirm.next();
            break;
        }
      });
  }

  handleZeroAmountConfirm(): void {
    this.isPersistingExternalReservationId.set(true);
    this.#persistExternalReservationId()
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.isPersistingExternalReservationId.set(false)),
      )
      .subscribe(() => this.triggerFreeConfirm.next());
  }

  #persistExternalReservationId(): Observable<void> {
    const ffEnabled =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.RESERVATION_EXTERNAL_RESERVATION_ID,
        team: 'distribution',
      }) ?? false;
    const canReserveCart = this.#userService.hasPermission(Permissions.CAN_RESERVE_CART);
    const canReserveOnBehalf = this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF);
    if (!((ffEnabled && canReserveCart) || canReserveOnBehalf)) {
      return of(undefined);
    }
    const state = this.#reservationCheckoutStateService.state();
    const reservationId = state.reservation?.id;
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    const currentValue = state.reservation?.externalReservationId ?? null;
    const newValue = state.externalReservationId;
    if (!reservationId || !partnerId || !userId || newValue == null || newValue === currentValue) {
      return of(undefined);
    }
    return this.#reservationsService.setExternalReservationId(partnerId, userId, reservationId, newValue).pipe(
      take(1),
      timeout(EXTERNAL_RESERVATION_ID_PERSIST_TIMEOUT_MS),
      map(response => {
        if (response.error) {
          this.#showExternalReservationIdErrorToast();
          return;
        }
        const reservation = this.#reservationCheckoutStateService.state().reservation;
        if (reservation) {
          this.#reservationCheckoutStateService.updateStateProp('reservation', {
            ...reservation,
            externalReservationId: response.data?.externalReservationId ?? null,
          });
        }
      }),
      catchError(error => {
        console.error('Failed to persist external reservation id', error);
        this.#showExternalReservationIdErrorToast();
        return of(undefined);
      }),
    );
  }

  #showExternalReservationIdErrorToast(): void {
    this.#toastService.add({
      title: this.#translateService.instant('reservation.externalReservationId.toast.errorTitle'),
      message: this.#translateService.instant('reservation.externalReservationId.toast.errorMessage'),
      sentiment: AlertSentiment.danger,
      autoHide: true,
    });
  }

  navigateToCreateReservation(): void {
    const url = this.#reservationNavigateService.getMakeReservationUrl();
    this.#router.navigate([url], { queryParamsHandling: 'merge' });
  }

  ngOnDestroy(): void {
    this.triggerBalanceConfirm.complete();
    this.triggerCardConfirm.complete();
    this.triggerFreeConfirm.complete();
    this.triggerMarkAsPaidConfirm.complete();
    this.triggerPayAtBoxOfficeConfirm.complete();
    this.triggerPaymentLinkConfirm.complete();
  }

  ngOnInit(): void {
    const paymentOptionParam = this.#route.snapshot.queryParamMap.get('paymentOption') as PaymentOption | null;
    this.#reservationPaymentOptionService.initializePaymentOption(paymentOptionParam ?? undefined);
  }

  onAgreeToTermsChange(value: boolean): void {
    this.agreeToTerms.set(value);
    if (value) {
      this.showTermsError.set(false);
    }
  }

  onPaymentLinkLoadingChange(isLoading: boolean): void {
    this.isPaymentLinkLoading.set(isLoading);
  }

  openDepositInfoModal(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.#modalService.open(DepositInfoModalComponent, {
      centered: true,
    });
  }

  selectPaymentMethod(paymentMethod: PaymentMethod | string) {
    const methodValue = typeof paymentMethod === 'string' ? (paymentMethod as PaymentMethod) : paymentMethod;
    this.selectedPaymentMethod.set(methodValue);
  }

  selectPaymentOption(option: PaymentOption): void {
    this.showTermsError.set(false);
    this.#reservationPaymentOptionService.switchToPaymentOption(option);
    const reservation = this.currentReservation();
    if (reservation?.id) {
      this.#fzTracking.track(
        depositPaymentOptionSelected({
          ...depositTrackingContextFromCart(this.reservationCart()),
          cartId: this.reservationCart()?.id ?? '',
          paymentOption: option,
          reservationId: reservation.id,
        }),
      );
    }
  }

  #loadPaymentMethods(): void {
    this.isLoadingPaymentMethods.set(true);
    if (!this.currentReservation()) {
      this.#getAvailablePaymentMethodsService
        .getAvailablePaymentMethodsToPayNow()
        .pipe(
          catchError(error => {
            this.#onPaymentMethodsError();
            throw error;
          }),
          finalize(() => this.isLoadingPaymentMethods.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe(paymentMethods => {
          this.#onPaymentMethodsLoaded(paymentMethods as PaymentMethodOption[]);
        });
      return;
    }

    this.#getAvailablePaymentMethodsService
      .getAvailablePaymentMethods()
      .pipe(
        catchError(error => {
          this.#onPaymentMethodsError();
          throw error;
        }),
        finalize(() => this.isLoadingPaymentMethods.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(paymentMethods => {
        this.#onPaymentMethodsLoaded(paymentMethods as PaymentMethodOption[]);
      });
  }

  #onPaymentMethodsError(): void {
    this.paymentMethods.set([]);
    this.selectedPaymentMethod.set(null);
    this.balance.set(null);
  }

  #onPaymentMethodsLoaded(paymentMethods: PaymentMethodOption[]): void {
    const currentSelection = this.selectedPaymentMethod();

    const isCurrentSelectionAvailable = paymentMethods.some(method => method.value === currentSelection);
    this.paymentMethods.set(paymentMethods as PaymentMethodOption[]);

    if (isCurrentSelectionAvailable) {
      this.selectedPaymentMethod.set(currentSelection);
    } else if (paymentMethods.length > 0) {
      this.selectedPaymentMethod.set(paymentMethods[0].value as PaymentMethod);
    }

    const balance = this.#getAvailablePaymentMethodsService.getBalance();
    if (balance) {
      this.balance.set(balance);
    }
  }
}
