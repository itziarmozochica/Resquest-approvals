import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, Injector, signal, Signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationExtras, Params, Router } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { CreateModifiedOrderEvent } from '@fz-original/app/core/tracking/core/events/create-modified-order';
import { CreateOrderEvent } from '@fz-original/app/core/tracking/core/events/create-order';
import { getMultiplanCartFlags } from '@fz-original/app/core/tracking/core/events/create-order.util';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { MembershipsMember } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import {
  MemberBenefitsNotAppliedError,
  memberBenefitsNotAppliedMessage,
} from '@fz-original/app/modules/box-office/memberships/services/member-benefits-not-applied.error';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { buildCustomerFromMember } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { PurchasedCartHandoff } from '@fz-original/app/modules/box-office/purchased-cart/models/purchased-cart-handoff.model';
import { PurchasedCartHandoffService } from '@fz-original/app/modules/box-office/purchased-cart/services/purchased-cart-handoff.service';
import {
  ContactInformationFieldEnum,
  ContactInformationRequirementEnum,
  OnsiteSetup,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import {
  CheckoutPaymentOptionsService,
  type CheckoutQuickAction,
} from '@fz-original/app/modules/box-office/shared/services/checkout-payment-options/checkout-payment-options.service';
import { type EfrGuardPurchaseContext } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/efr-health-check.model';
import { OnsiteCheckoutContextResolver } from '@fz-original/app/modules/box-office/shared/services/onsite-checkout-context/onsite-checkout-context.resolver';
import { PaymentFlowFeatureService } from '@fz-original/app/modules/box-office/shared/services/payment-flow-feature/payment-flow-feature.service';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { ChargeMismatchError } from '@fz-original/app/modules/box-office/ticketing/models/expected-charge.model';
import {
  PayOneStepQuery,
  PayOneStepResponse,
} from '@fz-original/app/modules/box-office/ticketing/services/one-step-purchase/one-step-purchase.service';
import { TicketingUnsavedChangesBypassService } from '@fz-original/app/modules/box-office/ticketing/services/ticketing-unsaved-changes-bypass.service';
import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import { type CheckoutPaymentLinkOption } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-link.model';
import type { CheckoutPreselectedMethod } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { mapCartToCheckoutCartItems } from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-cart.mapper';
import { OrderRescheduled, SessionItem } from '@fz-original/app/modules/reschedule/models/reschedule-order.model';
import { RescheduleModalCancelledError, RescheduleService } from '@fz-original/app/modules/reschedule/services/reschedule.service';
import {
  ReservationSettlementSession,
  ReservationSettlementStartResult,
} from '@fz-original/app/modules/reservation-settlement/models/reservation-settlement-session.model';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { adoptReservationSettlementCoupon } from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-discount.util';
import { matchesReservationSettlementSession } from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-integrity.util';
import { manualPriceRefused } from '@fz-original/app/modules/reservation/tracking/events/manual-price-refused.event';
import { ManualPriceRefusedAction } from '@fz-original/app/modules/reservation/tracking/models/manual-price-tracking.model';
import { signedAdjustmentOverTotal } from '@fz-original/app/shared/cart/utils/cart-adjustment.util';
import { passSessionInCart } from '@fz-original/app/shared/checkers/pass-session-in-cart';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { invalidCartStatusConfirmedErrorCode } from '@fz-original/app/shared/models/cart/cart-error-code';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { CustomerType } from '@fz-original/app/shared/models/customer/customer-type.enum';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Terms } from '@fz-original/app/shared/models/customer/terms.enum';
import { Money } from '@fz-original/app/shared/models/money.model';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { SharedAvailabilityRule } from '@fz-original/app/shared/models/session-availability/shared-availability-rule.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CartTimingService } from '@fz-original/app/shared/services/cart-timing/cart-timing.service';
import { ContactInformationDraftService } from '@fz-original/app/shared/services/contact-information-draft/contact-information-draft.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import {
  findFiscalComplianceBlockCode,
  FiscalComplianceBlockCode,
} from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-code';
import { FiscalComplianceBlockGuardService } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-guard.service';
import { FiscalComplianceBlockPrepareError } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-prepare.error';
import {
  LinkOrdersRescheduleType,
  type SeatCancellationItem,
} from '@fz-original/app/shared/services/move-customers-seats/ticket/ticket.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PriceViewerPrinterServiceManager } from '@fz-original/app/shared/services/price-viewer/price-viewer.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { isManualPriceRefusalCode } from '@fz-original/app/shared/utils/cart-manual-price.util';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';
import { resolvePaymentMethodLabel } from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { sessionTypeDiscountsFrom } from '@fz-original/app/shared/utils/session-type-discount.util';
import { environment } from '@fz-original/environments/environment';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateService } from '@ngx-translate/core';
import { UserAttributes } from '@optimizely/optimizely-sdk';
import moment from 'moment-timezone';
import { EMPTY, forkJoin, from, Observable, of, ReplaySubject, share, Subject, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  filter,
  finalize,
  map,
  mergeMap,
  switchMap,
  take,
  takeUntil,
  tap,
  toArray,
} from 'rxjs/operators';

import { OboSecondScreenDataService } from '../../../obo-second-screen/services/obo-second-screen-data.service';
import { ModifiedOrderModeEnum } from '../../../one-stop-shop/models';
import { type ModifiedOrderMode } from '../../../one-stop-shop/models/oss-modified-order-mode.model';
import { posCheckoutCashCalcShowModal } from '../../../one-stop-shop/tracking/events/pos-checkout-cash-calc-show-modal.event';
import { posCheckoutContactInfoCloseModal } from '../../../one-stop-shop/tracking/events/pos-checkout-contact-info-close-modal.event';
import { posCheckoutContactInfoShowModal } from '../../../one-stop-shop/tracking/events/pos-checkout-contact-info-show-modal.event';
import { posCheckoutMembershipsApplyBenefitsError } from '../../../one-stop-shop/tracking/events/pos-checkout-memberships-apply-benefits-error.event';
import { posCheckoutPaymentCompleted } from '../../../one-stop-shop/tracking/events/pos-checkout-payment-completed.event';
import { posCheckoutPaymentFailed } from '../../../one-stop-shop/tracking/events/pos-checkout-payment-failed.event';
import { posCheckoutPaymentStarted } from '../../../one-stop-shop/tracking/events/pos-checkout-payment-started.event';
import {
  posCheckoutSelectPaymentMethod,
  type PosCheckoutSelectPaymentMethodSource,
} from '../../../one-stop-shop/tracking/events/pos-checkout-select-payment-method.event';
import {
  getFilledContactInfoFields,
  getRequiredContactInfoFields,
  getVisibleContactInfoFields,
  resolveContactInfoCloseModalAction,
} from '../../../one-stop-shop/tracking/utils/pos-checkout-contact-info-close-modal.util';
import {
  buildPosCheckoutPaymentCompletedData,
  buildPosCheckoutPaymentFailedData,
  collectPlanIdsFromCart,
  extractPaymentFailureReason,
  shouldTrackAdyenPaymentStarted,
} from '../../../one-stop-shop/tracking/utils/pos-checkout-payment.util';
import { buildPosCheckoutSelectPaymentMethodData } from '../../../one-stop-shop/tracking/utils/pos-checkout-select-payment-method.util';
import { isCancelledTransactionError } from '../../../ticketing/utils/cancelled-transaction-error.util';
import {
  PosHardwareCheckResolution,
  type PosHardwareCheckResult,
  type PosHardwareMismatchCheckResult,
} from '../../models/pos-hardware-check.model';
import {
  PosPreparedCartReleaseReason,
  PosPreparedCartReplacement,
  PosPreparedCartStep,
  type PosPreparedCartReplaced,
} from '../../models/pos-prepared-cart.model';
import { type PosContactInfoContext } from '../../models/pos-ui-request.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { isModificationAlreadyPendingError, modificationAlreadyPendingMessageKey } from '../../utils/modification-reservation-error.util';
import { contactInformationCartHasSessionsInFuture, resolveContactInformationCart } from '../../utils/pos-contact-information-cart.util';
import { isHardwareMismatch } from '../../utils/pos-hardware-check.util';
import { PosAvailabilityService } from '../availability/pos-availability.service';
import { PosCartService } from '../cart/pos-cart.service';
import { PosCouponsService } from '../coupons/pos-coupons.service';
import { PosFlexibleBundleService } from '../flexible-bundle/pos-flexible-bundle.service';
import { PosMemberAccountService } from '../member-account/pos-member-account.service';
import { PosModificationPaymentLinkService } from '../modification-payment-link/pos-modification-payment-link.service';
import { PosModifyOrderLinePriceService } from '../modify-order-line-price/pos-modify-order-line-price.service';
import { PosUiPortService } from '../pos-ui-port/pos-ui-port.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPreparedCartService } from '../prepared-cart/pos-prepared-cart.service';
import { PosSeatingService } from '../seating/pos-seating.service';
import { PosSecondScreenService } from '../second-screen/pos-second-screen.service';
import { PosSetupService } from '../setup/pos-setup.service';
import { PosShiftService } from '../shift/pos-shift.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/** `allowedTicketsErrorCode` — min/max tickets per booking violated. */
const allowedTicketsErrorCode = 905;
const invalidCartStatusCodesForPrepare: readonly number[] = [invalidCartStatusConfirmedErrorCode];
const genericTicketRequirementsError: FormattedError = {
  message: 'oneStopShop.errors.ticketRequirements.generic',
  title: 'oneStopShop.errors.ticketRequirements.title',
};

interface FormattedError {
  message: string;
  title: string;
}

/** `PaymentError` — the loose envelope shape `#showPaymentErrorModal` probes. */
interface PaymentError {
  error?: { code?: string | number; message?: string };
  message?: string;
}

/** Payload of {@link PosPurchaseService.splitPaymentCancellationError$}. */
export interface PosSplitPaymentCancellationError {
  cartId: string;
  partnerId: number;
  transactionId: string;
}

const manualPriceRefusedMessageKey = 'boxOffice.cart.linePrice.errors.refused';

/**
 * The one-step purchase pipeline, end to end, plus the order-modification flow layered on top of it.
 *
 * Pipeline order: modify-order validation → device selector → timeslot-mismatch warning →
 * override-capacity confirm → EFR/EFSTA health check → shift validation → gift-card presteps →
 * add-to-cart alongside contact info → zero-total/free check → expiry check → booking questions →
 * checkout modal → cash calculator → member benefits → pay → order linking → success navigation /
 * error handling.
 */
@Injectable()
export class PosPurchaseService {
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #boxOfficePaymentMethods = inject(BoxOfficePaymentMethodsService);
  readonly #cartTiming = inject(CartTimingService);
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #checkoutPaymentOptions = inject(CheckoutPaymentOptionsService);
  readonly #contactInformationDraft = inject(ContactInformationDraftService);
  readonly #core = inject(TicketingCoreService);
  readonly #datadog = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #flexibleBundle = inject(PosFlexibleBundleService);
  readonly #dualScreenStorage = inject(DualScreenStorageService);
  readonly #injector = inject(Injector);
  readonly #legacyTracking = inject(TrackingService);
  readonly #memberAccount = inject(PosMemberAccountService);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #oboSecondScreenData = inject(OboSecondScreenDataService);
  readonly #onsiteCheckoutContextResolver = inject(OnsiteCheckoutContextResolver);
  readonly #optimizely = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #purchasedCartHandoff = inject(PurchasedCartHandoffService);
  readonly #paymentFlowFeature = inject(PaymentFlowFeatureService);
  readonly #preparedCart = inject(PosPreparedCartService);
  readonly isNewPaymentFlowActive = this.#paymentFlowFeature.isNewPaymentFlowActive;
  readonly #priceViewer = inject(PriceViewerPrinterServiceManager);
  readonly #reservationSettlementSession = inject(ReservationSettlementSessionService);
  readonly #rescheduleService = inject(RescheduleService);
  readonly #router = inject(Router);
  readonly #spinner = inject(SpinnerService);
  readonly #state = inject(PosTicketingState);
  readonly #fiscalComplianceBlockGuard = inject(FiscalComplianceBlockGuardService);
  readonly #tracking = inject(FzTrackingService);
  readonly #translate = inject(TranslateService);
  readonly #ui = inject(PosUiPortService);
  readonly #unsavedChangesBypass = inject(TicketingUnsavedChangesBypassService, { optional: true });
  readonly #userService = inject(UserService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /**
   * Bookkeeping for B2BO-5389: the backend binds a cart to the user of its first prepare attempt.
   * A second attempt after the operator corrects the customer email would keep validating
   * user-restricted coupons against the *first* user, so the cart must be discarded and rebuilt.
   * Refreshed by {@link #recordCartPrepareAttempt} on every pay/checkout attempt.
   */
  #lastCartPrepareAttempt: { cartId: string; customerEmail: string | null } | null = null;

  /**
   * Cart and query captured when the payment is armed. `payOneStep` confirmation is asynchronous
   * (terminal + book-result polling); a concurrent state reset (`loadNewSearch`, invalid-cart
   * recovery, discard-after-error) can null `state.cart` before the success callback runs.
   * Post-payment processing reads these snapshots instead of live state so a completed sale never
   * throws or is lost. Cleared implicitly by being overwritten on every arming.
   */
  #paidCartSnapshot: Cart | null = null;
  #paidQuerySnapshot: PayOneStepQuery | null = null;

  /**
   * Fire-and-forget: `onCloseSearch()` at the top of the pay entry point. The retail-search overlay is
   * component-local UI (`isSearchVisible`), so the component subscribes and hides it.
   */
  readonly closeSearchRequested$ = new Subject<void>();

  /**
   * Fire-and-forget: a cancelled Adyen split had already-completed legs, so the component must call
   * `SplitPaymentRetryUiService.showCancellationErrorModal(partnerId, cartId, transactionId)`.
   * It is a self-contained UI service whose result never re-enters the pipeline.
   */
  readonly splitPaymentCancellationError$ = new Subject<PosSplitPaymentCancellationError>();

  // ─────────────────────────────── lazily resolved sibling strategies ──────────────────────────────

  /**
   * `modified_order_id` / `mode` mirrored from the URL. Wired in the constructor rather than on
   * demand because the search-by-plan effect and the availability-ready hook both gate on them from
   * their first run.
   */
  constructor() {
    this.#activatedRoute.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(params => {
      const orderIdParam = (params['modified_order_id'] as string | undefined) ?? undefined;
      this.#modifiedOrderId.set(orderIdParam);
      this.#state.modifiedOrderMode.set(this.#parseModifiedOrderMode(params['mode']));
    });
    this.#core.franceAsyncFiscalFailure$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#state.paymentInProgress = false;
      this.#spinner.hide();
      this.#cart.clearCart();
    });
  }

  /**
   * The deep-linked plan is not on sale (or carries no resolvable plan id): the modification cannot
   * proceed, so the flow aborts, the operator is told, and the stored plan is restored once the
   * modal closes.
   */
  abortModifyOrderFlowForUnavailablePlan(): void {
    this.#state.modifyOrderFlowAborted = true;
    this.#showModifyOrderValidationModal({
      messageKey: 'boxOffice.orderModificationPlanUnavailable.message',
      titleKey: 'boxOffice.orderModificationPlanUnavailable.modalTitle',
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#setup.loadStoredPlan());
    this.#handleMissingOrderDataInModifyOrderFlow();
  }

  /**
   * Copies each session's `sharedAvailabilityRule` from the freshly loaded availability onto the
   * seeded cart lines that lack one, so shared-capacity validation treats the original order's
   * tickets like live selections. Modify-order mode only.
   */
  applyModifyOrderSharedAvailabilityRules(): void {
    if (!this.isModifyOrderMode() || this.#state.nonConfirmedCart == null) {
      return;
    }
    const rulesBySessionId = new Map<number, SharedAvailabilityRule>();
    this.#state.regularSessionAvailabilitySummaryByDateList.forEach(availabilityByDate =>
      availabilityByDate.sessionAvailabilityByDatetimeList.forEach(availabilityByDatetime =>
        availabilityByDatetime.sessionAvailabilityList.forEach(sessionAvailability => {
          if (sessionAvailability.sharedAvailabilityRule !== undefined) {
            rulesBySessionId.set(Number(sessionAvailability.id), sessionAvailability.sharedAvailabilityRule);
          }
        }),
      ),
    );
    if (rulesBySessionId.size === 0) {
      return;
    }
    let cartUpdated = false;
    this.#state.nonConfirmedCart.sessionItemsByDatetime.forEach(sessions =>
      sessions.forEach(session => {
        if (session.sharedAvailabilityRule === undefined) {
          const rule = rulesBySessionId.get(session.sessionId);
          if (rule !== undefined) {
            session.sharedAvailabilityRule = rule;
            cartUpdated = true;
          }
        }
      }),
    );
    if (cartUpdated) {
      this.#viewUpdate.markForCheck();
    }
  }

  /**
   * `isModifyOrderTimeSlotApplied` must be set in every branch, failures included: the
   * availability-ready hook re-fires after the fallback `loadNewSearch`, and the flag is what stops
   * the loop.
   */
  applyModifyOrderTimeSlotPreselection(): void {
    const orderTimeSlotStartsAt = this.getModifyOrderFirstSessionStartsAt();
    if (!orderTimeSlotStartsAt) {
      this.#state.isModifyOrderTimeSlotApplied = true;
      return;
    }
    const list = this.#state.regularSessionAvailabilitySummaryByDateList ?? [];
    if (list.length === 0) {
      this.#state.isModifyOrderTimeSlotApplied = true;
      return;
    }
    const orderTimestamp = new Date(orderTimeSlotStartsAt).getTime();
    const session = this.#availability.findSessionAndApplySelectionForTimestamp(orderTimestamp, orderTimeSlotStartsAt);
    if (session) {
      this.#state.isModifyOrderTimeSlotApplied = true;
      this.#availability.selectSession(session);
      return;
    }
    this.#state.isModifyOrderTimeSlotApplied = true;
    this.#showModifyOrderValidationModal({
      alertTitleKey: 'boxOffice.orderModificationSessionNotFound.warningTitle',
      interpolationParams: { date: this.#formatDatetime(orderTimeSlotStartsAt) },
      messageKey: 'boxOffice.orderModificationSessionNotFound.message',
      titleKey: 'boxOffice.orderModificationSessionNotFound.modalTitle',
    });
    if (this.#state.filters) {
      this.#availability.loadNewSearch(this.#state.filters);
    }
  }

  /**
   * Zero/free total short-circuit: `PaymentType.FREE` may only settle a cart that really
   * costs nothing, so the total is recomputed and a non-zero cart aborts with an explanatory modal.
   */
  checkCartTotalIsZeroIfPaymentMethodIsFree(): Observable<void> {
    if (this.#state.paymentType() !== PaymentType.FREE) {
      return of(void 0);
    }

    this.#cart.updateCartTotalMoney(this.#state.cart ?? this.#state.nonConfirmedCart, this.#state.coupon ?? undefined);
    if ((this.#state.cartTotalMoney?.amount ?? 0) === 0) {
      return of(void 0);
    }
    this.#cart.showModal(
      'oneStopShop.errors.freePayment.cartTotalUpdated.title',
      'oneStopShop.errors.freePayment.cartTotalUpdated.message',
    );
    this.#state.paymentType.set(null);
    return EMPTY;
  }

  clearReservationSettlementParams(): void {
    this.#router.navigate([], {
      queryParams: { mode: null, reservation_cart_id: null, reservation_id: null },
      queryParamsHandling: 'merge',
      relativeTo: this.#activatedRoute,
      replaceUrl: true,
    });
  }

  clearReservationSettlementSession(): void {
    this.#reservationSettlementSession.clear();
    this.#state.reservationSettlementSeededCartId = null;
    this.#state.isReservationSettlementRejected.set(false);
    this.#state.isReservationSettlementMismatch.set(false);
    this.#state.allowMultiTimeSlotSelection = this.isModifyOrderMode() || this.#isMultiTimeSlotSelectionEnabled();
    this.#state.isPreservingCart = false;
  }

  /**
   * Payment-menu entry point. The guard order below is intentional, and every early return must
   * leave `#skipModifyOrderPayWarningOnce` exactly as it does here — that state drives the
   * warning-bypass flow on retry.
   */
  clickOnPayOneStep(paymentType?: PaymentType, trackSelectPayment = false): void {
    if (this.#state.payPipelineInFlight) {
      return;
    }
    if (!this.#flexibleBundle.canSaveCart()) {
      return;
    }
    const hardwareCheck = this.#setup.checkHardwareType();
    this.#trackHardwareCheck(hardwareCheck);
    if (isHardwareMismatch(hardwareCheck)) {
      // The answer is asked before the payment is engaged, so an expired real-time basket drops it, which
      // closes the modal, as it drops the open step of the pipeline (GIT-1564).
      this.#showHardwareMismatchModal(hardwareCheck)
        .pipe(take(1), takeUntil(this.#seating.realTimeBasketExpired$), takeUntilDestroyed(this.#destroyRef))
        .subscribe((resolution: PosHardwareCheckResolution) => {
          this.#trackHardwareCheckResolution(hardwareCheck, resolution);
          if (resolution === PosHardwareCheckResolution.selectOnsiteSetup) {
            this.#setup.openSetupSelector();
          }
          if (resolution === PosHardwareCheckResolution.override) {
            this.#continuePayOneStep(paymentType, trackSelectPayment);
          }
        });
      return;
    }
    this.#continuePayOneStep(paymentType, trackSelectPayment);
  }

  /**
   * `modify_order` confirmation: reschedules the original order onto the seeded cart's sessions
   * through `RescheduleService`. A cart response means a price difference must be paid in place
   * (`#enterModifyOrderPaymentState`); an order response navigates to the rescheduled order.
   */
  confirmModifyOrder(): void {
    const order = this.#state.modifiedOrder();
    const nonConfirmedCart = this.#state.nonConfirmedCart;
    if (
      order?.id == null ||
      order.planId == null ||
      nonConfirmedCart == null ||
      nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0
    ) {
      this.#cart.showModalError();
      return;
    }

    const targetSessionItemsByDatetime = this.#buildModifyOrderSessionItemsByDatetime(nonConfirmedCart);
    const sessionItems = this.#buildModifyOrderSessionItems(targetSessionItemsByDatetime);
    if (sessionItems.length === 0 || sessionItems.some(sessionItem => !sessionItem.sessionId)) {
      this.#cart.showModalError('reschedule.error.sessionTicketTypeMismatch');
      return;
    }

    const planId = this.resolveModifyOrderTargetPlanId(order.planId);
    const placeId = this.#state.selectedPlace?.id;
    const cityId = this.#state.selectedCity?.id;
    const partnerId = this.#state.partner?.id;
    if (placeId == null || cityId == null || partnerId == null) {
      this.#cart.showModalError();
      return;
    }

    this.#rescheduleService.primeReschedulePricingFeatureFlags(planId);

    const rescheduledSessionDate = this.#getEarliestTargetSessionDate(targetSessionItemsByDatetime);

    this.#rescheduleService
      .determineWhoPays(order, nonConfirmedCart)
      .pipe(
        mergeMap(paymentType =>
          this.#rescheduleService.confirmReschedule(
            paymentType,
            cityId,
            planId,
            placeId,
            sessionItems,
            order,
            rescheduledSessionDate,
            partnerId,
            this.#state.channelId,
            this.#state.channel,
            nonConfirmedCart,
            null,
            targetSessionItemsByDatetime,
          ),
        ),
        catchError(
          (error: { code?: number | string; error?: { code?: number | string; message?: string }; message?: string } | undefined) => {
            this.#spinner.hide();
            if (error instanceof RescheduleModalCancelledError) {
              return EMPTY;
            }
            const fiscalComplianceBlockCode = findFiscalComplianceBlockCode(error);
            if (fiscalComplianceBlockCode !== undefined) {
              this.#requestFiscalComplianceBlockModal(fiscalComplianceBlockCode);
              return EMPTY;
            }
            if (isModificationAlreadyPendingError(error)) {
              this.#cart.showModalError(modificationAlreadyPendingMessageKey);
              return EMPTY;
            }
            const errorCode = error?.code ?? error?.error?.code;
            if (isManualPriceRefusalCode(errorCode)) {
              this.#tracking.track(
                manualPriceRefused({
                  action: ManualPriceRefusedAction.ModifyOrder,
                  channel: this.#state.channelId,
                  code: Number(errorCode),
                }),
              );
              this.#cart.showModalError(error?.message ?? error?.error?.message ?? manualPriceRefusedMessageKey);
              return EMPTY;
            }
            this.#cart.showModalError(error?.message ?? error?.error?.message ?? 'errors.generic');
            return EMPTY;
          },
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => this.#handleModifyOrderRescheduleResponse(order, response));
  }

  confirmModifyOrderIsDisabled(): boolean {
    const emptyCart = this.#state.nonConfirmedCart == null || this.#state.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
    return (
      emptyCart ||
      this.#state.isLoadingCart ||
      this.#state.isLoadingSessions ||
      this.#modifyOrderCartIsUnchanged() ||
      (this.#state.nonConfirmedCart?.getTimeslotsViolatingGroupRules().length ?? 0) > 0
    );
  }

  cancelModifyOrderPayment(): void {
    if (this.#state.paymentInProgress) {
      return;
    }
    this.exitModifyOrderPaymentIfActive();
  }

  /** Any cart edit while the difference payment is armed discards the reschedule cart. */
  exitModifyOrderPaymentIfActive(): void {
    const paymentCart = this.#state.modifyOrderPaymentCart();
    if (paymentCart == null || this.#state.paymentInProgress) {
      return;
    }
    this.releaseModifyOrderPaymentCart();
    this.#discardModifyOrderCart(paymentCart);
  }

  /** Leaves the difference payment step without discarding its cart: the caller decides whether the cart dies. */
  releaseModifyOrderPaymentCart(): void {
    this.#state.modifyOrderPaymentCart.set(null);
    this.#state.cart = null;
    this.#viewUpdate.markForCheck();
  }

  exitReservationSettlement(): void {
    const reservationId = this.#reservationSettlementSession.session()?.reservationId;
    this.#endReservationSettlement();
    if (reservationId == null) {
      return;
    }
    this.#router.navigate(['/reservations/list', reservationId, 'checkout']);
  }

  /** The selected timeslot normalised to the cart's datetime-key format. */
  get currentSelectedDatetime(): string | null {
    if (!this.#state.selectedSession?.selectedDatetime?.datetime) {
      return null;
    }
    return new Date(this.#state.selectedSession.selectedDatetime.datetime).toISOString().replace(/.\d+Z$/g, 'Z');
  }

  /**
   * `#displaySquareAlertModalIfNeeded` — a stored Square pairing that no longer applies to the
   * resolved plan must be surfaced. Called from the availability `changePlan()` tap, right after
   * `PosSetupService.updatePaymentConfigurationFromOnsiteSetup()`, so the freshly built
   * `paymentConfiguration` is what decides which of the two copies is shown.
   */
  displaySquareAlertModalIfNeeded(): void {
    const storedPaymentConfiguration = this.#core.getPaymentConfiguration();
    const isApplicable: boolean = storedPaymentConfiguration?.isConfigApplicable() === true;
    if (storedPaymentConfiguration?.squareConfiguration != null && !isApplicable) {
      const [title, message] =
        this.#state.paymentConfiguration !== null && this.#state.paymentConfiguration.squareConfiguration !== undefined
          ? ['square.notCompatiblePlanModal.title', 'square.notCompatiblePlanModal.message']
          : ['square.notEnabledPlanModal.title', 'square.notEnabledPlanModal.message'];
      this.#cart.showModal(title, message);
    }
  }

  /**
   * Assembles the purchase query. A reservation settlement sends no coupon, since the coupon booked
   * online is already on the server cart, and asks the pipeline to charge only what the till shows.
   */
  generatePayOneStepQueryParams(): PayOneStepQuery {
    const isSettlement = this.isReservationSettlementMode();
    const { additionalGiftCardCodes, couponCode }: { couponCode: string | null; additionalGiftCardCodes?: string[] } = isSettlement
      ? { couponCode: null }
      : this.#coupons.getPayOneStepCouponCodes();
    return {
      cartId: this.#state.cart!.id!,
      channel: this.#state.channelId,
      checkoutFlow: this.#state.isCheckoutModalFlow ? 'modal' : 'legacy',
      cityId: this.#state.selectedCity.id,
      couponCode: couponCode ?? undefined,
      customer: this.#state.customer ?? undefined,
      onsiteSetupId: this.#state.onsiteSetupSelected?.id,
      partnerId: this.#state.partner!.id,
      paymentConfiguration: this.#state.paymentConfiguration!,
      paymentType: this.#state.paymentType()!,
      placeId: this.#getCheckoutPlaceId(),
      planId: this.#state.plan!.id,
      ...(additionalGiftCardCodes && { additionalGiftCardCodes }),
      ...(isSettlement && {
        expectedCharge: {
          couponCode: this.#state.coupon?.code ?? null,
          total: new Money(this.#state.cartTotalMoney.amount, this.#state.cartTotalMoney.currency),
        },
      }),
      ...(this.#ticketSelection.shouldSendOverrideCapacity() && { overrideCapacity: true }),
    };
  }

  getButtonImageUrl(paymentType: PaymentType): string | null {
    return this.#state.paymentMethodDisplay.get(paymentType)?.imageUrl ?? null;
  }

  getButtonLabel(paymentType: PaymentType): string {
    return this.#state.paymentMethodDisplay.get(paymentType)?.label ?? resolvePaymentMethodLabel(null, paymentType);
  }

  isButtonImageTintable(paymentType: PaymentType): boolean {
    return this.#state.paymentMethodDisplay.get(paymentType)?.isImageTintable === true;
  }

  // ═══════════════════════════════════════════ lifecycle ══════════════════════════════════════════

  getCardDisabledTooltip(paymentType: PaymentType): string | null {
    if (!this.payWithCardIsDisabled(paymentType)) {
      return null;
    }
    return this.#core.getCardDisabledTooltip(
      this.#core.getPaymentConfiguration(),
      this.#boxOfficePaymentMethods.getGatewayProvider(this.#state.onsiteSetupSelected),
      this.#boxOfficePaymentMethods.allowsDelegatedCardPayment(this.#state.onsiteSetupSelected),
    );
  }

  /**
   * Which contact fields the operator must fill.
   *
   * Every branch is wrapped by `PosCouponsService.mergeMandatoryContactForCouponRemaining`, which adds
   * the email field whenever stacked gift cards leave a balance.
   */
  getMandatoryFields(): string[] {
    if (this.#ticketSelection.cartIsNotEmptyAndContainsOnlyShopProducts(this.#state.nonConfirmedCart)) {
      return this.#coupons.mergeMandatoryContactForCouponRemaining([]);
    }

    const contactCart = this.#contactInformationCart();
    if (contactCart !== null && passSessionInCart(this.#state.regularSessionAvailabilitySummaryByDateList, contactCart)) {
      return this.#coupons.mergeMandatoryContactForCouponRemaining([...this.#state.contactFields]);
    }

    const mandatoryFields: string[] = [];
    const hasSessionsInFuture = contactInformationCartHasSessionsInFuture(contactCart);
    const hasContactInformationRequirement =
      this.#state.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day == ContactInformationRequirementEnum.REQUIRED;

    if (hasSessionsInFuture || hasContactInformationRequirement) {
      if (this.#state.showEmailContactInformation) {
        mandatoryFields.push(this.#state.emailField);
      }
      if (this.#state.showPhoneNumberContactInformation) {
        mandatoryFields.push(this.#state.phoneField);
      }
    }

    return this.#coupons.mergeMandatoryContactForCouponRemaining(mandatoryFields);
  }

  // ═════════════════════════════════════════ entry point ══════════════════════════════════════════

  getModifyOrderFirstSessionStartsAt(): string | null {
    const order = this.#state.modifiedOrder();
    if (!order?.accessTickets?.size) {
      return null;
    }
    const firstTicket = Array.from(order.accessTickets.values())[0];
    return firstTicket?.sessionStartsAt ?? null;
  }

  /** The calendar date the search must start on; consumed by the plan effect. */
  getModifyOrderInitialDate(): Date | null {
    const sessionStartsAt = this.getModifyOrderFirstSessionStartsAt();
    if (!sessionStartsAt) {
      return null;
    }
    const startsAt = moment.tz(sessionStartsAt, this.#state.timezone);
    return new Date(Date.UTC(startsAt.year(), startsAt.month(), startsAt.date()));
  }

  /** The URL-borne order id, or `undefined` when absent or non-numeric. */
  getModifiedOrderIdFromUrl(): number | undefined {
    const urlOrderId = Number(this.#activatedRoute.snapshot.queryParams['modified_order_id']);
    return Number.isFinite(urlOrderId) && urlOrderId > 0 ? urlOrderId : undefined;
  }

  /** Difference between the seeded cart's total and the original order's effective total. */
  getModifyOrderPriceDifference(): Money | null {
    const paymentCartTotal = this.#state.modifyOrderPaymentCart()?.total;
    if (paymentCartTotal != null) {
      return new Money(paymentCartTotal.amount, paymentCartTotal.currency);
    }
    const orderCart = this.#state.modifiedOrder()?.cart;
    const newTotal = this.getModifyOrderTotal();
    if (orderCart == null || newTotal == null) {
      return null;
    }
    const originalOrderAmount = (orderCart.total?.amount ?? 0) + (orderCart.appliedCoupon?.discount.amount ?? 0);
    return new Money(newTotal.amount - originalOrderAmount, newTotal.currency || orderCart.total?.currency || '');
  }

  getModifyOrderTotal(): Money | null {
    const order = this.#state.modifiedOrder();
    const cartTotal = this.#state.cartTotalMoney;
    if (!this.isModifyOrderMode() || order == null || cartTotal == null) {
      return null;
    }
    return this.#rescheduleService.getRescheduledTotal(order, cartTotal);
  }

  getModifyOrderCarriedAdjustment(): Money | null {
    const adjustment = this.#state.modifiedOrder()?.cart?.adjustment;
    const cartTotal = this.#state.cartTotalMoney;
    if (!this.isModifyOrderMode() || adjustment == null || cartTotal == null) {
      return null;
    }
    return signedAdjustmentOverTotal(adjustment, cartTotal);
  }

  /**
   * The *effective* mode — deliberately stricter than `state.modifiedOrderMode` (the raw URL parse
   * the banner and the order-detail modal bind to): the loaded order must be the one the URL names,
   * so a stale `history.state.order` cannot silently turn a normal sale into a modification.
   */
  getModifyOrderMode(): ModifiedOrderMode | undefined {
    const params = this.#activatedRoute.snapshot.queryParams;
    const urlOrderId = params['modified_order_id'];
    const mode = params['mode'];
    const order = this.#state.modifiedOrder();
    if (!urlOrderId || !order || order.id !== Number(urlOrderId)) {
      return undefined;
    }
    return this.#parseModifiedOrderMode(mode);
  }

  /**
   * Blocking validation of a seat-upgrade cart before payment.
   *
   * Only `upgrade_seating` validates: the operator must pick at least one seat and never more than the
   * original order had. A cart with a coupon but no upgrade add-on is a `warning` — payable once the
   * operator confirms (`skipModifyOrderPayWarningOnce`).
   */
  getModifyOrderPayModalPayload(): {
    messageKey: string;
    mode: 'error' | 'warning';
    titleKey: string;
    alertTitleKey?: string;
    interpolationParams?: Record<string, string>;
  } | null {
    if (!this.isUpgradeSeatingMode()) {
      return null;
    }

    const cart = this.#cart.getCart();
    const selectedSeatCount = cart ? this.#getSeatIdsFromCart(cart).length : 0;
    const originalOrderSeatCount = this.#getOriginalOrderSeatIds().length;
    const messageBase = 'oneStopShop.errors.modifyOrderValidation';
    const hasOriginalSeats = originalOrderSeatCount > 0;

    if (hasOriginalSeats && selectedSeatCount === 0) {
      return {
        messageKey: `${messageBase}.noSeatSelected`,
        mode: 'error',
        titleKey: `${messageBase}.noSeatSelectedTitle`,
      };
    }
    if (hasOriginalSeats && selectedSeatCount > originalOrderSeatCount) {
      return {
        messageKey: `${messageBase}.tooManySeats`,
        mode: 'error',
        titleKey: `${messageBase}.seatSelectionError`,
      };
    }

    return this.#getModifyOrderProceedWithoutUpgradeAddonWarning();
  }

  // ═════════════════════════════════════════ pipeline steps ═══════════════════════════════════════

  /** Pre-booking questions; `false` aborts. */
  handleBookingQuestions(): Observable<boolean> {
    this.#secondScreen.clearHighlightedSeats();
    return this.#ui
      .request('bookingQuestions', {
        cart: this.#state.cart,
        customer: this.#state.customer ?? undefined,
        phase: 'pre',
      })
      .pipe(switchMap(answered => (answered ? of(answered) : EMPTY)));
  }

  /**
   * Cash change calculator. Skipped for zero totals and for the new payment flow, where the
   * checkout modal owns the tendered amount. Mandatory-ness comes from `obo_cash_modal_mandatory`.
   */
  handleCashCalculator(): Observable<{ amount: number } | null> {
    if ((this.#state.cart?.total?.amount ?? 0) <= 0) {
      return of({ amount: 0 });
    }
    if (this.#state.isCheckoutModalFlow) {
      return of({ amount: 0 });
    }
    return this.#showCashCalculatorModal();
  }

  /**
   * Contact capture, skipped when the gift-card prestep already collected it, replaced by the
   * member's own details and consent, auto-filled from the order being modified, or disabled
   * by the setup for same-day sessions. `cartReady$` gates the modal's Checkout until the server cart exists.
   */
  handleContactInformation(cartReady$?: Observable<unknown>): Observable<void> {
    if (this.#state.contactInformationCollectedForCoupon) {
      this.#state.contactInformationCollectedForCoupon = false;
      return of(void 0);
    }
    const member = this.#memberships.data().member;
    if (member !== null) {
      return this.#showMembershipsAcceptTermsModal(member);
    }
    if (this.isUpgradeSeatingMode() || this.isAddTicketsMode()) {
      const customerFromModifiedOrder = this.#getContactInformationFromModifiedOrder();
      if (customerFromModifiedOrder !== undefined) {
        this.updateCustomer(customerFromModifiedOrder);
        this.#trackContactInfoCloseModal(customerFromModifiedOrder, { autoFilled: true });
        return of(void 0);
      }
    }
    if (contactInformationCartHasSessionsInFuture(this.#contactInformationCart()) || !this.#canSkipContactInformation()) {
      return this.#showContactInformationModal(cartReady$).pipe(mergeMap((customer: Customer | null) => (customer ? of(void 0) : EMPTY)));
    }
    return of(void 0);
  }

  /**
   * The pipeline's `error` handler.
   *
   * Order matters: an active modal payment session owns its own failure screen, an invalid cart status
   * is recovered instead of reported, a cancelled Adyen split with completed legs needs the dedicated
   * retry modal, a real-time seating cart is kept for the retry, and a classic free-seating cart may
   * have been prepared server-side and must be discarded. A real-time map gets its basket back first,
   * on every path (GIT-1271): the widget only restores its token on `cart-error`, and
   * `PosSeatingService` only forwards it once per `finalized`, so repeated calls are safe. An invalid
   * cart status empties the POS cart through the clear path, which already deletes the basket.
   */
  handlePaymentError(error: unknown): void {
    this.#state.isReadyForSeatReleasePayment = false;
    this.#unsavedChangesBypass?.clearPendingBypass();
    this.#seating.sendCartError();

    if (error instanceof FiscalComplianceBlockPrepareError) {
      this.#requestFiscalComplianceBlockModal(error.code);
      return;
    }

    if (error instanceof ChargeMismatchError) {
      this.#raiseReservationSettlementChargeMismatch(error);
      return;
    }

    // While a modal payment session is active the failure is owned by the checkout modal (it shows
    // the payment-failed screen), so we never surface the legacy error popup.
    if (this.#checkoutPaymentDriver.isActive()) {
      return;
    }

    // A cancellation of the checkout-modal journey is owned end to end by the modal
    // (B2BO-7939): the modal either just closed (nothing recorded yet) or already showed its
    // Cancel Confirmation step (recorded legs cancelled and refunded). The legacy
    // cancellation confirmation / error popups must never surface for it.
    if (this.#state.isCheckoutModalFlow && isCancelledTransactionError(error)) {
      return;
    }

    if (this.#invalidCartStatusMatches((error as BaseResponse<unknown> | undefined)?.error?.code, invalidCartStatusCodesForPrepare)) {
      this.#cart.handleInvalidCartStatus().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
      return;
    }

    if (error instanceof MemberBenefitsNotAppliedError) {
      this.#showPaymentErrorModal(error);
      return;
    }

    const cartId = this.#state.cart?.id;
    const transactionId = this.#core.getLastPaymentTransactionId(cartId);
    if (this.#state.paymentType() === PaymentType.CARD_SPLIT && transactionId && cartId && this.#core.isCancellingPayment()) {
      this.#core.adyenCancelHadCompletedPayments$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
        error: () => this.#showPaymentErrorModal(error),
        next: (hadCompletedPayments: boolean) => {
          if (hadCompletedPayments) {
            this.splitPaymentCancellationError$.next({ cartId, partnerId: this.#state.partner!.id, transactionId });
          } else {
            this.#showPaymentErrorModal(error);
          }
        },
      });
      return;
    }

    // A real-time cart is never discarded here: discarding it empties the OneBox basket while the map
    // still shows the seats (and OneBox refuses the release once the order is pre-confirmed), whereas
    // fever2 prepares and books the same cart again on the retry. The `cart-error` sent above gives the
    // widget back the token it forgot on `finalized`, so "Pay" works again and "Clear all" / leaving can
    // still delete the basket (GIT-1271).
    if (cartId && this.#state.isRealTimeSeating) {
      this.#showPaymentErrorModal(error);
      return;
    }

    if (cartId && this.#state.manageAsFreeSeatingMap) {
      this.#handleFreeSeatingPaymentError(error);
      return;
    }

    this.#showPaymentErrorModal(error);
  }

  /**
   * Per-mount wiring, invoked once from `PointOfSaleTicketing.initialise()`. Covers the purchase and
   * modify-order per-setup listeners.
   */
  initialise(): void {
    // The price viewer must not still show a previous sale's total.
    this.#priceViewer.clear(this.#state.onsiteSetupSelected);

    // A modify-order navigation carries the order in the router state.
    const historyOrder = (history.state as { order?: Order } | null)?.order;
    if (historyOrder != null) {
      this.#state.modifiedOrder.set(historyOrder);
    }

    // A device paired in another tab changes which methods are payable.
    this.#core
      .paymentConfigurationChanges()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.updatePaymentMethodsAvailable();
        this.#viewUpdate.markForCheck();
      });

    // Handles the modify-order half of this listener; the free-map reload and the seating-tab
    // auto-navigation halves live elsewhere (see `isWaitingForOrderFromUrl()`).
    this.#state.sessionAvailableReady.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (this.#state.modifiedOrder() && !this.#state.isModifyOrderTimeSlotApplied) {
        this.applyModifyOrderTimeSlotPreselection();
      }
    });

    // Re-runs per resolved setup; `setupBootstrap$` is the hook for that.
    this.#setup.setupBootstrap$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.showOrderModificationBannerIfNeeded();
      this.startReservationSettlementIfNeeded();
    });
  }

  isAddTicketsMode(): boolean {
    return this.getModifyOrderMode() === ModifiedOrderModeEnum.AddTickets;
  }

  /**
   * The single predicate behind both header surfaces and {@link PosSetupService.openPlanSelector}, so the
   * selector a surface offers is always the selector the command accepts.
   */
  canChangePlan(): boolean {
    if (this.#state.modifyOrderPaymentCart() !== null) {
      return false;
    }
    return !this.isModifyOrderMode() || this.isCrossPlanModificationEnabled();
  }

  /** Gates the selector only — it holds for the whole modification. Everything a real plan change justifies gates on {@link isCrossPlanModificationActive}. */
  isCrossPlanModificationEnabled(): boolean {
    return this.isModifyOrderMode() && this.#state.multiPlanCartEnabled;
  }

  isCrossPlanModificationActive(): boolean {
    return this.isCrossPlanModificationEnabled() && this.#state.modifyOrderPlanChangedByOperator;
  }

  /**
   * On another plan *now*, where {@link isCrossPlanModificationActive} only records that it moved once.
   * Measured against the entry plan, not `order.planId`, which the deep link legitimately differs from.
   * An unknown plan falls back to the sticky answer.
   */
  isCrossPlanModificationOnAnotherPlan(): boolean {
    if (!this.isCrossPlanModificationActive()) {
      return false;
    }
    const entryPlanId = this.#state.modifyOrderEntryPlanId;
    const screenPlanId = this.#state.selectedPlan?.id != null ? Number(this.#state.selectedPlan.id) : null;
    if (entryPlanId === null || screenPlanId === null || Number.isNaN(screenPlanId)) {
      return true;
    }
    return screenPlanId !== entryPlanId;
  }

  /**
   * Whether the page was *entered* as a `modify_order` deep link (URL + flag), regardless of
   * whether the order has been fetched yet. `getModifyOrderMode()` additionally requires the loaded
   * order to match; availability/setup gating needs the weaker, earlier predicate. A flow abort
   * (`modifyOrderFlowAborted`) turns the entry back into a normal sale.
   */
  isModifyOrderEntry(): boolean {
    if (this.#state.modifyOrderFlowAborted) {
      return false;
    }
    const params = this.#activatedRoute.snapshot.queryParams;
    return (
      params['mode'] === ModifiedOrderModeEnum.ModifyOrder &&
      params['modified_order_id'] != null &&
      this.isOrderModificationWithOssEnabled()
    );
  }

  isModifyOrderMode(): boolean {
    return this.getModifyOrderMode() === ModifiedOrderModeEnum.ModifyOrder;
  }

  isOrderModificationWithOssEnabled(): boolean {
    return (
      this.#optimizely.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ORDER_MODIFICATION_WITH_OSS,
        team: 'game-centers',
      }) === true
    );
  }

  isReservationSettlementActive(): boolean {
    return this.isReservationSettlementMode() || this.#isReservationSettlementEntry();
  }

  isReservationSettlementMode(): boolean {
    return this.#reservationSettlementSession.session() !== null;
  }

  isUpgradeSeatingMode(): boolean {
    return this.getModifyOrderMode() === ModifiedOrderModeEnum.UpgradeSeating;
  }

  /**
   * The availability-ready hook must not load the free seating map while the
   * order behind `?modified_order_id=` is still in flight, or the map would be built for the wrong
   * timeslot. Public seam used from elsewhere in the availability flow.
   */
  isWaitingForOrderFromUrl(): boolean {
    const urlOrderId = this.#modifiedOrderId();
    return urlOrderId != null && urlOrderId !== '' && !this.#state.modifiedOrder();
  }

  // ══════════════════════════════════════ payment-menu surface ════════════════════════════════════

  /** The lateral menu's confirm button needs a selected method. */
  readonly isPaymentsMenuConfirmButtonEnabled: Signal<boolean> = computed(() => !!this.#state.paymentType());

  linkOrdersForModifyOrder(): Observable<BaseResponse<void>> {
    const linking = this.#getModifyOrderLinking();
    if (linking == null) {
      return of(new BaseResponse<void>(null, null));
    }

    const rescheduleType = this.isAddTicketsMode() ? LinkOrdersRescheduleType.AddTicketsModify : LinkOrdersRescheduleType.FixedPriceUpgrade;

    return this.#core.linkOrders({
      reschedule_type: rescheduleType,
      source_order_id: linking.sourceOrderId,
      target_order_id: linking.targetOrderId,
    });
  }

  /** Public so the availability/search effects can defer until the order has been fetched. */
  get modifiedOrderIdParam(): Signal<string | undefined> {
    return this.#modifiedOrderId;
  }

  /** Purchased-cart navigation for the modify-order paths. */
  navigateToSuccessPage(): void {
    // The live cart can be null by the time the modify-order flows navigate (async book-result
    // polling + async post-payment reconciliation), so the paid query snapshot is the source of
    // truth for the cart id.
    const cartId = this.#resolveSuccessCartId();
    this.clearReservationSettlementSession();
    if (cartId == null) {
      return;
    }
    this.#cartTiming.markSaleCheckoutClosed();
    this.#core
      .showFiscalUserMessageIfPresent()
      .pipe(this.#cartTiming.trackOperatorTime(), take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#unsavedChangesBypass?.markPendingBypass();
        this.#contactInformationDraft.clear();
        this.#router.navigate(['/box-office/purchased-cart/', cartId], this.#buildSuccessNavigationExtras());
      });
  }

  /**
   * Bottom-sheet confirmation: cancels the selected access codes, frees their seats and
   * then continues to the success page. An empty (or seatless) selection short-circuits.
   */
  onReleaseTickets(): void {
    this.#state.isReleaseTicketsSheetOpen.set(false);

    const selectedTickets = this.#state.releaseTicketSeats().filter((_, index) => this.#state.releaseTicketSelections()[index]);

    if (selectedTickets.length === 0) {
      this.navigateToSuccessPage();
      return;
    }

    const cancellations = this.#buildCancellationsFromTickets(selectedTickets);

    if (cancellations.length === 0) {
      this.navigateToSuccessPage();
      return;
    }

    this.#releaseSeatsAndNavigate(cancellations);
  }

  /** Only when the operator entered through the checkout modal. */
  openCheckoutModalIfNeeded(charged?: { cart: Cart; total: Money }): Observable<void> {
    if (!this.#state.isCheckoutModalFlow) {
      return of(void 0);
    }
    const storedDeviceId = this.#core.getPaymentConfiguration()?.deviceId;
    const paymentOptions = this.#checkoutPaymentOptions.resolve(this.#state.onsiteSetupSelected, storedDeviceId);
    const cashCaptureMode = this.#onsiteCheckoutContextResolver.resolveCashCaptureMode({
      activeShift: this.#state.activeShift(),
      onsiteSetup: this.#state.onsiteSetupSelected,
    });
    return this.#ui
      .request('checkout', {
        availableMethods: paymentOptions.methods,
        availableTerminals: paymentOptions.terminals,
        basePaymentConfiguration: paymentOptions.basePaymentConfiguration,
        checkoutFlows: paymentOptions.checkoutFlows,
        fitToTiles: paymentOptions.fitToTiles,
        cartItems: mapCartToCheckoutCartItems(charged?.cart ?? this.#state.cart ?? this.#state.nonConfirmedCart),
        cartTotal: charged?.total ?? this.#state.cartTotalMoney,
        cashCaptureMode,
        locale: this.#translate.currentLang ?? 'en-US',
        flow: this.#state.requestedCheckoutFlow,
        preselectedMethod: this.#state.requestedCheckoutMethod ?? undefined,
        paymentLink: this.#modificationPaymentLinkOption(),
        selectedTerminalId: paymentOptions.selectedTerminalId,
        tapToPay: paymentOptions.tapToPay,
      })
      .pipe(
        take(1),
        tap((selectedPaymentType: PaymentType) => this.#state.paymentType.set(selectedPaymentType)),
        map((): undefined => void 0),
      );
  }

  openLateralPayments(): void {
    this.#state.showPaymentsInLateral = true;
    this.#state.paymentType.set(null);
  }

  /** Pay through the checkout modal instead of the legacy inline flow. */
  openSplitPaymentOptionsModal(): void {
    if (this.#state.payPipelineInFlight) {
      return;
    }
    this.#state.isCheckoutModalFlow = true;
    this.#state.requestedCheckoutFlow = 'fullCheckout';
    this.#state.requestedCheckoutMethod = null;
    this.clickOnPayOneStep();
  }

  openFullPaymentIntegrated(): void {
    if (this.#state.payPipelineInFlight) {
      return;
    }
    this.#state.isCheckoutModalFlow = true;
    this.#state.requestedCheckoutFlow = 'fullPaymentIntegrated';
    this.#state.requestedCheckoutMethod = null;
    this.clickOnPayOneStep();
  }

  openQuickPayment(method: CheckoutPreselectedMethod): void {
    if (this.#state.payPipelineInFlight) {
      return;
    }
    this.#state.isCheckoutModalFlow = true;
    this.#state.requestedCheckoutFlow = method.type === PaymentType.CASH && method.delegated ? 'fullPaymentCash' : 'fullPaymentIntegrated';
    this.#state.requestedCheckoutMethod = { delegated: method.delegated, type: method.type };
    this.clickOnPayOneStep();
  }

  footerQuickActions(): CheckoutQuickAction[] {
    return this.#checkoutPaymentOptions.resolveQuickActions(this.#state.onsiteSetupSelected);
  }

  isFullPaymentIntegratedAvailable(): boolean {
    return this.#checkoutPaymentOptions.hasIntegratedCardMethod(this.#state.onsiteSetupSelected);
  }

  /**
   * The settlement call with the checkout-modal resend loop around it.
   *
   * The resend loop is only reachable while a modal session is active; outside it the wrapper just
   * rethrows, so behaviour for the inline flow is unchanged. A modal session closed without resend
   * never reaches `handlePaymentError`, so it hands the basket back to a real-time map itself.
   */
  payInOneStep(): Observable<PayOneStepResponse | null> {
    return this.#core.payWithModalResend({
      onSessionEndedWithoutResend: () => {
        this.#unsavedChangesBypass?.clearPendingBypass();
        this.#seating.sendCartError();
      },
      payInOneStep: () => this.#payInOneStepOnce(),
      setPaymentType: (paymentType: PaymentType) => this.#state.paymentType.set(paymentType),
    });
  }

  /**
   * Settles a `modify_order` price difference in place: the reschedule already produced a prepared
   * cart, so this runs only the payment-adjacent gates (fiscal health, shift, checkout modal, cash
   * calculator) and a single payment attempt — no prepare, no order linking.
   *
   * Under `NEW_PAYMENT_FLOW` the difference is collected through the checkout modal, exactly as a
   * normal sale: the modal supplies the payment type (hence the optional argument), collects the
   * tendered cash instead of the legacy calculator, and owns the screen until it closes.
   */
  payModifyOrderDifference(paymentType?: PaymentType): void {
    const paymentCart = this.#state.modifyOrderPaymentCart();
    if (paymentCart == null || this.#state.paymentInProgress || this.#state.payPipelineInFlight) {
      return;
    }
    this.#setPayPipelineInFlight(true);
    if (paymentType !== undefined) {
      this.#state.paymentType.set(paymentType);
    }
    const checkedCashRegisterId = this.#state.activeShift()?.cashRegister;
    (
      this.#guardFiscalCompliance(paymentCart).pipe(
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() => this.runEfrHealthCheck()),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.#guardFiscalTaxes(paymentCart)),
        take(1),
        filter((fiscalisable: boolean) => fiscalisable),
        switchMap(() => this.#shift.validateShift()),
        take(1),
        switchMap(() => this.#guardFiscalComplianceAfterShiftValidation(checkedCashRegisterId, paymentCart)),
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() => this.#runEfrHealthCheckAfterShiftValidation(checkedCashRegisterId)),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.openCheckoutModalIfNeeded({ cart: paymentCart, total: this.#modifyOrderChargedTotal(paymentCart) })),
        take(1),
        switchMap(() => this.#handleModifyOrderCashCalculator(paymentCart)),
        take(1),
        switchMap((cashReceived: { amount: number } | null) => {
          if (this.#state.paymentType() === PaymentType.CASH && cashReceived === null) {
            this.#state.paymentType.set(null);
            return EMPTY;
          }
          this.#state.cashCalculatorCashReceived = cashReceived !== null ? cashReceived.amount : null;
          return this.payInOneStep();
        }),
        filter((response): response is PayOneStepResponse => response != null),
        finalize(() => {
          this.#state.isCheckoutModalFlow = false;
          this.#state.requestedCheckoutFlow = 'fullCheckout';
          this.#state.requestedCheckoutMethod = null;
          this.#setPayPipelineInFlight(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      ) as Observable<PayOneStepResponse>
    ).subscribe({
      error: (error: unknown) => this.#handleModifyOrderPaymentError(error),
      next: (response: PayOneStepResponse) => this.#navigateAfterModifyOrderPayment(response.order.id!),
    });
  }

  /** Card methods need a payable terminal, unless the device selector can still fix it. */
  payWithCardIsDisabled(paymentType: PaymentType): boolean {
    const cardPayments = [
      PaymentType.ALIPAY,
      PaymentType.CARD,
      PaymentType.CARD_SPLIT,
      PaymentType.CREDIT_CARD,
      PaymentType.DEBIT_CARD,
      PaymentType.GRABPAY_SG,
      PaymentType.ID_PAYMENT,
      PaymentType.PAY_NOW,
      PaymentType.PIX,
      PaymentType.QUICPAY,
      PaymentType.SIMPLE_PAYMENTS_KR,
      PaymentType.SQUARE_QR,
      PaymentType.IC_CARD,
      PaymentType.WECHAT_PAY,
    ];

    if (!cardPayments.includes(paymentType)) {
      return false;
    }

    const currentCart = this.#state.nonConfirmedCart;

    if (!currentCart || !currentCart?.total) {
      return true;
    }

    const paymentConfigurationStorage = this.#core.getPaymentConfiguration();
    const cartAmountIsZero: boolean = currentCart?.total?.amount === 0;

    const isDisallowed: boolean = this.#core.isCardPaymentDisallowed(
      this.#state.paymentConfiguration,
      paymentConfigurationStorage,
      cartAmountIsZero,
      this.#boxOfficePaymentMethods.getGatewayProvider(this.#state.onsiteSetupSelected),
      this.#boxOfficePaymentMethods.allowsDelegatedCardPayment(this.#state.onsiteSetupSelected),
    );

    if (!isDisallowed) {
      return false;
    }

    if (cartAmountIsZero) {
      return true;
    }

    return !this.shouldShowDeviceSelector(paymentType, this.#state.onsiteSetupSelected, paymentConfigurationStorage);
  }

  /**
   * The full pipeline.
   *
   * Each step is flattened rather than nested because every step is `take(1)`-narrowed, which makes a
   * flat chain semantically identical to nesting.
   *
   * Until the payment is engaged, an expiry of the real-time basket aborts the pipeline (GIT-1564): the
   * open step (contact dialog, checkout modal, cash calculator) is dropped, which closes it, and the
   * pipeline completes like a cancelled one. Past that point the payment is never interrupted.
   */
  proceedWithPayOneStep(paymentType?: PaymentType): void {
    if (this.#state.payPipelineInFlight) {
      return;
    }
    this.#cartTiming.startSaleCheckout(this.#state.cart?.id ?? null);
    this.#state.contactInformationCollectedForCoupon = false;
    this.#state.currentStep = this.#state.ticketSelectorStep;

    if (paymentType) {
      this.#state.paymentType.set(paymentType);
    }

    if (this.#state.nonConfirmedCart) {
      // The customer-facing price viewer shows the amount before the terminal is engaged.
      this.#priceViewer.showTotal(
        this.#state.onsiteSetupSelected,
        this.#state.nonConfirmedCart.total!.currency,
        this.#state.nonConfirmedCart.total!.amount,
      );
    }

    const checkedCashRegisterId = this.#state.activeShift()?.cashRegister;
    // Set when this pipeline stops for the payment already in progress: the checkout flags and the
    // real-time basket belong to that payment, so this pipeline's teardown must leave them alone.
    let keptCartForPaymentInProgress = false;
    // The cart was built from a basket that is gone: the open step closes and nothing is paid.
    let realTimeBasketExpired = false;
    const realTimeBasketExpired$ = this.#seating.realTimeBasketExpired$.pipe(
      take(1),
      tap(() => {
        realTimeBasketExpired = true;
        this.resetPaymentState();
      }),
    );
    // Read once per attempt: the cart is prepared right before the booking questions step, which reads them from
    // that prepare, and the payment starts from that cart (B2BO-9578).
    const isBookingQuestionsAfterPrepare = this.#isBookingQuestionsAfterPrepareEnabled();
    this.#setPayPipelineInFlight(true);
    // A settled sale keeps the prefetched booking questions: the post-booking step reads them, also after the
    // navigation to the purchased cart. Any other ending drops them, since the cart may still change.
    let paymentSettled = false;
    (
      this.#guardFiscalCompliance(this.#state.nonConfirmedCart).pipe(
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() => this.runEfrHealthCheck()),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.#shift.validateShift().pipe(this.#cartTiming.trackOperatorTime())),
        take(1),
        switchMap(() => this.#guardFiscalComplianceAfterShiftValidation(checkedCashRegisterId, this.#state.nonConfirmedCart)),
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() => this.#runEfrHealthCheckAfterShiftValidation(checkedCashRegisterId)),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() =>
          this.#coupons.applyGiftCardPresteps(() => this.#showContactInformationModal()).pipe(this.#cartTiming.trackOperatorTime()),
        ),
        take(1),
        switchMap(() => this.#createCartWhileCapturingContactInformation$(isBookingQuestionsAfterPrepare)),
        switchMap(() => this.checkCartTotalIsZeroIfPaymentMethodIsFree()),
        take(1),
        switchMap(() => this.#cart.checkCartSessionsIsAboutToExpireObservable()),
        take(1),
        switchMap(() => this.#discardAndRecreateCartIfCustomerChanged$()),
        tap(outcome => (keptCartForPaymentInProgress = outcome === 'keptForPaymentInProgress')),
        filter(outcome => outcome === true),
        switchMap(() => this.#guardFiscalTaxes(this.#state.cart)),
        take(1),
        filter((fiscalisable: boolean) => fiscalisable),
        switchMap(() => {
          const bookingQuestions$: Observable<unknown> = isBookingQuestionsAfterPrepare
            ? this.#prepareAndAskPreBookingQuestions$()
            : this.handleBookingQuestions();
          return bookingQuestions$.pipe(this.#cartTiming.trackOperatorTime());
        }),
        take(1),
        switchMap(() => {
          this.#preparedCart.enterStep(PosPreparedCartStep.CHECKOUT_MODAL);
          return this.openCheckoutModalIfNeeded();
        }),
        take(1),
        switchMap(() => {
          this.#preparedCart.enterStep(PosPreparedCartStep.CASH_CALCULATOR);
          return this.handleCashCalculator();
        }),
        take(1),
        switchMap((cash: { amount: number } | null) => this.#validateCashCalculator(cash).pipe(take(1))),
        this.#preparedCart.releaseOnError(),
        takeUntil(realTimeBasketExpired$),
        switchMap((cash: { amount: number } | null) => {
          this.#state.cashCalculatorCashReceived = cash !== null ? cash.amount : null;
          this.#state.isReadyForSeatReleasePayment = true;
          return this.payInOneStep().pipe(
            concatMap((response: PayOneStepResponse | null) => this.#modifyOrderLinkAfterPayInOneStep(response)),
          );
        }),
        filter((response): response is PayOneStepResponse => response != null),
        tap(() => (paymentSettled = true)),
        finalize(() => {
          if (!keptCartForPaymentInProgress) {
            this.#state.isCheckoutModalFlow = false;
            this.#state.requestedCheckoutFlow = 'fullCheckout';
            this.#state.requestedCheckoutMethod = null;
          }
          if (!paymentSettled) {
            this.#core.clearPrefetchedBookingQuestions();
          }
          this.#cartTiming.endSaleCheckoutAttempt();
          // A cart prepared for a payment that never started is replaced first, and the pipeline stays in flight
          // until it is, so a new Pay click never reaches the released cart. Without one this completes at once.
          // The release completes on its own (its requests end, and it replaces nothing on a page being left).
          this.#preparedCart
            .release$(realTimeBasketExpired ? PosPreparedCartReleaseReason.BASKET_EXPIRED : undefined)
            .subscribe({ complete: () => this.#setPayPipelineInFlight(false) });
        }),
        takeUntilDestroyed(this.#destroyRef),
      ) as Observable<PayOneStepResponse>
    ).subscribe({
      /**
       * A success `next` already consumed the basket and a failure already handed it back through the
       * error path, so this only acts when the pipeline was cancelled past `finalized` (contact dialog,
       * cash calculator, coupon re-apply). A pipeline that stopped for the payment in progress leaves
       * the basket with that payment.
       */
      complete: () => {
        if (!keptCartForPaymentInProgress) {
          this.#seating.sendCartError();
        }
      },
      error: (error: unknown) => this.handlePaymentError(error),
      next: (response: PayOneStepResponse) => this.#onPaymentSettled(response),
    });
  }

  /**
   * Re-entry of a payment the operator already started, past the hardware check they already
   * answered: the pairing of the terminal and the upgrade-seating warning resume through here, so the
   * hardware modal and its evaluation log appear once per payment. Every other entry goes through
   * `clickOnPayOneStep`.
   */
  resumePayOneStep(paymentType?: PaymentType): void {
    if (this.#state.payPipelineInFlight) {
      return;
    }
    if (!this.#flexibleBundle.canSaveCart()) {
      return;
    }
    this.#continuePayOneStep(paymentType, false);
  }

  resetPaymentState(): void {
    this.#state.paymentType.set(null);
    this.#state.cashCalculatorCashReceived = null;
  }

  /**
   * Fiscal readiness gate before payment. HU/PL read the local EFSTA printer, and only when
   * `isFiscalReceiptEnabled` is on for the setup's country (flag: `enable_fiscal_receipt`). France asks
   * partners for the fiscal health of the active shift's cash register. Elsewhere it is a no-op.
   */
  /** Reading the plan on screen unconditionally would send a showcase order's catalog plan on a modification nobody moved. */
  resolveModifyOrderTargetPlanId(orderPlanId: number): number {
    if (!this.isCrossPlanModificationOnAnotherPlan()) {
      return orderPlanId;
    }
    return this.#state.selectedPlan?.id ?? orderPlanId;
  }

  runEfrHealthCheck(): Observable<boolean> {
    return this.#core.guardFiscalPurchase(this.#state.onsiteSetupSelected?.place?.country_iso_code_2, this.#efrGuardPurchaseContext());
  }

  selectPaymentType(paymentType: PaymentType): void {
    this.#state.paymentType.set(paymentType);
    this.trackSelectPaymentMethod(paymentType, 'lateral_menu');
  }

  // ═══════════════════════════════════ post-purchase / errors ═════════════════════════════════════

  /** Public because the device-pairing surface asks the same question. */
  shouldShowDeviceSelector(
    paymentType: PaymentType | undefined,
    onsiteSetup: OnsiteSetup | null | undefined,
    storedPaymentConfig: ReturnType<TicketingCoreService['getPaymentConfiguration']> | null,
  ): boolean {
    return this.#boxOfficePaymentMethods.requiresDeviceSelection(onsiteSetup, paymentType, storedPaymentConfig);
  }

  /** Re-read per plan in `loadNewSearch`, hence public. */
  shouldShowEmail(): boolean {
    const fields = this.#state.onsiteSetupSelected?.contact_information_setup?.fields || [];
    return fields.includes(ContactInformationFieldEnum.EMAIL);
  }

  shouldShowPhoneNumber(): boolean {
    const fields = this.#state.onsiteSetupSelected?.contact_information_setup?.fields || [];
    return fields.includes(ContactInformationFieldEnum.PHONE);
  }

  /**
   * Fetches the order behind `?modified_order_id=` and shows the modification banner. Re-run per
   * resolved setup.
   *
   * A missing or unreadable order is not an error state: the query params are dropped so the page
   * falls back to a normal sale.
   */
  showOrderModificationBannerIfNeeded(): void {
    const orderId = this.#activatedRoute.snapshot.queryParams['modified_order_id'] as string | undefined;
    if (orderId == null || orderId === '') {
      return;
    }
    this.#getOrderForModificationFlow(orderId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(order => {
        if (this.#state.modifyOrderFlowAborted) {
          return;
        }
        if (order == null) {
          this.#handleMissingOrderDataInModifyOrderFlow();
          return;
        }
        const searchedChannelId = this.#availability.getAvailabilityQueryChannelId();
        this.#state.modifiedOrder.set(order);
        const filters = this.#state.filters;
        if (filters != null && this.#availability.getAvailabilityQueryChannelId() !== searchedChannelId) {
          // Search before seeding: a seeded cart sends `loadNewSearch` down its same-venue shortcut,
          // which reloads only the day's sessions and leaves the dates on the first search's channel.
          const initialDate = this.getModifyOrderInitialDate() ?? undefined;
          if (initialDate !== undefined) {
            this.#state.isModifyOrderTimeSlotApplied = false;
          }
          this.#availability.loadNewSearch(filters, initialDate);
          this.#seedModifyOrderCartIfNeeded();
          return;
        }
        this.#seedModifyOrderCartIfNeeded();
        if (this.#state.regularSessionAvailabilitySummaryByDateList?.length && !this.#state.isModifyOrderTimeSlotApplied) {
          this.applyModifyOrderTimeSlotPreselection();
          this.#seating.loadOneStepFreeSeatingMap();
        }
      });
  }

  startReservationSettlementIfNeeded(): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!this.#isReservationSettlementEntry()) {
      if (this.isReservationSettlementMode() || this.#state.reservationSettlementSeededCartId !== null) {
        this.#endReservationSettlement();
      }
      return;
    }
    if (partnerId == null) {
      this.#rejectReservationSettlementEntry();
      return;
    }
    const queryParams = this.#activatedRoute.snapshot.queryParams;
    this.#reservationSettlementSession
      .start({
        partnerId,
        queryParams: {
          mode: queryParams['mode'],
          reservation_cart_id: queryParams['reservation_cart_id'],
          reservation_id: queryParams['reservation_id'],
        },
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: ReservationSettlementStartResult) => {
        if (result.status === 'rejected') {
          this.#rejectReservationSettlementEntry();
          return;
        }
        this.#state.isReservationSettlementRejected.set(false);
        this.#state.isReservationSettlementMismatch.set(false);
        this.#seedReservationSettlementCart(result.session);
      });
  }

  /** Capped at the number of seats the new order added. */
  toggleReleaseTicketSelection(index: number): void {
    const selections = [...this.#state.releaseTicketSelections()];
    const isSelecting = !selections[index];
    const selectedCount = selections.filter(Boolean).length;
    if (isSelecting && selectedCount >= this.#state.releaseTicketsRequiredCount()) {
      return;
    }
    selections[index] = isSelecting;
    this.#state.releaseTicketSelections.set(selections);
  }

  trackSelectPaymentMethod(paymentType: PaymentType, source: PosCheckoutSelectPaymentMethodSource): void {
    const cart = this.#state.cart ?? this.#state.nonConfirmedCart;
    this.#tracking.track(
      posCheckoutSelectPaymentMethod(
        buildPosCheckoutSelectPaymentMethodData({
          availablePaymentMethods: this.#state.paymentTypes ?? [],
          cart,
          paymentMethod: paymentType,
          source,
          totalAmount: this.#state.cartTotalMoney?.amount ?? cart?.total?.amount ?? 0,
        }),
      ),
    );
  }

  /** An anonymous customer is stored as "no customer at all". */
  updateCustomer(customer: Customer): void {
    if (!customer || customer.type === CustomerType.ANONYMOUS) {
      this.#state.customer = null;
      return;
    }
    this.#state.customer = customer;
    this.#state.customer.cityStandardId = this.#state.selectedCity.id;
  }

  updatePaymentMethodsAvailable(): void {
    const { display, methods } = this.#boxOfficePaymentMethods.getAvailableMethods(this.#state.onsiteSetupSelected);
    this.#state.paymentTypes = methods;
    this.#state.paymentMethodDisplay.clear();
    display.forEach((methodDisplay, paymentType) => this.#state.paymentMethodDisplay.set(paymentType, methodDisplay));
    this.#state.showCommonPaymentButton = this.#state.paymentTypes?.length > this.#state.maxPaymentMethodInOneStep;
  }

  /**
   * Whether every code we tried to reapply after a cart recreate is actually on the new cart. The
   * check reads live state (`combinedCoupons` / `coupon`) rather than the recreated cart's
   * `appliedCoupon` because gift-card stacks live on the strategy, not on the `Cart` DTO.
   */
  #allCouponCodesApplied(couponCodes: string[]): boolean {
    const appliedCodes =
      this.#state.combinedCoupons.length > 0
        ? this.#state.combinedCoupons.map((coupon: Coupon) => coupon.code)
        : this.#state.coupon != null
          ? [this.#state.coupon.code]
          : [];
    return couponCodes.every(code => appliedCodes.includes(code));
  }

  #applyMemberBenefitsUnlessSettling$(cartId: string): Observable<void> {
    if (this.isReservationSettlementMode() || (this.isModifyOrderMode() && this.#state.modifyOrderPaymentCart() !== null)) {
      return of(void 0);
    }
    return this.#memberAccount.applyBenefitsToCart$(cartId);
  }

  /** The member benefits go on the cart before its prepare: a prepared cart can no longer be updated. */
  #applyMemberBenefitsOrStopTheSale$(query: PayOneStepQuery): Observable<void> {
    return this.#applyMemberBenefitsUnlessSettling$(query.cartId).pipe(
      catchError((error: unknown) => {
        this.#datadog.logWarn('[POS-PURCHASE] Member benefits auto-apply failed, stopping the sale before the prepare', {
          cartId: query.cartId,
          httpStatus: error instanceof HttpErrorResponse ? error.status : null,
        });
        this.#trackApplyBenefitsError(error);
        if (query.checkoutFlow === 'modal' && this.#checkoutPaymentDriver.isActive()) {
          this.#core.reportModalFailureBeforePay(memberBenefitsNotAppliedMessage);
        }
        return throwError(() => new MemberBenefitsNotAppliedError(memberBenefitsNotAppliedMessage));
      }),
    );
  }

  get #availability(): PosAvailabilityService {
    return this.#injector.get(PosAvailabilityService);
  }

  /** Only seated tickets can be handed back. */
  #buildCancellationsFromTickets(tickets: AccessTicket[]): SeatCancellationItem[] {
    return tickets
      .filter(ticket => ticket.seatId != null)
      .map(ticket => ({
        code_id: parseInt(ticket.id, 10),
        seat_id: ticket.seatId as number,
      }));
  }

  /**
   * The charged cart the confirmation screen reads instead of requesting it.
   * It comes from the payment response, not from `#paidCartSnapshot`, which is taken before the member benefits
   * are applied. Null outside a regular sale: a reservation settlement's deposit changes at the payment and a
   * modification pays another cart than the one on screen, so both keep the request. Read before the settlement
   * session is cleared.
   */
  #buildPaidCartHandoff(paidCart: Cart | null): PurchasedCartHandoff | null {
    const cartId = paidCart?.id;
    const partnerId = this.#state.partner?.id;
    if (
      paidCart === null ||
      cartId === undefined ||
      partnerId == null ||
      this.isReservationSettlementMode() ||
      this.getModifyOrderMode() !== undefined
    ) {
      return null;
    }
    return { cart: paidCart, cartId, partnerId };
  }

  #buildSuccessNavigationExtras(): NavigationExtras {
    return {
      queryParams: {
        cityId: this.#state.selectedCity.id,
        mode: null,
        modified_order_id: null,
        planId: this.#state.selectedPlan.id,
        reservation_cart_id: null,
        reservation_id: null,
        venueId: this.#state.selectedPlace.id,
      },
      queryParamsHandling: 'merge',
      state: {
        autoPrint: true,
        isOssFlow: true,
        isOrderModificationLanding: this.isModifyOrderMode(),
        paymentTransactionId: this.#core.getLastPaymentTransactionId(this.#resolveSuccessCartId()),
        plan: this.#state.plan,
      },
    };
  }

  /** Only same-day carts may skip contact capture, and only if the setup disables it. */
  #canSkipContactInformation(): boolean {
    if (!contactInformationCartHasSessionsInFuture(this.#contactInformationCart())) {
      return (
        this.#state.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day ===
        ContactInformationRequirementEnum.DISABLED
      );
    }

    return false;
  }

  /**
   * Creates the server cart while the operator fills the contact details, and emits once both are done, before any
   * step that reads the server cart. The contact modal's Checkout waits for the cart, so the modal, whose backdrop
   * blocks the page, stays on screen until the cart exists and the selection cannot change under it. A failed cart
   * completes empty after its error modal, which drops the contact request and closes the modal; the typed details
   * stay in `ContactInformationDraftService` for the next Pay. The cart request is shared and never cancelled by the
   * contact step, so a step that ends first does not leave a cart half created; it ends with the sale, on a real-time
   * basket expiry or when the POS is left, as the sequential cart did.
   *
   * Only the contact modal runs alongside the cart. Every other contact step waits for the cart, as before this
   * change: an identified member's accept-terms modal has an always-enabled button and a header close, so opened
   * alongside the cart it would let the operator back onto the page with the cart still pending; the remaining
   * steps (details filled from the order being modified, already collected by the gift-card prestep, or skipped for
   * a same-day sale) open nothing. A sale the cart step aborts at once (empty selection, adding to the cart disabled,
   * free seating with no map) asks for no contact details. That branch is decided before the cart step runs:
   * `handleCartContent()` flags the cart as loading at once, which reads as "adding to the cart disabled".
   */
  #createCartWhileCapturingContactInformation$(isBookingQuestionsAfterPrepare: boolean): Observable<void> {
    const capturesContactInformationAfterCart = this.#cart.abortsCartContentAtOnce() || !this.#opensContactInformationModal();
    const cartCreated$: Observable<void> = this.#cart.handleCartContent().pipe(
      take(1),
      tap(() => {
        if (!isBookingQuestionsAfterPrepare) {
          this.#prefetchBookingQuestions();
        }
      }),
      map((): void => undefined),
      // The request ends with the sale it serves, as the sequential cart did: an expired real-time basket or a POS
      // being left has no cart to write. Only the contact step ending first leaves it running.
      takeUntil(this.#seating.realTimeBasketExpired$),
      takeUntilDestroyed(this.#destroyRef),
      share({
        connector: () => new ReplaySubject<void>(1),
        resetOnComplete: false,
        resetOnError: false,
        resetOnRefCountZero: false,
      }),
    );
    if (capturesContactInformationAfterCart) {
      return cartCreated$.pipe(switchMap(() => this.handleContactInformation().pipe(this.#cartTiming.trackOperatorTime(), take(1))));
    }
    const contactInformationCaptured$ = this.handleContactInformation(cartCreated$).pipe(this.#cartTiming.trackOperatorTime(), take(1));
    return forkJoin([cartCreated$, contactInformationCaptured$]).pipe(map((): void => undefined));
  }

  /** The branches of {@link handleContactInformation} that end in the contact modal, read without their side effects. */
  #opensContactInformationModal(): boolean {
    if (this.#state.contactInformationCollectedForCoupon || this.#memberships.data().member !== null) {
      return false;
    }
    if ((this.isUpgradeSeatingMode() || this.isAddTicketsMode()) && this.#getContactInformationFromModifiedOrder() !== undefined) {
      return false;
    }
    return contactInformationCartHasSessionsInFuture(this.#contactInformationCart()) || !this.#canSkipContactInformation();
  }

  #contactInformationCart(): Cart | null {
    return resolveContactInformationCart(this.#state.cart, this.#state.nonConfirmedCart);
  }

  get #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  // ══════════════════════════════════════════ contact info ════════════════════════════════════════

  /**
   * Runs the override-capacity confirmation before proceeding; does not track the payment method
   * since `clickOnPayOneStep` already did. Reuses the shift `ConfirmModalComponent`.
   */
  #clickOnPayOneStepBase(paymentType?: PaymentType): void {
    if (!this.#flexibleBundle.canSaveCart()) {
      return;
    }

    if (this.isReservationSettlementMode()) {
      if (!this.#matchesReservationSettlementCart()) {
        this.#state.isCheckoutModalFlow = false;
        this.#state.requestedCheckoutFlow = 'fullCheckout';
        this.#state.requestedCheckoutMethod = null;
        this.#raiseReservationSettlementMismatch();
        return;
      }
      this.#state.isReservationSettlementMismatch.set(false);
    }

    if (this.#ticketSelection.shouldSendOverrideCapacity()) {
      this.#openShiftConfirmationModal('boxOffice.overrideCapacity.confirmationModal')
        .pipe(take(1), filter(Boolean), takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => this.proceedWithPayOneStep(paymentType));
      return;
    }
    this.proceedWithPayOneStep(paymentType);
  }

  /**
   * Everything `clickOnPayOneStep` does once the hardware check lets the payment through, either
   * because the setup matches or because the operator chose "Continue anyway".
   */
  #continuePayOneStep(paymentType: PaymentType | undefined, trackSelectPayment: boolean): void {
    if (this.isModifyOrderMode()) {
      if (this.#state.modifyOrderPaymentCart() !== null) {
        this.payModifyOrderDifference(paymentType);
        return;
      }
      this.confirmModifyOrder();
      return;
    }

    if (trackSelectPayment && paymentType != null) {
      this.trackSelectPaymentMethod(paymentType, 'button');
    }

    // The retail-search overlay is component-local UI (fire-and-forget), the payments lateral is
    // shared state, the mirrored seating map is second-screen state.
    this.closeSearchRequested$.next();
    this.#state.showPaymentsInLateral = false;
    this.#secondScreen.resetSeatingMapVisibility();

    const modifyOrderPayPayload = this.getModifyOrderPayModalPayload();
    let modifyOrderModalPayload = modifyOrderPayPayload;
    if (this.#state.skipModifyOrderPayWarningOnce) {
      if (modifyOrderPayPayload?.mode === 'warning') {
        modifyOrderModalPayload = null;
      } else {
        this.#state.skipModifyOrderPayWarningOnce = false;
      }
    }
    if (modifyOrderModalPayload) {
      const confirm$ = this.#showModifyOrderValidationModal(modifyOrderModalPayload);
      if (modifyOrderModalPayload.mode === 'warning') {
        confirm$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.#state.skipModifyOrderPayWarningOnce = true;
            this.resumePayOneStep(paymentType);
          }
        });
      }
      return;
    }

    // The terminal must be picked before the payment can start; the modal and the retry live on
    // `PosSetupService` (device pairing), which reads `state.pendingPaymentType` back in
    // `handleLinkedDeviceSelectorClosed` and resumes the payment with it through `resumePayOneStep`.
    if (paymentType != null && this.#shouldShowDeviceSelector(paymentType)) {
      this.#state.pendingPaymentType = paymentType;
      this.#setup.openLinkedDeviceModal();
      return;
    }

    const mismatchedCartDatetime = this.#getMismatchedCartTimeslot();
    if (mismatchedCartDatetime) {
      this.#showTimeslotMismatchWarning(mismatchedCartDatetime)
        .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
        .subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.#clickOnPayOneStepBase(paymentType);
          }
          this.#state.skipModifyOrderPayWarningOnce = false;
        });
      return;
    }

    this.#state.skipModifyOrderPayWarningOnce = false;
    this.#clickOnPayOneStepBase(paymentType);
  }

  get #coupons(): PosCouponsService {
    return this.#injector.get(PosCouponsService);
  }

  /**
   * The backend keeps a cart bound to the user of its first prepare attempt, so preparing again with
   * a corrected email would still validate user-restricted coupons against the first user (B2BO-5389).
   * Emits `true` to continue the pipeline, `false` when the recreated cart could not accept the
   * previously applied coupons back — the pay-one-step pipeline continues only on `true`, so it
   * aborts in the latter case. A real-time cart is superseded without a discard: discarding it
   * empties the OneBox basket the recreated cart is built from, while the map still paints the seats.
   * The previous cart stays valid server-side until the new one takes the basket over, the same
   * trade-off as `PosCartService.#reuseOrSupersedeRealTimeCart`.
   *
   * While a payment is in progress the cart is the one that payment is charging, so a second pay
   * pipeline that reaches this step emits `'keptForPaymentInProgress'` and leaves the cart alone
   * (B2BO-9256): discarding it lets the payment be captured with no order to book. The pipeline stops
   * there without tearing down the checkout state of that payment. The attempt is kept, so the next
   * attempt after that payment ends still recreates the cart for the new customer.
   */
  #discardAndRecreateCartIfCustomerChanged$(): Observable<boolean | 'keptForPaymentInProgress'> {
    const cartId = this.#state.cart?.id ?? null;
    const attempt = this.#lastCartPrepareAttempt;
    const customerEmail = this.#state.customer?.email ?? null;
    if (cartId === null || attempt === null || attempt.cartId !== cartId || attempt.customerEmail === customerEmail) {
      return of(true);
    }
    if (this.#state.paymentInProgress) {
      this.#datadog.logWarn('[OSS-CART] Customer changed while a payment is in progress, keeping the cart', {
        cartId,
        partnerId: this.#state.partner?.id,
      });
      return of('keptForPaymentInProgress' as const);
    }
    if (this.isReservationSettlementMode()) {
      this.#lastCartPrepareAttempt = null;
      return of(true);
    }
    if (this.#state.isRealTimeSeating) {
      // Discarding a real-time cart releases the OneBox basket (the next create would fail with 924), so
      // the cart is superseded instead: forgetting the selection it was created from makes the next
      // create-or-update send a new create, which takes the basket over with the new customer.
      this.#datadog.logWarn('[OSS-CART] Customer changed after a prepare attempt, superseding the real-time cart', {
        cartId,
        partnerId: this.#state.partner?.id,
      });
      this.#lastCartPrepareAttempt = null;
      this.#state.realTimeCartSelectionKey = null;
      return this.#recreateCartWithAppliedCoupons$();
    }
    this.#datadog.logWarn('[OSS-CART] Customer changed after a prepare attempt, discarding cart and recreating', {
      cartId,
      partnerId: this.#state.partner?.id,
    });
    this.#lastCartPrepareAttempt = null;
    this.#state.cart = null;
    return this.#core.discardCart({ cartId, partnerId: this.#state.partner!.id }).pipe(
      catchError(() => of(null)),
      switchMap(() => this.#recreateCartWithAppliedCoupons$()),
    );
  }

  #efrGuardPurchaseContext(): EfrGuardPurchaseContext {
    return {
      cashRegisterId: this.#state.activeShift()?.cashRegister,
      hasActiveShift: this.#state.activeShift() != null,
      partnerId: this.#state.partner?.id,
      placeId: this.#state.onsiteSetupSelected?.place?.id?.toString(),
    };
  }

  #fetchOrderById(orderId: string): Observable<Order | null> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined || partnerId === null) {
      return of(null);
    }
    const orderIdNum = Number(orderId);
    if (Number.isNaN(orderIdNum)) {
      return of(null);
    }
    return this.#core.getOrder(partnerId, orderIdNum).pipe(
      map(response => (response?.data != null && response.error == null ? response.data : null)),
      catchError(() => of(null)),
    );
  }

  #formatBackendError(errorMessage?: string, errorCode?: string | number): FormattedError {
    switch (Number(errorCode)) {
      case allowedTicketsErrorCode:
        return this.#formatTicketRequirementsError905(errorMessage);
      default:
        return { message: errorMessage ?? 'errors.generic', title: 'common.errorTitle' };
    }
  }

  #formatDate(datetime: string): string {
    return moment(datetime).tz(this.#state.timezone).locale(this.#state.locale).format('MMM D, YYYY');
  }

  #formatDatetime(datetime: string | null): string {
    if (!datetime) {
      return '';
    }
    return moment(datetime).tz(this.#state.timezone).locale(this.#state.locale).format('MMM D, YYYY - h:mmA');
  }

  // ═════════════════════════════════════════ cash calculator ══════════════════════════════════════

  /** `"errorTitle,errorMessage[,errorCode]"`; the code chunk is optional. */
  #formatErrorMessage(error: string): string {
    const chunks = error.split(',');
    if (chunks.length < 2) {
      return 'common.errorTitle,errors.generic';
    }
    if (chunks.length <= 3) {
      return error;
    }
    return chunks.slice(0, 3).join(',');
  }

  /** Turns the backend's "from N to M for session S" into an operator-readable message. */
  #formatTicketRequirementsError905(errorMessage?: string): FormattedError {
    if (!errorMessage) {
      return genericTicketRequirementsError;
    }

    const parsedError = this.#parseTicketRequirementsFromError(errorMessage);
    if (!parsedError) {
      return genericTicketRequirementsError;
    }

    const sessionName = this.#getSessionNameById(parsedError.sessionId) || this.#translate.instant('common.session');

    const message = this.#translate.instant('oneStopShop.errors.ticketRequirements.message', {
      max: parsedError.max,
      min: parsedError.min,
      sessionName,
    });

    return { message, title: 'oneStopShop.errors.ticketRequirements.title' };
  }

  // ════════════════════════════════════════════ tracking ═════════════════════════════════════════

  #getAllSessions(): SessionAvailability[] {
    return [
      ...this.#state.productSessions,
      ...(this.#state.selectedSession?.sessionAvailabilityByDatetimeList?.flatMap(datetime => datetime.sessionAvailabilityList) ?? []),
    ];
  }

  #getCartSeatIds(): string[] {
    return this.#getSeatIdsFromCart(this.#paidCartSnapshot ?? this.#state.cart ?? new Cart());
  }

  #getCartTimeslotsWithItems(): string[] {
    const cartDatetimes = this.#state.nonConfirmedCart?.sessionItemsByDatetime;
    if (!cartDatetimes?.size) {
      return [];
    }

    return [...cartDatetimes.keys()].filter(key => {
      if (key === 'products') return false;
      const sessions = cartDatetimes.get(key);
      return sessions && sessions.length > 0;
    });
  }

  #getCheckoutPlaceId(): number {
    return this.#state.onsiteSetupSelected?.place?.id ?? this.#state.onsiteSetupSelected?.place_id ?? this.#state.plan!.places![0].id;
  }

  /** The modified order's own buyer, unless it is the generic on-site user. */
  #getContactInformationFromModifiedOrder(): Customer | undefined {
    const user = this.#state.modifiedOrder()?.user;
    if (!user) {
      return undefined;
    }
    if (user.id === environment.OBO.GENERIC_USER_ID) {
      return undefined;
    }
    const hasData = user.email || user.firstName || user.lastName;
    if (!hasData) {
      return undefined;
    }

    return {
      acceptedTerms: [Terms.ON_SITE_TERMS_OF_PRIVACY],
      email: user.email,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? '',
      type: CustomerType.USER,
    };
  }

  /**
   * Under `MULTI_TIME_SLOT_SELECTION` the cart may hold lines for a timeslot other
   * than the selected one; paying then is legal but worth confirming.
   */
  #getMismatchedCartTimeslot(): string | null {
    if (!this.#state.allowMultiTimeSlotSelection || !this.currentSelectedDatetime) {
      return null;
    }

    const cartTimeslots = this.#getCartTimeslotsWithItems();
    if (cartTimeslots.length === 0) {
      return null;
    }

    return cartTimeslots.includes(this.currentSelectedDatetime) ? null : cartTimeslots[0];
  }

  #getModifyOrderLinking(): { sourceOrderId: number; targetOrderId: number } | undefined {
    const sourceOrderId = this.#state.modifiedOrder()?.id;
    const targetOrderId = this.#state.modifyOrderNewOrderId;
    if (sourceOrderId == null || targetOrderId == null) {
      return undefined;
    }
    return { sourceOrderId, targetOrderId };
  }

  // ══════════════════════════════════════════ modify order ════════════════════════════════════════

  /** `#modifiedOrderIdParam`, fed from the query params in the constructor. */
  readonly #modifiedOrderId: WritableSignal<string | undefined> = signal<string | undefined>(undefined);

  #getModifyOrderProceedWithoutUpgradeAddonWarning(): { messageKey: string; mode: 'warning'; titleKey: string } | null {
    const cart = this.#cart.getCart();
    const hasCoupon = Boolean(this.#state.coupon ?? cart?.appliedCoupon);
    if (!hasCoupon || cart == null) {
      return null;
    }
    if (this.#getUpgradeSeatCount(cart) > 0) {
      return null;
    }
    const messageBase = 'oneStopShop.errors.modifyOrderValidation.proceedWithoutUpgradeAddon';
    return {
      messageKey: `${messageBase}.message`,
      mode: 'warning',
      titleKey: `${messageBase}.title`,
    };
  }

  /** The banner copy differs for a seat upgrade. */
  readonly modifiedOrderBannerTitleKey: Signal<string> = computed(() =>
    this.#state.modifiedOrderMode() === ModifiedOrderModeEnum.UpgradeSeating
      ? 'boxOffice.orderModificationBanner.seatsTitle'
      : 'boxOffice.orderModificationBanner.title',
  );

  /** Flag `modify_order_with_seating_through_new_pos`, variable `session_type_ids_…`. */
  #getOptimizelyUpgradeSessionTypeIds(): number[] {
    return (
      this.#optimizely.getFeatureVariableJSON<{ session_type_ids: number[] }>(
        'modify_order_with_seating_through_new_pos',
        'session_type_ids_considered_as_seating_upgrades',
      )?.session_type_ids ?? []
    );
  }

  /**
   * The navigation may already carry the order, avoiding a round trip. A `modify_order` entry
   * always refetches: its flow needs the freshest cart to seed from.
   */
  #getOrderForModificationFlow(orderId: string): Observable<Order | null> {
    if (this.isModifyOrderEntry()) {
      return this.#fetchOrderById(orderId);
    }
    const routerStateOrder = (history.state as { order?: Order } | null)?.order;
    if (routerStateOrder != null) {
      return of(routerStateOrder);
    }
    return this.#fetchOrderById(orderId);
  }

  #guardFiscalTaxes(cart: Cart | null): Observable<boolean> {
    return this.#core.guardFiscalTaxes(this.#state.onsiteSetupSelected?.place?.country_iso_code_2, this.#state.partner?.id, cart?.id);
  }

  #runEfrHealthCheckAfterShiftValidation(checkedCashRegisterId: string | undefined): Observable<boolean> {
    if (this.#state.activeShift()?.cashRegister === checkedCashRegisterId) {
      return of(true);
    }
    return this.#core.guardFiscalPurchaseAfterShiftStart(
      this.#state.onsiteSetupSelected?.place?.country_iso_code_2,
      this.#efrGuardPurchaseContext(),
    );
  }

  #guardFiscalComplianceAfterShiftValidation(checkedCashRegisterId: string | undefined, cart: Cart | null): Observable<boolean> {
    if (this.#state.activeShift()?.cashRegister === checkedCashRegisterId) {
      return of(true);
    }
    return this.#guardFiscalCompliance(cart);
  }

  #guardFiscalCompliance(cart: Cart | null): Observable<boolean> {
    const partnerId = this.#state.partner?.id;
    if (partnerId === undefined) {
      return of(true);
    }
    const activeShift = this.#state.activeShift();
    return this.#fiscalComplianceBlockGuard.guardPurchase({
      channelId: this.#state.channelId,
      complianceCheckoutEnabled: activeShift?.complianceCheckoutEnabled,
      hasActiveShift: activeShift !== null,
      onsiteSetupId: this.#state.onsiteSetupSelected?.id,
      partnerId,
      planIds: [...new Set([this.#state.plan?.id, ...collectPlanIdsFromCart(cart)])].filter(
        (planId): planId is number => planId !== undefined,
      ),
    });
  }

  #allCartLinesHaveUnitPrice(cart: Cart): boolean {
    let allLinesHaveUnitPrice = true;
    cart.sessionItemsByDatetime?.forEach(sessions =>
      sessions.forEach(session => {
        if (session.unitPrice == null) {
          allLinesHaveUnitPrice = false;
        }
      }),
    );
    return allLinesHaveUnitPrice;
  }

  #buildModifyOrderSessionItems(sessionItemsByDatetime: Map<string, CartSession[]>): SessionItem[] {
    const unitsBySessionId = new Map<number, number>();
    sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        unitsBySessionId.set(session.sessionId, (unitsBySessionId.get(session.sessionId) ?? 0) + session.units);
      });
    });
    return Array.from(unitsBySessionId.entries()).map(([sessionId, ticketNumber]) => ({ sessionId, ticketNumber }));
  }

  #buildModifyOrderSessionItemsByDatetime(cart: Cart): Map<string, CartSession[]> {
    const sessionItemsByDatetime = new Map<string, CartSession[]>();
    cart.sessionItemsByDatetime?.forEach((sessions, datetime) => {
      const cartSessions = sessions
        .filter(session => session.sessionId != null && session.units > 0)
        .map(session => {
          const targetSession = new CartSession(session.sessionId, session.units);
          targetSession.mainPlanId = session.mainPlanId;
          if (session.manualPrice != null) {
            targetSession.catalogUnitPrice = session.catalogUnitPrice;
            targetSession.manualPrice = this.#linePrice.catalogueManualPriceOf(session);
          }
          return targetSession;
        });
      if (cartSessions.length > 0) {
        sessionItemsByDatetime.set(datetime, cartSessions);
      }
    });
    return sessionItemsByDatetime;
  }

  #discardModifyOrderCart(paymentCart: Cart): void {
    const partnerId = this.#state.partner?.id;
    if (paymentCart.id && partnerId != null) {
      this.#core
        .discardCart({ cartId: paymentCart.id, partnerId })
        .pipe(
          take(1),
          catchError(() => EMPTY),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
    }
  }

  /** Undoes {@link #seedModifyOrderCartIfNeeded} when the flow aborts. */
  #discardModifyOrderSeededCart(): void {
    if (!this.#state.isModifyOrderCartSeeded) {
      return;
    }
    this.#state.isModifyOrderCartSeeded = false;
    this.#state.modifyOrderSessionTypeDiscounts.set(null);
    this.#state.allowMultiTimeSlotSelection = false;
    this.#state.isPreservingCart = false;
    this.#state.nonConfirmedCart = null;
    this.#state.cartTotalMoney = new Money(0, this.#state.currency ?? '');
    this.#state.selectedTicketsBySessionId = new Map<string, number>();
    this.#state.selectedTicketsBySessionType = new Map<string, number>();
    this.#viewUpdate.markForCheck();
  }

  #enterModifyOrderPaymentState(paymentCart: Cart): void {
    this.#state.cart = paymentCart;
    this.#state.modifyOrderPaymentCart.set(paymentCart);
    this.#viewUpdate.markForCheck();
  }

  #fillMissingUnitPricesFromLineTotals(cart: Cart): void {
    cart.sessionItemsByDatetime?.forEach(sessions =>
      sessions.forEach(session => {
        if (session.unitPrice == null && session.price != null && session.units > 0) {
          session.unitPrice = new Money(session.price.amount / session.units, session.price.currency);
        }
      }),
    );
  }

  #getEarliestTargetSessionDate(sessionItemsByDatetime: Map<string, CartSession[]>): Date {
    const targetDatetime = this.#getEarliestSessionDatetime(sessionItemsByDatetime);
    if (targetDatetime !== undefined) {
      return new Date(targetDatetime);
    }
    const orderDatetime = this.#getEarliestSessionDatetime(this.#state.modifiedOrder()?.cart?.sessionItemsByDatetime);
    return orderDatetime !== undefined ? new Date(orderDatetime) : new Date();
  }

  #getEarliestSessionDatetime(sessionItemsByDatetime: Map<string, CartSession[]> | undefined): string | undefined {
    return Array.from(sessionItemsByDatetime?.keys() ?? [])
      .filter(datetime => datetime !== 'products')
      .sort()[0];
  }

  /**
   * An overridden order's lines carry the post-override price; `getModifyOrderTotal()` adds the override
   * on top, so any recalculation from those lines would count it twice.
   */
  #restoreLinePricesWithoutOverride(cart: Cart): void {
    cart.sessionItemsByDatetime?.forEach(sessions =>
      sessions.forEach(session => {
        const overridePrices = session.overridePrices;
        if (overridePrices == null || session.units <= 0) {
          return;
        }
        const { totalPriceWithoutOverride: price, totalSurchargeWithoutOverride: surcharge } = overridePrices;
        session.unitPrice = new Money(price.amount / session.units, price.currency);
        session.price = new Money(price.amount, price.currency);
        session.surchargePerTicket = new Money(surcharge.amount / session.units, surcharge.currency);
        session.totalSurchargePerTicket = new Money(surcharge.amount, surcharge.currency);
        session.total = new Money(fixedDecimals(price.amount + surcharge.amount, 3), price.currency);
      }),
    );
  }

  /** Cash tender for the difference payment; skipped for free/zero differences. */
  #handleModifyOrderCashCalculator(paymentCart: Cart): Observable<{ amount: number } | null> {
    if (this.#state.paymentType() !== PaymentType.CASH) {
      return of(null);
    }
    if ((paymentCart.total?.amount ?? 0) <= 0) {
      return of({ amount: 0 });
    }
    if (this.#state.isCheckoutModalFlow) {
      return of({ amount: 0 });
    }
    return this.#ui
      .request('cashCalculator', {
        cart: paymentCart,
        cashModalMandatory: this.#state.cashModalMandatory,
        trackViewEvent: posCheckoutCashCalcShowModal({ toBePaid: paymentCart.total!.amount }),
      })
      .pipe(take(1));
  }

  get #linePrice(): PosModifyOrderLinePriceService {
    return this.#injector.get(PosModifyOrderLinePriceService);
  }

  /** Only "See more options" on the modify-order payment step offers it, never a quick-pay button or a sale. */
  #modificationPaymentLinkOption(): CheckoutPaymentLinkOption | null {
    if (this.#state.requestedCheckoutFlow !== 'fullCheckout' || this.#state.modifyOrderPaymentCart() === null) {
      return null;
    }
    return this.#injector.get(PosModificationPaymentLinkService, null)?.checkoutOption() ?? null;
  }

  /**
   * The modify-order counterpart of `handlePaymentError`: the checkout modal owns its own failure
   * and cancellation screens, so the legacy popups must never surface on top of them.
   */
  #handleModifyOrderPaymentError(error: unknown): void {
    if (error instanceof FiscalComplianceBlockPrepareError) {
      this.#requestFiscalComplianceBlockModal(error.code);
      return;
    }
    if (this.#checkoutPaymentDriver.isActive()) {
      return;
    }
    if (this.#state.isCheckoutModalFlow && isCancelledTransactionError(error)) {
      return;
    }
    this.#showPaymentErrorModal(error);
  }

  #handleModifyOrderRescheduleResponse(order: Order, response: Cart | BaseResponse<OrderRescheduled> | PayOneStepResponse): void {
    if (response instanceof Cart) {
      this.#spinner.hide();
      this.#enterModifyOrderPaymentState(response);
      return;
    }

    const orderId = response instanceof BaseResponse ? response.data?.orderId : response.order?.id;
    if (orderId === undefined) {
      this.#spinner.hide();
      this.#cart.showModalError();
      return;
    }

    const rescheduledCartId = response instanceof BaseResponse ? response.data?.cartId : response.cartId;
    if (this.isCrossPlanModificationActive() && rescheduledCartId != null && rescheduledCartId !== '') {
      this.#navigateToRescheduledCart(rescheduledCartId);
      return;
    }

    this.#navigateToRescheduledOrder(orderId);
  }

  #clearSeededReservationSettlementCart(): void {
    this.#state.cart = null;
    this.#state.nonConfirmedCart = null;
    this.#state.cartTotalMoney = new Money(0, this.#state.currency || '');
    this.#ticketSelection.clearSelectedTicketsReferences();
    this.#cart.resetCartPresentation();
  }

  #endReservationSettlement(): void {
    const hasSeededCart = this.#state.reservationSettlementSeededCartId !== null;
    this.clearReservationSettlementSession();
    if (hasSeededCart) {
      this.#clearSeededReservationSettlementCart();
      this.#coupons.removeAppliedDiscount();
    }
  }

  #rejectReservationSettlementEntry(): void {
    this.#endReservationSettlement();
    this.#state.isReservationSettlementRejected.set(true);
    this.clearReservationSettlementParams();
    this.#viewUpdate.markForCheck();
  }

  /** The confirmed cart is what gets charged and the non-confirmed one is what the screen shows, so both must be the reservation. */
  #matchesReservationSettlementCart(): boolean {
    const session = this.#reservationSettlementSession.session();
    return (
      matchesReservationSettlementSession(this.#state.cart ?? this.#state.nonConfirmedCart, session) &&
      matchesReservationSettlementSession(this.#state.nonConfirmedCart ?? this.#state.cart, session)
    );
  }

  /** The checkout modal is unwound before this runs; the banner says why and the till shows what the server would charge. */
  #raiseReservationSettlementChargeMismatch(error: ChargeMismatchError): void {
    const session = this.#reservationSettlementSession.session();

    this.#state.reservationSettlementMismatchReason.set('amount');
    this.#state.isReservationSettlementMismatch.set(true);
    this.#datadog.logWarn('Reservation settlement charge differs from the till, refusing to pay', {
      cartId: this.#state.cart?.id ?? null,
      chargedCouponCode: error.charged.couponCode,
      chargedTotal: error.charged.total.amount,
      displayedCouponCode: error.expected.couponCode,
      displayedTotal: error.expected.total.amount,
      partnerId: this.#state.partner?.id,
      reservationCartId: session?.cartId ?? null,
      reservationId: session?.reservationId ?? null,
    });
    this.#showReservationSettlementCart(error.cart);
  }

  #raiseReservationSettlementMismatch(): void {
    const session = this.#reservationSettlementSession.session();
    const cart = this.#state.cart ?? this.#state.nonConfirmedCart;

    this.#state.reservationSettlementMismatchReason.set('cart');
    this.#state.isReservationSettlementMismatch.set(true);
    this.#datadog.logWarn('Reservation settlement cart no longer matches the reservation, refusing to pay', {
      cartId: cart?.id ?? null,
      partnerId: this.#state.partner?.id,
      reservationCartId: session?.cartId ?? null,
      reservationId: session?.reservationId ?? null,
    });
    this.#viewUpdate.markForCheck();
  }

  #isMultiTimeSlotSelectionEnabled(): boolean {
    const userAttributes: UserAttributes = this.#state.selectedPlan ? { plan_id: this.#state.selectedPlan.id.toString() } : {};
    return this.#optimizely.isFeatureEnabled(FeatureFlags.MULTI_TIME_SLOT_SELECTION, userAttributes) ?? false;
  }

  /** A plain sale only: a reservation settlement and a modify-order payment keep today's pipeline. */
  #isBookingQuestionsAfterPrepareEnabled(): boolean {
    return !this.isReservationSettlementMode() && !this.isModifyOrderMode() && this.#preparedCart.isEnabled();
  }

  /**
   * The booking questions step of a sale whose cart is prepared ahead of its payment (B2BO-9578): the bookkeeping and
   * the member benefits the payment runs before its own prepare, then the prepare and the questions it brings.
   */
  #prepareAndAskPreBookingQuestions$(): Observable<void> {
    this.#secondScreen.clearHighlightedSeats();
    this.#recordCartPrepareAttempt();
    const query = this.generatePayOneStepQueryParams();
    return this.#applyMemberBenefitsOrStopTheSale$(query).pipe(
      switchMap(() => this.#preparedCart.prepareAndAskPreBookingQuestions$(query, reason => this.#replacePreparedCart$(reason))),
    );
  }

  /**
   * Replaces a cart prepared for a payment that never started with an unprepared one holding the same lines and
   * coupons, as a customer change does in `#discardAndRecreateCartIfCustomerChanged$`: discard and recreate, or, on a
   * real-time map, supersede (a discard empties the OneBox basket). An expired basket has nothing left to recreate.
   */
  #replacePreparedCart$(reason: PosPreparedCartReleaseReason): Observable<PosPreparedCartReplaced> {
    this.#lastCartPrepareAttempt = null;
    if (this.#state.isRealTimeSeating) {
      this.#state.realTimeCartSelectionKey = null;
      if (reason === PosPreparedCartReleaseReason.BASKET_EXPIRED) {
        return of({ couponsReapplied: true, replacement: PosPreparedCartReplacement.SUPERSEDE_WITHOUT_RECREATE });
      }
      return this.#recreateCartWithAppliedCoupons$().pipe(
        map(couponsReapplied => ({ couponsReapplied, replacement: PosPreparedCartReplacement.SUPERSEDE })),
      );
    }
    const cartId = this.#state.cart?.id;
    this.#state.cart = null;
    const discarded$ =
      cartId == null ? of(null) : this.#core.discardCart({ cartId, partnerId: this.#state.partner!.id }).pipe(catchError(() => of(null)));
    return discarded$.pipe(
      switchMap(() => this.#recreateCartWithAppliedCoupons$()),
      map(couponsReapplied => ({ couponsReapplied, replacement: PosPreparedCartReplacement.DISCARD_AND_RECREATE })),
    );
  }

  /**
   * Requests every booking question of the cart as soon as the pay pipeline has the server cart, so the
   * request runs while the operator is still in the contact information step, and both the pre- and the
   * post-booking step read it instead of requesting. The cart is not prepared yet, so fever2 answers what it would answer at the booking questions step; a
   * recreated cart has a new id and is requested again.
   */
  #prefetchBookingQuestions(): void {
    const cartId = this.#state.cart?.id;
    if (cartId == null) {
      return;
    }
    this.#core.prefetchBookingQuestions(cartId);
  }

  #isReservationSettlementEntry(): boolean {
    return this.#reservationSettlementSession.isEntry(this.#activatedRoute.snapshot.queryParams);
  }

  #modifyOrderCartIsUnchanged(): boolean {
    const orderCart = this.#state.modifiedOrder()?.cart;
    if (orderCart == null || this.#state.nonConfirmedCart == null) {
      return false;
    }
    return this.#state.nonConfirmedCart.hasSameContent(orderCart);
  }

  #modifyOrderChargedTotal(paymentCart: Cart): Money {
    const total = paymentCart.total;
    return total != null ? new Money(total.amount, total.currency || this.#state.currency || '') : this.#state.cartTotalMoney;
  }

  #moveShopProductsToProductsBucket(cart: Cart): void {
    const sessionItemsByDatetime = new Map<string, CartSession[]>();
    const productsBySessionId = new Map<number, CartSession>();

    const collectProduct = (session: CartSession): void => {
      const alreadyCollected = productsBySessionId.get(session.sessionId);
      if (alreadyCollected) {
        alreadyCollected.units += session.units;
        return;
      }
      productsBySessionId.set(session.sessionId, session);
    };

    cart.sessionItemsByDatetime.forEach((sessions, datetime) => {
      if (datetime === 'products') {
        sessions.forEach(collectProduct);
        return;
      }
      const ticketSessions = sessions.filter(session => {
        if (session.sessionType?.isShopProduct !== true) {
          return true;
        }
        collectProduct(session);
        return false;
      });
      if (ticketSessions.length > 0) {
        sessionItemsByDatetime.set(datetime, ticketSessions);
      }
    });

    if (productsBySessionId.size > 0) {
      sessionItemsByDatetime.set('products', [...productsBySessionId.values()]);
    }

    cart.sessionItemsByDatetime = sessionItemsByDatetime;
  }

  /** The modal owns the screen until it closes; only then may we leave the page. */
  #navigateAfterModifyOrderPayment(orderId: number): void {
    const navigate = (): void => {
      if (this.#resolveSuccessCartId() == null) {
        this.#datadog.logWarn(
          '[POS-PURCHASE] Modify order difference payment success cart ID is null, falling back to rescheduled order screen',
          {
            orderId,
          },
        );
        this.#navigateToRescheduledOrder(orderId);
        return;
      }
      this.navigateToSuccessPage();
    };
    if (!this.#state.isCheckoutModalFlow) {
      navigate();
      return;
    }
    this.#checkoutPaymentDriver.modalClosed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => navigate());
  }

  /** Hands the paid cart to the confirmation screen's resolver, and takes it back when the router refuses the navigation. */
  #navigateToPurchasedCart(cartId: string, paidCartHandoff: PurchasedCartHandoff | null): void {
    const handoff = paidCartHandoff?.cartId === cartId ? paidCartHandoff : null;
    if (handoff !== null) {
      this.#purchasedCartHandoff.handOff(handoff);
    }
    this.#contactInformationDraft.clear();
    this.#router.navigate(['/box-office/purchased-cart/', cartId], this.#buildSuccessNavigationExtras()).then((navigated: boolean) => {
      if (!navigated && handoff !== null) {
        this.#purchasedCartHandoff.discard(handoff);
      }
    });
  }

  /**
   * A moved modification settles into one order per plan, and the rescheduled-order screen shows one
   * order of one plan — it hides the rest, and `OrderResolver` bounces an order whose plan is not the
   * one on screen. The purchased cart screen is cart-scoped, which is where a multiplan sale lands.
   * `isOrderModificationLanding` keeps the Polish zero-value notice down: a modification settles at zero
   * because the exchange coupon covers it, so the notice would be noise, exactly as on the other two landings.
   */
  #navigateToRescheduledCart(cartId: string): void {
    this.#unsavedChangesBypass?.markPendingBypass();
    this.#router.navigate(['/box-office/purchased-cart/', cartId], {
      queryParams: this.#buildModifyOrderLandingQueryParams(),
      queryParamsHandling: 'merge',
      state: {
        autoPrint: true,
        isOssFlow: true,
        isOrderModificationLanding: true,
        paymentTransactionId: this.#core.getLastPaymentTransactionId(cartId),
        plan: this.#state.plan,
      },
    });
  }

  /** Rescheduled-order screen, with the plan params that make it auto-print. */
  #navigateToRescheduledOrder(orderId: number): void {
    this.#unsavedChangesBypass?.markPendingBypass();
    this.#router.navigate(['/box-office/order/', orderId], {
      queryParams: this.#buildModifyOrderLandingQueryParams(),
      queryParamsHandling: 'merge',
      state: {
        autoPrint: true,
        cart: this.#state.cart,
        isOssFlow: true,
        plan: this.#state.plan,
      },
    });
  }

  /** Shared by both modification landings, which differ in their navigation state and not in their params. */
  #buildModifyOrderLandingQueryParams(): Params {
    return {
      cityId: this.#state.selectedCity?.id,
      mode: null,
      modified_order_id: null,
      planId: this.#state.selectedPlan?.id ?? this.#state.modifiedOrder()?.planId,
      venueId: this.#state.selectedPlace?.id,
    };
  }

  /**
   * Seeds the working cart from the modified order's own cart (once per entry): coupon stripped,
   * line prices restored to before the order's price override, unit prices backfilled from line
   * totals, selections recomputed, F&B rows registered from the catalog as a sale would,
   * shared-availability rules applied. `allowMultiTimeSlotSelection` + `isPreservingCart` keep the
   * seeded lines alive across the availability reload.
   */
  #seedModifyOrderCartIfNeeded(): void {
    if (this.#state.isModifyOrderCartSeeded || !this.isModifyOrderMode()) {
      return;
    }
    const orderCart = this.#state.modifiedOrder()?.cart;
    if (!orderCart) {
      return;
    }
    this.#state.isModifyOrderCartSeeded = true;
    this.#state.allowMultiTimeSlotSelection = true;
    this.#state.isPreservingCart = true;
    this.#moveShopProductsToProductsBucket(orderCart);
    const seededCart = orderCart.clone();
    seededCart.appliedCoupon = null;
    if (orderCart.adjustment != null) {
      this.#restoreLinePricesWithoutOverride(seededCart);
    }
    this.#state.modifyOrderSessionTypeDiscounts.set(sessionTypeDiscountsFrom(seededCart));
    this.#fillMissingUnitPricesFromLineTotals(seededCart);
    if (this.#allCartLinesHaveUnitPrice(seededCart)) {
      seededCart.calculateTotal();
    } else if (orderCart.adjustment != null && orderCart.totalWithoutOverride != null) {
      seededCart.total = orderCart.totalWithoutOverride;
    }
    this.#state.nonConfirmedCart = seededCart;
    this.#state.cartTotalMoney = new Money(seededCart.total?.amount ?? 0, seededCart.total?.currency || this.#state.currency || '');
    this.#ticketSelection.recalculateSelectedTicketsFromCart();
    this.#state.modifyOrderSeededProductLines = new Map();
    this.#ticketSelection.registerModifyOrderProductRowsFromCatalog();
    this.applyModifyOrderSharedAvailabilityRules();
    this.#viewUpdate.markForCheck();
  }

  #seedReservationSettlementCart(session: ReservationSettlementSession): void {
    if (this.#state.reservationSettlementSeededCartId === session.cartId && this.#state.nonConfirmedCart != null) {
      return;
    }
    this.#state.reservationSettlementSeededCartId = session.cartId;
    this.#state.allowMultiTimeSlotSelection = true;
    this.#state.isPreservingCart = true;
    this.#showReservationSettlementCart(session.cart.clone());
  }

  #showReservationSettlementCart(cart: Cart): void {
    this.#state.coupon = adoptReservationSettlementCoupon(cart);
    // Without a coupon there is nothing to strike through, and a later local recompute starts from this base.
    if (this.#state.coupon === null && cart.total != null) {
      cart.totalWithoutDiscount = cart.total;
    }
    this.#state.couponCodeApplied.next(this.#state.coupon !== null);
    this.#state.cart = cart;
    this.#state.nonConfirmedCart = cart;
    const currency = this.#state.currency || '';
    this.#state.cartTotalMoney = new Money(cart.total?.amount ?? 0, cart.total?.currency || currency);
    const totalWithoutCoupon = cart.totalWithoutDiscount ?? cart.total;
    this.#state.cartTotalMoneyWithoutCoupon = new Money(totalWithoutCoupon?.amount ?? 0, totalWithoutCoupon?.currency || currency);
    this.#state.cartHasEffectiveDiscount = this.#state.cartTotalMoneyWithoutCoupon.amount !== this.#state.cartTotalMoney.amount;
    this.#ticketSelection.recalculateSelectedTicketsFromCart();
    this.#viewUpdate.markForCheck();
  }

  #getOriginalOrderSeatIds(): number[] {
    return (
      this.#state
        .modifiedOrder()
        ?.assignedSeatsIds?.map(seat => seat.seatsIds)
        .flat() ?? []
    );
  }

  /** Pure fold, duplicated per domain (the second-screen strategy has its own copy). */
  #getSeatIdsFromCart(cart: Cart): string[] {
    return Array.from(cart.sessionItemsByDatetime?.values() ?? [])
      .reduce((acc, val) => acc.concat(val), [] as CartSession[])
      .map((session: CartSession) => session.seats)
      .filter((seats): seats is string[] => seats != null)
      .flat();
  }

  #getSessionNameById(sessionId: number): string | null {
    const session = this.#getAllSessions().find(candidate => candidate.id === sessionId);
    return session?.name || session?.sessionType?.label || null;
  }

  /** Cart lines whose session type counts as a paid seating upgrade. */
  #getUpgradeSeatCount(cart: Cart): number {
    const upgradeIds = new Set(this.#getOptimizelyUpgradeSessionTypeIds());
    const sessions = Array.from(cart.sessionItemsByDatetime?.entries() ?? [])
      .filter(([key]) => key !== 'products')
      .flatMap(([, cartSessions]) => cartSessions);

    return sessions
      .filter((session: CartSession) => session.sessionType?.id != null && upgradeIds.has(session.sessionType.id))
      .reduce((sum, session) => sum + session.units, 0);
  }

  /**
   * `#handlePaymentError` — on a classic free-seating map the payment may have prepared the cart
   * server-side; such a cart can never be paid again, so it is discarded rather than retried. Real-time
   * carts never reach this branch (see `handlePaymentError`).
   */
  #handleFreeSeatingPaymentError(error: unknown): void {
    this.#core
      .getCart(this.#state.partner!.id, this.#state.cart!.id!)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.#showPaymentErrorModal(error),
        next: response => {
          if (response.data?.preparedAt) {
            this.#cart.discardCartAfterPaymentError();
          } else {
            this.#showPaymentErrorModal(error);
          }
        },
      });
  }

  /**
   * The component owns the compliance dialog: it closes the checkout modal and opens the dialog in
   * the same turn, so the dismissal cannot unwind the flow first.
   */
  #requestFiscalComplianceBlockModal(code: FiscalComplianceBlockCode): void {
    this.#ui.request('fiscalComplianceBlock', { code }).pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  /**
   * Drops `mode` + `modified_order_id` so the page becomes a normal sale, discarding whatever the
   * modification seeded and restoring the merchandising surfaces it had hidden.
   */
  #handleMissingOrderDataInModifyOrderFlow(): void {
    this.#state.modifyOrderFlowAborted = true;
    this.#state.modifiedOrder.set(undefined);
    this.#discardModifyOrderSeededCart();
    setTimeout(() => {
      void this.#router
        .navigate([], {
          queryParams: { mode: null, modified_order_id: null },
          queryParamsHandling: 'merge',
          relativeTo: this.#activatedRoute,
          replaceUrl: true,
        })
        .then(() => this.#setup.restoreMerchandisingAfterModifyOrderAbort());
    }, 0);
  }

  /** The post-sale questionnaire, asked once the checkout modal has closed. */
  #handlePostBookingQuestions(orderId?: number): Observable<boolean> {
    return this.#ui.request('bookingQuestions', { cart: this.#state.cart, orderId, phase: 'post' }).pipe(take(1));
  }

  /** Shared with `PosCartService`, duplicated because both files own their own code list. */
  #invalidCartStatusMatches(errorCode: string | number | undefined, codes: readonly number[]): boolean {
    if (errorCode == null) {
      return false;
    }
    return codes.includes(Number(errorCode));
  }

  /**
   * Links the new order to the original one once the payment settled. A failure is
   * reported but does **not** fail the sale: the order exists and the operator must be able to move on.
   */
  #modifyOrderLinkAfterPayInOneStep(response: PayOneStepResponse | null): Observable<PayOneStepResponse | null> {
    if (response === null) {
      return of(null);
    }
    if (!this.isUpgradeSeatingMode() && !this.isAddTicketsMode()) {
      return of(response);
    }
    this.#state.modifyOrderNewOrderId = response.order.id ?? null;
    this.#spinner.show();
    return this.linkOrdersForModifyOrder().pipe(
      takeUntilDestroyed(this.#destroyRef),
      tap(() => {
        this.#spinner.hide();
      }),
      map(() => response),
      catchError(() => {
        this.#spinner.hide();
        this.#cart.showModalError();
        return of(response);
      }),
    );
  }

  /**
   * Success handler. Tracks, navigates, and hands the modify-order variants over to their own
   * seat-reconciliation paths instead of navigating straight away.
   */
  #onPaymentSettled(response: PayOneStepResponse): void {
    this.#seating.markBasketConsumed();
    // The live cart/query can be reset (loadNewSearch, invalid-cart recovery, discard-after-error)
    // during the async book-result polling; use the snapshots armed in `#payInOneStepOnce()` so the
    // completed sale is never lost. The armed snapshot is the source of truth; the live fallback is
    // kept only for defensive symmetry.
    const payOneStepQuery = this.#paidQuerySnapshot ?? this.generatePayOneStepQueryParams();
    const paidCart = this.#paidCartSnapshot;
    const paidCartHandoff = this.#buildPaidCartHandoff(response.cart ?? null);
    this.#trackPaymentCompleted(payOneStepQuery.paymentType);
    if (paidCart !== null) {
      this.#sendCreateOrderEvent(response, payOneStepQuery, paidCart);
    }
    this.clearReservationSettlementSession();

    this.#secondScreen.updatePayment();
    this.#state.shouldResetOboSecondScreenToStandBy = false;

    if (this.isUpgradeSeatingMode() || this.isAddTicketsMode()) {
      if (this.isUpgradeSeatingMode()) {
        this.#upgradeSeatingRelease();
      } else {
        this.navigateToSuccessPage();
      }
      return;
    }

    const doNavigate = (): void => {
      this.#cartTiming.markSaleCheckoutClosed();
      // A pending fiscal operator message blocks navigation until acknowledged.
      this.#core
        .showFiscalUserMessageIfPresent()
        .pipe(this.#cartTiming.trackOperatorTime(), take(1), takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#unsavedChangesBypass?.markPendingBypass();
          const purchasedCartId = payOneStepQuery.cartId ?? this.#state.cart?.id;
          if (purchasedCartId != null) {
            this.#navigateToPurchasedCart(purchasedCartId, paidCartHandoff);
            return;
          }
          this.#router.navigate(['/box-office/order/', response.order.id], this.#buildSuccessNavigationExtras());
        });
    };

    if (this.#state.isCheckoutModalFlow) {
      // The modal owns the screen until it closes; only then may we leave the page. Under
      // `NEW_PAYMENT_FLOW` the modal already asked the post-booking questions itself. The snapshot is
      // captured here because the purchase pipeline's finalize clears it before modalClosed$ fires.
      const isCheckoutModalFlow = this.#state.isCheckoutModalFlow;
      this.#checkoutPaymentDriver.modalClosed$
        .pipe(
          take(1),
          switchMap(() => (isCheckoutModalFlow ? of(true) : this.#handlePostBookingQuestions(response.order.id))),
          take(1),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe(() => doNavigate());
      return;
    }
    doNavigate();
  }

  /** Fills the bottom sheet the operator picks the releasable tickets in. */
  #openPostPaymentSeatReconciliationSheet(): void {
    const order = this.#state.modifiedOrder();
    const originalTickets = order?.accessTickets ? Array.from(order.accessTickets.values()).filter(ticket => ticket.seatId != null) : [];
    const newSeatsCount = this.#getCartSeatIds().length;

    this.#state.releaseTicketSeats.set(originalTickets);
    this.#state.releaseTicketSelections.set(originalTickets.map(() => false));
    this.#state.releaseTicketsAddedCount.set(newSeatsCount);
    this.#state.releaseTicketsRequiredCount.set(newSeatsCount);
    this.#state.isReleaseTicketsSheetOpen.set(true);
  }

  /** The prefix-driven `ConfirmModalComponent`, shared with the shift prompts. */
  #openShiftConfirmationModal(translationPrefix: string): Observable<boolean> {
    return this.#ui.request('confirm', { translationPrefix }).pipe(take(1));
  }

  #parseModifiedOrderMode(mode: unknown): ModifiedOrderMode | undefined {
    if (mode === ModifiedOrderModeEnum.UpgradeSeating || mode === ModifiedOrderModeEnum.AddTickets) {
      return mode;
    }
    if (mode === ModifiedOrderModeEnum.ModifyOrder && this.isOrderModificationWithOssEnabled()) {
      return mode;
    }
    return undefined;
  }

  #parseTicketRequirementsFromError(errorMessage: string): { max: number; min: number; sessionId: number } | null {
    const regex = /from\s+(\d+)\s+to\s+(\d+)\s+for\s+session\s+(\d+)/;
    const match = errorMessage.match(regex);

    if (!match) {
      return null;
    }

    return { max: Number(match[2]), min: Number(match[1]), sessionId: Number(match[3]) };
  }

  /** A single payment attempt. */
  #payInOneStepOnce(): Observable<PayOneStepResponse | null> {
    this.#state.showPaymentsInLateral = false;
    if (this.#state.paymentInProgress || this.#core.isHandlingFranceAsyncFiscalFailure()) {
      return of(null);
    }
    this.#unsavedChangesBypass?.markPendingBypass();
    this.#spinner.show();
    this.#state.paymentInProgress = true;
    this.#cartTiming.markSaleStep('prepare');
    this.#recordCartPrepareAttempt();
    // Snapshot the paid cart and query before the terminal engages. `state.cart` can be nulled by a
    // concurrent `loadNewSearch` / invalid-cart recovery / discard-after-error while the async
    // book-result polling is still in flight (B2BO-7636). Post-payment processing consumes these
    // snapshots so a completed sale never throws or is lost.
    // A cart prepared ahead of the payment (B2BO-9578) already carries the member benefits and is paid as it is.
    const generatedQuery = this.generatePayOneStepQueryParams();
    const preparedCart = this.#preparedCart.takePreparedCart(generatedQuery.cartId);
    const payOneStepQuery: PayOneStepQuery = preparedCart === null ? generatedQuery : { ...generatedQuery, preparedCart };
    this.#paidQuerySnapshot = payOneStepQuery;
    this.#paidCartSnapshot = this.#state.cart;
    return (preparedCart === null ? this.#applyMemberBenefitsOrStopTheSale$(payOneStepQuery) : of(void 0)).pipe(
      switchMap(() => {
        this.#trackPaymentStarted();
        return this.#core.pay(payOneStepQuery).pipe(
          catchError((error: unknown) => {
            this.#trackPaymentFailed(error);
            return throwError(() => error);
          }),
        );
      }),
      finalize(() => {
        this.#state.paymentInProgress = false;
        // Reset on every termination (success/error/cancel). On Square/Payhere cancel the stream
        // completes without error, so the `error` handler never runs; without this reset the flag
        // stays true and `createOrUpdateCart()` short-circuits, leaving cart edits unsaved.
        this.#state.isReadyForSeatReleasePayment = false;
        this.#spinner.hide();
      }),
    );
  }

  /**
   * Bookkeeping paired with {@link #discardAndRecreateCartIfCustomerChanged$}: every prepare attempt
   * (the pay-one-step pipeline arms this) records the cart id and customer email in flight, so the
   * next attempt can detect a mid-flow customer swap and rebuild the cart against the correct user.
   */
  #recordCartPrepareAttempt(): void {
    this.#state.lastCartWrite = null;
    if (this.#state.cart?.id == null) {
      return;
    }
    this.#lastCartPrepareAttempt = { cartId: this.#state.cart.id, customerEmail: this.#state.customer?.email ?? null };
  }

  /**
   * Rebuilds the discarded cart from `nonConfirmedCart` and re-applies whichever coupon layer was on
   * the previous cart. In coupon-combination mode every stacked gift card is re-tried in order; a
   * partial failure surfaces the last `couponError` and resolves `false`, aborting the pay pipeline
   * without confusing the operator with a paid cart that suddenly has fewer discounts. Without any
   * coupons the plain create/update path is enough.
   */
  #recreateCartWithAppliedCoupons$(): Observable<boolean> {
    const inCombinationMode = this.#coupons.hasStackedCoupons();
    const appliedCouponCodes = inCombinationMode
      ? this.#state.combinedCoupons.map((coupon: Coupon) => coupon.code)
      : this.#state.coupon != null
        ? [this.#state.coupon.code]
        : [];
    if (appliedCouponCodes.length === 0) {
      return this.#cart.createOrUpdateCart().pipe(
        mergeMap(response => this.#cart.checkResponseData(response)),
        tap(response => {
          this.#state.cart = response.data;
          this.#state.cart!.hasSeating = this.#state.nonConfirmedCart?.hasSeating ?? false;
          this.#core.publishCart(this.#state.cart!);
        }),
        map(() => true),
      );
    }
    this.#coupons.clearCoupon();
    let lastCouponApplyError: Error | null = null;
    return from(appliedCouponCodes).pipe(
      concatMap(code =>
        (inCombinationMode ? this.#coupons.restackCouponOneStep$(code) : this.#coupons.applyCouponOneStep$(code, null)).pipe(
          defaultIfEmpty(void 0),
          tap(() => {
            lastCouponApplyError = this.#state.couponError.getValue() ?? lastCouponApplyError;
          }),
        ),
      ),
      toArray(),
      map(() => {
        if (this.#state.cart?.id == null || !this.#allCouponCodesApplied(appliedCouponCodes)) {
          if (lastCouponApplyError !== null && this.#state.couponError.getValue() === null) {
            this.#coupons.setPromoCodeApplyError(lastCouponApplyError);
          }
          return false;
        }
        this.#core.publishCart(this.#state.cart);
        return true;
      }),
    );
  }

  // ══════════════════════════════════ seat handover (upgrade seating) ══════════════════════════════

  /** The exact-match branch releases every original seat without asking. */
  #releaseAllOriginalSeatsAndNavigate(): void {
    const order = this.#state.modifiedOrder();
    const originalTickets = order?.accessTickets ? Array.from(order.accessTickets.values()).filter(ticket => ticket.seatId != null) : [];
    const cancellations = this.#buildCancellationsFromTickets(originalTickets);

    if (cancellations.length === 0) {
      this.navigateToSuccessPage();
      return;
    }

    this.#releaseSeatsAndNavigate(cancellations);
  }

  #releaseSeatsAndNavigate(cancellations: SeatCancellationItem[]): void {
    this.#spinner.show();

    this.#core
      .cancelCodesAndReleaseSeats(cancellations, this.#getModifyOrderLinking())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#spinner.hide();
          this.#cart.showModalError();
        },
        next: () => {
          this.#spinner.hide();
          this.navigateToSuccessPage();
        },
      });
  }

  #resolveSuccessCartId(): string | undefined {
    return this.#paidQuerySnapshot?.cartId ?? this.#state.cart?.id;
  }

  get #seating(): PosSeatingService {
    return this.#injector.get(PosSeatingService);
  }

  get #secondScreen(): PosSecondScreenService {
    return this.#injector.get(PosSecondScreenService);
  }

  /**
   * Emitted only for a genuine modification: the URL must carry both a numeric
   * `modified_order_id` and a recognised `mode`, and the new order must exist.
   */
  #sendCreateModifiedOrderEvent(newOrderId: number | undefined): void {
    const params = this.#activatedRoute.snapshot.queryParams;
    const urlOrderId = params['modified_order_id'];
    if (!urlOrderId) {
      return;
    }
    const originalOrderId = Number(urlOrderId);
    const mode = params['mode'];
    const hasValidIds = newOrderId != null && !Number.isNaN(originalOrderId);
    const isValidMode = mode === ModifiedOrderModeEnum.UpgradeSeating || mode === ModifiedOrderModeEnum.AddTickets;

    if (!hasValidIds || !isValidMode) {
      return;
    }

    this.#legacyTracking.track(
      new CreateModifiedOrderEvent({
        mode,
        new_order_id: newOrderId,
        original_order_id: originalOrderId,
      }),
    );
  }

  /** The legacy Mixpanel channel; `#sendCreateModifiedOrderEvent` is chained at the end. */
  #sendCreateOrderEvent(response: PayOneStepResponse, query: PayOneStepQuery, cart: Cart): void {
    const isUsingCashCalculator = query.paymentType === PaymentType.CASH && (this.#state.cashCalculatorCashReceived ?? 0) > 0;
    const { order, paymentTransactionId } = response;
    const couponCode = this.#coupons.hasStackedCoupons() ? order.cart?.appliedCoupon?.code || null : cart.appliedCoupon?.code || null;

    this.#cartTiming.recordSaleOrder({
      orderId: order.id,
      paymentProvider: response.paymentProvider,
      paymentType: query.paymentType,
    });
    this.#legacyTracking.track(
      new CreateOrderEvent({
        cart_id: query.cartId,
        channel: this.#state.channelId,
        city_id: this.#state.selectedCity.id,
        city_name: this.#state.selectedCity.title,
        coupon_code: couponCode,
        currency: cart.total != null ? cart.total.currency : '',
        customer_id: cart.userId,
        event_date: [...cart.sessionItemsByDatetime][0][0],
        feverzone_user: this.#userService.getUserEmail(),
        integration_mode: this.#cartTiming.getSaleIntegrationMode(),
        obo_flow_type: this.#state.onsiteSetupSelected?.obo_flow_type,
        order_id: order.id,
        payment_provider: response.paymentProvider,
        payment_transaction_id: paymentTransactionId,
        payment_type: query.paymentType,
        place_id: this.#state.selectedPlace.id,
        place_name: this.#state.selectedPlace.title,
        plan_id: this.#state.selectedPlan.id,
        plan_name: this.#state.selectedPlan.title,
        purchase_source: this.#state.channelId,
        time: new Date().toISOString(),
        total: cart.total != null ? cart.total.amount : 0,
        total_purchased_tickets: cart.getNumberOfTicketAndProductCounts(),
        total_surcharge: cart.totalSurcharge != null ? cart.totalSurcharge.amount : 0,
        using_cash_calculator: isUsingCashCalculator,
        ...getMultiplanCartFlags(cart),
      }),
    );
    this.#sendCreateModifiedOrderEvent(order.id);
  }

  #setPayPipelineInFlight(inFlight: boolean): void {
    this.#state.payPipelineInFlight = inFlight;
    this.#viewUpdate.markForCheck();
  }

  get #setup(): PosSetupService {
    return this.#injector.get(PosSetupService);
  }

  get #shift(): PosShiftService {
    return this.#injector.get(PosShiftService);
  }

  /** Convenience overload resolved against the *active* setup signal. */
  #shouldShowDeviceSelector(paymentType?: PaymentType): boolean {
    return this.shouldShowDeviceSelector(paymentType, this.#state.activeOnsiteSetup(), this.#core.getPaymentConfiguration() ?? null);
  }

  /** Only cash tenders open it; a dismissal resolves to `null`. */
  #showCashCalculatorModal(): Observable<{ amount: number } | null> {
    if (this.#state.paymentType() !== PaymentType.CASH) {
      return of(null);
    }

    this.#secondScreen.clearHighlightedSeats();
    const cart = this.#cart.getCurrentCart();
    if (cart == null || cart.total == null) {
      return of(null);
    }
    return this.#ui
      .request('cashCalculator', {
        cart,
        cashModalMandatory: this.#state.cashModalMandatory,
        trackViewEvent: posCheckoutCashCalcShowModal({ toBePaid: cart.total.amount }),
      })
      .pipe(take(1));
  }

  /**
   * Contact-details modal. The component only opens `ContactInformationModalComponent` and hands
   * back the raw result; every side effect around it belongs here.
   */
  #showContactInformationModal(cartReady$?: Observable<unknown>): Observable<Customer | null> {
    this.#secondScreen.clearHighlightedSeats();
    this.#secondScreen.setSeatingMapFullscreen(false);
    const isDualScreenSynchronizationActive =
      (this.#optimizely.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ENABLE_SECOND_SCREEN_CONTACT_INFO,
        team: 'b2b-shops',
      }) ??
        false) &&
      this.#dualScreenStorage.containsData();
    if (isDualScreenSynchronizationActive) {
      this.#oboSecondScreenData.setIsContactInfoActive(true);
    }

    const context: PosContactInfoContext = {
      cartReady$,
      defaultCountry: this.#state.partner?.countryCode ?? null,
      fieldsOrder: this.#state.onsiteSetupSelected?.contact_information_setup?.fields_order ?? null,
      isDualScreenSynchronizationActive,
      keepsDraft: true,
      mandatoryFields: this.getMandatoryFields(),
      previousUserDetails: this.#contactInformationDraft.draft(),
      showEmail: this.#state.showEmailContactInformation,
      showPhoneNumber: this.#state.showPhoneNumberContactInformation,
    };
    const closed$ = this.#ui.request('contactInfo', context).pipe(take(1));
    this.#trackContactInfoShowModal(); // Intentionally fired after the modal is requested.

    return closed$.pipe(
      finalize(() => {
        if (isDualScreenSynchronizationActive) {
          this.#oboSecondScreenData.setIsContactInfoActive(false);
        }
      }),
      map((customer: Customer | null) => {
        if (customer) {
          this.updateCustomer(customer);
        }
        this.#trackContactInfoCloseModal(customer);
        return customer;
      }),
    );
  }

  #showHardwareMismatchModal(hardwareCheck: PosHardwareMismatchCheckResult): Observable<PosHardwareCheckResolution> {
    return this.#ui.request('hardwareMismatch', {
      overrideDeadline: hardwareCheck.overrideDeadline === null ? null : this.#formatDate(hardwareCheck.overrideDeadline),
      setupHardwareType: hardwareCheck.setupHardwareType,
    });
  }

  #showMembershipsAcceptTermsModal(member: MembershipsMember): Observable<void> {
    return this.#ui
      .request('membershipsAcceptTerms', {
        email: member.customer.email,
        fullName: `${member.customer.firstName} ${member.customer.lastName}`,
      })
      .pipe(
        take(1),
        map((): undefined => void 0),
        tap(() => this.updateCustomer(buildCustomerFromMember(member))),
      );
  }

  /**
   * Translation and interpolation happen here so the component handler is a plain
   * pass-through into the CDK dialog. `error` payloads map to the modal's terminal `info` mode;
   * the returned observable always emits on close (GAME-970 made the error-mode close observable
   * too, for the plan-unavailable abort).
   */
  #showModifyOrderValidationModal(payload: {
    messageKey: string;
    titleKey: string;
    alertTitleKey?: string;
    interpolationParams?: Record<string, string>;
    mode?: 'error' | 'warning';
  }): Observable<boolean> {
    const params = payload.interpolationParams;
    const payloadMode = payload.mode ?? 'error';

    const request$ = this.#ui.request('confirm', {
      alertTitle: payload.alertTitleKey ? this.#translate.instant(payload.alertTitleKey, params) : undefined,
      message: this.#translate.instant(payload.messageKey, params),
      mode: payloadMode === 'warning' ? 'confirm' : 'info',
      title: this.#translate.instant(payload.titleKey, params),
      variant: 'modifyOrderValidation',
    });

    if (payloadMode === 'warning') {
      return request$.pipe(take(1));
    }
    // `error` payloads are terminal for the modal, but the dialog must open even when the caller
    // ignores the result, and some callers (the plan-unavailable abort) act on the close. The
    // request is fired eagerly and its settlement replayed.
    const closed$ = new ReplaySubject<boolean>(1);
    request$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
      complete: () => closed$.complete(),
      next: (confirmed: boolean) => {
        closed$.next(confirmed);
        closed$.complete();
      },
    });
    return closed$.asObservable();
  }

  #showPaymentErrorModal(error: unknown): void {
    if (typeof error === 'string') {
      const formattedErrorMessage = this.#formatErrorMessage(error);
      const [errorTitle, errorMessage, errorCode] = formattedErrorMessage.split(',');
      this.#cart.showModal(errorTitle, errorMessage, errorCode);
      return;
    }

    const typedError = error as PaymentError;

    if (Number(typedError?.error?.code) === allowedTicketsErrorCode) {
      const formattedError = this.#formatBackendError(typedError.error?.message, typedError.error?.code);
      this.#cart.showModal(formattedError.title, formattedError.message, typedError.error?.code);
    } else if (typedError?.message || typedError?.error?.message) {
      this.#cart.showModalError(typedError.message ?? typedError.error?.message);
    } else {
      this.#cart.showModalError();
    }
  }

  // ═══════════════════════════════════════ timeslot mismatch ══════════════════════════════════════

  #showTimeslotMismatchWarning(cartDatetime: string): Observable<boolean> {
    const titlePrefix = this.#translate.instant('oneStopShop.timeslotWarningModal.titlePrefix');

    return this.#ui.request('confirm', {
      newlySelectedDatetime: this.#formatDatetime(this.currentSelectedDatetime),
      title: `${titlePrefix} ${this.#formatDatetime(cartDatetime)}`,
      variant: 'timeslotMismatch',
    });
  }

  get #ticketSelection(): PosTicketSelectionService {
    return this.#injector.get(PosTicketSelectionService);
  }

  #trackApplyBenefitsError(error: unknown): void {
    this.#tracking.track(
      posCheckoutMembershipsApplyBenefitsError({
        failureReason: extractPaymentFailureReason(error),
        planIds: collectPlanIdsFromCart(this.#state.cart),
      }),
    );
  }

  #trackContactInfoCloseModal(customer: Customer | null, options?: { autoFilled?: boolean }): void {
    const mandatoryFields = this.getMandatoryFields();

    this.#tracking.track(
      posCheckoutContactInfoCloseModal({
        action: resolveContactInfoCloseModalAction(customer, mandatoryFields, options),
        filledFields: getFilledContactInfoFields(customer),
        requiredFields: getRequiredContactInfoFields(mandatoryFields),
        visibleFields: getVisibleContactInfoFields(this.#state.showEmailContactInformation, this.#state.showPhoneNumberContactInformation),
      }),
    );
  }

  // ═══════════════════════════════════════ UI-port helpers ════════════════════════════════════════

  #trackContactInfoShowModal(): void {
    const mandatoryFields = this.getMandatoryFields();

    this.#tracking.track(
      posCheckoutContactInfoShowModal({
        requiredFields: getRequiredContactInfoFields(mandatoryFields),
        visibleFields: getVisibleContactInfoFields(this.#state.showEmailContactInformation, this.#state.showPhoneNumberContactInformation),
      }),
    );
  }

  #trackHardwareCheck(hardwareCheck: PosHardwareCheckResult): void {
    this.#datadog.logInfo('[POS-HARDWARE-CHECK] Onsite setup hardware type evaluated on pay', {
      deviceHardwareType: hardwareCheck.deviceHardwareType,
      isEnforcementEnabled: hardwareCheck.isEnforcementEnabled,
      onsiteSetupId: hardwareCheck.onsiteSetupId,
      outcome: hardwareCheck.outcome,
      overrideDeadline: hardwareCheck.overrideDeadline,
      partnerId: this.#state.partner?.id ?? null,
      setupHardwareType: hardwareCheck.setupHardwareType,
    });
  }

  #trackHardwareCheckResolution(hardwareCheck: PosHardwareCheckResult, resolution: PosHardwareCheckResolution): void {
    this.#datadog.logInfo('[POS-HARDWARE-CHECK] Operator answered the hardware mismatch warning', {
      deviceHardwareType: hardwareCheck.deviceHardwareType,
      onsiteSetupId: hardwareCheck.onsiteSetupId,
      partnerId: this.#state.partner?.id ?? null,
      resolution,
      setupHardwareType: hardwareCheck.setupHardwareType,
    });
  }

  #trackPaymentCompleted(paymentMethod: PaymentType): void {
    if (!this.#state.cart) {
      return;
    }
    this.#tracking.track(posCheckoutPaymentCompleted(buildPosCheckoutPaymentCompletedData(this.#state.cart, paymentMethod)));
  }

  #trackPaymentFailed(error: unknown): void {
    const paymentMethod = this.#state.paymentType();
    if (paymentMethod == null) {
      return;
    }
    this.#tracking.track(posCheckoutPaymentFailed(buildPosCheckoutPaymentFailedData(this.#state.cart, paymentMethod, error)));
  }

  // ═════════════════════════════════════════════ helpers ══════════════════════════════════════════

  /** Adyen terminal payments only; other gateways have no "started" moment to report. */
  #trackPaymentStarted(): void {
    if (
      !shouldTrackAdyenPaymentStarted(
        this.#state.paymentType(),
        this.#core.getPaymentConfiguration(),
        this.#boxOfficePaymentMethods.getGatewayProvider(this.#state.onsiteSetupSelected),
      )
    ) {
      return;
    }

    this.#tracking.track(posCheckoutPaymentStarted());
  }

  /**
   * After an upgrade payment the original seats must be freed. Fewer new seats than
   * original ones means the operator has to choose which to release; an exact match releases them all.
   * More new seats than original is impossible here — `getModifyOrderPayModalPayload` blocks it.
   */
  #upgradeSeatingRelease(): void {
    const cartSeatIdsCount = this.#getCartSeatIds().length;
    const originalOrderSeatIdsCount = this.#getOriginalOrderSeatIds().length;

    if (cartSeatIdsCount < originalOrderSeatIdsCount) {
      this.#openPostPaymentSeatReconciliationSheet();
    } else if (cartSeatIdsCount === originalOrderSeatIdsCount) {
      this.#releaseAllOriginalSeatsAndNavigate();
    }
  }

  /** A dismissed calculator aborts a cash payment and resets the selected method. */
  #validateCashCalculator(cashReceived: { amount: number } | null): Observable<{ amount: number } | null> {
    if (this.#state.paymentType() === PaymentType.CASH && !cashReceived) {
      this.resetPaymentState();
      return EMPTY;
    }
    return of(cashReceived);
  }
}
