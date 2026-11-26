import { computed, DestroyRef, effect, EffectRef, inject, Injectable, Injector, Signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';
import { SquareConfiguration } from '@fz-original/app/app/models/payment-checkout-square.model';
import { OnsiteSetupSelectedEvent } from '@fz-original/app/core/tracking/core/events/onsite-setup-selected';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { MemberAccountIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/member-account-identification.service';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { SecondScreenLoggedOutBannerStorageService } from '@fz-original/app/modules/box-office/obo-second-screen/services/logged-out-banner/second-screen-logged-out-banner-storage.service';
import { SecondScreenConfigurationStorageService } from '@fz-original/app/modules/box-office/obo-second-screen/services/second-screen-configuration/second-screen-configuration-storage.service';
import { shouldStoreSecondScreenConfiguration } from '@fz-original/app/modules/box-office/obo-second-screen/utils/second-screen-configuration.util';
import {
  HardwareTypeEnum,
  OboFlowTypeEnum,
  OnsiteSetup,
  ShiftStrategyEnum,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { SecondScreenConfiguration } from '@fz-original/app/modules/box-office/shared/models/second-screen-configuration';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { TapToPayAvailabilityService } from '@fz-original/app/modules/box-office/shared/services/tap-to-pay/tap-to-pay-availability.service';
import { isTapToPayEnabled } from '@fz-original/app/modules/box-office/shared/utils/tap-to-pay.util';
import { isTapToPayDeviceId, TAP_TO_PAY_DEVICE_ID } from '@fz-original/app/payments/models/tap-to-pay.model';
import { SelectDropdownCityOption } from '@fz-original/app/shared/dropdown/select-dropdown-city-option';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { DeviceType, FeverzoneDeviceType } from '@fz-original/app/shared/models/device/device.model';
import { isFlexibleBundle } from '@fz-original/app/shared/models/plan/is-flexible-bundle.util';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { venueAttributes } from '@fz-original/app/shared/optimizely/venue-attributes.util';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { TicketingContextService } from '@fz-original/app/shared/services/ticketing/ticketing-context.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  fromEvent,
  map,
  Observable,
  of,
  ReplaySubject,
  Subject,
  switchMap,
  take,
  timer,
} from 'rxjs';

import { type OssOnsiteSetupModalData } from '../../../one-stop-shop/containers/oss-onsite-setup-modal/oss-onsite-setup-modal.model';
import { type OssPlanSelectionModalData } from '../../../one-stop-shop/containers/oss-plan-selection-modal/oss-plan-selection-modal.model';
import { OSSOnsiteSetupConfig, OSSPlanConfig, OssTab } from '../../../one-stop-shop/models';
import { OSSConfigStorageService } from '../../../one-stop-shop/services/oss-config-storage.service';
import { OssOnsiteSetupStore } from '../../../one-stop-shop/store/oss-onsite-setup.store';
import { OssPlanSelectionStore } from '../../../one-stop-shop/store/oss-plan-selection.store';
import { posPlaceEventSelectorModalClosed } from '../../../one-stop-shop/tracking/events/pos-place-event-selector-modal-closed.event';
import { posPlaceEventSelectorModalOpened } from '../../../one-stop-shop/tracking/events/pos-place-event-selector-modal-opened.event';
import { buildPlanPlaceSelectorChangeData } from '../../../one-stop-shop/tracking/utils/pos-place-event-selector-modal.util';
import { isHungarianFiscalReceiptEnabled } from '../../../shared/services/efsta-fiscal/efsta-fiscal.util';
import { OnsiteSetupsStorageService } from '../../../shared/services/onsite-setups/onsite-setups-storage.service';
import { KEEP_VENUE_DECISION } from '../../guards/venue-scoped-flag.guard';
import { PosHardwareCheckOutcome, type PosHardwareCheckResult } from '../../models/pos-hardware-check.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosFlexibleBundleStore } from '../../store/pos-flexible-bundle.store';
import { resolveOpenHardwareOverrideDeadline } from '../../utils/pos-hardware-check.util';
import { isCompleteOnsiteSetup } from '../../utils/pos-onsite-setup-update.util';
import { PosAvailabilityService } from '../availability/pos-availability.service';
import { PosCartService } from '../cart/pos-cart.service';
import { PosOnsiteSetupRefreshService } from '../onsite-setup-refresh/pos-onsite-setup-refresh.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';
import { PosShiftService } from '../shift/pos-shift.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/** URL preselection carried through the whole setup-resolution chain. */
export interface PosSetupPreselection {
  onsiteSetupId?: string;
  venueId?: string;
}

/**
 * Inputs of `OssLinkedDeviceModalComponent`. The modal is opened with
 * `backdrop: 'static'`, `keyboard: false`, `modalDialogClass: 'oss-linked-device-modal'`, `size: 'md'`
 * and the host component's own `Injector`.
 */
export interface PosLinkedDeviceRequest {
  paymentConfiguration: PaymentConfiguration;
}

/**
 * Inputs of `SquareConnectionModalComponent` — default modal options.
 *
 * `paymentConfiguration` is not a modal input: it is carried through the request so the component
 * can hand it back to `PosSetupService.handleSquareConnectionSelectorClosed` instead of the
 * strategy parking it in a field.
 */
export interface PosSquareConnectionRequest {
  deviceId: string;
  paymentConfiguration: PaymentConfiguration;
  planId: number;
  squareConfiguration: SquareConfiguration;
}

/**
 * Pure-UI hooks the tab bookkeeping needs: `activeTab` is the component's visual selection,
 * so `updateAvailableTabs` hands the newly computed list back to the component instead of
 * mutating it here.
 */
export interface PosTabUiHandlers {
  ensureActiveTabIsValid: (availableTabs: OssTab[]) => void;
}

/**
 * Onsite-setup and plan resolution, plus the custom-tab / hierarchy tile data behind the product
 * catalog.
 *
 * Resolution priority (`#loadOnsiteSetup`): URL `?onsiteSetupId=` → open shift → stored config →
 * selector modal. Absorbs the wrapper's async `onsiteSetupId` resolution and its storage-event
 * re-resolution, which hard-reloads on a cross-tab switch to the legacy flow.
 */
@Injectable()
export class PosSetupService {
  /** A configuration edit reaches the second screen within this delay: one setup read per interval while a configuration is active. */
  static readonly secondScreenConfigurationRefreshMs = 5 * 60 * 1000;

  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #boxOfficePaymentMethods = inject(BoxOfficePaymentMethodsService);
  readonly #cart = inject(PosCartService);
  readonly #configStorage = inject(OSSConfigStorageService);
  readonly #core = inject(TicketingCoreService);
  readonly #destroyRef = inject(DestroyRef);
  /** Pure client-side capability probe, so it is used directly (plan's "Direct" list). */
  readonly #deviceService = inject(DeviceService);
  readonly #flexibleBundleStore = inject(PosFlexibleBundleStore);
  readonly #injector = inject(Injector);
  /** Legacy `TrackingService` — `OnsiteSetupSelectedEvent` parity. */
  readonly #legacyTracking = inject(TrackingService);
  readonly #memberAccount = inject(MemberAccountIdentificationService);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #onsiteSetupRefresh = inject(PosOnsiteSetupRefreshService);
  readonly #onsiteSetupStore = inject(OssOnsiteSetupStore);
  readonly #onsiteSetupsStorage = inject(OnsiteSetupsStorageService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #planSelectionStore = inject(OssPlanSelectionStore);
  readonly #purchase = inject(PosPurchaseService);
  /** URL sync only — navigation is a cross-cutting client-side concern. */
  readonly #router = inject(Router);
  readonly #secondScreenLoggedOutBannerStorage = inject(SecondScreenLoggedOutBannerStorageService);
  readonly #secondScreenConfigurationStorage = inject(SecondScreenConfigurationStorageService);
  readonly #state = inject(PosTicketingState);
  readonly #tapToPayAvailability = inject(TapToPayAvailabilityService);
  readonly #ticketSelection = inject(PosTicketSelectionService);
  readonly #ticketingContext = inject(TicketingContextService);
  readonly #tracking = inject(FzTrackingService);
  /** The persisted deep-link setup carries the operator id. */
  readonly #userService = inject(UserService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /** Pushes the resolved setup through the ticketing surface. */
  applyOnsiteSetup(): void {
    const previousChannelId = this.#state.channelId;
    this.#state.channelId = this.#state.onsiteSetupSelected.channel_id ?? Channel.BoxOffice;
    if (previousChannelId !== this.#state.channelId) {
      this.#reloadFlexibleBundleSessionsForActivePlan();
    }
    this.updatePaymentConfigurationFromOnsiteSetup();
    this.#state.daysWithActiveSession = this.getMaxPurchasableDays(this.#state.onsiteSetupSelected);
    this.#state.hasShiftsEnabled = this.#state.onsiteSetupSelected.shift_strategy !== ShiftStrategyEnum.disabled;
    this.#state.includeSoldOutSessions = this.#state.onsiteSetupSelected.show_sold_out_sessions;
    this.#state.canOverrideCapacities = this.#state.onsiteSetupSelected.can_override_capacities ?? false;
    this.#state.includeOverrideCapacity = this.#state.canOverrideCapacities;
    // Cross-domain: `updatePaymentMethodsAvailable` fills paymentTypes + icons.
    this.#purchase.updatePaymentMethodsAvailable();
    this.#legacyTracking.track(
      new OnsiteSetupSelectedEvent({
        details: JSON.stringify(this.#state.onsiteSetupSelected),
        name: this.#state.onsiteSetupSelected.name,
      }),
    );
  }

  buildPlanConfigFromPlan(plan: Plan, preferredPlaceId?: number): OSSPlanConfig | null {
    if (plan.id === undefined || plan.id === null) {
      return null;
    }
    const places = plan.places ?? [];
    if (places.length === 0) {
      return null;
    }
    const preferredPlace = preferredPlaceId === undefined ? null : (places.find(place => place.id === preferredPlaceId) ?? null);
    const selectedPlace = preferredPlace ?? places[0];
    return {
      cityId: selectedPlace.city?.id?.toString() ?? '',
      id: plan.id.toString(),
      placeId: selectedPlace.id?.toString() ?? '',
    };
  }

  // ──────────────────────────────────── component-facing UI streams ────────────────────────────────

  /**
   * Ask the component to open `OssOnsiteSetupModalComponent`. Payload is the
   * modal's own data object, so the handler is a pass-through into `IgntDialogService.openModal`.
   *
   * The component must also close the header menu on mobile/tablet first (`#displaySetupSelector`)
   * and feed the result back through {@link handleSetupSelectorClosed}.
   */
  readonly openSetupSelector$ = new Subject<OssOnsiteSetupModalData>();

  /**
   * Ask the component to open `OssPlanSelectionModalComponent`; the result goes
   * back through {@link handlePlanSelectorClosed}.
   */
  readonly openPlanSelector$ = new Subject<OssPlanSelectionModalData>();

  /**
   * Fires once per resolved setup, right after this strategy has kicked off plan loading and
   * custom-tab initialisation. Parity-locked with the legacy `queueMicrotask` block in `ngOnInit`:
   * remaining initialisers must hook here in this order — `#initializeCustomTilesTicketTypesEffect`
   * → `#initializeSearchByNewPlanEffect` → `#initializeQueryParamsEffect` → base `ngOnInit` →
   * `#showOrderModificationBannerIfNeeded`.
   */
  readonly setupBootstrap$ = new Subject<OnsiteSetup>();

  /**
   * Fires at the end of {@link resetState}. Carries the component-owned half:
   * `activeTab.set({ tabIndex: 0, type: OssTab.TICKETS_AND_ADDONS })` and the
   * tour-reset click counter/timeout.
   */
  readonly stateReset$ = new Subject<void>();

  /**
   * Ask the component to open `OssLinkedDeviceModalComponent`. The selected terminal id comes back
   * through {@link handleLinkedDeviceSelectorClosed}, which owns the whole pairing continuation
   * (store the config → PayHere pairing → resume a pending payment).
   *
   * Parity-locked: the component must subscribe to the modal's `closed` stream and never
   * `dismissed`, forwarding `undefined` when it closes with no selection.
   */
  readonly openLinkedDeviceSelector$ = new Subject<PosLinkedDeviceRequest>();

  /**
   * Ask the component to open `SquareConnectionModalComponent`. Parity-locked: the component
   * forwards only the resolved value through {@link handleSquareConnectionSelectorClosed} and must
   * swallow the rejection — a rejected promise here must never surface as an error.
   */
  readonly openSquareConnectionSelector$ = new Subject<PosSquareConnectionRequest>();

  /**
   * Parity-locked: must be emitted from this exact point in {@link initializeSearchByNewPlanEffect}.
   * The guided tour is component UI, so the component decides — with its own
   * `#hasTourBeenInitialized` flag, reset on {@link stateReset$} — whether to show it.
   */
  readonly tourInitializationRequested$ = new Subject<void>();

  // ─────────────────────────────── device pairing / fiscal view state ─────────────────────────────

  /** The stored pairing as a signal, so `displayedDeviceId` tracks storage events. */
  readonly paymentConfigurationSignal: Signal<PaymentConfiguration | undefined> = toSignal(this.#core.paymentConfigurationChanges(), {
    initialValue: this.#core.getPaymentConfiguration(),
  });

  /** Header/menu tag for the currently paired terminal. */
  readonly displayedDeviceId: Signal<string | null> = computed(() => this.paymentConfigurationSignal()?.deviceId ?? null);

  readonly isMobilePos: Signal<boolean> = computed(() => this.#deviceService.getDeviceType() === DeviceType.MobilePos);

  /**
   * Gates `app-oss-fiscal-actions`. A Hungarian place with the Hungarian fiscal receipt flag on,
   * resolved inside `isHungarianFiscalReceiptEnabled` (efsta-fiscal.util). The actions themselves
   * are still Hungary-only until B2BO-8116 / B2BO-8120 land.
   */
  readonly hasFiscalActions: Signal<boolean> = computed(() =>
    isHungarianFiscalReceiptEnabled(this.#optimizely, this.#state.activeOnsiteSetup()?.place?.country_iso_code_2),
  );

  readonly isLinkDeviceButtonVisible: Signal<boolean> = computed(() =>
    this.#isLinkDeviceButtonVisible(this.#state.activeOnsiteSetup(), this.isMobilePos()),
  );

  // ───────────────────────────────── template-facing projections ─────────────────────────────────

  readonly displayedOnsiteSetup: Signal<string | null> = computed(() => {
    const onsiteSetup = this.#state.activeOnsiteSetup();
    if (!onsiteSetup) {
      return null;
    }
    return onsiteSetup?.name ?? '';
  });

  readonly displayedOnsiteSetupPlace: Signal<string | null> = computed(() => {
    const onsiteSetup = this.#state.activeOnsiteSetup();
    if (!onsiteSetup) {
      return null;
    }
    return onsiteSetup?.place?.name ?? '';
  });

  /** Also the lookup the cart-line timeslot activation uses. */
  readonly availablePlansById: Signal<Map<number, Plan>> = computed(() => {
    const plansById = new Map<number, Plan>();
    this.#state.availablePlans().forEach(plan => {
      if (plan.id) {
        plansById.set(plan.id, plan);
      }
    });
    return plansById;
  });

  /** Component-private, but gates resolution. */
  #onsiteSetupModalShown = false;
  #hasStorageChangeWhileSetupSelectorShown = false;
  #planSelectionModalShown = false;
  #areEffectsInitialized = false;
  /** Destroyed by {@link resetState}. */
  #activeEffectRefs: EffectRef[] = [];
  #resolutionStarted = false;
  #releaseSeatsHandler: (() => void) | null = null;
  #planSelectorPreviousConfig: OSSPlanConfig | null = null;
  #planSelectorPlansSnapshot: Plan[] = [];
  readonly #setupResolved$ = new ReplaySubject<OnsiteSetup | null>(1);

  // ─────────────────────────────────────────── setup resolution ───────────────────────────────────

  /** Plans the plan-selection modal must show as disabled. */
  getDisabledPlanIdsForPlanSelection(): number[] {
    return Array.from(this.#getDisabledPlanIdsForPlanSelection());
  }

  getMaxPurchasableDays(onsiteSetup: OnsiteSetup = this.#state.onsiteSetupSelected): number {
    const maxPurchasableDaysOneStep = 3;
    if (!onsiteSetup) {
      return maxPurchasableDaysOneStep;
    }
    if (onsiteSetup.max_purchasable_days > maxPurchasableDaysOneStep) {
      return maxPurchasableDaysOneStep;
    }
    return onsiteSetup.max_purchasable_days;
  }

  /**
   * Linked-device modal closed: stores the pairing, re-pairs PayHere terminals and resumes the
   * payment the device guard interrupted, past the hardware check the operator already answered
   * (`resumePayOneStep`). An `undefined` result (modal closed empty), like every
   * failure branch, drops `pendingPaymentType` so the interrupted payment is *not* resumed.
   *
   * `paymentConfiguration` is handed back by the component rather than read from a shared field so
   * that two interleaved opens each resolve against their own config.
   */
  handleLinkedDeviceSelectorClosed(paymentConfiguration: PaymentConfiguration, result: string | undefined): void {
    if (result === undefined) {
      this.#clearPendingPaymentRetry();
      return;
    }

    const newConfig = paymentConfiguration.clone();
    newConfig.deviceId = this.#getDeviceIdFromConfiguration(paymentConfiguration, result);
    this.#core.setPaymentConfiguration(newConfig);

    const partnerId = this.#partnerService.getPartner()?.id;
    const onsiteSetupId = this.#state.activeOnsiteSetup()?.id;

    if (paymentConfiguration.payhereConfiguration && (partnerId == null || !onsiteSetupId)) {
      this.#clearPendingPaymentRetry();
      return;
    }

    const pairing$ =
      paymentConfiguration.payhereConfiguration && partnerId != null && !!onsiteSetupId
        ? this.#core.pairPayHere(partnerId, result, result, onsiteSetupId)
        : of(true);

    pairing$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {
        this.#clearPendingPaymentRetry();
      },
      next: () => {
        if (this.#state.pendingPaymentType) {
          const paymentTypeToRetry = this.#state.pendingPaymentType;
          this.#state.pendingPaymentType = null;
          this.#purchase.resumePayOneStep(paymentTypeToRetry);
        }
      },
    });
  }

  /**
   * Cross-tab setup change: the new setup is re-resolved in place, whatever its flow type, as a fresh
   * load of the page would resolve it. While the setup selector is open the change waits for it to
   * close: a pick is resolved once by {@link handleSetupSelectorClosed}, and a dismissal applies the
   * change it held back, so a setup stored from another tab is not lost.
   */
  handleOnsiteSetupStorageChange(onsiteSetupId: string | null): void {
    if (this.#onsiteSetupModalShown) {
      this.#hasStorageChangeWhileSetupSelectorShown = true;
      return;
    }
    this.#maybeMigrateStoredOnsiteSetupFlow();
    const storedOnsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorage.getConfiguration();
    const targetOnsiteSetupId = onsiteSetupId ?? storedOnsiteSetup?.id ?? null;
    if (!targetOnsiteSetupId || targetOnsiteSetupId === this.#state.activeOnsiteSetup()?.id) {
      return;
    }
    this.#updateOnsiteSetupSelected(targetOnsiteSetupId);
  }

  /** Operator (or auto-selection) picked a plan. */
  handlePlanSelected(config: OSSPlanConfig): void {
    this.#planSelectionStore.clearSelectionDismissed();
    const planId = parseInt(config.id);
    const previousPlanConfig = this.#state.activeOssPlanConfig();
    const previousPlanId = previousPlanConfig?.id ? parseInt(previousPlanConfig.id) : null;
    const hasPlanChanged = previousPlanId !== null && previousPlanId !== planId;
    const hasPlaceChanged = previousPlanId !== null && previousPlanConfig?.placeId !== config.placeId;
    const hasSeatingSelectionsBefore = this.#state.selectedTicketsSeatsBySessionId.size > 0;
    const hasSeatingLinesInCart = this.#cartHasSeatingLines(this.#state.nonConfirmedCart ?? this.#state.cart);

    this.#state.activeOssPlanConfig.set(config);
    if (!planId) {
      return;
    }

    if (this.#purchase.isCrossPlanModificationEnabled()) {
      this.#state.modifyOrderEntryPlanId ??= previousPlanId ?? planId;
      this.#state.modifyOrderPlanChangedByOperator ||= hasPlanChanged;
      this.#state.modifyOrderSearchMovedByOperator ||= hasPlanChanged || hasPlaceChanged;
    }

    if (hasPlanChanged && !this.#state.multiPlanCartEnabled) {
      this.#cart.clearCart();
      this.#state.nonConfirmedCart = null;
      this.#ticketSelection.clearSelectedTickets();
    }
    if (hasPlanChanged && this.#state.multiPlanCartEnabled && (hasSeatingSelectionsBefore || hasSeatingLinesInCart)) {
      this.#state.isPreservingCart = this.#hasMultiplanSeatingFlowContext() || hasSeatingLinesInCart;
      if (!this.#state.isPreservingCart) {
        this.#cart.clearCart();
        this.#state.nonConfirmedCart = null;
      }
      this.#state.selectedTicketsSeatsBySessionId = new Map();
      this.#state.selectedTicketsBySessionId = new Map();
      this.#state.selectedTicketsBySessionType = new Map<string, number>();
      // `releaseSeats` frees the previous plan's seats provider-side. When the cart is preserved the
      // previous plan keeps its seated line and its entry in `seatingHoldTokensBySessionId`, so those
      // seats must stay held and nothing may be released here — no seat was dropped. Mirrors
      // `PosSeatingService.releaseDroppedSeatingSelection`, which only releases what a change
      // actually drops — B2BO-8391.
      if (!this.#state.isPreservingCart) {
        this.#releaseSeatsHandler?.();
      }
    }

    this.#updatePlanSelected(planId);
    const currentConfig = this.#configStorage.getConfiguration();
    if (currentConfig) {
      this.#configStorage.setConfiguration({
        ...currentConfig,
        plan: config,
      });
    }
  }

  /** Plan-selection **modal** closed. */
  handlePlanSelectorClosed(config?: OSSPlanConfig): void {
    const planPlaceChangeData = buildPlanPlaceSelectorChangeData(this.#planSelectorPreviousConfig, config, this.#planSelectorPlansSnapshot);
    if (planPlaceChangeData) {
      this.#tracking.track(posPlaceEventSelectorModalClosed(planPlaceChangeData));
    }
    if (config) {
      this.#planSelectionModalShown = false;
      this.handlePlanSelected(config);
      return;
    }
    this.#planSelectionStore.markSelectionDismissed();
    this.#planSelectionModalShown = false;
  }

  /** Plan-selection **slider** closed (`onPlanSelectedFromSlider`) — no tracking. */
  handlePlanSelectorClosedFromSlider(config?: OSSPlanConfig): void {
    this.#planSelectionModalShown = false;
    if (config) {
      this.handlePlanSelected(config);
      return;
    }
    this.#planSelectionStore.markSelectionDismissed();
  }

  /** Operator picked a setup in the selector. The pick supersedes any storage change held back meanwhile. */
  handleSetupSelected(onsiteSetup: OSSOnsiteSetupConfig): void {
    this.#hasStorageChangeWhileSetupSelectorShown = false;
    if (onsiteSetup?.id) {
      this.#updateOnsiteSetupSelected(onsiteSetup.id);
      return;
    }
    const config = this.#getOnsiteSetupConfigFromStorage();
    if (config) {
      this.#updateOnsiteSetupSelected(config.id);
      return;
    }
    this.#onsiteSetupModalShown = false;
  }

  /** Setup-selector **modal** closed. */
  handleSetupSelectorClosed(result?: OSSOnsiteSetupConfig): void {
    if (result) {
      this.handleSetupSelected(result);
      return;
    }
    this.#onsiteSetupModalShown = false;
    this.#onsiteSetupStore.markSelectionDismissed();
    this.#applyStorageChangeMissedBySetupSelector();
  }

  /**
   * Setup-selector **slider** closed. Same body as {@link handleSetupSelectorClosed} except the
   * flag is cleared before the selection is applied. Parity-locked: this ordering must match the
   * legacy flow.
   */
  handleSetupSelectorClosedFromSlider(result?: OSSOnsiteSetupConfig): void {
    this.#onsiteSetupModalShown = false;
    if (result) {
      this.handleSetupSelected(result);
      return;
    }
    this.#onsiteSetupStore.markSelectionDismissed();
    this.#applyStorageChangeMissedBySetupSelector();
  }

  /**
   * Square connection modal closed. `null` means the operator connected no terminal. Parity-locked:
   * a rejected `result` promise is swallowed by the component, not surfaced.
   *
   * `paymentConfiguration` is echoed back from the request for the same reason as in
   * {@link handleLinkedDeviceSelectorClosed}.
   */
  handleSquareConnectionSelectorClosed(paymentConfiguration: PaymentConfiguration, result: { deviceId: string | undefined } | null): void {
    if (result === null) {
      return;
    }
    const newConfig = paymentConfiguration.clone();
    newConfig.deviceId = result.deviceId;
    this.#core.setPaymentConfiguration(newConfig);
  }

  hasPaymentConfig(onsiteSetup: OnsiteSetup | null): boolean {
    if (!onsiteSetup) return false;

    const gateway = this.#boxOfficePaymentMethods.getGatewayProvider(onsiteSetup);
    if (gateway === 'undefined') return false;

    if (this.isSquareGateway(onsiteSetup)) {
      return this.#boxOfficePaymentMethods.buildPaymentConfiguration(onsiteSetup).squareConfiguration != null;
    }

    return this.#boxOfficePaymentMethods.getGatewayTerminalIds(onsiteSetup).length > 0;
  }

  // ─────────────────────────────────────────── device pairing ─────────────────────────────────────

  /** `storage`-event watcher. The event itself is a client-side channel, so it is subscribed here rather than in the component. */
  initialiseOnsiteSetupStorageWatcher(): void {
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(
        filter(event => event.key === this.#onsiteSetupsStorage.ONSITE_SETUP_CONFIG),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.handleOnsiteSetupStorageChange(this.#onsiteSetupsStorage.getConfiguration()?.id ?? null));
  }

  /**
   * Loads the retail catalog of every resolved setup that has one. A modification cart seeded before
   * the catalog arrived gets its F&B rows once it lands.
   *
   * Parity-locked: a **single, mount-scoped** stream, not a per-setup resettable effect. The
   * `switchMap` cancels the in-flight catalog request when the operator switches setup, so rapid
   * switching cannot stack requests nor let a stale response win the race.
   */
  initializeProductsCatalogStream(): void {
    toObservable(this.#state.activeOnsiteSetup, { injector: this.#injector })
      .pipe(
        switchMap(onsiteSetup => {
          const partner = this.#partnerService.getPartner();
          if (!onsiteSetup?.retail_setup_id || !partner) {
            this.#state.isProductCatalogLoaded.set(false);
            this.#state.isLoadingProductCatalog.set(false);
            return EMPTY;
          }
          this.#state.isLoadingProductCatalog.set(true);
          return this.#core.initializeProductCatalog(partner.id, onsiteSetup.id, this.#state.channelId).pipe(
            catchError(() => {
              this.#state.isProductCatalogLoaded.set(false);
              this.#state.isLoadingProductCatalog.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ data }) => {
        this.#state.isProductCatalogLoaded.set(data != null && Object.keys(data.sessions_by_id).length > 0);
        this.#state.isLoadingProductCatalog.set(false);
        this.#ticketSelection.registerModifyOrderProductRowsFromCatalog();
      });
  }

  /**
   * Keeps the second screen configuration of the active setup fresh while the setup stays active (B2BO-9598): an edit made in
   * settings reaches the second screen without reactivating the setup. Mount-scoped like the catalog stream; it runs only
   * while the active setup has a configuration and the flag is on for its venue. It re-reads the setup (the endpoint every POS
   * role already reads) once on activation and then every {@link secondScreenConfigurationRefreshMs}, and the second screen is
   * only written, and so only re-rendered, when the configuration was reassigned, removed or edited.
   */
  initializeSecondScreenConfigurationRefresh(): void {
    toObservable(this.#state.activeOnsiteSetup, { injector: this.#injector })
      .pipe(
        map(onsiteSetup => (onsiteSetup !== null && this.#getSecondScreenConfiguration(onsiteSetup) !== null ? onsiteSetup.id : null)),
        distinctUntilChanged(),
        switchMap(onsiteSetupId =>
          onsiteSetupId === null
            ? EMPTY
            : timer(0, PosSetupService.secondScreenConfigurationRefreshMs).pipe(
                exhaustMap(() => this.#core.getOnsiteSetup(onsiteSetupId).pipe(catchError(() => EMPTY))),
              ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(latestOnsiteSetup => this.#syncSecondScreenConfiguration(this.#toActiveOnsiteSetup(latestOnsiteSetup)));
  }

  /**
   * Re-writes the query string whenever the active plan or setup changes. Registered as a
   * resettable effect, so a setup change disposes it via `#cleanupActiveEffects`. Must be invoked
   * from the per-setup bootstrap sequence (see {@link setupBootstrap$}), not from
   * {@link resolveOnsiteSetup} — it belongs inside the `queueMicrotask` block.
   */
  initializeQueryParamsEffect(): void {
    const effectRef = effect(
      () => {
        this.#state.activePlan();
        this.#state.activeOnsiteSetup();

        this.updateQueryParams();
      },
      { injector: this.#injector },
    );

    this.registerResettableEffect(effectRef);
  }

  // ────────────────────────────────────────────── URL sync ────────────────────────────────────────

  /**
   * Every resolved (setup, plan) pair rebuilds the `SearchFilter` and re-runs the availability
   * search. Parity-locked: both guards below matter. A plan config that does not yet match the
   * loaded plan is skipped so the search never runs on a half-applied selection; and while
   * `?modified_order_id=` is still being fetched nothing is searched, with the search then starting
   * on the order's own date and re-arming `isModifyOrderTimeSlotApplied`.
   */
  initializeSearchByNewPlanEffect(): void {
    const effectRef = effect(
      () => {
        const planConfig = this.#state.activeOssPlanConfig();
        if (!this.#state.activeOnsiteSetup() || !this.#state.activePlan()) {
          return;
        }
        const activePlanId = this.#state.activePlan()?.id ?? null;
        const planConfigId = planConfig?.id ? Number(planConfig.id) : null;
        if (planConfigId !== null && activePlanId !== null && planConfigId !== activePlanId) {
          return;
        }
        if (this.#purchase.isWaitingForOrderFromUrl()) {
          return;
        }
        this.#state.isLoadingNewSearch.set(true);
        try {
          const partner = this.#partnerService.getPartner();
          if (!partner || !this.#state.plan) {
            return;
          }
          const placeIdFromConfig = parseInt(planConfig?.placeId || '0', 10);
          const place = this.#state.plan.places?.find(planPlace => planPlace.id === placeIdFromConfig) || this.#state.plan.places?.[0];
          if (!place || !place.city) {
            return;
          }
          const citySelected: SelectDropdownCityOption = {
            id: place.city.id || 0,
            timezone: this.#state.timezone,
            title: place.city.name || '',
          };
          const planSelected: SelectOption = {
            id: this.#state.plan.id || 0,
            title: this.#state.plan.name || '',
          };
          const placeSelected: SelectOption = {
            id: place.id || 0,
            title: place.name || '',
          };
          this.#state.timezone = place.city.timeZone || this.#state.timezone;
          this.#state.filters = new SearchFilter(partner, citySelected, planSelected, placeSelected, null, this.#state.timezone, true);
          // The date survives a move; the preselection must not, because it matches by datetime and
          // the target plan or place never had that session.
          const initialDate = this.#state.modifiedOrder() != null ? (this.#purchase.getModifyOrderInitialDate() ?? undefined) : undefined;
          if (initialDate !== undefined && !this.#state.modifyOrderSearchMovedByOperator) {
            this.#state.isModifyOrderTimeSlotApplied = false;
          }
          // The dispatch stays untracked: it reaches `PosAvailabilityStore`, and a single tracked
          // state read down that path makes this effect re-run its own search forever.
          untracked(() => {
            this.#availability.loadNewSearch(this.#state.filters, initialDate);

            // The tour is component UI, so only the request crosses the boundary.
            this.tourInitializationRequested$.next();
          });
        } finally {
          this.#state.isLoadingNewSearch.set(false);
        }
      },
      { injector: this.#injector },
    );

    this.registerResettableEffect(effectRef);
  }

  /** True when the session belongs to one of the configured custom tabs. */
  isSessionInCustomTabs(sessionId: number): boolean {
    return this.#state.customTabSignals().some(tabSignal => {
      const tabData = tabSignal();
      if (!tabData?.tilesData) {
        return false;
      }
      return tabData.tilesData.customTiles.some(tile => tile.customTile.sessions.some(session => session.id === sessionId));
    });
  }

  isSquareGateway(onsiteSetup: OnsiteSetup | null): boolean {
    return this.#boxOfficePaymentMethods.getGatewayProvider(onsiteSetup) === PaymentCheckout[PaymentCheckout.square];
  }

  /** Moved to `PosTicketSelectionService`; forwarded while unmigrated callers still reach it here. */
  isTabDateDependant(tabIndex: number): boolean {
    return this.#ticketSelection.isTabDateDependant(tabIndex);
  }

  // ─────────────────────────────────────────── plan resolution ────────────────────────────────────

  /** Loads the plans available for the resolved setup. */
  loadPlans(): void {
    this.#planSelectionStore.resetPlanAvailability();
    this.#core
      .getPlans(this.#partnerService.getPartner()!.id, [], { channelId: this.#state.channelId })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(plans => {
        const prioritizedPlanIds = this.#prioritizedPlanIds();
        this.#state.onSalePlans = plans?.filter(plan => plan.status === PlanStatus.ON_SALE) || [];
        let filteredPlans = this.#state.onSalePlans;
        if (prioritizedPlanIds.length > 0) {
          filteredPlans = filteredPlans
            .filter(plan => prioritizedPlanIds.includes(plan.id!))
            .sort((planA, planB) => {
              return prioritizedPlanIds.indexOf(planA.id!) - prioritizedPlanIds.indexOf(planB.id!);
            });
        }
        this.#state.availablePlans.set(filteredPlans);
        this.#planSelectionStore.setHasAvailablePlans(this.#hasSelectablePlanPlaces(filteredPlans));
        this.#loadPlan();
      });
  }

  checkHardwareType(): PosHardwareCheckResult {
    const deviceHardwareType = this.#deviceService.getFeverzoneDeviceType();
    const onsiteSetup = this.#state.activeOnsiteSetup();
    const setupHardwareType = onsiteSetup?.hardware_type ?? null;
    const isEnforcementEnabled =
      this.#optimizely.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.DO_NOT_ALLOW_BOX_OFFICE_WITH_WRONG_HARDWARE_TYPE,
        team: 'b2b-onsite',
      }) === true;
    const overrideDeadline = isEnforcementEnabled
      ? resolveOpenHardwareOverrideDeadline(
          this.#optimizely.getFeatureVariableJSON<unknown>(FeatureFlags.DO_NOT_ALLOW_BOX_OFFICE_WITH_WRONG_HARDWARE_TYPE, 'override'),
          Date.now(),
        )
      : null;
    const base = {
      deviceHardwareType,
      isEnforcementEnabled,
      onsiteSetupId: onsiteSetup?.id ?? null,
      overrideDeadline,
      setupHardwareType,
    };

    if (onsiteSetup === null) {
      return { ...base, outcome: PosHardwareCheckOutcome.noActiveSetup };
    }
    if (setupHardwareType === null || setupHardwareType === HardwareTypeEnum.unknown) {
      return { ...base, outcome: PosHardwareCheckOutcome.setupHardwareUnknown };
    }
    const currentHardwareType = this.#currentHardwareType();
    if (currentHardwareType === null) {
      return { ...base, outcome: PosHardwareCheckOutcome.deviceNotEnforceable };
    }
    if (currentHardwareType === setupHardwareType) {
      return { ...base, outcome: PosHardwareCheckOutcome.matched };
    }

    if (!isEnforcementEnabled) {
      return { ...base, outcome: PosHardwareCheckOutcome.mismatchNotEnforced };
    }

    return {
      ...base,
      outcome: overrideDeadline === null ? PosHardwareCheckOutcome.blocked : PosHardwareCheckOutcome.mismatchOverridable,
    };
  }

  /**
   * Square pairs through its own connection modal, every other gateway through
   * the linked-device selector.
   */
  onLinkDeviceButtonClick(): void {
    const onsiteSetup = this.#state.activeOnsiteSetup();
    if (this.#hasSquarePaymentConfig(onsiteSetup)) {
      this.#openSquareConnectionModal();
      return;
    }
    this.openLinkedDeviceModal();
  }

  /**
   * Public because the purchase pipeline opens it as its device guard (sets `pendingPaymentType`
   * then calls `openLinkedDeviceModal()`).
   *
   * The guard *predicate* stays with the pipeline: `PosPurchaseService.clickOnPayOneStep` evaluates
   * `#shouldShowDeviceSelector`, sets `state.pendingPaymentType` and only then calls this.
   */
  openLinkedDeviceModal(): void {
    if (!this.hasPaymentConfig(this.#state.activeOnsiteSetup())) {
      return;
    }
    this.openLinkedDeviceSelector$.next({ paymentConfiguration: this.#buildPaymentConfiguration() });
  }

  /** Header "change plan/place" action. Refused while the difference payment is armed: that cart is prepared, and no plan-change path discards it. */
  openPlanSelector(): void {
    if (!this.#purchase.canChangePlan()) {
      return;
    }
    this.#planSelectionStore.clearSelectionDismissed();
    if (!this.#planSelectionStore.shouldShowPlanPlaceSelector()) {
      return;
    }
    this.#showPlanSelectionModal();
  }

  /** Header "change setup" action. */
  openSetupSelector(): void {
    this.#onsiteSetupStore.clearSelectionDismissed();
    this.#onsiteSetupStore.ensureSummaryLoaded();
    this.#displaySetupSelector(true);
  }

  /** Brings back the retail catalog and the custom tabs a modify-order entry had hidden. */
  restoreMerchandisingAfterModifyOrderAbort(): void {
    this.#state.hasProductCatalog.set(Boolean(this.#state.activeOnsiteSetup()?.retail_setup_id));
    this.updateAvailableTabs();
    this.#viewUpdate.markForCheck();
  }

  /** Keeps the stored config's country code in sync with the resolved setup. */
  patchStoredConfigWithCountryCode(onsiteSetup: OnsiteSetup): void {
    const countryCode = onsiteSetup.place?.country_iso_code_2;
    const storedConfig = this.#configStorage.getConfiguration();
    if (!storedConfig || storedConfig.onsiteSetup.placeCountryCode || !countryCode) {
      return;
    }
    this.#configStorage.setConfiguration({
      ...storedConfig,
      onsiteSetup: { ...storedConfig.onsiteSetup, placeCountryCode: countryCode },
    });
  }

  // ──────────────────────────────────────── custom tabs / hierarchy ───────────────────────────────

  /**
   * `PointOfSaleComponent` owns the seating map `ViewChild`; `handlePlanSelected` calls
   * `seatingSelectorRef?.clearSelection({ expireHoldToken: true })`, and only when the cart is
   * dropped — a preserved cart keeps the other plans' seats held (B2BO-8391).
   */
  registerReleaseSeatsHandler(handler: () => void): void {
    this.#releaseSeatsHandler = handler;
  }

  /**
   * Effects created by other domains — `#initializeCustomTilesTicketTypesEffect`,
   * `initializeSearchByNewPlanEffect`, `initializeProductsCatalogEffect`,
   * `initializeQueryParamsEffect` — register here so a setup change disposes them via
   * `#cleanupActiveEffects`.
   */
  registerResettableEffect(effectRef: EffectRef): void {
    this.#activeEffectRefs.push(effectRef);
  }

  /** Resets all ticketing state after a setup or plan change. */
  resetState(): void {
    this.#cleanupActiveEffects();
    this.#areEffectsInitialized = false;
    this.#state.modifyOrderPlanChangedByOperator = false;
    this.#state.modifyOrderSearchMovedByOperator = false;
    this.#state.modifyOrderEntryPlanId = null;
    this.#cart.clearCart();
    this.#state.nonConfirmedCart = null;
    this.#state.isModifyOrderCartSeeded = false;
    this.#state.modifyOrderSessionTypeDiscounts.set(null);
    this.#ticketSelection.clearSelectedTickets();
    this.#state.ticketTypes = [];
    // Component-owned half: `activeTab` reset to TICKETS_AND_ADDONS + tour-reset click state.
    // Parity-locked: emitted **before** `updateAvailableTabs()` so the reset happens first; the
    // recompute may legitimately move the selection again (e.g. to the seating tab on a free map)
    // and must therefore win.
    this.stateReset$.next();
    this.updateAvailableTabs();
    this.#clearCustomTileSessions();
    this.#ticketSelection.clearCustomTabs();
    this.#state.regularSessionAvailabilitySummaryByDateList = [];
    this.#state.selectedSession = null;
    this.#state.productSessions = [];
    this.#state.productTypes = [];
    this.#state.isLoadingNewSearch.set(false);
  }

  /**
   * Deep-link resolution absorbed from the wrapper. Emits `true` when the component may boot the
   * business layer and `false` when an open shift on a *different* setup blocks it. Parity-locked:
   * `false` must prevent the ticketing page from mounting, leaving only the end-shift modal that
   * `PosShiftService.resolveShiftMismatch` publishes. Both branches persist the resolved setup,
   * which is what makes the follow-up {@link resolveOnsiteSetup} load it from storage instead of
   * falling through to the selector modal.
   */
  resolveDeepLinkSetup(): Observable<boolean> {
    const onsiteSetupIdFromUrl = this.#activatedRoute.snapshot.queryParams['onsiteSetupId'] as string | undefined;
    const currentOnsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorage.getConfiguration();
    const storedOnsiteSetupConfig = this.#getOnsiteSetupConfigFromStorage();
    const shouldLoadFromUrl =
      Boolean(onsiteSetupIdFromUrl) &&
      (currentOnsiteSetup?.id !== onsiteSetupIdFromUrl || storedOnsiteSetupConfig?.id !== onsiteSetupIdFromUrl);

    if (!shouldLoadFromUrl) {
      return of(true);
    }

    return this.#shift.resolveShiftMismatch(onsiteSetupIdFromUrl as string).pipe(
      switchMap(({ isMismatch, targetOnsiteSetupId }) =>
        this.#core.getOnsiteSetup(targetOnsiteSetupId).pipe(
          map((onsiteSetup: OnsiteSetup) => {
            if (isMismatch) {
              // The URL is rewritten to the shift's setup, replacing the history entry.
              this.#router.navigate([], {
                queryParams: { onsiteSetupId: onsiteSetup.id },
                queryParamsHandling: 'merge',
                replaceUrl: true,
                state: { [KEEP_VENUE_DECISION]: true },
              });
              this.#persistOnsiteSetupSelection(onsiteSetup);
              this.#viewUpdate.markForCheck();
              return false;
            }
            this.#persistOnsiteSetupSelection(onsiteSetup);
            return true;
          }),
        ),
      ),
      // A failing probe/fetch falls back to plain resolution.
      catchError(() => of(true)),
      take(1),
    );
  }

  /**
   * Runs the full resolution priority chain and settles `activeOnsiteSetup` / `onsiteSetupSelected`,
   * emitting once the flow is resolved; the component defers core initialisation until then. `null`
   * means resolution fell through to the selector modal — still unresolved, not an error state.
   */
  resolveOnsiteSetup(onsiteSetupIdFromUrl?: string, venueIdFromUrl?: string): Observable<OnsiteSetup | null> {
    if (this.#resolutionStarted) {
      return this.#setupResolved$.asObservable();
    }
    this.#resolutionStarted = true;

    this.#maybeMigrateStoredOnsiteSetupFlow();

    // Read here because `handlePlanSelected` branches on it.
    this.#state.multiPlanCartEnabled =
      this.#optimizely.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.BOX_OFFICE_MULTIPLAN_CART,
        team: 'b2b-shops',
      }) ?? false;

    this.#loadOnsiteSetup({ onsiteSetupId: onsiteSetupIdFromUrl, venueId: venueIdFromUrl });
    this.#watchSetupSelectorAutoOpen();
    this.#watchPlanPlaceSelectorAutoOpen();
    this.#watchSetupApplied();

    return this.#setupResolved$.asObservable();
  }

  /** Restores a stored plan, revalidating that it is still on sale. */
  resolveRestorablePlanConfig(): OSSPlanConfig | null {
    const matchingActivePlanConfig = this.#resolvePlanConfigFromMatchingActivePlan();
    if (matchingActivePlanConfig !== null) {
      return matchingActivePlanConfig;
    }
    return this.#resolvePlanConfigFromActiveSelection();
  }

  /** Auto-selects when the setup exposes exactly one plan. */
  selectSinglePlanIfOnlyOneAvailable(): boolean {
    const plans = this.#state.availablePlans();
    if (plans.length !== 1) {
      return false;
    }

    const plan = plans[0];
    if ((plan.places?.length ?? 0) !== 1) {
      return false;
    }

    const config = this.buildPlanConfigFromPlan(plan);
    if (config === null) {
      return false;
    }

    this.#updatePlanSelected(Number(config.id));
    this.#state.activeOssPlanConfig.set(config);
    this.#savePlanToCurrentConfig(config);
    return true;
  }

  /** Moved to `PosTicketSelectionService`; forwarded while unmigrated callers still reach it here. */
  updateAvailableTabs(): void {
    this.#ticketSelection.updateAvailableTabs();
  }

  /** Moved to `PosTicketSelectionService`; forwarded while unmigrated callers still reach it here. */
  updateCustomTilesAvailability(sessionId: number, sessionTicketsSelected: number | null = null): void {
    this.#ticketSelection.updateCustomTilesAvailability(sessionId, sessionTicketsSelected);
  }

  /**
   * Delegates to `#clearStoredPaymentConfigIfStale`. Public because it is called from three more
   * places outside this domain.
   */
  updatePaymentConfigurationFromOnsiteSetup(): void {
    this.#clearStoredPaymentConfigIfStale();
    this.#storeTapToPayDeviceIfNeeded();
    const storedDeviceId: string | undefined = this.#core.getPaymentConfiguration()?.deviceId;
    this.#state.paymentConfiguration = this.#boxOfficePaymentMethods.buildPaymentConfiguration(
      this.#state.onsiteSetupSelected,
      storedDeviceId,
    );
  }

  /**
   * Mirrors the *stored* setup config and the active plan into `?onsiteSetupId&cityId&venueId&planId`,
   * merged onto whatever else is on the URL. Reads storage rather than `activeOnsiteSetup()` because
   * the stored config is what carries `cityId`/`placeId`. Public because the deep-link rewrite after
   * a shift-mismatch resolution calls it directly.
   */
  updateQueryParams(): void {
    const queryParams: Record<string, string | number> = {};
    const onsiteSetupConfig = this.#getOnsiteSetupConfigFromStorage();
    if (onsiteSetupConfig) {
      queryParams['onsiteSetupId'] = onsiteSetupConfig.id;
      if (onsiteSetupConfig.cityId) {
        queryParams['cityId'] = onsiteSetupConfig.cityId;
      }
      if (onsiteSetupConfig.placeId) {
        queryParams['venueId'] = onsiteSetupConfig.placeId;
      }
    }
    const activePlan = this.#state.activePlan();
    if (activePlan) {
      if (activePlan.id) {
        queryParams['planId'] = activePlan.id.toString();
      }
    }
    if (Object.keys(queryParams).length === 0) {
      return;
    }
    this.#router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  #applyRestoredPlanConfig(planConfig: OSSPlanConfig): void {
    this.#state.activeOssPlanConfig.set(planConfig);
    this.#savePlanToCurrentConfig(planConfig);

    const activePlanId = this.#state.activePlan()?.id;
    const restoredPlanId = Number(planConfig.id);
    if (activePlanId !== restoredPlanId) {
      this.#updatePlanSelected(restoredPlanId);
    }
  }

  // ─────────────────────────────────────────── private — setup ────────────────────────────────────

  #applyStorageChangeMissedBySetupSelector(): void {
    if (!this.#hasStorageChangeWhileSetupSelectorShown) {
      return;
    }
    this.#hasStorageChangeWhileSetupSelectorShown = false;
    this.handleOnsiteSetupStorageChange(null);
  }

  /**
   * Resolved on demand: `PosAvailabilityService` and `PosShiftService` both sit on the other side of
   * this domain's call graph (availability → `isTabDateDependant`, shift → `showShiftModal` → cart), so
   * eager fields here would risk a DI construction cycle (NG0200). Same injector, same instances.
   */
  get #availability(): PosAvailabilityService {
    return this.#injector.get(PosAvailabilityService);
  }

  #buildPaymentConfiguration(): PaymentConfiguration {
    const storedDeviceId = this.#core.getPaymentConfiguration()?.deviceId;
    return this.#boxOfficePaymentMethods.buildPaymentConfiguration(this.#state.activeOnsiteSetup(), storedDeviceId);
  }

  #cartHasSeatingLines(cart: Cart | null): boolean {
    if (cart == null || cart.sessionItemsByDatetime == null) {
      return false;
    }

    for (const sessions of cart.sessionItemsByDatetime.values()) {
      if (sessions.some(session => this.#isCartSessionSeatingLine(session))) {
        return true;
      }
    }

    return false;
  }

  #cleanupActiveEffects(): void {
    this.#activeEffectRefs.forEach(effectRef => {
      if (effectRef && typeof effectRef.destroy === 'function') {
        effectRef.destroy();
      }
    });
    this.#activeEffectRefs = [];
  }

  #clearCustomTileSessions(): void {
    const allCustomTileSessionIds = new Set<number>();
    this.#state.customTabSignals().forEach(tabSignal => {
      const tabData = tabSignal();
      if (tabData?.tilesData) {
        tabData.tilesData.customTiles.forEach(tile => {
          tile.customTile.sessions.forEach(session => {
            allCustomTileSessionIds.add(session.id);
          });
        });
      }
    });
    this.#state.ticketTypes = this.#state.ticketTypes.filter(
      ticketType => ticketType.sessionId !== undefined && !allCustomTileSessionIds.has(ticketType.sessionId),
    );
    this.updateAvailableTabs();
  }

  /** Forgets the payment the device guard interrupted and re-arms the modify-order warning. */
  #clearPendingPaymentRetry(): void {
    this.#state.pendingPaymentType = null;
    this.#state.skipModifyOrderPayWarningOnce = false;
  }

  #clearStoredPaymentConfigIfStale(): void {
    const stored = this.#core.getPaymentConfiguration();
    if (!stored) {
      return;
    }
    if (isTapToPayDeviceId(stored.deviceId) && !isTapToPayEnabled(this.#state.onsiteSetupSelected)) {
      this.#core.removeStoredPaymentConfiguration();
      return;
    }
    const gateway = this.#boxOfficePaymentMethods.getGatewayProvider(this.#state.onsiteSetupSelected);
    if (gateway === 'undefined') {
      return;
    }
    const storedProvider = stored.adyenConfiguration
      ? 'adyen'
      : stored.squareConfiguration
        ? 'square'
        : stored.razorpayConfiguration
          ? 'razorpay'
          : stored.payhereConfiguration
            ? 'payhere'
            : null;
    if (storedProvider === null) {
      return;
    }
    if (storedProvider !== gateway) {
      this.#core.removeStoredPaymentConfiguration();
      return;
    }
    if (
      storedProvider !== 'square' &&
      stored.deviceId != null &&
      !this.#boxOfficePaymentMethods.getGatewayTerminalIds(this.#state.onsiteSetupSelected).includes(stored.deviceId)
    ) {
      this.#core.removeStoredPaymentConfiguration();
    }
  }

  #storeTapToPayDeviceIfNeeded(): void {
    const setup = this.#state.onsiteSetupSelected;
    if (!isTapToPayEnabled(setup) || isTapToPayDeviceId(this.#core.getPaymentConfiguration()?.deviceId)) {
      return;
    }
    this.#core.setPaymentConfiguration(this.#boxOfficePaymentMethods.buildPaymentConfiguration(setup, TAP_TO_PAY_DEVICE_ID));
  }

  #clearStoredPlanAndOpenSelector(): void {
    const currentConfig = this.#configStorage.getConfiguration();
    if (currentConfig !== null) {
      this.#configStorage.setConfiguration({
        ...currentConfig,
        plan: undefined,
      });
    }
    this.#state.activeOssPlanConfig.set(null);
    this.#state.activePlan.set(null);
    this.#flexibleBundleStore.clear();
    this.#state.plan = null;
    this.#memberships.clear();
    this.#memberAccount.clear();
    this.#planSelectionStore.clearSelectionDismissed();
    this.#openPlanPlaceSelector();
  }

  #currentHardwareType(): HardwareTypeEnum | null {
    switch (this.#deviceService.getFeverzoneDeviceType()) {
      case FeverzoneDeviceType.desktop:
        return HardwareTypeEnum.desktop;
      case FeverzoneDeviceType.dual_screen:
        return HardwareTypeEnum.dual_screen;
      default:
        return null;
    }
  }

  /** `#displaySetupSelector` → `#showOnsiteSetupModal`. */
  #displaySetupSelector(withCloseButtonOnModal: boolean, preselection?: PosSetupPreselection): void {
    this.#onsiteSetupModalShown = true;
    this.#hasStorageChangeWhileSetupSelectorShown = false;
    this.openSetupSelector$.next({
      hasActiveShiftAndActiveOnsiteSetup: Boolean(this.#state.activeShift()) && Boolean(this.#state.activeOnsiteSetup()),
      hasCloseButton: withCloseButtonOnModal,
      preselectedOnsiteSetupId: preselection?.onsiteSetupId,
      preselectedVenueId: preselection?.venueId,
    });
  }

  /**
   * POS overrides whatever flow the setup was configured with, so every setup that reaches
   * storage, state or analytics is rewritten to `one_stop_shop` first. Without it a setup
   * configured for a legacy flow would be persisted as such and bounce the operator back out
   * of POS on the next storage read.
   */
  #effectiveOnsiteSetup(onsiteSetup: OnsiteSetup): OnsiteSetup {
    return { ...onsiteSetup, obo_flow_type: OboFlowTypeEnum.one_stop_shop };
  }

  #getCurrentPlaceId(): number | null {
    const currentOnsiteSetupStorage = this.#onsiteSetupsStorage.getConfiguration();
    if (!currentOnsiteSetupStorage) {
      return null;
    }
    return currentOnsiteSetupStorage.place_id ?? null;
  }

  #getDeviceId(deviceIds: string[], deviceSelected: string): string | undefined {
    return deviceIds.find(deviceId => deviceId === deviceSelected);
  }

  /** Square is absent on purpose: it pairs through its own modal. */
  #getDeviceIdFromConfiguration(config: PaymentConfiguration, deviceSelected: string): string | undefined {
    let deviceIds: string[] = [];
    if (config.adyenConfiguration) {
      deviceIds = config.adyenConfiguration.devicesIds;
    } else if (config.adyenLocalConfiguration) {
      deviceIds = config.adyenLocalConfiguration.devicesIds;
    } else if (config.razorpayConfiguration) {
      deviceIds = config.razorpayConfiguration.devicesIds;
    } else if (config.payhereConfiguration) {
      deviceIds = config.payhereConfiguration.devicesIds;
    }
    return this.#getDeviceId(deviceIds, deviceSelected);
  }

  #getDisabledPlanIdsForPlanSelection(): Set<number> {
    const disabledPlanIds = new Set<number>();
    const sourceCart = this.#state.nonConfirmedCart ?? this.#state.cart;
    if (sourceCart == null) {
      return disabledPlanIds;
    }

    sourceCart.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        if (session.mainPlanId != null && this.#isCartSessionSeatingLine(session)) {
          disabledPlanIds.add(session.mainPlanId);
        }
      });
    });

    return disabledPlanIds;
  }

  #getOnsiteSetupConfigFromOpenedShift(): Observable<OSSOnsiteSetupConfig | null> {
    return this.#core.getOpenedShift().pipe(
      map(openedShift => {
        if (openedShift?.onsiteSetupId) {
          return {
            cityId: openedShift.cityId,
            id: openedShift.onsiteSetupId,
            placeId: openedShift.oboVenueId,
            placeName: openedShift.oboVenueName,
          };
        }
        return null;
      }),
      catchError(() => of(null)),
    );
  }

  // ─────────────────────────────────────────── private — plan ─────────────────────────────────────

  #getOnsiteSetupConfigFromStorage(): OSSOnsiteSetupConfig | null {
    return this.#configStorage.getConfiguration()?.onsiteSetup || null;
  }

  #getStoredOnsiteSetup(onsiteSetupId: string): OnsiteSetup | null {
    const storedOnsiteSetup = this.#onsiteSetupsStorage.getConfiguration();
    return storedOnsiteSetup?.id === onsiteSetupId && isCompleteOnsiteSetup(storedOnsiteSetup) ? storedOnsiteSetup : null;
  }

  #handleMissingOrInvalidStoredPlan(): void {
    if (this.selectSinglePlanIfOnlyOneAvailable()) {
      return;
    }

    const restorablePlanConfig = this.resolveRestorablePlanConfig();
    if (restorablePlanConfig !== null) {
      this.#applyRestoredPlanConfig(restorablePlanConfig);
      return;
    }

    this.#openPlanPlaceSelector();
  }

  /**
   * Duplicated here because `handlePlanSelected` is its only consumer in this domain; other
   * domains may later hoist it.
   */
  #hasMultiplanSeatingFlowContext(): boolean {
    return this.#ticketingContext.hasMultiplanSeatingFlowContext({
      cart: this.#state.cart,
      nonConfirmedCart: this.#state.nonConfirmedCart,
      sessionSummaries: this.#state.regularSessionAvailabilitySummaryByDateList,
      userAttributes: this.#state.selectedPlan ? { plan_id: this.#state.selectedPlan.id.toString() } : undefined,
    });
  }

  #hasSelectablePlanPlaces(plans: Plan[]): boolean {
    return plans.some(plan => plan.places?.some(place => place.city != null) ?? false);
  }

  #hasSquarePaymentConfig(onsiteSetup: OnsiteSetup | null): boolean {
    return !!onsiteSetup && this.hasPaymentConfig(onsiteSetup) && this.isSquareGateway(onsiteSetup) && !this.isMobilePos();
  }

  #isCartSessionSeatingLine(session: CartSession): boolean {
    if (session.sessionType?.isShopProduct) {
      return false;
    }
    if (session.hasSeating === false) {
      return false;
    }
    if (session.hasSeating === true) {
      return true;
    }
    return (
      session.seatingProvider != null ||
      (session.seats?.length ?? 0) > 0 ||
      (session.seatLabels?.length ?? 0) > 0 ||
      (session.seatDisplayLabels?.length ?? 0) > 0
    );
  }

  /** Non-Square gateways always show the button; Square only off a mobile POS. */
  #isLinkDeviceButtonVisible(onsiteSetup: OnsiteSetup | null, isMobilePos: boolean): boolean {
    if (!onsiteSetup) return false;
    if (!this.hasPaymentConfig(onsiteSetup)) return false;
    if (isTapToPayEnabled(onsiteSetup)) return false;
    if (!this.isSquareGateway(onsiteSetup)) return true;
    return !isMobilePos;
  }

  #isStoredPlanOnSaleForCurrentSetup(storedPlan: OSSPlanConfig): boolean {
    const planId = Number(storedPlan.id);
    if (isNaN(planId)) {
      return false;
    }
    return this.#state.availablePlans().some(plan => plan.id === planId);
  }

  #isStoredPlanValid(storedPlan: OSSPlanConfig): boolean {
    if (!storedPlan || !storedPlan.id) {
      return false;
    }
    if (!storedPlan.cityId || !storedPlan.placeId) {
      return false;
    }
    return true;
  }

  #loadFlexibleBundleSessions(partnerId: number, plan: Plan): void {
    const bundleInformation = plan.bundleInformation;
    if (plan.id == null || !isFlexibleBundle(bundleInformation) || !bundleInformation.bundles.some(bundle => bundle.planId !== plan.id)) {
      this.#flexibleBundleStore.clear();
      return;
    }
    this.#flexibleBundleStore.fetchFlexibleBundleSessions({ channelId: this.#state.channelId, partnerId, planId: plan.id });
  }

  /** Resolution priority chain. */
  #loadOnsiteSetup(onsiteSetupParamsFromUrl: PosSetupPreselection): void {
    const config = this.#configStorage.getConfiguration();
    if (onsiteSetupParamsFromUrl.onsiteSetupId && !this.#state.activeOnsiteSetup() && !this.#onsiteSetupModalShown) {
      if (!this.#onsiteSetupMatchesStoredConfig(onsiteSetupParamsFromUrl, config?.onsiteSetup)) {
        this.#loadOnsiteSetupWithoutConfig(onsiteSetupParamsFromUrl);
        return;
      }
    }
    if (!config && !this.#onsiteSetupModalShown) {
      this.#loadOnsiteSetupWithoutConfig();
      return;
    }
    if (config && !this.#state.activeOnsiteSetup()) {
      this.#updateOnsiteSetupSelected(config.onsiteSetup.id);
    }
  }

  /**
   * Open shift first, then fall through to the selector. `failedOnsiteSetupId` is the setup that
   * just failed to load: a shift still pointing at it (e.g. deleted in the backend) is skipped,
   * otherwise its fetch fails again and resolution never reaches the selector.
   */
  #loadOnsiteSetupWithoutConfig(preselection?: PosSetupPreselection, failedOnsiteSetupId?: string): void {
    this.#state.pendingSetupPreselection = preselection;
    this.#getOnsiteSetupConfigFromOpenedShift()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(shiftOnsiteSetupConfig => {
        if (shiftOnsiteSetupConfig && shiftOnsiteSetupConfig.id !== failedOnsiteSetupId) {
          this.#state.pendingSetupPreselection = undefined;
          this.#configStorage.setConfiguration({ onsiteSetup: shiftOnsiteSetupConfig });
          this.#updateOnsiteSetupSelected(shiftOnsiteSetupConfig.id);
          return;
        }
        this.#onsiteSetupStore.fetchAvailableOnsiteSetups();
        // `activeOnsiteSetup()` stays null while the selector opens; downstream consumers treat
        // null as still-resolving, not an error.
        this.#setupResolved$.next(null);
      });
  }

  #loadPlan(): void {
    const modifyOrderPlanConfig = this.#resolvePlanConfigFromModifyOrderParams();
    if (modifyOrderPlanConfig !== null) {
      this.#applyRestoredPlanConfig(modifyOrderPlanConfig);
      return;
    }
    if (this.#purchase.isModifyOrderEntry()) {
      this.#purchase.abortModifyOrderFlowForUnavailablePlan();
      return;
    }

    this.loadStoredPlan();
  }

  /**
   * The pre-GAME-970 `#loadPlan` body. Public: the modify-order abort restores the stored plan
   * once the plan-unavailable modal closes.
   */
  loadStoredPlan(): void {
    const storedPlan = this.#configStorage.getConfiguration()?.plan;
    if (storedPlan === undefined || !this.#isStoredPlanValid(storedPlan)) {
      this.#handleMissingOrInvalidStoredPlan();
      return;
    }

    if (!this.#isStoredPlanOnSaleForCurrentSetup(storedPlan)) {
      this.#clearStoredPlanAndOpenSelector();
      return;
    }

    this.#syncActivePlanWithStoredPlan(storedPlan);
  }

  /**
   * The wrapper's `#resolveActiveOnsiteSetup` migration: a stored setup left on a legacy flow is
   * rewritten in place, so the next read (this tab or another)
   * already agrees with the flow POS is running.
   */
  #maybeMigrateStoredOnsiteSetupFlow(): void {
    const storedOnsiteSetup = this.#onsiteSetupsStorage.getConfiguration();
    if (storedOnsiteSetup === null || storedOnsiteSetup.obo_flow_type === OboFlowTypeEnum.one_stop_shop) {
      return;
    }
    this.#onsiteSetupsStorage.setConfiguration(this.#effectiveOnsiteSetup(storedOnsiteSetup));
  }

  #onsiteSetupMatchesStoredConfig(params: PosSetupPreselection, onsiteSetupConfig?: OSSOnsiteSetupConfig): boolean {
    if (!onsiteSetupConfig) {
      return false;
    }

    if (onsiteSetupConfig.id !== params.onsiteSetupId) {
      return false;
    }

    return true;
  }

  #openPlanPlaceSelector(): void {
    if (!this.#planSelectionStore.shouldShowPlanPlaceSelector()) {
      return;
    }

    if (this.selectSinglePlanIfOnlyOneAvailable()) {
      return;
    }

    this.#showPlanSelectionModal();
  }

  #openSquareConnectionModal(): void {
    const paymentConfiguration = this.#buildPaymentConfiguration();
    if (!paymentConfiguration?.squareConfiguration) {
      return;
    }
    const planId = this.#state.activePlan()?.id;
    if (planId == null) {
      return;
    }
    this.openSquareConnectionSelector$.next({
      deviceId: paymentConfiguration.deviceId ?? '',
      paymentConfiguration,
      planId,
      squareConfiguration: paymentConfiguration.squareConfiguration,
    });
  }

  #pairPayHereOnSetupLoad(onsiteSetup: OnsiteSetup): void {
    const paymentConfiguration = this.#buildPaymentConfiguration();
    const partnerId = this.#partnerService.getPartner()?.id;
    const deviceId = paymentConfiguration.deviceId;

    if (!paymentConfiguration.payhereConfiguration || partnerId == null || !deviceId || !onsiteSetup.id) {
      return;
    }

    this.#core.pairPayHere(partnerId, deviceId, deviceId, onsiteSetup.id).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  /** Persists the deep-link setup into both storages, exactly as the wrapper did. */
  #persistOnsiteSetupSelection(onsiteSetup: OnsiteSetup): void {
    const effectiveOnsiteSetup = this.#effectiveOnsiteSetup(onsiteSetup);
    const userId = this.#userService.getUser()?.id;
    const onsiteSetupWithUser = userId ? ({ ...effectiveOnsiteSetup, user_id: userId } as OnsiteSetup) : effectiveOnsiteSetup;
    this.#onsiteSetupsStorage.setConfiguration(onsiteSetupWithUser);

    const currentConfig = this.#configStorage.getConfiguration();
    this.#configStorage.setConfiguration({
      ...currentConfig,
      onsiteSetup: {
        cityId: effectiveOnsiteSetup.place?.city_id ?? currentConfig?.onsiteSetup?.cityId ?? 0,
        id: effectiveOnsiteSetup.id,
        placeId: Number(effectiveOnsiteSetup.place?.id ?? effectiveOnsiteSetup.place_id ?? 0),
        placeName: effectiveOnsiteSetup.place?.name ?? currentConfig?.onsiteSetup?.placeName ?? '',
      },
    });
  }

  // ────────────────────────────────────── private — custom tabs ───────────────────────────────────

  #prioritizedPlanIds(): number[] {
    return this.#state.activeOnsiteSetup()?.prioritized_main_plans || [];
  }

  /** The sessions are priced per channel, and a setup change can move the channel while the plan stays. */
  #reloadFlexibleBundleSessionsForActivePlan(): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    const activePlan = this.#state.activePlan();
    if (partnerId == null || activePlan == null) {
      return;
    }
    this.#loadFlexibleBundleSessions(partnerId, activePlan);
  }

  #resolvePlanConfigFromActiveSelection(): OSSPlanConfig | null {
    const activePlanConfig = this.#state.activeOssPlanConfig();
    if (activePlanConfig === null || !this.#isStoredPlanValid(activePlanConfig)) {
      return null;
    }
    if (!this.#isStoredPlanOnSaleForCurrentSetup(activePlanConfig)) {
      return null;
    }
    return activePlanConfig;
  }

  /** The `modify_order` deep link names its plan; it must be on sale to proceed. */
  #resolvePlanConfigFromModifyOrderParams(): OSSPlanConfig | null {
    if (!this.#purchase.isModifyOrderEntry()) {
      return null;
    }
    const params = this.#activatedRoute.snapshot.queryParams;
    const planId = Number(params['planId']);
    if (Number.isNaN(planId)) {
      return null;
    }
    const plan = this.#state.onSalePlans.find(onSalePlan => onSalePlan.id === planId);
    if (plan === undefined) {
      return null;
    }
    const venueId = Number(params['venueId']);
    return this.buildPlanConfigFromPlan(plan, Number.isNaN(venueId) ? undefined : venueId);
  }

  #resolvePlanConfigFromMatchingActivePlan(): OSSPlanConfig | null {
    const activePlan = this.#state.activePlan();
    const matchedActivePlan = this.#state.availablePlans().find(plan => plan.id === activePlan?.id);
    if (matchedActivePlan === undefined) {
      return null;
    }

    const preferredPlaceId = Number(this.#state.activeOssPlanConfig()?.placeId);
    return this.buildPlanConfigFromPlan(matchedActivePlan, Number.isNaN(preferredPlaceId) ? undefined : preferredPlaceId);
  }

  #savePlanToCurrentConfig(plan: OSSPlanConfig): void {
    const currentConfig = this.#configStorage.getConfiguration();
    if (currentConfig === null) {
      return;
    }
    this.#configStorage.setConfiguration({
      ...currentConfig,
      plan,
    });
  }

  get #shift(): PosShiftService {
    return this.#injector.get(PosShiftService);
  }

  #showPlanSelectionModal(): void {
    if (this.#planSelectionModalShown) {
      return;
    }

    const plans = this.#state.availablePlans();
    if (!plans?.length || !this.#hasSelectablePlanPlaces(plans)) {
      return;
    }

    this.#planSelectionModalShown = true;
    const previousPlanConfig = this.#state.activeOssPlanConfig();
    this.#planSelectorPreviousConfig = previousPlanConfig;
    this.#planSelectorPlansSnapshot = plans;
    this.openPlanSelector$.next({
      currentPlanConfig: previousPlanConfig,
      disabledPlanIds: this.#getDisabledPlanIdsForPlanSelection(),
      hasCloseButton: true,
      plans,
    });

    this.#tracking.track(posPlaceEventSelectorModalOpened());
  }

  #syncActivePlanWithStoredPlan(storedPlan: OSSPlanConfig): void {
    if (this.#state.activeOssPlanConfig() !== null) {
      return;
    }
    this.#updatePlanSelected(Number(storedPlan.id));
    this.#state.activeOssPlanConfig.set(storedPlan);
  }

  #syncSecondScreenLoggedOutBannerCustomText(onsiteSetup: OnsiteSetup): void {
    const isFlagEnabled = this.#optimizely.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.ENABLE_SECOND_SCREEN_CUSTOM_TEXT_FOR_LOGGED_OUT_BANNER,
      team: 'b2b-shops',
    });
    const name = onsiteSetup?.name?.trim();
    if (isFlagEnabled === true && name) {
      this.#secondScreenLoggedOutBannerStorage.setSecondScreenLoggedOutBannerText(name);
      return;
    }
    this.#secondScreenLoggedOutBannerStorage.removeSecondScreenLoggedOutBannerText();
  }

  /**
   * Mirrors the setup's second screen configuration onto the second screen tab (B2BS-2115). Only the POS tab evaluates the
   * flag, per venue, so a partner outside its audience keeps today's second screen: the key is removed whenever the flag
   * does not answer `true` or the setup carries no configuration.
   */
  #syncSecondScreenConfiguration(onsiteSetup: OnsiteSetup): void {
    const configuration = this.#getSecondScreenConfiguration(onsiteSetup);
    if (configuration === null) {
      this.#secondScreenConfigurationStorage.removeSecondScreenConfiguration();
      return;
    }
    // A setup read from storage embeds the configuration as it was then: it never overwrites a fresher copy the refresh stored.
    if (shouldStoreSecondScreenConfiguration(configuration, this.#secondScreenConfigurationStorage.getSecondScreenConfiguration())) {
      this.#secondScreenConfigurationStorage.setSecondScreenConfiguration(configuration);
    }
  }

  /** The configuration the second screen shows for a setup: `null` without one, or when the flag does not answer `true` for its venue. */
  #getSecondScreenConfiguration(onsiteSetup: OnsiteSetup): SecondScreenConfiguration | null {
    const isFlagEnabled = this.#optimizely.isFeatureEnabled(
      { optimizelyFeatureKey: FeatureFlags.ENABLE_SECOND_SCREEN_CONFIGURATION, team: 'b2b-shops' },
      venueAttributes(onsiteSetup.place?.id ?? onsiteSetup.place_id),
    );
    return isFlagEnabled === true ? (onsiteSetup.second_screen_configuration ?? null) : null;
  }

  #toActiveOnsiteSetup(onsiteSetup: OnsiteSetup): OnsiteSetup {
    const currentPlaceId = this.#getCurrentPlaceId();
    const onsiteSetupWithPlaceId = currentPlaceId !== null ? { ...onsiteSetup, place_id: currentPlaceId } : onsiteSetup;
    return this.#effectiveOnsiteSetup(onsiteSetupWithPlaceId);
  }

  /**
   * `#updateOnsiteSetupSelected` — the single place a setup becomes active.
   * Preset coupons are prefetched (and their failure swallowed) before the setup is applied, or
   * alongside it with `box_office_parallel_preset_coupons` on.
   */
  #updateOnsiteSetupSelected(onsiteSetupId: string): void {
    this.#onsiteSetupRefresh.cancel();
    const storedOnsiteSetup = this.#getStoredOnsiteSetup(onsiteSetupId);
    const onsiteSetup$ = storedOnsiteSetup === null ? this.#core.getOnsiteSetup(onsiteSetupId) : of(storedOnsiteSetup);
    onsiteSetup$
      .pipe(
        switchMap(onsiteSetup => this.#prefetchPresetCoupons(onsiteSetup)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.#onsiteSetupModalShown = false;
          this.resetState();
          this.#state.activeOnsiteSetup.set(null);
          this.#configStorage.removeConfiguration();
          this.#onsiteSetupsStorage.removeConfiguration();
          this.#loadOnsiteSetupWithoutConfig(undefined, onsiteSetupId);
        },
        next: (onsiteSetup: OnsiteSetup) => {
          this.#onsiteSetupModalShown = false;
          this.resetState();
          this.#onsiteSetupStore.clearSelectionDismissed();
          this.patchStoredConfigWithCountryCode(onsiteSetup);
          const effectiveOnsiteSetup = this.#toActiveOnsiteSetup(onsiteSetup);
          // Active before `setConfiguration`: it dispatches a same-tab `storage` event and
          // `handleOnsiteSetupStorageChange` ignores updates when the id already matches.
          this.#state.onsiteSetupSelected = effectiveOnsiteSetup;
          this.#state.activeOnsiteSetup.set(effectiveOnsiteSetup);
          this.#onsiteSetupsStorage.setConfiguration(effectiveOnsiteSetup);
          this.#syncSecondScreenLoggedOutBannerCustomText(effectiveOnsiteSetup);
          this.#syncSecondScreenConfiguration(effectiveOnsiteSetup);
          this.#state.hasProductCatalog.set(Boolean(effectiveOnsiteSetup.retail_setup_id));
          this.applyOnsiteSetup();
          this.#pairPayHereOnSetupLoad(effectiveOnsiteSetup);
          this.#tapToPayAvailability.warmUp();
          this.updateAvailableTabs();
          this.#viewUpdate.markForCheck();
          this.#setupResolved$.next(effectiveOnsiteSetup);
          if (storedOnsiteSetup !== null) {
            this.#onsiteSetupRefresh.check(onsiteSetupId, latestOnsiteSetup => this.#toActiveOnsiteSetup(latestOnsiteSetup));
          }
        },
      });
  }

  #prefetchPresetCoupons(onsiteSetup: OnsiteSetup): Observable<OnsiteSetup> {
    const presetCoupons$ = this.#core.getPresetCoupons(onsiteSetup).pipe(
      map(() => onsiteSetup),
      catchError(() => of(onsiteSetup)),
    );
    const isParallel = this.#optimizely.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.BOX_OFFICE_PARALLEL_PRESET_COUPONS,
      team: 'b2b-shops',
    });
    if (isParallel !== true) {
      return presetCoupons$;
    }

    presetCoupons$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();

    return of(onsiteSetup);
  }

  /**
   * Intentional: `TicketingCoreService.getPlan` unwraps the envelope and therefore *throws* where
   * legacy simply skipped a `null` payload. The empty error handler here preserves that no-op
   * behavior and must not be filled in.
   */
  #updatePlanSelected(planId: number): void {
    const previousPlanId = this.#state.plan?.id ?? null;
    const partnerId = this.#partnerService.getPartner()!.id;
    this.#core
      .getPlan(partnerId, planId)
      .pipe(take(1))
      .subscribe({
        error: () => {},
        next: plan => {
          this.#state.plan = plan;
          this.#state.activePlan.set(this.#state.plan);
          this.#loadFlexibleBundleSessions(partnerId, plan);
          if (previousPlanId !== plan?.id) {
            // The member's perks were fetched for the plan we just left — MSM-820.
            this.#memberships.clear();
          }
        },
      });
  }

  #watchPlanPlaceSelectorAutoOpen(): void {
    effect(
      () => {
        const shouldOpen = this.#planSelectionStore.shouldAutoOpenPlanPlaceSelector();
        const hasActiveSetup = this.#state.activeOnsiteSetup();
        const hasActivePlan = this.#state.activePlan() || this.#state.activeOssPlanConfig();
        if (shouldOpen && hasActiveSetup && !hasActivePlan && !this.#planSelectionModalShown) {
          untracked(() => {
            this.#openPlanPlaceSelector();
          });
        }
      },
      { injector: this.#injector },
    );
  }

  /**
   * First resolved setup boots the per-setup initialisers. The flag is reset by
   * {@link resetState}, so every setup change re-runs the whole block.
   */
  #watchSetupApplied(): void {
    effect(
      () => {
        const onsiteSetup = this.#state.activeOnsiteSetup();
        if (onsiteSetup && !this.#areEffectsInitialized) {
          this.#areEffectsInitialized = true;
          // queueMicrotask keeps effect creation outside the reactive context (NG0602).
          queueMicrotask(() => {
            this.loadPlans();
            this.#ticketSelection.initializeCustomTabs(onsiteSetup);
            this.setupBootstrap$.next(onsiteSetup);
          });
        }
      },
      { injector: this.#injector },
    );
  }

  #watchSetupSelectorAutoOpen(): void {
    effect(
      () => {
        const shouldOpen = this.#onsiteSetupStore.shouldAutoOpenSelector();
        const hasActiveSetup = this.#state.activeOnsiteSetup();
        if (shouldOpen && !hasActiveSetup && !this.#onsiteSetupModalShown) {
          untracked(() => {
            this.#displaySetupSelector(true, this.#state.pendingSetupPreselection);
            this.#state.pendingSetupPreselection = undefined;
          });
        }
      },
      { injector: this.#injector },
    );
  }
}
