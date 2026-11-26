import { Dialog } from '@angular/cdk/dialog';
import { AsyncPipe, CurrencyPipe, NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { IconName, IconPrefix, IconProp } from '@fortawesome/fontawesome-svg-core';
import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { ScannerService } from '@fz-original/app/app/services/scanner/scanner.service';
import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { ConfirmationDialogComponent } from '@fz-original/app/memberships/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogService } from '@fz-original/app/memberships/services/confirmation-dialog/confirmation-dialog.service';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { SecondScreenLoggedOutBannerStorageService } from '@fz-original/app/modules/box-office/obo-second-screen/services/logged-out-banner/second-screen-logged-out-banner-storage.service';
import { OssLinkedDeviceModalComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-linked-device-modal/oss-linked-device-modal.component';
import { OboFlowTypeEnum, OnsiteSetup, ShiftStrategyEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsPresetCouponsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups-preset-coupons/onsite-setups-preset-coupons.service';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { FilterProductSessionsPipe } from '@fz-original/app/modules/box-office/ticketing/filter-product-sessions.pipe';
import { UserShiftService } from '@fz-original/app/modules/box-office/ticketing/services/user-shift/user-shift.service';
import {
  ReservationSettlementSession,
  ReservationSettlementStartResult,
} from '@fz-original/app/modules/reservation-settlement/models/reservation-settlement-session.model';
import { adoptReservationSettlementCoupon } from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-discount.util';
import { ValidationNavigationState } from '@fz-original/app/modules/validation/models/validation-navigation-state.model';
import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { CouponCodeSelectorComponent } from '@fz-original/app/shared/components/coupon-code-selector/coupon-code-selector.component';
import { getDateSelectorTitleKey } from '@fz-original/app/shared/components/date-selector/date-selector.util';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import {
  cartWithOnlyOtherPlanSessions,
  mergeCartSessionsFromOtherPlans,
  seatingHoldTokensForSeatedCartLines,
} from '@fz-original/app/shared/components/ticketing/ticketing.utils';
import { SelectDropdownCityOption } from '@fz-original/app/shared/dropdown/select-dropdown-city-option';
import { CreateEventEntryService } from '@fz-original/app/shared/layout/create-event-entry/create-event-entry.service';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TOGGLE_FOOTER_EVENT_KEY } from '@fz-original/app/shared/layout/footer/toggle-footer-event-key';
import { ModalContentModule } from '@fz-original/app/shared/layout/modal/modal-content.module';
import { TOGGLE_SIDEBAR_EVENT_KEY } from '@fz-original/app/shared/layout/sidebar/toggle-sidebar-event-key';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { DeviceType } from '@fz-original/app/shared/models/device/device.model';
import { MenuItem } from '@fz-original/app/shared/models/header/header.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { pickNextUpcomingSession } from '@fz-original/app/shared/models/session-availability/next-upcoming-session.util';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-datetime.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { FreeSeatResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/free-seat-response.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { SeatingSelectorModule } from '@fz-original/app/shared/seating-selector/seating-selector.module';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { HeaderStateService } from '@fz-original/app/shared/services/header/header-state.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { EmptyStateComponent } from '@fz-shop-products/src/public-api';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent, IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
// B2BP-1995: commented out with the release-tickets sheet of the template.
// import { IgntBottomSheetDialogComponent } from '@ignite/legacy/components/ignt-bottom-sheet-dialog/ignt-bottom-sheet-dialog.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
// B2BP-1995: only the commented-out release-tickets sheet of the template used it.
// import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntTourAnchorDirective } from '@ignite/legacy/components/ignt-ui-tour/ignt-tour-anchor.directive';
import { IgntTourService } from '@ignite/legacy/components/ignt-ui-tour/ignt-tour.service';
import { IgntTourComponent } from '@ignite/legacy/components/ignt-ui-tour/ignt-ui-tour.component';
import { IgntTourConfig, IgntTourStep } from '@ignite/legacy/components/ignt-ui-tour/ignt-ui-tour.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { BehaviorSubject, defer, EMPTY, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, concatMap, map, skip, switchMap, take } from 'rxjs/operators';

import { SquareConnectionModalComponent } from '../../shared/components/square-connection-modal/square-connection-modal.component';
import { isHungarianFiscalReceiptEnabled } from '../../shared/services/efsta-fiscal/efsta-fiscal.util';
import { OnsiteSetupsStorageService } from '../../shared/services/onsite-setups/onsite-setups-storage.service';
import { OssButtonsSectionComponent } from '../components/oss-buttons-section/oss-buttons-section.component';
import { OssCartDetailComponent, TimeslotActivationFromCartPayload } from '../components/oss-cart-detail/oss-cart-detail.component';
import { OssFiscalActionsComponent } from '../components/oss-fiscal-actions/oss-fiscal-actions.component';
import { OssHierarchyTilesComponent } from '../components/oss-hierarchy-tiles/oss-hierarchy-tiles.component';
import { OssTicketSelectorComponent } from '../components/oss-ticket-selector/oss-ticket-selector.component';
import { OssTicketsSectionComponent } from '../components/oss-tickets-section/oss-tickets-section.component';
import {
  HierarchyNavigationLeafNode,
  HierarchyNavigationLevel,
  HierarchyNavigationParentNode,
  OssCustomTabData,
  OssCustomTile,
  OssCustomTileExtraInfoHierarchyElement,
  OssCustomTilesData,
  OssHierarchyCategory,
  OssHierarchyProduct,
  OSSOnsiteSetupConfig,
  OSSPlanConfig,
  OssSeatingSelectionSnapshot,
  OssSessionAvailability,
  OssSessionWithCustomTile,
  OssTab,
  OssTargetElementType,
  UpdateTicketTypeCounter,
} from '../models';
import { ModifiedOrderMode } from '../models/oss-modified-order-mode.model';
import { OssMomentDatePipe } from '../pipes/oss-moment-date.pipe';
import { OSSConfigStorageService } from '../services/oss-config-storage.service';
import { OssCustomTabSessionsForDateQuery } from '../services/oss-custom-tab-sessions-for-date-query';
import { OssCustomTabsService } from '../services/oss-custom-tabs.service';
import { OssOnsiteSetupStore } from '../store/oss-onsite-setup.store';
import { OssPlanSelectionStore } from '../store/oss-plan-selection.store';
import { posCartCleared, type PosCartClearedSource } from '../tracking/events/pos-cart-cleared.event';
import { type PosCartSource } from '../tracking/events/pos-cart-item-quantity-change.event';
import { posPlaceEventSelectorModalClosed } from '../tracking/events/pos-place-event-selector-modal-closed.event';
import { posPlaceEventSelectorModalOpened } from '../tracking/events/pos-place-event-selector-modal-opened.event';
import { posSearchOpened } from '../tracking/events/pos-search-opened.event';
import { posTabSwitched } from '../tracking/events/pos-tab-switched.event';
import { oneStopShopTrackingProvider } from '../tracking/one-stop-shop.tracking-provider';
import { buildPlanPlaceSelectorChangeData } from '../tracking/utils/pos-place-event-selector-modal.util';
import { ossIdentifyMemberActionId, ossIdentifyMemberMenuItem } from '../utils/oss-identify-member-action.util';
import { OssDateSelectorModalComponent } from './oss-date-selector-modal/oss-date-selector-modal.component';
import {
  OssModifyOrderValidationModalComponent,
  OssModifyOrderValidationModalData,
} from './oss-modify-order-validation-modal/oss-modify-order-validation-modal.component';
import { OssOnsiteSetupModalComponent } from './oss-onsite-setup-modal/oss-onsite-setup-modal.component';
import { type OssOnsiteSetupModalData, type OssOnsiteSetupModalResult } from './oss-onsite-setup-modal/oss-onsite-setup-modal.model';
import { OssPlanSelectionModalComponent } from './oss-plan-selection-modal/oss-plan-selection-modal.component';
import {
  type OssPlanSelectionModalData,
  type OssPlanSelectionModalResult,
} from './oss-plan-selection-modal/oss-plan-selection-modal.model';
import { OssSearchComponent } from './oss-search/oss-search.component';
import { OssTicketingComponent } from './oss-ticketing/oss-ticketing.component';
import {
  OssTimeslotWarningModalComponent,
  OssTimeslotWarningModalData,
} from './oss-timeslot-warning-modal/oss-timeslot-warning-modal.component';

@Component({
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslateModule,
    OssButtonsSectionComponent,
    OssHierarchyTilesComponent,
    OssSearchComponent,
    OssTicketsSectionComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    NgTemplateOutlet,
    NgIf,
    OssTicketSelectorComponent,
    ConfirmationDialogComponent,
    CouponCodeSelectorComponent,
    IgntButtonComponent,
    NgForOf,
    CurrencyPipe,
    IgntIconComponent,
    OssCartDetailComponent,
    SharedComponentsModule,
    AsyncPipe,
    ModalContentModule,
    IgntIconButtonComponent,
    IgntLinkComponent,
    FilterProductSessionsPipe,
    IgntTourComponent,
    IgntTourAnchorDirective,
    IgntTagComponent,
    IgntAlertComponent,
    // IgntBottomSheetDialogComponent, // B2BP-1995: commented out with the release-tickets sheet of the template.
    // IgntCheckboxComponent, // B2BP-1995: only the commented-out release-tickets sheet of the template used it.
    OssFiscalActionsComponent,
    OssMomentDatePipe,
    OssModifyOrderValidationModalComponent,
    EmptyStateComponent,
    SeatingSelectorModule,
  ],
  providers: [...oneStopShopTrackingProvider(), MembershipsIdentificationService, OssOnsiteSetupStore, OssPlanSelectionStore],
  selector: 'app-one-stop-shop',
  standalone: true,
  styleUrls: ['./one-stop-shop.component.scss'],
  templateUrl: './one-stop-shop.component.html',
})
export class OneStopShopComponent extends OssTicketingComponent implements OnInit, OnDestroy {
  static readonly tourResetClickThreshold = 5;
  static readonly tourResetTimeoutMs = 2000;
  #activatedRoute = inject(ActivatedRoute);
  #activeEffectRefs: { destroy: () => void }[] = [];
  #areEffectsInitialized = false;
  #tileAddSessionId: number | null = null;
  #isModifyOrderTimeSlotApplied = false;
  #isModifyOrderCartSeeded = false;
  #modifyOrderFlowAborted = false;
  #onSalePlans: Plan[] = [];
  readonly #modifiedOrderIdParam: Signal<string | undefined> = toSignal(
    this.#activatedRoute.queryParams.pipe(map(params => params['modified_order_id'] ?? undefined)),
    {
      initialValue: this.#activatedRoute.snapshot.queryParams['modified_order_id'] ?? undefined,
    },
  );
  readonly #modifiedOrderModeParam: Signal<ModifiedOrderMode | undefined> = toSignal(
    this.#activatedRoute.queryParams.pipe(map(params => this.#parseModifiedOrderMode(params['mode']))),
    {
      initialValue: this.#parseModifiedOrderMode(this.#activatedRoute.snapshot.queryParams['mode']),
    },
  );
  readonly #settlementModeParam: Signal<string | undefined> = toSignal(
    this.#activatedRoute.queryParams.pipe(map(params => params['mode'] ?? undefined)),
    {
      initialValue: this.#activatedRoute.snapshot.queryParams['mode'] ?? undefined,
    },
  );
  readonly #settlementCartIdParam: Signal<string | undefined> = toSignal(
    this.#activatedRoute.queryParams.pipe(map(params => params['reservation_cart_id'] ?? undefined)),
    {
      initialValue: this.#activatedRoute.snapshot.queryParams['reservation_cart_id'] ?? undefined,
    },
  );
  readonly #settlementReservationIdParam: Signal<string | undefined> = toSignal(
    this.#activatedRoute.queryParams.pipe(map(params => params['reservation_id'] ?? undefined)),
    {
      initialValue: this.#activatedRoute.snapshot.queryParams['reservation_id'] ?? undefined,
    },
  );
  #hasTourBeenInitialized = false;
  #authenticationService = inject(AuthenticationService);
  #breakpointStateService = inject(BreakpointStateService);
  #pendingPaymentType: PaymentType | null = null;
  #cdkDialog = inject(Dialog);
  #confirmationDialogService = inject(ConfirmationDialogService);
  #datadogLogService = inject(DatadogLogService);
  readonly #fzTrackingService = inject(FzTrackingService);
  #skipClearCartTracking = false;
  readonly #activateTimeslot$ = new Subject<TimeslotActivationFromCartPayload>();
  #preferredCartDatetimeAfterDateChange: string | null = null;
  #destroyRef = inject(DestroyRef);
  #translateService = inject(TranslateService);
  activeOnsiteSetup: WritableSignal<OnsiteSetup | null> = signal<OnsiteSetup | null>(null);
  displayedOnsiteSetup: Signal<string | null> = computed((): string | null => {
    const onsiteSetup = this.activeOnsiteSetup();
    if (!onsiteSetup) {
      return null;
    }
    return onsiteSetup?.name ?? '';
  });
  #featureMenuItems: Signal<MenuItem[]> = computed(() => {
    const items: MenuItem[] = [];

    items.push({
      icon: ['fal', 'cog'],
      id: 'oss-change-setup',
      label: this.#translateService.instant('oneStopShop.mobileMenu.changeSetup'),
      tag: this.displayedOnsiteSetup(),
      tagSentiment: 'info',
    });

    // `activePlan()` is the reactive read that makes this `computed()` re-run on a plan change;
    // `canIdentifyMember()` reads the plain `plan` field and cannot provide it.
    if (this.activePlan()?.id != null && this.canIdentifyMember()) {
      items.push(
        ossIdentifyMemberMenuItem(
          this.#translateService.instant('boxOffice.memberships.identifyMember.button'),
          this.membershipsData.member?.holder.name ?? null,
        ),
      );
    }

    if (this.isLinkDeviceButtonVisible()) {
      items.push({
        icon: ['fal', 'mobile'],
        id: 'oss-link-device',
        label: this.#translateService.instant('oneStopShop.mobileMenu.linkDevice'),
        tag: this.displayedDeviceId(),
        tagSentiment: 'info',
      });
    }
    return items;
  });
  #hasModalCouponCodeOpened = false;
  activeTab: WritableSignal<{ tabIndex: number; type: OssTab }> = signal<{ tabIndex: number; type: OssTab }>({
    tabIndex: 0,
    type: OssTab.TICKETS_AND_ADDONS,
  });
  #headerActions: Signal<MenuItem[]> = computed(() => {
    const actions: MenuItem[] = [];
    const tabType = this.activeTab().type;

    if (tabType === OssTab.SEATING || tabType === OssTab.TICKETS_AND_ADDONS) {
      actions.push({
        icon: ['fas', 'calendar'],
        id: 'oss-calendar',
        label: this.#translateService.instant('menu.calendar'),
      });
    } else if (tabType === OssTab.CUSTOM_TABS) {
      actions.push({
        icon: ['fas', 'search'],
        id: 'oss-search',
        label: this.#translateService.instant('oneStopShop.mobileMenu.search'),
      });
    }

    return actions;
  });
  #headerStateService = inject(HeaderStateService);
  #hierarchyLevelsCache = new Map<string, HierarchyNavigationLevel | null>();
  #injector = inject(Injector);
  #isDateChangeInProgress = false;
  #seatingTabAutoNavigated = false;
  #skipModifyOrderPayWarningOnce = false;
  #modalService = inject(NgbModal);
  readonly #dialogService = inject(IgntDialogService);
  #onsiteSetupModalShown = false;
  #planSelectionModalShown = false;
  #pendingSetupPreselection?: { onsiteSetupId?: string; venueId?: string };
  readonly #planSelectionStore = inject(OssPlanSelectionStore);
  protected readonly onsiteSetupStore = inject(OssOnsiteSetupStore);
  #onsiteSetupsService = inject(OnsiteSetupsService);
  readonly #onsiteSetupsPresetCouponsService = inject(OnsiteSetupsPresetCouponsService);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #ossConfigStorageService = inject(OSSConfigStorageService);
  #partnerService = inject(PartnerService);
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #paymentService = inject(PaymentService);
  #planService = inject(PlanService);
  #purchaseService = inject(PurchaseService);
  #productSessionsSummaryService = inject(ProductSessionsSummaryService);
  #customTabsService = inject(OssCustomTabsService);
  #deviceService = inject(DeviceService);
  #manageOrderTourTemplate!: TemplateRef<unknown>;
  readonly #createEventEntryService = inject(CreateEventEntryService);
  #router = inject(Router);
  #scannerService = inject(ScannerService);
  #secondScreenLoggedOutBannerStorageService = inject(SecondScreenLoggedOutBannerStorageService);
  #toastService = inject(ToastService);
  #tourResetClickCount = 0;

  #tourResetClickTimeout: ReturnType<typeof setTimeout> | null = null;

  #tourService = inject(IgntTourService);

  #userShiftService = inject(UserShiftService);
  readonly headerCenterTemplate = viewChild<TemplateRef<unknown>>('headerCenterTemplate');
  protected readonly hasActivePlanSelected = computed(() => this.activePlan() !== null);
  protected readonly shouldShowPlanPlaceSelector = computed(() => this.#planSelectionStore.shouldShowPlanPlaceSelector());
  protected readonly ticketSelectorPlaceholder = computed(() => this.#planSelectionStore.ticketSelectorPlaceholder());
  override addCustomTileSessionsToTicketTypes(customTilesData: OssCustomTilesData): void {
    if (!this.cart && !this.nonConfirmedCart) {
      this.ticketTypes = [];
      this.#updateAvailableTabs();
    }
    super.addCustomTileSessionsToTicketTypes(customTilesData);
  }

  override clickOnPayOneStep(paymentType?: PaymentType, trackSelectPayment = false): void {
    if (trackSelectPayment && paymentType != null) {
      this.trackSelectPaymentMethod(paymentType, 'button');
    }

    this.onCloseSearch();
    this.showPaymentsInLateral = false;
    this.#syncSecondScreenSeatingMapVisibility(false);

    const modifyOrderPayPayload = this.getModifyOrderPayModalPayload();
    let modifyOrderModalPayload = modifyOrderPayPayload;
    if (this.#skipModifyOrderPayWarningOnce) {
      if (modifyOrderPayPayload?.mode === 'warning') {
        modifyOrderModalPayload = null;
      } else {
        this.#skipModifyOrderPayWarningOnce = false;
      }
    }
    if (modifyOrderModalPayload) {
      const confirm$ = this.#showModifyOrderValidationModal(modifyOrderModalPayload);
      if (modifyOrderModalPayload.mode === 'warning') {
        confirm$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.#skipModifyOrderPayWarningOnce = true;
            this.clickOnPayOneStep(paymentType);
          }
        });
      }
      return;
    }

    if (paymentType != null && this.#shouldShowDeviceSelector(paymentType)) {
      this.#pendingPaymentType = paymentType;
      this.openLinkedDeviceModal();
      return;
    }

    const mismatchedCartDatetime = this.#getMismatchedCartTimeslot();
    if (mismatchedCartDatetime) {
      this.#showTimeslotMismatchWarning(mismatchedCartDatetime)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe((confirmed: boolean) => {
          if (confirmed) {
            super.clickOnPayOneStep(paymentType);
          }
          this.#skipModifyOrderPayWarningOnce = false;
        });
      return;
    }

    this.#skipModifyOrderPayWarningOnce = false;
    super.clickOnPayOneStep(paymentType);
  }

  override discardCartBeforeNavigation(): Observable<void> {
    if (this.cartHasItems()) {
      if (this.#skipClearCartTracking) {
        this.#skipClearCartTracking = false;
      } else {
        this.#trackCartCleared('leave_pos');
      }
    }
    return super.discardCartBeforeNavigation();
  }

  /**
   * Rebuilds the cart from the current selection, keeping the other plans' lines.
   *
   * `super.getCart()` delegates to `generateCart()`, which wipes `sessionItemsByDatetime` and
   * re-adds only the sessions of the plan on screen. `createOrUpdateCart()` calls this right before
   * the create/update request, so without the merge back the lines of every other plan are dropped
   * from the outgoing payload and never reach the backend — B2BO-8391.
   *
   * A `null` rebuild is passed straight through, because callers read it as "nothing to refresh":
   * `createOrUpdateCart()` keeps the cart it already has. Turning that `null` into a cart without the
   * current plan would drop that plan from the checkout payload. The seat path, which does assign the
   * `null`, handles it in `updateSeatsInCart()` instead.
   */
  override getCart(): Cart | null {
    const previousNonConfirmedCart = this.nonConfirmedCart;
    const rebuiltCart = super.getCart();
    const currentPlanId = this.selectedPlan?.id ?? null;
    const shouldPreserveMultiPlanSessions =
      this.multiPlanCartEnabled && this.hasMultiplanSeatingFlowContext && !this.allowMultiTimeSlotSelection;
    if (!shouldPreserveMultiPlanSessions || rebuiltCart === null || previousNonConfirmedCart === null || currentPlanId === null) {
      return rebuiltCart;
    }
    return mergeCartSessionsFromOtherPlans(rebuiltCart, previousNonConfirmedCart, currentPlanId);
  }

  override getUnloadDiscardCartQuery(): DiscardCartQuery | null {
    const query = super.getUnloadDiscardCartQuery();
    if (this.cartHasItems()) {
      this.#trackCartCleared('leave_fz');
      if (!query) {
        this.#skipClearCartTracking = true;
      }
    }
    return query;
  }

  override handleProductScannedCode(code: string): void {
    const productSession = this.#productSessionsSummaryService.getSessionDataByProductCode(code);
    if (productSession) {
      super.handleProductScannedCode(code);
      this.scrollToCartItem(productSession.id);
      return;
    }

    if (this.hasProductCatalog() && !this.isProductCatalogLoaded()) {
      super.handleProductScannedCode(code);
      return;
    }

    this.#handleScannedOrderCode(code);
  }

  protected override isModifyOrderFlowAborted(): boolean {
    return this.#modifyOrderFlowAborted;
  }

  override loadNewSearch(filters: SearchFilter, date?: Date): void {
    const isSameVenue =
      this.selectedPlan?.id === filters.selectedPlan?.id &&
      this.selectedPlace?.id === filters.selectedPlace?.id &&
      this.selectedCity?.id === filters.selectedCity?.id;
    const dateChanged = date && (!this.fromDate || this.fromDate.getTime() !== date.getTime());
    const hasPlanOrPlaceChanged =
      this.selectedPlan?.id !== filters.selectedPlan?.id || this.selectedPlace?.id !== filters.selectedPlace?.id;
    if (this.manageAsFreeSeatingMap && hasPlanOrPlaceChanged) {
      this.seatingMapUrl = null;
      this.seatingMapState = null;
      this.clearLastSeatingMapLoadContext();
      this.seatingToken = '';
      // The map is gone, but a preserved multiplan cart still holds the other plans' seats under
      // their own hold tokens: keep those, or their lines go out stamped with the new plan's token
      // and the backend rejects the order — B2BO-8391.
      this.seatingHoldTokensBySessionId = this.multiPlanCartEnabled
        ? seatingHoldTokensForSeatedCartLines(this.seatingHoldTokensBySessionId, [this.nonConfirmedCart, this.cart])
        : new Map();
      this.selectedTicketsSeatsBySessionId = new Map();
    }
    if (isSameVenue && !dateChanged && (this.cart || this.nonConfirmedCart)) {
      this.filters = filters;
      if (filters.selectedPlan != null) this.selectedPlan = filters.selectedPlan;
      if (filters.selectedPlace != null) this.selectedPlace = filters.selectedPlace;
      if (filters.selectedCity != null) this.selectedCity = filters.selectedCity;
      this.timezone = filters.timezone;
      if (this.#isActiveTabDateDependant()) {
        this.getSessionsForSelectedDate();
      } else if (this.activeTab().type === OssTab.CUSTOM_TABS) {
        this.#preserveCartStateForCustomTabs();
      }
      return;
    }
    this.#seatingTabAutoNavigated = false;
    super.loadNewSearch(filters, date);
  }
  activeOssPlanConfig: WritableSignal<OSSPlanConfig | null> = signal<OSSPlanConfig | null>(null);
  activePlan: WritableSignal<Plan | null> = signal<Plan | null>(null);
  activeCustomTabIndex: WritableSignal<number> = signal<number>(0);
  customTabSignals: WritableSignal<WritableSignal<OssCustomTabData | null>[]> = signal([]);
  activeCustomTab: Signal<OssCustomTabData | null> = computed(() => {
    const tabSignals = this.customTabSignals();
    const index = this.activeCustomTabIndex();
    return tabSignals[index]?.() || null;
  });
  activeTabIndex: Signal<number> = computed(() => {
    return this.activeTab().tabIndex;
  });
  availablePlans: WritableSignal<Plan[]> = signal<Plan[]>([]);
  availablePlansById: Signal<Map<number, Plan>> = computed(() => {
    const map = new Map<number, Plan>();
    this.availablePlans().forEach(plan => {
      if (plan.id) {
        map.set(plan.id, plan);
      }
    });
    return map;
  });

  availableTabs: WritableSignal<OssTab[]> = signal<OssTab[]>([OssTab.TICKETS_AND_ADDONS]);
  readonly modifiedOrderMode: Signal<ModifiedOrderMode | undefined> = this.#modifiedOrderModeParam;
  readonly modifiedOrderBannerTitleKey: Signal<string> = computed(() =>
    this.modifiedOrderMode() === 'upgrade_seating'
      ? 'boxOffice.orderModificationBanner.seatsTitle'
      : 'boxOffice.orderModificationBanner.title',
  );

  modifiedOrderModalOpen: WritableSignal<boolean> = signal(false);

  override newSelectTicketCounter(
    ticketTypeCounter: { bySessionId: Map<string, number>; bySessionType: Map<string, number> },
    modifiedSessionIsShopProduct: boolean = false,
    skipPosCartTracking = false,
  ): void {
    this.exitModifyOrderPaymentIfActive();
    ticketTypeCounter.bySessionId.forEach((sessionTicketsSelected, sessionId) => {
      const numericSessionId = parseInt(sessionId);
      if (this.#isSessionInCustomTabs(numericSessionId)) {
        this.#updateCustomTilesAvailability(numericSessionId, sessionTicketsSelected);
      }
    });

    if (this.manageAsFreeSeatingMap && this.selectedTicketsSeatsBySessionId.size > 0) {
      this.selectedTicketsSeatsBySessionId.forEach((seatInfos, sessionId) => {
        const seatsCount = seatInfos.length;
        const existingSessionCounter = ticketTypeCounter.bySessionId.get(sessionId) ?? 0;
        if (seatsCount > 0 && existingSessionCounter <= 0) {
          ticketTypeCounter.bySessionId.set(sessionId, seatsCount);
          const ticketType = this.#getTicketTypeBySessionId(sessionId);
          if (ticketType) {
            const existingCount = ticketTypeCounter.bySessionType.get(ticketType) || 0;
            ticketTypeCounter.bySessionType.set(ticketType, existingCount + seatsCount);
          }
        }
      });
    }

    const ticketTypeCounterBySessionIdWithoutZeros = new Map<string, number>();
    ticketTypeCounter.bySessionId.forEach((counter, sessionId) => {
      if (counter > 0) {
        ticketTypeCounterBySessionIdWithoutZeros.set(sessionId, counter);
      }
    });
    const ticketTypeCounterBySessionTypeWithoutZeros = new Map<string, number>();
    ticketTypeCounter.bySessionType.forEach((counter, sessionId) => {
      if (counter > 0) {
        ticketTypeCounterBySessionTypeWithoutZeros.set(sessionId, counter);
      }
    });
    ticketTypeCounter.bySessionId = ticketTypeCounterBySessionIdWithoutZeros;
    ticketTypeCounter.bySessionType = ticketTypeCounterBySessionTypeWithoutZeros;

    super.newSelectTicketCounter(ticketTypeCounter, modifiedSessionIsShopProduct, skipPosCartTracking);
  }

  protected override resetSecondScreenSeatingMapVisibility(): void {
    this.#syncSecondScreenSeatingMapVisibility(false);
  }

  override selectDate(dateAvailability: DateAvailability): void {
    this.#isDateChangeInProgress = true;

    if (this.manageAsFreeSeatingMap) {
      const seatingSelectionSnapshot = this.#captureSeatingSelectionSnapshot();
      const shouldClearSelection = !this.multiPlanCartEnabled || !this.hasMultiplanSeatingFlowContext;
      if (shouldClearSelection) {
        this.onClearSelectionRequested();
      }
      this.#releaseDroppedSeatingSelection(seatingSelectionSnapshot);
      this.seatingMapUrl = null;
      this.seatingMapState = null;
      this.clearLastSeatingMapLoadContext();
    }

    const prevDatetime = this.selectedSession?.selectedDatetime?.datetime;
    if (
      this.allowMultiTimeSlotSelection &&
      prevDatetime != null &&
      prevDatetime !== '' &&
      this.#cartDatetimeMatchesCalendarDate(prevDatetime, dateAvailability.date)
    ) {
      this.#preferredCartDatetimeAfterDateChange = this.#normalizeOssDatetime(prevDatetime);
    } else {
      this.#preferredCartDatetimeAfterDateChange = null;
    }

    super.selectDate(dateAvailability);
  }

  protected override selectDefaultSessionForAdvancedFlow(): void {
    const cartTimeslots = this.#getCartTimeslotsWithItems();
    const preferredCartDatetime = this.#preferredCartDatetimeAfterDateChange;
    this.#preferredCartDatetimeAfterDateChange = null;
    const shouldSelectCartMatchingSession = this.allowMultiTimeSlotSelection && cartTimeslots.length > 0;
    if (!shouldSelectCartMatchingSession) {
      super.selectDefaultSessionForAdvancedFlow();
      this.#ensureSelectedSessionForCalendarWithMultiTimeslotCart();
      return;
    }
    const calendarDate = this.selectedDateAvailability?.date;
    const cartTimeslotsOrdered = this.#orderCartTimeslotsForCalendar(cartTimeslots, calendarDate, preferredCartDatetime);
    if (this.regularSessionAvailabilitySummaryByDateList.length > 0) {
      for (const cartDatetime of cartTimeslotsOrdered) {
        const normalizedCartDatetime = this.#normalizeOssDatetime(cartDatetime);
        const hasMatchingSession = this.regularSessionAvailabilitySummaryByDateList.some(summary =>
          summary.sessionAvailabilityByDatetimeList.some(avail => this.#isMatchingDatetime(avail, normalizedCartDatetime)),
        );
        if (hasMatchingSession) {
          this.#activatePendingTimeslot(cartDatetime);
          return;
        }
      }
    }
    super.selectDefaultSessionForAdvancedFlow();
    this.#ensureSelectedSessionForCalendarWithMultiTimeslotCart();
  }

  override selectSession(selectedSession: SessionAvailabilitySummaryByDate): void {
    super.selectSession(selectedSession);
    if ((this.isMobile() || this.isTablet()) && !this.#isDateChangeInProgress) {
      this.showMobileDateSelector.set(false);
    }
    this.updateCapacityLimit();
  }

  override updateFreeMapMode(): void {
    const seatingSelectionSnapshot = this.#captureSeatingSelectionSnapshot();
    super.updateFreeMapMode();
    this.#releaseDroppedSeatingSelection(seatingSelectionSnapshot);
  }

  /**
   * Sends one hold token per session instead of the single last-received one.
   *
   * Each plan's seating map issues its own hold token. With one plan in the cart the global
   * `seatingToken` was always the right one, but a multiplan seated cart carries seats from two maps:
   * stamping the last token on every line makes the backend reject the order with "Problem assigning
   * seats" (802), because the token does not own the other plan's seats. Mirrors what the legacy page
   * does for its own multiplan flow — B2BO-8391.
   *
   * Gated on the multiplan cart alone, the flag this page reads. `hasMultiplanSeatingFlowContext`
   * would read better here but hangs off `box_office_multiplan_flow`, the LEGACY page's flag, and a
   * partner with only the cart flag on would silently lose the fix. Widening it costs nothing: the
   * per-item token is only stamped on lines that carry seats, and a single-plan cart has the one
   * right entry in the map anyway.
   */
  protected override get shouldUseSeatingHoldTokensBySession(): boolean {
    return this.multiPlanCartEnabled;
  }

  protected override updateNonConfirmedCart(): void {
    const previousCartReference = this.nonConfirmedCart;
    const previousNonConfirmedCart =
      this.multiPlanCartEnabled && this.hasMultiplanSeatingFlowContext && this.nonConfirmedCart != null
        ? this.nonConfirmedCart.clone()
        : this.nonConfirmedCart;
    const currentPlanId = this.selectedPlan?.id ?? null;

    super.updateNonConfirmedCart();

    if (previousNonConfirmedCart == null || currentPlanId == null || this.nonConfirmedCart == null) {
      return;
    }
    if (this.nonConfirmedCart === previousCartReference) {
      return;
    }
    if (this.allowMultiTimeSlotSelection) {
      return;
    }

    this.#mergeMultiplanCart(previousNonConfirmedCart, currentPlanId);
  }

  override updateSeatsInCart(data: FreeSeatResponse): void {
    const shouldPreserveMultiPlanSessions = this.multiPlanCartEnabled && this.hasMultiplanSeatingFlowContext;
    const previousCartReference = this.nonConfirmedCart;
    const previousNonConfirmedCart =
      shouldPreserveMultiPlanSessions && this.nonConfirmedCart != null ? this.nonConfirmedCart.clone() : this.nonConfirmedCart;
    const currentPlanId = this.selectedPlan?.id ?? null;

    super.updateSeatsInCart(data);

    if (!shouldPreserveMultiPlanSessions) {
      return;
    }
    if (previousNonConfirmedCart == null || currentPlanId == null) {
      return;
    }
    if (this.allowMultiTimeSlotSelection) {
      return;
    }
    // Removing the last seat of the plan on screen empties its selection, `generateCart()` answers
    // `null` and the base assignment above takes every other plan's line down with it. Keep those
    // lines, and with them the seats they hold — B2BO-8391.
    if (this.nonConfirmedCart === null) {
      const otherPlansCart = cartWithOnlyOtherPlanSessions(previousNonConfirmedCart, currentPlanId);
      if (otherPlansCart !== null) {
        this.nonConfirmedCart = otherPlansCart;
        this.refreshCartTotal();
      }
      return;
    }
    if (this.nonConfirmedCart === previousCartReference) {
      return;
    }

    if (this.#mergeMultiplanCart(previousNonConfirmedCart, currentPlanId)) {
      // `super.updateSeatsInCart()` priced the cart before the other plans' lines were merged back
      // in, so the header would read "2 items" at one plan's price — B2BO-8391.
      this.refreshCartTotal();
    }
  }

  paymentConfigurationSignal: Signal<PaymentConfiguration | undefined> = toSignal(this.#paymentConfigStorageService.listenStorage(), {
    initialValue: this.#paymentConfigStorageService.getConfiguration(),
  });
  displayedDeviceId: Signal<string | null> = computed((): string | null => {
    return this.paymentConfigurationSignal()?.deviceId ?? null;
  });
  displayedOnsiteSetupPlace: Signal<string | null> = computed((): string | null => {
    const onsiteSetup = this.activeOnsiteSetup();
    if (!onsiteSetup) {
      return null;
    }
    return onsiteSetup?.place?.name ?? '';
  });
  hasFiscalActions: Signal<boolean> = computed(() => {
    const countryCode = this.activeOnsiteSetup()?.place?.country_iso_code_2;
    return isHungarianFiscalReceiptEnabled(this.optimizelyService, countryCode);
  });
  hasPaymentConfig: Signal<boolean> = computed(() => this.#hasPaymentConfig(this.activeOnsiteSetup()));
  hasProductCatalog: WritableSignal<boolean> = signal(false);
  hasShift: Signal<boolean> = computed(() => {
    const onsiteSetup = this.activeOnsiteSetup();
    if (!onsiteSetup) return false;
    return (onsiteSetup.shift_strategy ?? ShiftStrategyEnum.disabled) !== ShiftStrategyEnum.disabled;
  });
  isCartDetailOpened = false;
  isMobilePos: Signal<boolean> = computed(() => this.#deviceService.getDeviceType() === DeviceType.MobilePos);
  isLinkDeviceButtonVisible: Signal<boolean> = computed(() =>
    this.#isLinkDeviceButtonVisible(this.activeOnsiteSetup(), this.isMobilePos()),
  );
  isLoadingNewSearch: WritableSignal<boolean> = signal<boolean>(true);
  isSeatingMapFullscreen: WritableSignal<boolean> = signal<boolean>(false);
  readonly seatingFullscreenButtonIcon: Signal<IconProp> = computed(() =>
    this.isSeatingMapFullscreen() ? ['fas', 'eye-slash'] : ['fas', 'eye'],
  );
  multiPlanCartEnabled = false;
  isLoadingProductCatalog: WritableSignal<boolean> = signal<boolean>(false);
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isProductCatalogLoaded: WritableSignal<boolean> = signal(false);
  isCustomTabDateSelectorModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  isSearchVisible: WritableSignal<boolean> = signal(false);
  isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  isTourOpen = false;
  @ViewChild(OssCartDetailComponent) ossCartDetailComponent!: OssCartDetailComponent;
  @ViewChild('ossSearchComponent') ossSearchComponent!: OssSearchComponent;
  PaymentTypeEnum = PaymentType;
  prioritizedPlanIds: Signal<number[]> = computed(() => this.activeOnsiteSetup()?.prioritized_main_plans || []);
  customTabHasTilesData: Signal<boolean[]> = computed(() => {
    const tabSignals = this.customTabSignals();
    const result = tabSignals.map(tabSignal => {
      const tabData = tabSignal();
      return !!tabData?.tilesData;
    });
    return result;
  });
  customTabTilesData: Signal<(OssCustomTilesData | null)[]> = computed(() => {
    const tabSignals = this.customTabSignals();
    return tabSignals.map(tabSignal => {
      const tabData = tabSignal();
      return tabData?.tilesData || null;
    });
  });
  customTabHierarchyLevels: Signal<(HierarchyNavigationLevel | null)[]> = computed(() => {
    const tilesData = this.customTabTilesData();
    return tilesData.map(data => {
      if (!data) {
        return null;
      }
      const cacheKey = this.#createStructuralCacheKey(data);
      if (this.#hierarchyLevelsCache.has(cacheKey)) {
        return this.#hierarchyLevelsCache.get(cacheKey)!;
      }
      const result = this.convertCustomTabsToHierarchy(data);
      this.#hierarchyLevelsCache.set(cacheKey, result);
      return result;
    });
  });
  customTabIcons: Signal<IconProp[]> = computed(() => {
    const tabSignals = this.customTabSignals();
    return tabSignals.map(tabSignal => {
      const tabData = tabSignal();
      return tabData?.setupIcon || (['fal', 'heart'] as IconProp);
    });
  });
  customTabNames: Signal<string[]> = computed(() => {
    const tabSignals = this.customTabSignals();
    return tabSignals.map(tabSignal => {
      const tabData = tabSignal();
      return tabData?.setupName || '';
    });
  });
  // Session availability map for visual state (separate from structural cache)
  customTileSessionAvailabilityMaps: Signal<(Map<number, { isUnavailable: boolean }> | null)[]> = computed(() => {
    const tilesData = this.customTabTilesData();
    return tilesData.map(data => {
      if (!data) {
        return null;
      }
      const availabilityMap = new Map<number, { isUnavailable: boolean }>();
      data.customTiles.forEach(wrapper => {
        wrapper.customTile.sessions.forEach(session => {
          availabilityMap.set(session.id, {
            isUnavailable: session.isUnavailable || false,
          });
        });
      });
      return availabilityMap;
    });
  });
  scannedCouponCode: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  scrollToCartItem = (sessionId: number): void => {
    if (this.ossCartDetailComponent) {
      this.ossCartDetailComponent.scrollToSessionItem(sessionId);
    }
  };
  seatingProviderEnum = SeatingProviderEnum;
  showMobileDateSelector: WritableSignal<boolean> = signal(false);

  protected get mobileDateSelectorTitleKey(): string {
    return getDateSelectorTitleKey(this.sessionSelectorType, false);
  }

  @ViewChild('tourComponent') tourComponent!: IgntTourComponent;

  override updateTicketTypeFields(): void {
    if (this.activeTab().type === OssTab.CUSTOM_TABS) {
      this.ossUpdateSessionAvailabilitySummary();
      this.productTypes = this.sessionAvailabilitySummary?.getProductTypes() ?? [];
      this.#updateAvailableTabs();
      return;
    }
    const existingCustomTabTicketTypes = this.ticketTypes.filter(ticketType => {
      return this.customTabSignals().some(tabSignal => {
        const tabData = tabSignal();
        if (!tabData?.tilesData) {
          return false;
        }
        return tabData.tilesData.customTiles.some(tile => tile.customTile.sessions.some(session => session.id === ticketType.sessionId));
      });
    });
    this.ticketTypes = [];
    super.updateTicketTypeFields();
    existingCustomTabTicketTypes.forEach(ticketType => {
      if (!this.ticketTypes.some(existing => existing.sessionId === ticketType.sessionId)) {
        this.ticketTypes.push(ticketType);
      }
    });
    this.#updateAvailableTabs();
  }

  tourConfig: IgntTourConfig = {
    continueOnError: true,
    showProgress: true,
    steps: [],
    tourStorageKey: StorageKey.ossTourCompleted,
  };

  addUnitBySessionId($event: number): void {
    const sessionIsKnownInTicketOrProductTypes =
      this.ticketTypes.some(t => t.sessionId === $event) || this.productTypes.some(t => t.sessionId === $event);
    if (!sessionIsKnownInTicketOrProductTypes) {
      const productSession = this.#productSessionsSummaryService.getSessionDataBySessionId($event);
      if (productSession) {
        const previousCount = this.selectedTicketsBySessionId.get(productSession.id.toString()) ?? 0;
        this.addProductSessionToCartUsingTicketTypeCounter(productSession, true);
        this.trackPosCartItemQuantityChange({
          newCount: previousCount + 1,
          previousCount,
          sessionId: productSession.id,
          source: 'from_tile',
        });
        return;
      }
    }
    this.#tileAddSessionId = $event;
    try {
      this.addCounterSessionId.next($event);
    } finally {
      this.#tileAddSessionId = null;
    }
  }

  cartHasItems(): boolean {
    return !!(this.nonConfirmedCart && this.nonConfirmedCart.getNumberOfTicketAndProductCounts() > 0);
  }

  clearAllCart(): void {
    if (this.ossCartDetailComponent) {
      this.ossCartDetailComponent.clearAllCartItems();
    }
  }

  clearCartFromCartDetail(): void {
    if (this.ossCartDetailComponent) {
      this.ossCartDetailComponent.clearAllCartItemsWithoutConfirmation();
    } else {
      this.onClearAllConfirmed();
    }
  }

  convertCustomTabsToHierarchy(customTabData: OssCustomTilesData | null): HierarchyNavigationLevel | null {
    if (!customTabData?.customTiles) {
      return null;
    }
    let allSessions = customTabData.customTiles.flatMap(tile => tile.customTile.sessions);
    const fakeSessions: OssSessionAvailability[] = [];
    const directSessions = customTabData.customTiles
      .filter(tile => tile.customTile.targetElementType === OssTargetElementType.SESSION_TYPE)
      .reduce((sessionTilePairs: { customTile: OssCustomTile; session: OssSessionAvailability }[], tile, index) => {
        if (tile.customTile.sessions.length === 0) {
          const fakeId = -index - 1;
          const fakeSession = this.#createFakeUnavailableSession(fakeId, tile.customTile.name);
          fakeSessions.push(fakeSession);
          return [
            ...sessionTilePairs,
            {
              customTile: tile.customTile,
              session: fakeSession,
            },
          ];
        }
        return [
          ...sessionTilePairs,
          ...tile.customTile.sessions.map(session => ({
            customTile: tile.customTile,
            session,
          })),
        ];
      }, []);
    const hierarchyTilesWithConfig = customTabData.customTiles
      .filter(tile => this.#isHierarchyElementType(tile.customTile.targetElementType))
      .flatMap(tile => this.#flattenHierarchyTileToSessions(tile.customTile));
    const allSessionsWithConfig = [...directSessions, ...hierarchyTilesWithConfig];
    const hierarchySessionsTypesWithConfig = allSessionsWithConfig.filter(sessionWithConfig =>
      this.#isHierarchyElementType(sessionWithConfig.customTile.targetElementType),
    );
    const sessionsTypesWithConfig = allSessionsWithConfig.filter(
      sessionWithConfig => sessionWithConfig.customTile.targetElementType === OssTargetElementType.SESSION_TYPE,
    );
    const leafsFromFlattening: HierarchyNavigationLeafNode[] = [];
    const childrenParentNodes: HierarchyNavigationParentNode[] = hierarchySessionsTypesWithConfig.flatMap(sessionWithConfig => {
      const extraInfo = sessionWithConfig.customTile.targetElementExtraInfo as OssCustomTileExtraInfoHierarchyElement;
      const parent = this.#convertToHierarchyParent(
        extraInfo,
        sessionWithConfig.customTile.position,
        sessionWithConfig.customTile.color,
        sessionWithConfig.customTile.name,
      );

      if (sessionWithConfig.customTile.targetElementType === OssTargetElementType.PARENT_HIERARCHY_ELEMENT) {
        const { parents, promotedLeafs } = this.#applyFirstLevelFlattening(parent);
        leafsFromFlattening.push(...promotedLeafs);
        return parents;
      }
      return [parent];
    });
    const leafs: HierarchyNavigationLeafNode[] = [
      ...sessionsTypesWithConfig.map(sessionWithConfig => ({
        customColor: sessionWithConfig.customTile.color,
        customName: sessionWithConfig.customTile.name,
        order: sessionWithConfig.customTile.position,
        sessionId: sessionWithConfig.session.id.toString(),
      })),
      ...leafsFromFlattening,
    ];
    allSessions = [...allSessions, ...fakeSessions];
    const result: HierarchyNavigationLevel = {
      leafNodes: leafs,
      name: 'Custom Tabs',
      parentNodes: childrenParentNodes,
      sessions: allSessions,
    };
    return result;
  }

  get currentNumberOfTickets(): number {
    return this.nonConfirmedCart?.getNumberOfTicketAndProductCounts() ?? 0;
  }

  get currentPartner(): { countryCode: string; name: string } | null {
    return this.#partnerService.getPartner();
  }

  get dateSelectorTicketTypes(): Map<string, number> {
    if (this.#isActiveTabDateDependant()) {
      return new Map();
    }
    return new FilterProductSessionsPipe().transform(this.selectedTicketsBySessionType, this.productSessions);
  }

  getCustomTabData(tabIndex: number): OssCustomTabData | null {
    const tabSignals = this.customTabSignals();
    return tabSignals[tabIndex]?.() || null;
  }

  getCustomTabSetupIndexForTab(availableTabIndex: number): number {
    let customTabIndex = 1;
    for (let i = 0; i < availableTabIndex; i++) {
      if (this.availableTabs()[i] === OssTab.CUSTOM_TABS) {
        customTabIndex++;
      }
    }
    return customTabIndex;
  }

  handleCouponModalClosed(): void {
    if (!this.#hasModalCouponCodeOpened) {
      return;
    }

    this.trackPromoCodeModalClosed();
    this.#hasModalCouponCodeOpened = false;
    this.resetPromoCodeModalSession();
    this.scannedCouponCode.next(null);
  }

  isTourCompleted(): boolean {
    return this.#tourService.isTourCompleted(this.tourConfig.tourStorageKey);
  }

  @ViewChild('manageOrderTourTemplate') set manageOrderTourTemplate(template: TemplateRef<unknown>) {
    this.#manageOrderTourTemplate = template;
  }

  modalCouponCodeOpened(): void {
    this.#hasModalCouponCodeOpened = true;
    this.resetPromoCodeModalSession();
  }

  ngOnDestroy(): void {
    this.clearReservationSettlementSession();
    this.#syncSecondScreenSeatingMapVisibility(false);
    this.#toggleFooter(true);
    this.#toggleSidebar(false);
    this.#onsiteSetupModalShown = false;
    this.#planSelectionModalShown = false;
    this.#cleanupActiveEffects();
    this.#clearTourResetTimeout();
    this.#headerStateService.clearHeaderActions();
    this.#headerStateService.clearFeatureMenuItems();
    this.#headerStateService.clearCenterContent();
  }

  ngOnInit(): void {
    this.multiPlanCartEnabled =
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.BOX_OFFICE_MULTIPLAN_CART,
        team: 'b2b-shops',
      }) ?? false;
    this.#hideFooterAndSidebar();
    this.#initializeFeatureMenuItems();
    this.#initializeHeaderActions();
    this.#initializeScannerService();
    this.#initializeSessionAvailableEvent();
    this.#setupTimeslotActivationListener();
    this.#initializeHeaderCenterContent();
    this.#syncSecondScreenSeatingMapVisibility(false);
    this.#loadOnsiteSetup();
    this.#watchSetupSelectorAutoOpen();
    this.#watchPlanPlaceSelectorAutoOpen();
    this.#initializeProductsCatalogStream();
    effect(
      () => {
        if (this.activeOnsiteSetup() && !this.#areEffectsInitialized) {
          this.#areEffectsInitialized = true;
          // Use queueMicrotask to schedule effect creations outside the reactive context
          // This prevents NG0602 error: "effect() cannot be called from within a reactive context"
          queueMicrotask(() => {
            this.#initializeAvailablePlans();
            this.#initializeCustomTabsData();
            this.#initializeCustomTilesTicketTypesEffect();
            this.#initializeSearchByNewPlanEffect();
            this.#initializeQueryParamsEffect();
            super.ngOnInit();
            this.#showOrderModificationBannerIfNeeded();
            this.startReservationSettlementIfNeeded();
          });
        }
      },
      { injector: this.#injector },
    );
  }

  onClearAllConfirmed(): void {
    this.#trackCartCleared('button');
    this.seatingSelectorRef?.clearSelection();

    this.selectedTicketsBySessionId = new Map<string, number>();
    this.selectedTicketsBySessionType = new Map<string, number>();
    this.selectedTicketsSeatsBySessionId = new Map();
    this.seatingHoldTokensBySessionId = new Map();

    this.newSelectTicketCounter(
      {
        bySessionId: new Map<string, number>(),
        bySessionType: new Map<string, number>(),
      },
      true,
    );

    this.#checkAndCloseCartIfEmpty();
  }

  onCloseSearch(): void {
    this.isSearchVisible.set(false);
  }

  onLinkDeviceButtonClick(): void {
    const onsiteSetup = this.activeOnsiteSetup();
    if (this.#hasSquarePaymentConfig(onsiteSetup)) {
      this.#openSquareConnectionModal();
    } else {
      this.openLinkedDeviceModal();
    }
  }

  onModifiedOrderModalClosed(): void {
    this.modifiedOrderModalOpen.set(false);
  }

  onOnSiteSetupTitleClick(): void {
    this.#clearTourResetTimeout();
    this.#tourResetClickCount++;
    if (this.#tourResetClickCount === OneStopShopComponent.tourResetClickThreshold) {
      this.#tourResetClickCount = 0;
      this.#tourService.resetTourCompletion(StorageKey.ossTourCompleted);
      this.startTourModal();
    } else {
      this.#tourResetClickTimeout = setTimeout(() => {
        this.#tourResetClickCount = 0;
        this.#tourResetClickTimeout = null;
      }, OneStopShopComponent.tourResetTimeoutMs);
    }
  }

  onOnsiteSetupSelectedFromSlider(result: OSSOnsiteSetupConfig | undefined): void {
    this.#onsiteSetupModalShown = false;
    if (result) {
      this.#handleSetupSelected(result);
      return;
    }
    this.onsiteSetupStore.markSelectionDismissed();
  }

  onPlanSelectedFromSlider(config: OSSPlanConfig | undefined): void {
    this.#planSelectionModalShown = false;
    if (config) {
      this.#handlePlanSelected(config);
      return;
    }
    this.#planSelectionStore.markSelectionDismissed();
  }

  onSessionSelected(session: ProductSession): void {
    const previousCount = this.selectedTicketsBySessionId.get(session.id.toString()) ?? 0;
    this.addProductSessionToCartUsingTicketTypeCounter(session, true);
    this.trackPosCartItemQuantityChange({ newCount: previousCount + 1, previousCount, sessionId: session.id, source: 'from_search' });
    if (!(this.isMobile() || this.isTablet())) {
      this.scrollToCartItem(session.id);
    }
  }

  onShowSearch(event: { buttonRect: DOMRect }): void {
    this.#openSearch();
    setTimeout(() => {
      if (this.ossSearchComponent) {
        this.ossSearchComponent.show(event.buttonRect);
      }
    }, 0);
  }

  onTimeslotActivatedFromCart(payload: TimeslotActivationFromCartPayload): void {
    this.#activateTimeslot$.next(payload);
  }

  onTourComplete(): void {
    this.isTourOpen = false;
  }

  openCodeSelectionSlider(): void {
    this.modalCouponCodeOpened();
  }

  openLinkedDeviceModal(): void {
    if (!this.hasPaymentConfig()) {
      return;
    }
    const modalRef = this.#modalService.open(OssLinkedDeviceModalComponent, {
      backdrop: 'static',
      injector: this.#injector,
      keyboard: false,
      modalDialogClass: 'oss-linked-device-modal',
      size: 'md',
    });
    const paymentConfiguration = this.#buildPaymentConfiguration();
    modalRef.componentInstance.paymentConfiguration = paymentConfiguration;
    modalRef.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: string | undefined) => {
      if (paymentConfiguration && result !== undefined) {
        const newConfig = paymentConfiguration.clone();
        newConfig.deviceId = this.#getDeviceIdFromConfiguration(paymentConfiguration, result);
        this.#paymentConfigStorageService.setConfiguration(newConfig);

        const partnerId = this.#partnerService.getPartner()?.id;
        const onsiteSetupId = this.activeOnsiteSetup()?.id;

        if (paymentConfiguration.payhereConfiguration && (partnerId == null || !onsiteSetupId)) {
          this.#pendingPaymentType = null;
          this.#skipModifyOrderPayWarningOnce = false;
          return;
        }

        const pairing$ =
          paymentConfiguration.payhereConfiguration && partnerId != null && !!onsiteSetupId
            ? this.#paymentService.pairPayHere(partnerId, result, result, onsiteSetupId)
            : of(true);

        pairing$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
          error: () => {
            this.#pendingPaymentType = null;
            this.#skipModifyOrderPayWarningOnce = false;
          },
          next: () => {
            if (this.#pendingPaymentType) {
              const paymentTypeToRetry = this.#pendingPaymentType;
              this.#pendingPaymentType = null;
              this.clickOnPayOneStep(paymentTypeToRetry);
            }
          },
        });
      } else {
        this.#pendingPaymentType = null;
        this.#skipModifyOrderPayWarningOnce = false;
      }
    });
  }

  selectNewDate() {
    if (this.isReservationSettlementMode()) {
      return;
    }
    this.#showCustomTabDateSelectorModal(true);
  }

  selectNewPlan(): void {
    this.selectPlan();
  }

  selectOnsiteSetup(): void {
    this.onsiteSetupStore.clearSelectionDismissed();
    this.onsiteSetupStore.ensureSummaryLoaded();
    this.#openSetupSelector(true);
  }

  navigateToBoxOfficeSettings(): void {
    this.#router.navigate(['/box-office/settings']);
  }

  selectPlan(): void {
    if (this.isModifyOrderMode() || this.isReservationSettlementMode()) {
      return;
    }
    this.#planSelectionStore.clearSelectionDismissed();
    if (!this.#planSelectionStore.shouldShowPlanPlaceSelector()) {
      return;
    }
    this.#showPlanSelectionModal();
  }

  navigateToCreateEvent(): void {
    this.#createEventEntryService.handleHeaderCreateEvent();
  }

  selectTab(tabIndex: number): void {
    const currentTab = this.activeTab();
    const previousTab = currentTab.type;
    const selectedTab = this.availableTabs()[tabIndex];
    if (currentTab.tabIndex !== tabIndex) {
      this.#trackTabSwitched(currentTab.tabIndex, tabIndex);
    }
    this.activeTab.set({ tabIndex, type: selectedTab });
    if (selectedTab === OssTab.CUSTOM_TABS) {
      this.activeCustomTabIndex.set(this.translateTabIndexToCustomTabsIndex(tabIndex));
    } else if (selectedTab === OssTab.TICKETS_AND_ADDONS && previousTab === OssTab.CUSTOM_TABS) {
      this.updateTicketTypeFields();
    }
  }

  #getTabTrackingName(tabIndex: number): string {
    const tabType = this.availableTabs()[tabIndex];
    if (tabType === OssTab.CUSTOM_TABS) {
      return this.customTabNames()[this.translateTabIndexToCustomTabsIndex(tabIndex)] ?? tabType;
    }
    return tabType;
  }

  showModifiedOrderModal(): void {
    if (!this.modifiedOrder()) {
      return;
    }
    this.modifiedOrderModalOpen.set(true);
  }

  startTourModal(): void {
    if (this.isMobile() || this.isTablet()) {
      return;
    }
    this.#confirmationDialogService
      .confirm({
        acceptLabel: this.#translateService.instant('oneStopShop.tour.startModal.startButton'),
        cancelLabel: this.#translateService.instant('oneStopShop.tour.startModal.skipButton'),
        customStyle: true,
        isDanger: false,
        message: this.#translateService.instant('oneStopShop.tour.startModal.message'),
        title: this.#translateService.instant('oneStopShop.tour.startModal.title'),
      })
      .subscribe(confirmed => {
        if (confirmed) {
          this.isTourOpen = true;
          this.tourComponent.startTour();
        } else {
          this.#datadogLogService.logWarn('[IgntTour] Tour skipped by user', {
            totalSteps: this.tourConfig.steps.length,
            tourKey: this.tourConfig.tourStorageKey,
          });
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('uiTour.skipWarning'),
            sentiment: AlertSentiment.info,
          });
          this.#tourService.markTourAsCompleted(this.tourConfig.tourStorageKey);
        }
      });
  }

  toggleSecondScreenSeatingMapVisibility(): void {
    const isVisible = !this.isSeatingMapFullscreen();
    if (isVisible) {
      this.syncHighlightedSeatsStorageForSecondScreen();
    }
    this.#syncSecondScreenSeatingMapVisibility(isVisible);
  }

  translateTabIndexToCustomTabsIndex(index: number): number {
    const tabs = this.availableTabs();
    const firstCustomTabIndex = tabs.indexOf(OssTab.CUSTOM_TABS);
    if (firstCustomTabIndex === -1) {
      return 0;
    }
    return index - firstCustomTabIndex;
  }

  /**
   * Made into a public method for unit testing purposes.
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
    const activePlan = this.activePlan();
    if (activePlan) {
      if (activePlan.id) queryParams['planId'] = activePlan.id.toString();
    }
    if (Object.keys(queryParams).length == 0) {
      return;
    }
    this.#router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  updateSessionIdCounter($event: UpdateTicketTypeCounter) {
    this.exitModifyOrderPaymentIfActive();
    this.updateTicketTypeCounter.next($event);
    const sessionIdAsString = $event.sessionId.toString();
    const previousCount = this.selectedTicketsBySessionId.get($event.sessionId.toString()) ?? 0;
    const source: PosCartSource = this.#tileAddSessionId === $event.sessionId ? 'from_tile' : 'from_cart';

    if ($event.newCounter === 0) {
      this.trackPosCartItemQuantityChange({ newCount: 0, previousCount, sessionId: $event.sessionId, source });
      this.#handleCartSessionUpdate($event);
      if (!this.selectedTicketsBySessionId.has(sessionIdAsString)) {
        this.#releaseCartLineSeatingSelection($event.sessionId);
      }
      this.#checkAndCloseCartIfEmpty();
      this.updateCapacityLimit();
      this.updateOboSecondScreenCart();
      return;
    }

    const productType = this.productTypes.find(product => product.sessionId === $event.sessionId);
    if (productType) {
      const ticketTypeCounter = {
        bySessionId: new Map(this.selectedTicketsBySessionId),
        bySessionType: new Map(this.selectedTicketsBySessionType),
      };
      ticketTypeCounter.bySessionId.set($event.sessionId.toString(), $event.newCounter);
      ticketTypeCounter.bySessionType.set(productType.name, $event.newCounter);
      this.newSelectTicketCounter(ticketTypeCounter, true, true);
      this.trackPosCartItemQuantityChange({ newCount: $event.newCounter, previousCount, sessionId: $event.sessionId, source });
    } else {
      this.trackPosCartItemQuantityChange({ newCount: $event.newCounter, previousCount, sessionId: $event.sessionId, source });
      this.#handleCartSessionUpdate($event);
      this.updateCapacityLimit();
      this.updateOboSecondScreenCart();
    }
    this.#checkAndCloseCartIfEmpty();
  }

  get userName(): string | null {
    return this.#authenticationService.getUserName();
  }

  #activatePendingTimeslot(datetime: string): void {
    const sessionSummary = this.regularSessionAvailabilitySummaryByDateList.find(summary =>
      summary.sessionAvailabilityByDatetimeList.some(avail => this.#isMatchingDatetime(avail, datetime)),
    );
    if (sessionSummary) {
      const matchingDatetime = sessionSummary.sessionAvailabilityByDatetimeList.find(avail => this.#isMatchingDatetime(avail, datetime));
      if (matchingDatetime) {
        this.#restoreTicketCountsFromCart(datetime);
        sessionSummary.selectedDatetime = matchingDatetime;
        this.selectSession(sessionSummary);
      }
    }
  }

  #canActivateCartTimeslotWithoutRefetch(payload: TimeslotActivationFromCartPayload, shouldApplyPlanConfig: boolean): boolean {
    if (shouldApplyPlanConfig) {
      return false;
    }

    const selectedCalendarDate = this.selectedDateAvailability?.date;
    if (selectedCalendarDate === undefined) {
      return false;
    }

    const targetCalendarDate = moment(payload.datetime).tz(this.timezone).format('YYYY-MM-DD');
    if (selectedCalendarDate !== targetCalendarDate) {
      return false;
    }

    return this.regularSessionAvailabilitySummaryByDateList.some(summary =>
      summary.sessionAvailabilityByDatetimeList.some(avail => this.#isMatchingDatetime(avail, payload.datetime)),
    );
  }

  #applyFirstLevelFlattening(parent: HierarchyNavigationParentNode): {
    parents: HierarchyNavigationParentNode[];
    promotedLeafs: HierarchyNavigationLeafNode[];
  } {
    const parents: HierarchyNavigationParentNode[] = [];
    const promotedLeafs: HierarchyNavigationLeafNode[] = [];
    parent.childrenParentNodes.forEach(childParent => {
      // Children parent node with no children parent nodes and only one child leaf gets replaced by its child leaf.
      if (childParent.childrenParentNodes.length === 0 && childParent.childrenLeafNodes.length === 1) {
        promotedLeafs.push(childParent.childrenLeafNodes[0]);
        return;
      }
      parents.push(childParent);
    });
    promotedLeafs.push(...parent.childrenLeafNodes);
    return { parents, promotedLeafs };
  }

  #applyModifyOrderTimeSlotPreselection(): void {
    const orderTimeSlotStartsAt = this.#getModifyOrderFirstSessionStartsAt();
    if (!orderTimeSlotStartsAt) {
      this.#isModifyOrderTimeSlotApplied = true;
      return;
    }
    const list = this.regularSessionAvailabilitySummaryByDateList ?? [];
    if (list.length === 0) {
      this.#isModifyOrderTimeSlotApplied = true;
      return;
    }
    const orderTimestamp = new Date(orderTimeSlotStartsAt).getTime();
    const session = this.findSessionAndApplySelectionForTimestamp(orderTimestamp, orderTimeSlotStartsAt);
    if (session) {
      this.#isModifyOrderTimeSlotApplied = true;
      this.selectSession(session);
      return;
    }
    this.#isModifyOrderTimeSlotApplied = true;
    const formattedOrderSessionDate = this.#formatDatetime(orderTimeSlotStartsAt);
    this.#showModifyOrderValidationModal({
      alertTitleKey: 'boxOffice.orderModificationSessionNotFound.warningTitle',
      interpolationParams: { date: formattedOrderSessionDate },
      messageKey: 'boxOffice.orderModificationSessionNotFound.message',
      titleKey: 'boxOffice.orderModificationSessionNotFound.modalTitle',
    });
    if (this.filters) {
      this.loadNewSearch(this.filters);
    }
  }

  #applyRestoredPlanConfig(planConfig: OSSPlanConfig): void {
    this.activeOssPlanConfig.set(planConfig);
    this.#savePlanToCurrentConfig(planConfig);

    const activePlanId = this.activePlan()?.id;
    const restoredPlanId = Number(planConfig.id);
    if (activePlanId !== restoredPlanId) {
      this.#updatePlanSelected(restoredPlanId);
    }
  }

  #autoFillCouponFromScanner(code: string): void {
    this.scannedCouponCode.next(code);
  }

  #buildPaymentConfiguration(): PaymentConfiguration {
    const storedDeviceId = this.#paymentConfigStorageService.getConfiguration()?.deviceId;
    return this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(this.activeOnsiteSetup(), storedDeviceId);
  }

  #buildTourSteps(): IgntTourStep[] {
    const steps: IgntTourStep[] = [
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'tabsSelection', 'bottom'),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'tileSelection', 'bottom'),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'dateAndTimeSelector', 'right'),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'selectPlanPlace', 'bottom'),
      this.#createManageYourOrderTourStep(),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'setupSelection', 'left'),
    ];
    if (this.hasProductCatalog()) {
      steps.splice(4, 0, this.#tourService.createTourStep('oneStopShop.tour.steps', 'search', 'bottom'));
    }
    if (this.isLinkDeviceButtonVisible()) {
      steps.push(this.#tourService.createTourStep('oneStopShop.tour.steps', 'adyenDeviceSelection', 'left'));
    }
    if (this.hasShift()) {
      steps.splice(5, 0, this.#tourService.createTourStep('oneStopShop.tour.steps', 'shift', 'bottom'));
    }
    return steps;
  }

  #cartDatetimeMatchesCalendarDate(cartDatetime: string, calendarDate: string): boolean {
    return moment(cartDatetime).tz(this.timezone).format('YYYY-MM-DD') === calendarDate;
  }

  /**
   * Snapshots the current seating selection before a date/timeslot change clears it. The seat
   * references, the hold tokens and the map's release calls are the only way back to the provider once
   * the local maps are wiped, so they must all be taken while they still exist.
   */
  #captureSeatingSelectionSnapshot(): OssSeatingSelectionSnapshot | null {
    if (!this.manageAsFreeSeatingMap) {
      return null;
    }
    const seatReferencesBySessionId = new Map<string, string[]>();
    this.selectedTicketsSeatsBySessionId.forEach((seatInfos, sessionId) => {
      const seatReferences = seatInfos.map(seat => seat.seatReference).filter((reference): reference is string => Boolean(reference));
      if (seatReferences.length > 0) {
        seatReferencesBySessionId.set(sessionId, seatReferences);
      }
    });
    if (seatReferencesBySessionId.size === 0) {
      return null;
    }
    const seatingSelector = this.seatingSelectorRef;
    return {
      expireHoldToken: seatingSelector ? (): void => seatingSelector.clearSelection({ expireHoldToken: true }) : null,
      holdTokensBySessionId: new Map(this.seatingHoldTokensBySessionId),
      releaseSeatsByReference: seatingSelector ? (references: string[]): void => seatingSelector.releaseSeatsByReference(references) : null,
      seatReferencesBySessionId,
      state: this.seatingMapState,
    };
  }

  #checkAndCloseCartIfEmpty(): void {
    if (!this.cartHasItems() && this.isCartDetailOpened) {
      this.isCartDetailOpened = false;
    }
  }

  #checkAndShowTourModal(): void {
    if (this.isMobile() || this.isTablet()) {
      return;
    }
    const steps = this.#buildTourSteps();
    this.tourConfig = { ...this.tourConfig, steps: steps };
    this.#tourService.setSteps(steps);
    if (!this.#tourService.isTourCompleted(this.tourConfig.tourStorageKey)) {
      setTimeout(() => {
        this.startTourModal();
      }, 1000);
    }
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
    this.customTabSignals().forEach(tabSignal => {
      const tabData = tabSignal();
      if (tabData?.tilesData) {
        tabData.tilesData.customTiles.forEach(tile => {
          tile.customTile.sessions.forEach(session => {
            allCustomTileSessionIds.add(session.id);
          });
        });
      }
    });
    this.ticketTypes = this.ticketTypes.filter(
      ticketType => ticketType.sessionId !== undefined && !allCustomTileSessionIds.has(ticketType.sessionId),
    );
    this.#updateAvailableTabs();
  }

  #clearStoredPlanAndOpenSelector(): void {
    const currentConfig = this.#ossConfigStorageService.getConfiguration();
    if (currentConfig !== null) {
      this.#ossConfigStorageService.setConfiguration({
        ...currentConfig,
        plan: undefined,
      });
    }
    this.activeOssPlanConfig.set(null);
    this.activePlan.set(null);
    this.plan = null;
    this.clearMembershipsMember();
    this.#planSelectionStore.clearSelectionDismissed();
    this.#openPlanPlaceSelector();
  }

  #clearTourResetTimeout(): void {
    if (this.#tourResetClickTimeout) {
      clearTimeout(this.#tourResetClickTimeout);
      this.#tourResetClickTimeout = null;
    }
  }

  #compareCartTimeslotsForDefaultSession(a: string, b: string, calendarDate: string, preferredCartDatetime: string | null): number {
    const onSelectedDay = (dt: string): number => (this.#cartDatetimeMatchesCalendarDate(dt, calendarDate) ? 0 : 1);
    const dayRank = onSelectedDay(a) - onSelectedDay(b);
    if (dayRank !== 0) {
      return dayRank;
    }
    if (preferredCartDatetime !== null) {
      const preferredFirst = (dt: string): number => (this.#normalizeOssDatetime(dt) === preferredCartDatetime ? 0 : 1);
      const prefRank = preferredFirst(a) - preferredFirst(b);
      if (prefRank !== 0) {
        return prefRank;
      }
    }
    return a.localeCompare(b);
  }

  #convertCategoryToParentNode(category: OssHierarchyCategory, order: number = 1): HierarchyNavigationParentNode {
    const parentNodes: HierarchyNavigationParentNode[] = [];
    const leafNodes: HierarchyNavigationLeafNode[] = [];
    if (category.children) {
      category.children.forEach(child => {
        parentNodes.push(this.#convertCategoryToParentNode(child));
      });
    }
    if (category.products) {
      category.products.forEach(product => {
        parentNodes.push(this.#convertProductToParentNode(product));
      });
    }
    if (category.productVariations) {
      category.productVariations.forEach(variation => {
        leafNodes.push({
          order,
          sessionId: variation.sessionId,
        });
      });
    }
    return {
      childrenLeafNodes: leafNodes,
      childrenParentNodes: parentNodes,
      name: category.name,
      order,
    };
  }

  #convertProductToParentNode(product: OssHierarchyProduct, order: number = 1): HierarchyNavigationParentNode {
    const leafs: HierarchyNavigationLeafNode[] = product.productVariations.map(variation => ({
      order,
      sessionId: variation.sessionId,
    }));
    return {
      childrenLeafNodes: leafs,
      childrenParentNodes: [],
      name: product.name,
      order,
    };
  }

  #convertToHierarchyParent(
    extraInfo: OssCustomTileExtraInfoHierarchyElement,
    order: number = 1,
    customColor?: string | null,
    customName?: string | null,
  ): HierarchyNavigationParentNode {
    const parentNodes: HierarchyNavigationParentNode[] = [];
    const leafNodes: HierarchyNavigationLeafNode[] = [];
    if (extraInfo.children) {
      extraInfo.children.forEach(child => {
        parentNodes.push(this.#convertCategoryToParentNode(child));
      });
    }
    if (extraInfo.products) {
      extraInfo.products.forEach(product => {
        parentNodes.push(this.#convertProductToParentNode(product));
      });
    }
    if (extraInfo.productVariations) {
      extraInfo.productVariations.forEach(variation => {
        leafNodes.push({
          order,
          sessionId: variation.sessionId,
        });
      });
    }
    return {
      childrenLeafNodes: leafNodes,
      childrenParentNodes: parentNodes,
      customColor,
      customName,
      name: customName || extraInfo.name,
      order,
    };
  }

  #createFakeUnavailableSession(fakeId: number, name?: string | null): OssSessionAvailability {
    const currentDate = new Date().toISOString();
    const fakeSession = new OssSessionAvailability(
      fakeId,
      name || 'Unavailable',
      currentDate,
      currentDate,
      new Money(0, 'EUR'),
      false,
      1,
      0,
      0,
      currentDate,
      currentDate,
      false,
    );
    fakeSession.isUnavailable = true;
    return fakeSession;
  }

  #createManageYourOrderTourStep(): IgntTourStep {
    const translationsPath = 'oneStopShop.tour.steps.manageYourOrder';

    const step: IgntTourStep = {
      content: this.#translateService.instant(`${translationsPath}.content`),
      position: 'left',
      stepIdentifier: 'manageYourOrder',
      title: this.#translateService.instant(`${translationsPath}.title`),
    };

    if (this.allowMultiTimeSlotSelection && this.#manageOrderTourTemplate) {
      step.contentTemplate = this.#manageOrderTourTemplate;
    }

    return step;
  }

  #createStructuralCacheKey(data: OssCustomTilesData): string {
    // Create a stable cache key based on the structural data, ignoring session availability state
    const structuralData = {
      customTiles: data.customTiles.map(tile => ({
        customTile: {
          color: tile.customTile.color,
          name: tile.customTile.name,
          position: tile.customTile.position,
          // Include only session structure, not availability state
          sessions: tile.customTile.sessions.map(session => ({
            id: session.id,
            maximumTicketsAllowedPerBooking: session.maximumTicketsAllowedPerBooking,
            // Exclude isUnavailable and other mutable availability fields
            minimumTicketsAllowedPerBooking: session.minimumTicketsAllowedPerBooking,
            name: session.name,
          })),
          targetElementExtraInfo: tile.customTile.targetElementExtraInfo,
          targetElementType: tile.customTile.targetElementType,
        },
      })),
    };
    return JSON.stringify(structuralData);
  }

  #defaultDatetimeForOboDateSelector(summary: RegularSessionAvailabilitySummaryByDate): SessionAvailabilitySummaryByDatetime | null {
    const noCounters = new Map<string, number>();
    const maxField = this.maxLimitTicketField;
    const allowMulti = this.allowMultiTimeSlotSelection;
    const isAvailable = (session: SessionAvailabilitySummaryByDatetime) => session.isAvailable(noCounters, maxField, 0, allowMulti);
    const first = (sessions: SessionAvailabilitySummaryByDatetime[]) => sessions.find(isAvailable) ?? null;

    if (this.preselectNextUpcomingSession) {
      const nextUpcoming = pickNextUpcomingSession(
        [...summary.morningSessions, ...summary.afternoonSessions, ...summary.eveningSessions, ...summary.nightSessions].filter(
          isAvailable,
        ),
      );
      if (nextUpcoming !== null) {
        return nextUpcoming;
      }
    }

    return (
      first(summary.morningSessions) ?? first(summary.afternoonSessions) ?? first(summary.eveningSessions) ?? first(summary.nightSessions)
    );
  }

  #displaySetupSelector(withCloseButtonOnModal: boolean, preselection?: { onsiteSetupId?: string; venueId?: string }): void {
    if (this.isMobile() || this.isTablet()) {
      this.#headerStateService.closeMenu();
    }
    this.#showOnsiteSetupModal(withCloseButtonOnModal, preselection);
  }

  #ensureActiveTabIsValid(availableTabs: OssTab[]): void {
    const currentActiveTab = this.activeTab();
    const isCurrentTabStillAvailable = availableTabs.includes(currentActiveTab.type);
    if (!isCurrentTabStillAvailable) {
      this.activeTab.set({ tabIndex: 0, type: availableTabs[0] });
      return;
    }

    const expectedIndex = availableTabs.indexOf(currentActiveTab.type);
    if (expectedIndex !== -1 && currentActiveTab.tabIndex !== expectedIndex) {
      this.activeTab.set({ tabIndex: expectedIndex, type: currentActiveTab.type });
    }
  }

  #ensureSelectedSessionForCalendarWithMultiTimeslotCart(): void {
    if (
      !this.allowMultiTimeSlotSelection ||
      this.selectedSession !== null ||
      this.selectedTicketsBySessionType.size === 0 ||
      this.regularSessionAvailabilitySummaryByDateList.length === 0
    ) {
      return;
    }

    const calendarDate = this.selectedDateAvailability?.date;
    const sessionSummaryForDate =
      calendarDate !== undefined
        ? (this.regularSessionAvailabilitySummaryByDateList.find(summary => summary.date === calendarDate) ?? null)
        : null;
    const summary = sessionSummaryForDate ?? this.regularSessionAvailabilitySummaryByDateList[0];
    if (summary.sessionAvailabilityByDatetimeList.length === 0) {
      return;
    }

    const preferredDatetime = this.#defaultDatetimeForOboDateSelector(summary);
    summary.selectedDatetime = preferredDatetime;
    if (preferredDatetime === null) {
      summary.selectNextAvailableDatetime(new Map<string, number>(), this.maxLimitTicketField, {
        preferNextUpcoming: this.preselectNextUpcomingSession,
        skipCapacityValidation: this.allowMultiTimeSlotSelection,
      });
    }
    if (summary.selectedDatetime === null) {
      return;
    }
    this.selectSession(summary);
  }

  #extractOrderIdFromSearchResponse(orders: { id?: number }[]): string {
    if (orders.length !== 1 || orders[0].id === undefined || orders[0].id === null) {
      return '';
    }
    return String(orders[0].id);
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
    return this.#purchaseService.getOrder(partnerId, orderIdNum).pipe(
      map(response => (response?.data != null && response.error == null ? response.data : null)),
      catchError(() => of(null)),
    );
  }

  #flattenHierarchyTileToSessions(customTile: OssCustomTile): OssSessionWithCustomTile[] {
    const extraInfo = customTile.targetElementExtraInfo as OssCustomTileExtraInfoHierarchyElement;
    if (!extraInfo) {
      return [];
    }
    // Case 1: Single product variation directly (without products or children) → create session tile
    if (extraInfo.productVariations?.length === 1 && !extraInfo.products?.length && !extraInfo.children?.length) {
      const productVariation = extraInfo.productVariations[0];
      if (productVariation?.sessionId) {
        const sessionIdToMatch = Number(productVariation.sessionId);
        const session = customTile.sessions.find((s: OssSessionAvailability) => Number(s.id) === sessionIdToMatch);
        if (session) {
          return [
            {
              customTile: {
                ...customTile,
                name: customTile.name || session.getDisplayName(false) || '',
                targetElementType: OssTargetElementType.SESSION_TYPE,
              },
              session,
            },
          ];
        }
      }
    }
    // Case 2: Product with same name as category → create product tile
    if (extraInfo.products?.length === 1 && extraInfo.name === extraInfo.products[0].name) {
      const product = extraInfo.products[0];
      return [
        {
          customTile: {
            ...customTile,
            name: customTile.name || product.name,
            targetElementExtraInfo: {
              name: product.name,
              placeCityTimezone: extraInfo.placeCityTimezone,
              productVariations: product.productVariations,
            },
          },
          session: null as unknown as OssSessionAvailability,
        },
      ];
    }
    // Default case: Keep original hierarchy tile
    return [
      {
        customTile,
        session: null as unknown as OssSessionAvailability,
      },
    ];
  }

  #formatDatetime(datetime: string | null): string {
    if (!datetime) {
      return '';
    }
    return moment(datetime).tz(this.timezone).locale(this.locale).format('MMM D, YYYY - h:mmA');
  }

  #getCartTimeslotsWithItems(): string[] {
    const cartDatetimes = this.nonConfirmedCart?.sessionItemsByDatetime;
    if (!cartDatetimes?.size) {
      return [];
    }

    return [...cartDatetimes.keys()].filter(key => {
      if (key === 'products') return false;
      const sessions = cartDatetimes.get(key);
      return sessions && sessions.length > 0;
    });
  }

  #getDeviceId(deviceIds: string[], deviceSelected: string): string | undefined {
    return deviceIds.find(deviceId => deviceId === deviceSelected);
  }

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

  #getMismatchedCartTimeslot(): string | null {
    if (!this.allowMultiTimeSlotSelection || !this.currentSelectedDatetime) {
      return null;
    }

    const cartTimeslots = this.#getCartTimeslotsWithItems();
    if (cartTimeslots.length === 0) {
      return null;
    }

    const currentTimeslotHasItems = cartTimeslots.includes(this.currentSelectedDatetime);
    return currentTimeslotHasItems ? null : cartTimeslots[0];
  }

  #getModifyOrderFirstSessionStartsAt(): string | null {
    const order = this.modifiedOrder();
    if (!order?.accessTickets?.size) {
      return null;
    }
    const firstTicket = Array.from(order.accessTickets.values())[0];
    return firstTicket?.sessionStartsAt ?? null;
  }

  #getModifyOrderInitialDate(): Date | null {
    const sessionStartsAt = this.#getModifyOrderFirstSessionStartsAt();
    if (!sessionStartsAt) {
      return null;
    }
    const m = moment.tz(sessionStartsAt, this.timezone);
    return new Date(Date.UTC(m.year(), m.month(), m.date()));
  }

  #getOnsiteSetupConfigFromOpenedShift(): Observable<OSSOnsiteSetupConfig | null> {
    return this.#userShiftService.getOpenedShift().pipe(
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

  #getOnsiteSetupConfigFromStorage(): OSSOnsiteSetupConfig | null {
    return this.#ossConfigStorageService.getConfiguration()?.onsiteSetup || null;
  }

  #getOnsiteSetupParamsFromUrl() {
    const params = this.#activatedRoute.snapshot.queryParams;
    return {
      cityId: params['cityId'],
      onsiteSetupId: params['onsiteSetupId'],
      venueId: params['venueId'],
    };
  }

  #getOrderForModificationFlow(orderId: string): Observable<Order | null> {
    if (this.#isModifyOrderEntry()) {
      return this.#fetchOrderById(orderId);
    }
    const state = history.state as { order?: Order } | undefined;
    if (state?.order != null) {
      return of(state.order);
    }
    return this.#fetchOrderById(orderId);
  }

  #getOssPlanConfigFromPlan(plan: Plan, preferredPlaceId?: number): OSSPlanConfig | null {
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

  #getQuickTilesByDateTime(datetime: string): void {
    // Update all tab signals with new datetime and reset loading state
    this.customTabSignals().forEach(tabSignal => {
      const currentTabData = tabSignal();
      if (currentTabData) {
        tabSignal.set({
          ...currentTabData,
          datetimeSelected: datetime,
          isLoading: true,
          tilesData: null as OssCustomTilesData | null,
        });
      }
    });
    this.#loadAllCustomTabsData();
  }

  /**
   * Sessions that still hold seats after a selection change: the live selection plus every cart line
   * with seats. A session listed here must keep its provider hold.
   */
  #getSessionIdsHoldingSeats(): Set<string> {
    const sessionIds = new Set<string>();
    this.selectedTicketsSeatsBySessionId.forEach((seatInfos, sessionId) => {
      if (seatInfos.length > 0) {
        sessionIds.add(sessionId);
      }
    });
    for (const cart of [this.nonConfirmedCart, this.cart]) {
      cart?.sessionItemsByDatetime?.forEach(cartSessions => {
        cartSessions.forEach(cartSession => {
          if ((cartSession.seats?.length ?? 0) > 0) {
            sessionIds.add(cartSession.sessionId.toString());
          }
        });
      });
    }
    return sessionIds;
  }

  #getTicketTypeBySessionId(sessionId: string): string | null {
    const numericSessionId = parseInt(sessionId, 10);
    return this.selectedSession?.selectedDatetime?.ticketTypesBySessionId?.get(numericSessionId) ?? null;
  }

  #handleCartSessionUpdate($event: UpdateTicketTypeCounter): void {
    const sessionIdStr = $event.sessionId.toString();
    const applyFallbackSelectedTicketsBySessionIdUpdate = (): void => {
      const updatedBySessionId = new Map(this.selectedTicketsBySessionId);
      if ($event.newCounter > 0) {
        updatedBySessionId.set(sessionIdStr, $event.newCounter);
      } else {
        updatedBySessionId.delete(sessionIdStr);
      }
      this.selectedTicketsBySessionId = updatedBySessionId;
    };
    const hasLineContext = $event.datetime !== undefined && $event.mainPlanId !== undefined && $event.venueId !== undefined;
    const matchesCartLine = (session: CartSession, datetime: string): boolean => {
      if (session.sessionId !== $event.sessionId) {
        return false;
      }
      if (!hasLineContext) {
        return true;
      }
      return (
        datetime === $event.datetime &&
        (session.mainPlanId ?? null) === $event.mainPlanId &&
        (session.sessionAddressId ?? null) === $event.venueId
      );
    };

    if (this.nonConfirmedCart?.sessionItemsByDatetime == null) {
      applyFallbackSelectedTicketsBySessionIdUpdate();
      return;
    }

    let targetSession: CartSession | undefined;

    for (const [datetime, sessions] of this.nonConfirmedCart.sessionItemsByDatetime.entries()) {
      const session = sessions.find(s => matchesCartLine(s, datetime));
      if (session) {
        targetSession = session;
        break;
      }
    }

    if ($event.newCounter === 0) {
      const updatedSessionItemsByDatetime = new Map<string, CartSession[]>();

      this.nonConfirmedCart.sessionItemsByDatetime.forEach((sessions, datetime) => {
        const filteredSessions = sessions.filter(session => !matchesCartLine(session, datetime));
        if (filteredSessions.length > 0) {
          updatedSessionItemsByDatetime.set(datetime, filteredSessions);
        }
      });

      this.nonConfirmedCart.sessionItemsByDatetime = updatedSessionItemsByDatetime;

      if (this.#isSessionInCustomTabs($event.sessionId)) {
        this.#updateCustomTilesAvailability($event.sessionId, 0);
      }

      if (this.nonConfirmedCart.sessionItemsByDatetime.size === 0) {
        this.nonConfirmedCart = null;
        this.cartTotalMoney = new Money(0, this.currency ?? '');
        this.selectedTicketsBySessionId = new Map<string, number>();
        this.selectedTicketsBySessionType = new Map<string, number>();
      } else {
        this.#recalculateCartTotal();
        this.#recalculateSelectedTicketsBySessionId();
        this.#recalculateSelectedTicketsBySessionType();
      }
    } else if (targetSession) {
      targetSession.units = $event.newCounter;
      this.#recalculateCartTotal();
      this.#recalculateSelectedTicketsBySessionId();
      this.#recalculateSelectedTicketsBySessionType();
    } else {
      applyFallbackSelectedTicketsBySessionIdUpdate();
    }
  }

  #abortModifyOrderFlowForUnavailablePlan(): void {
    this.#modifyOrderFlowAborted = true;
    this.#showModifyOrderValidationModal({
      messageKey: 'boxOffice.orderModificationPlanUnavailable.message',
      titleKey: 'boxOffice.orderModificationPlanUnavailable.modalTitle',
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#loadStoredPlan());
    this.#handleMissingOrderDataInModifyOrderFlow();
  }

  #discardModifyOrderSeededCart(): void {
    if (!this.#isModifyOrderCartSeeded) {
      return;
    }
    this.#isModifyOrderCartSeeded = false;
    this.allowMultiTimeSlotSelection = false;
    this.isPreservingCart = false;
    this.nonConfirmedCart = null;
    this.cartTotalMoney = new Money(0, this.currency ?? '');
    this.selectedTicketsBySessionId = new Map<string, number>();
    this.selectedTicketsBySessionType = new Map<string, number>();
    this.changeDetectorRef.markForCheck();
  }

  #handleMissingOrderDataInModifyOrderFlow(): void {
    this.#modifyOrderFlowAborted = true;
    this.modifiedOrder.set(undefined);
    this.#discardModifyOrderSeededCart();
    setTimeout(() => {
      void this.#router
        .navigate([], {
          queryParams: { mode: null, modified_order_id: null },
          queryParamsHandling: 'merge',
          relativeTo: this.#activatedRoute,
          replaceUrl: true,
        })
        .then(() => this.#restoreMerchandisingAfterModifyOrderAbort());
    }, 0);
  }

  #handleMissingOrInvalidStoredPlan(): void {
    if (this.#selectSinglePlanIfOnlyOneAvailable()) {
      return;
    }

    const restorablePlanConfig = this.#resolveRestorablePlanConfig();
    if (restorablePlanConfig !== null) {
      this.#applyRestoredPlanConfig(restorablePlanConfig);
      return;
    }

    this.#openPlanPlaceSelector();
  }

  #handlePlanSelected(config: OSSPlanConfig): void {
    this.#planSelectionStore.clearSelectionDismissed();
    const planId = parseInt(config.id);
    const previousPlanId = this.activeOssPlanConfig()?.id ? parseInt(this.activeOssPlanConfig()!.id) : null;
    const hasPlanChanged = previousPlanId !== null && previousPlanId !== planId;
    const hasSeatingSelectionsBefore = this.selectedTicketsSeatsBySessionId.size > 0;
    const hasSeatingLinesInCart = this.#cartHasSeatingLines(this.nonConfirmedCart ?? this.cart);

    this.activeOssPlanConfig.set(config);
    if (!planId) {
      return;
    }

    if (hasPlanChanged && !this.multiPlanCartEnabled) {
      this.clearCart();
      this.nonConfirmedCart = null;
      this.clearSelectedTickets();
    }
    if (hasPlanChanged && this.multiPlanCartEnabled && (hasSeatingSelectionsBefore || hasSeatingLinesInCart)) {
      this.isPreservingCart = this.hasMultiplanSeatingFlowContext || hasSeatingLinesInCart;
      if (!this.isPreservingCart) {
        this.clearCart();
        this.nonConfirmedCart = null;
      }
      this.selectedTicketsSeatsBySessionId = new Map();
      this.selectedTicketsBySessionId = new Map();
      this.selectedTicketsBySessionType = new Map<string, number>();
      // Both `clearSelection()` variants free the previous plan's seats provider-side: with
      // `expireHoldToken` the whole token is expired, without it the map is told to release every
      // selected seat. When the cart is preserved the previous plan keeps its seated line and its
      // entry in `seatingHoldTokensBySessionId`, so those seats must stay held and nothing may be
      // released here — no seat was dropped. Mirrors `#releaseDroppedSeatingSelection`, which only
      // releases what a change actually drops — B2BO-8391.
      if (!this.isPreservingCart) {
        this.seatingSelectorRef?.clearSelection({ expireHoldToken: true });
      }
    }

    this.#updatePlanSelected(planId);
    const currentConfig = this.#ossConfigStorageService.getConfiguration();
    if (currentConfig) {
      this.#ossConfigStorageService.setConfiguration({
        ...currentConfig,
        plan: config,
      });
    }
  }

  #handleScannedCode(code: string): void {
    if (this.#hasModalCouponCodeOpened) {
      this.#autoFillCouponFromScanner(code);
      return;
    }
    const activeSetup = this.activeOnsiteSetup();
    if (activeSetup && activeSetup?.warehouse_id && activeSetup?.retail_setup_id) {
      this.handleProductScannedCode(code);
      return;
    }

    this.#handleScannedOrderCode(code);
  }

  #handleScannedOrderCode(scannedCode: string): void {
    const normalizedCode = scannedCode.trim();
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined || partnerId === null) {
      super.handleProductScannedCode(scannedCode);
      return;
    }

    const searchQuery = { code: normalizedCode, partnerId };

    this.#purchaseService
      .searchOrders(searchQuery)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.#showOrderOrProductNotFoundToast(scannedCode),
        next: response => {
          const resolvedOrderId = this.#extractOrderIdFromSearchResponse(response.data ?? []);
          if (!resolvedOrderId) {
            this.#showOrderOrProductNotFoundToast(scannedCode);
            return;
          }
          this.#navigateToOrderDetail(resolvedOrderId);
        },
      });
  }

  #handleSetupSelected(onsiteSetup: OSSOnsiteSetupConfig): void {
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

  #hasAddonsOrNonSeatingTickets(): boolean {
    if (this.productTypes.some(pt => pt.isShopProduct)) {
      return true;
    }
    const sessionAvailabilityList = this.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const hasSeatingBySessionId = new Map(sessionAvailabilityList.map(s => [s.id, s.seating !== null && s.seating !== undefined]));

    return this.ticketTypes.some(tt => {
      if (tt.isAddon) return true;
      if (tt.sessionId === undefined) return false;

      const hasSeating = hasSeatingBySessionId.get(tt.sessionId);
      return hasSeating === false || hasSeating === undefined;
    });
  }

  #hasPaymentConfig(onsiteSetup: OnsiteSetup | null): boolean {
    if (!onsiteSetup) return false;

    const gateway = this.#boxOfficePaymentMethodsService.getGatewayProvider(onsiteSetup);
    if (gateway === 'undefined') return false;

    if (this.#isSquareGateway(onsiteSetup)) {
      return this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(onsiteSetup).squareConfiguration != null;
    }

    return this.#boxOfficePaymentMethodsService.getGatewayTerminalIds(onsiteSetup).length > 0;
  }

  #hasSquarePaymentConfig(onsiteSetup: OnsiteSetup | null): boolean {
    return !!onsiteSetup && this.#hasPaymentConfig(onsiteSetup) && this.#isSquareGateway(onsiteSetup) && !this.isMobilePos();
  }

  #hideFooterAndSidebar() {
    this.#toggleFooter(false);
    this.#toggleSidebar(false);
  }

  #initializeAvailablePlans() {
    this.#planSelectionStore.resetPlanAvailability();
    this.#planService
      .getPlans(this.#partnerService.getPartner()!.id, [], { channelId: this.channelId })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.#onSalePlans = response.data?.filter(plan => plan.status === PlanStatus.ON_SALE) || [];
        let filteredPlans = this.#onSalePlans;
        if (this.prioritizedPlanIds().length > 0) {
          filteredPlans = filteredPlans
            .filter(plan => this.prioritizedPlanIds().includes(plan.id!))
            .sort((planA, planB) => {
              return this.prioritizedPlanIds().indexOf(planA.id!) - this.prioritizedPlanIds().indexOf(planB.id!);
            });
        }
        this.availablePlans.set(filteredPlans);
        this.#planSelectionStore.setHasAvailablePlans(this.#hasSelectablePlanPlaces(filteredPlans));
        this.#loadPlan();
      });
  }

  #initializeCustomTabsData(): void {
    const setups = this.activeOnsiteSetup()?.custom_tabs || [];
    const tabSignals = setups.map(() => signal<OssCustomTabData | null>(null));
    this.customTabSignals.set(tabSignals);
    setups.forEach((setup, index) => {
      const tabData: OssCustomTabData = {
        datetimeSelected: moment(Date.now())?.format('YYYY-MM-DDTHH:mm:ss')?.toString() ?? '',
        isLoading: true,
        setupIcon: this.#parseIconString(setup.icon),
        setupId: setup.id,
        setupName: setup.name,
        tilesData: null as OssCustomTilesData | null,
      };
      tabSignals[index].set(tabData);
    });

    this.#loadAllCustomTabsData();
  }

  #initializeCustomTilesTicketTypesEffect() {
    const effectRef = effect(
      () => {
        const activeTabData = this.activeCustomTab();
        const activeTabType = this.activeTab().type;
        const tilesData = activeTabData?.tilesData;

        if (!tilesData || activeTabType !== OssTab.CUSTOM_TABS) {
          return;
        }

        untracked(() => {
          this.addCustomTileSessionsToTicketTypes(tilesData);
          this.addProductSessionsByCustomTabsProductSessions(tilesData);
        });
      },
      { injector: this.#injector },
    );
    this.#activeEffectRefs.push(effectRef);
  }

  #initializeFeatureMenuItems(): void {
    effect(
      () => {
        const featureMenuItems = this.#featureMenuItems();
        untracked(() => {
          this.#headerStateService.setFeatureMenuItems(featureMenuItems);
        });
      },
      { injector: this.#injector },
    );

    this.#headerStateService.actionClicked$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(actionId => {
      if (actionId === 'oss-change-setup') {
        this.selectOnsiteSetup();
      }
      if (actionId === ossIdentifyMemberActionId) {
        if (this.membershipsData.member) {
          this.removeMembershipsMember();
        } else {
          this.identifyMembershipsMember();
        }
      }
      if (actionId === 'oss-link-device') {
        this.onLinkDeviceButtonClick();
      }
    });
  }

  #initializeHeaderActions(): void {
    effect(
      () => {
        const headerActions = this.#headerActions();
        untracked(() => {
          this.#headerStateService.setHeaderActions(headerActions);
        });
      },
      { injector: this.#injector },
    );

    this.#headerStateService.actionClicked$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(actionId => {
      if (actionId === 'oss-calendar') {
        this.showMobileDateSelector.set(true);
      }
      if (actionId === 'oss-search') {
        this.#openSearch();
      }
    });
  }

  #initializeHeaderCenterContent(): void {
    effect(
      () => {
        const isMobileOrTablet = this.isMobile() || this.isTablet();
        untracked(() => {
          if (isMobileOrTablet) {
            this.#headerStateService.setCenterContent(this.headerCenterTemplate() ?? null);
          } else {
            this.#headerStateService.clearCenterContent();
          }
        });
      },
      { injector: this.#injector },
    );
  }

  #initializeProductsCatalogStream(): void {
    toObservable(this.activeOnsiteSetup, { injector: this.#injector })
      .pipe(
        switchMap(onsiteSetup => {
          const partner = this.#partnerService.getPartner();
          if (!onsiteSetup?.retail_setup_id || !partner) {
            this.isProductCatalogLoaded.set(false);
            this.isLoadingProductCatalog.set(false);
            return EMPTY;
          }
          this.isLoadingProductCatalog.set(true);
          return this.#productSessionsSummaryService.initializeService(partner.id, onsiteSetup.id, this.channelId).pipe(
            catchError(() => {
              this.isProductCatalogLoaded.set(false);
              this.isLoadingProductCatalog.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ data }) => {
        this.isProductCatalogLoaded.set(data != null && Object.keys(data.sessions_by_id).length > 0);
        this.isLoadingProductCatalog.set(false);
      });
  }

  #initializeQueryParamsEffect(): void {
    const effectRef = effect(
      () => {
        this.activePlan();
        this.activeOnsiteSetup();

        this.updateQueryParams();
      },
      { injector: this.#injector },
    );

    this.#activeEffectRefs.push(effectRef);
  }

  #initializeScannerService(): void {
    this.#scannerService
      .observeScanCode()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((code: string) => {
        this.#handleScannedCode(code);
      });
  }

  #initializeSearchByNewPlanEffect(): void {
    const effectRef = effect(
      () => {
        const planConfig = this.activeOssPlanConfig();
        if (this.activeOnsiteSetup() && this.activePlan()) {
          const activePlanId = this.activePlan()?.id ?? null;
          const planConfigId = planConfig?.id ? Number(planConfig.id) : null;
          if (planConfigId !== null && activePlanId !== null && planConfigId !== activePlanId) {
            return;
          }
          const urlOrderId = this.#modifiedOrderIdParam();
          if (urlOrderId != null && urlOrderId !== '' && !this.modifiedOrder()) {
            return;
          }
          this.isLoadingNewSearch.set(true);
          try {
            const partner = this.#partnerService.getPartner();
            if (!partner || !this.plan) return;
            const placeIdFromConfig = parseInt(planConfig?.placeId || '0', 10);
            const place = this.plan.places?.find(place => place.id === placeIdFromConfig) || this.plan.places?.[0];
            if (!place || !place.city) return;
            const citySelected: SelectDropdownCityOption = {
              id: place.city.id || 0,
              timezone: this.timezone,
              title: place.city.name || '',
            };
            const planSelected: SelectOption = {
              id: this.plan.id || 0,
              title: this.plan.name || '',
            };
            const placeSelected: SelectOption = {
              id: place.id || 0,
              title: place.name || '',
            };
            this.timezone = place.city.timeZone || this.timezone;
            this.filters = new SearchFilter(partner, citySelected, planSelected, placeSelected, null, this.timezone, true);
            const initialDate = this.modifiedOrder() ? (this.#getModifyOrderInitialDate() ?? undefined) : undefined;
            if (initialDate !== undefined) {
              this.#isModifyOrderTimeSlotApplied = false;
            }
            this.loadNewSearch(this.filters, initialDate);

            if (!this.#hasTourBeenInitialized) {
              this.#hasTourBeenInitialized = true;
              this.#checkAndShowTourModal();
            }
          } finally {
            this.isLoadingNewSearch.set(false);
          }
        }
      },
      { injector: this.#injector },
    );
    this.#activeEffectRefs.push(effectRef);
  }

  #initializeSessionAvailableEvent(): void {
    this.sessionAvailableReady.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (this.modifiedOrder() && !this.#isModifyOrderTimeSlotApplied) {
        this.#applyModifyOrderTimeSlotPreselection();
      }
      const urlOrderId = this.#modifiedOrderIdParam();
      const isWaitingForOrderFromUrl = urlOrderId != null && urlOrderId !== '' && !this.modifiedOrder();
      if (!isWaitingForOrderFromUrl) {
        this.loadOneStepFreeSeatingMap();
      }
      setTimeout(() => {
        this.#isDateChangeInProgress = false;
        this.#updateAvailableTabs();
        const availableTabs = this.availableTabs();
        const seatingTabIndex = availableTabs.indexOf(OssTab.SEATING);
        if (this.hasPlanSeating() && seatingTabIndex !== -1 && !this.#seatingTabAutoNavigated) {
          this.#seatingTabAutoNavigated = true;
          this.activeTab.set({ tabIndex: seatingTabIndex, type: OssTab.SEATING });
        }
      }, 0);
    });
  }

  #isActiveTabDateDependant(): boolean {
    return this.#isTabDateDependant(this.activeTab().type);
  }

  #isHierarchyElementType(type: OssTargetElementType): boolean {
    return (
      type === OssTargetElementType.HIERARCHY_ELEMENT ||
      type === OssTargetElementType.PARENT_HIERARCHY_ELEMENT ||
      type === OssTargetElementType.PRODUCT
    );
  }

  #isLinkDeviceButtonVisible(onsiteSetup: OnsiteSetup | null, isMobilePos: boolean): boolean {
    if (!onsiteSetup) return false;
    if (!this.#hasPaymentConfig(onsiteSetup)) return false;
    if (!this.#isSquareGateway(onsiteSetup)) return true;
    return !isMobilePos;
  }

  #isMatchingDatetime(datetimeAvailability: { datetime: string }, datetime: string): boolean {
    const normalizedAvail = new Date(datetimeAvailability.datetime).toISOString().replace(/\.\d+Z$/, 'Z');
    const normalizedDatetime = new Date(datetime).toISOString().replace(/\.\d+Z$/, 'Z');
    return normalizedAvail === normalizedDatetime;
  }

  #isSessionInCustomTabs(sessionId: number): boolean {
    return this.customTabSignals().some(tabSignal => {
      const tabData = tabSignal();
      if (!tabData?.tilesData) return false;
      return this.#tabContainsSession(tabData, sessionId);
    });
  }

  #isModifyOrderEntry(): boolean {
    return this.#modifiedOrderModeParam() === 'modify_order' && this.#modifiedOrderIdParam() != null;
  }

  #isSquareGateway(onsiteSetup: OnsiteSetup | null): boolean {
    return this.#boxOfficePaymentMethodsService.getGatewayProvider(onsiteSetup) === PaymentCheckout[PaymentCheckout.square];
  }

  #isStoredPlanOnSaleForCurrentSetup(storedPlan: OSSPlanConfig): boolean {
    const planId = Number(storedPlan.id);
    if (isNaN(planId)) {
      return false;
    }
    return this.availablePlans().some(plan => plan.id === planId);
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

  #isTabDateDependant(ossTab: OssTab): boolean {
    if (ossTab === OssTab.SEATING && this.manageAsFreeSeatingMap) {
      return true;
    }
    if (ossTab === OssTab.TICKETS_AND_ADDONS) {
      return true;
    }
    return false;
  }

  #loadAllCustomTabsData(): void {
    const setups = this.activeOnsiteSetup()?.custom_tabs || [];
    setups.forEach((setup, index) => {
      this.#loadCustomTabDataByIndex(index);
    });
  }

  #loadCustomTabDataByIndex(tabIndex: number): void {
    const tabData = this.getCustomTabData(tabIndex);
    const setup = this.activeOnsiteSetup()?.custom_tabs?.[tabIndex];
    if (!tabData || !setup) {
      return;
    }
    const query: OssCustomTabSessionsForDateQuery = {
      channel: this.channelId,
      customTabSetupId: setup.id,
      fromDate: tabData.datetimeSelected || (moment(Date.now())?.format('YYYY-MM-DDTHH:mm:ss')?.toString() ?? ''),
      partnerId: this.#partnerService.getPartner()!.id,
    };
    this.#customTabsService
      .getCustomTabSessionsForDate(query)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: error => {
          console.error(`Error loading Custom Tab ${tabIndex}:`, error);
          this.#updateCustomTabData(tabIndex, {
            ...tabData,
            isLoading: false,
            tilesData: null as OssCustomTilesData | null,
          });
        },
        next: response => {
          this.#updateCustomTabData(tabIndex, {
            ...tabData,
            isLoading: false,
            tilesData: response.data,
          });
        },
      });
  }

  #loadOnsiteSetup(): void {
    const config = this.#ossConfigStorageService.getConfiguration();
    const onsiteSetupParamsFromUrl = this.#getOnsiteSetupParamsFromUrl();
    if (onsiteSetupParamsFromUrl.onsiteSetupId && !this.activeOnsiteSetup() && !this.#onsiteSetupModalShown) {
      if (!this.#onsiteSetupMatchesStoredConfig(onsiteSetupParamsFromUrl, config?.onsiteSetup)) {
        this.#loadOnsiteSetupWithoutConfig(onsiteSetupParamsFromUrl);
        return;
      }
    }
    if (!config && !this.#onsiteSetupModalShown) {
      this.#loadOnsiteSetupWithoutConfig();
      return;
    }
    if (config && !this.activeOnsiteSetup()) {
      this.#updateOnsiteSetupSelected(config.onsiteSetup.id);
    }
  }

  #loadOnsiteSetupWithoutConfig(preselection?: { onsiteSetupId?: string; venueId?: string }): void {
    this.#pendingSetupPreselection = preselection;
    this.#getOnsiteSetupConfigFromOpenedShift()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(shiftOnsiteSetupConfig => {
        if (shiftOnsiteSetupConfig) {
          this.#pendingSetupPreselection = undefined;
          this.#ossConfigStorageService.setConfiguration({ onsiteSetup: shiftOnsiteSetupConfig });
          this.#updateOnsiteSetupSelected(shiftOnsiteSetupConfig.id);
          return;
        }
        this.onsiteSetupStore.fetchAvailableOnsiteSetups();
      });
  }

  #watchSetupSelectorAutoOpen(): void {
    effect(
      () => {
        const shouldOpen = this.onsiteSetupStore.shouldAutoOpenSelector();
        const hasActiveSetup = this.activeOnsiteSetup();
        if (shouldOpen && !hasActiveSetup && !this.#onsiteSetupModalShown) {
          untracked(() => {
            this.#displaySetupSelector(true, this.#pendingSetupPreselection);
            this.#pendingSetupPreselection = undefined;
          });
        }
      },
      { injector: this.#injector },
    );
  }

  #loadPlan(): void {
    const modifyOrderPlanConfig = this.#resolvePlanConfigFromModifyOrderParams();
    if (modifyOrderPlanConfig !== null) {
      this.#applyRestoredPlanConfig(modifyOrderPlanConfig);
      return;
    }
    if (this.#isModifyOrderEntry()) {
      this.#abortModifyOrderFlowForUnavailablePlan();
      return;
    }

    this.#loadStoredPlan();
  }

  #loadStoredPlan(): void {
    const storedPlan = this.#ossConfigStorageService.getConfiguration()?.plan;
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
   * Re-appends the cart lines of the other plans on top of the current plan's rebuild.
   *
   * Returns `true` when lines were actually merged back, so the caller can refresh whatever it
   * computed from the pre-merge cart.
   */
  #mergeMultiplanCart(previousNonConfirmedCart: Cart, currentPlanId: number): boolean {
    if (this.nonConfirmedCart == null) {
      return false;
    }
    const mergedCart = mergeCartSessionsFromOtherPlans(this.nonConfirmedCart, previousNonConfirmedCart, currentPlanId);
    if (mergedCart === this.nonConfirmedCart) {
      return false;
    }
    this.nonConfirmedCart = mergedCart;
    return true;
  }

  #modalPreferredSessionSummary(): RegularSessionAvailabilitySummaryByDate | null {
    const list = this.regularSessionAvailabilitySummaryByDateList;
    if (!list?.length) {
      return null;
    }
    const key = this.selectedDateAvailability?.date;
    if (key) {
      return list.find(s => s.date === key) ?? list[0];
    }
    return list[0];
  }

  #navigateToOrderDetail(orderId: string): void {
    const state: ValidationNavigationState = { fromScan: true };
    this.#router.navigate(['/validation'], { queryParams: { id: orderId, type: 'order' }, state });
  }

  #normalizeOssDatetime(isoOrDateString: string): string {
    return new Date(isoOrDateString).toISOString().replace(/\.\d+Z$/, 'Z');
  }

  #onsiteSetupMatchesStoredConfig(
    params: { cityId?: string; onsiteSetupId?: string; venueId?: string },
    onsiteSetupConfig?: OSSOnsiteSetupConfig,
  ): boolean {
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

    if (this.#selectSinglePlanIfOnlyOneAvailable()) {
      return;
    }

    this.#showPlanSelectionModal();
  }

  #openSearch(): void {
    this.isSearchVisible.set(true);
    this.#fzTrackingService.track(posSearchOpened());
  }

  #openSetupSelector(withCloseButtonOnModal: boolean, preselection?: { onsiteSetupId?: string; venueId?: string }): void {
    this.#displaySetupSelector(withCloseButtonOnModal, preselection);
  }

  #openSquareConnectionModal(): void {
    const paymentConfiguration = this.#buildPaymentConfiguration();
    if (!paymentConfiguration?.squareConfiguration) {
      return;
    }
    const planId = this.activePlan()?.id;
    if (planId == null) {
      return;
    }
    const modalRef = this.#modalService.open(SquareConnectionModalComponent);
    modalRef.componentInstance.squareConfiguration = paymentConfiguration.squareConfiguration;
    modalRef.componentInstance.deviceId = paymentConfiguration.deviceId ?? '';
    modalRef.componentInstance.planId = planId;
    modalRef.result.then(
      (result: { deviceId: string | undefined } | null) => {
        if (result === null) {
          return;
        }
        const newConfig = paymentConfiguration.clone();
        newConfig.deviceId = result.deviceId;
        this.#paymentConfigStorageService.setConfiguration(newConfig);
      },
      () => {},
    );
  }

  #orderCartTimeslotsForCalendar(
    cartTimeslots: string[],
    calendarDate: string | undefined,
    preferredCartDatetime: string | null,
  ): string[] {
    if (calendarDate === undefined || cartTimeslots.length < 2) {
      return cartTimeslots;
    }
    return [...cartTimeslots].sort((a, b) => this.#compareCartTimeslotsForDefaultSession(a, b, calendarDate, preferredCartDatetime));
  }

  #pairPayHereOnSetupLoad(onsiteSetup: OnsiteSetup): void {
    const paymentConfiguration = this.#buildPaymentConfiguration();
    const partnerId = this.#partnerService.getPartner()?.id;
    const deviceId = paymentConfiguration.deviceId;

    if (!paymentConfiguration.payhereConfiguration || partnerId == null || !deviceId || !onsiteSetup.id) {
      return;
    }

    this.#paymentService.pairPayHere(partnerId, deviceId, deviceId, onsiteSetup.id).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #parseIconString(iconString: string): IconProp {
    if (!iconString) {
      return ['fal', 'heart'];
    }
    const hyphenIndex = iconString.indexOf('-');
    if (hyphenIndex === -1) {
      return ['fal', iconString as IconName];
    }
    const prefix = iconString.substring(0, hyphenIndex) as IconPrefix;
    const iconName = iconString.substring(hyphenIndex + 1) as IconName;
    return [prefix, iconName];
  }

  #parseModifiedOrderMode(mode: unknown): ModifiedOrderMode | undefined {
    if (mode === 'upgrade_seating' || mode === 'add_tickets') {
      return mode;
    }
    if (mode === 'modify_order' && this.isOrderModificationWithOssEnabled()) {
      return mode;
    }
    return undefined;
  }

  #patchStoredConfigWithCountryCode(onsiteSetup: OnsiteSetup): void {
    const countryCode = onsiteSetup.place?.country_iso_code_2;
    const storedConfig = this.#ossConfigStorageService.getConfiguration();
    if (!storedConfig || storedConfig.onsiteSetup.placeCountryCode || !countryCode) {
      return;
    }
    this.#ossConfigStorageService.setConfiguration({
      ...storedConfig,
      onsiteSetup: { ...storedConfig.onsiteSetup, placeCountryCode: countryCode },
    });
  }

  #preserveCartStateForCustomTabs(): void {
    if (!this.customTabSignals().length || (!this.cart && !this.nonConfirmedCart)) {
      return;
    }
    const cartToCheck = this.nonConfirmedCart || this.cart;
    cartToCheck?.sessionItemsByDatetime?.forEach(sessions => {
      sessions.forEach(cartSession => {
        if (cartSession.units > 0) {
          this.#updateCustomTilesAvailability(cartSession.sessionId, cartSession.units);
        }
      });
    });
  }

  #recalculateCartTotal(): void {
    if (!this.nonConfirmedCart) return;

    if (this.coupon) {
      this.updateCartTotalTrigger$.next();
      return;
    }

    this.nonConfirmedCart.calculateTotal();
    const cartCurrency = this.nonConfirmedCart.total?.currency || this.currency || '';
    this.cartTotalMoney = new Money(this.nonConfirmedCart.total?.amount ?? 0, cartCurrency);
    this.nonConfirmedCart = this.nonConfirmedCart.clone();
  }

  #recalculateSelectedTicketsBySessionId(): void {
    const newTicketsBySessionId = new Map<string, number>();

    if (!this.nonConfirmedCart?.sessionItemsByDatetime) {
      this.selectedTicketsBySessionId = newTicketsBySessionId;
      return;
    }

    this.nonConfirmedCart.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        const sessionId = session.sessionId?.toString();
        if (sessionId == null) {
          return;
        }
        const currentCount = newTicketsBySessionId.get(sessionId) ?? 0;
        newTicketsBySessionId.set(sessionId, currentCount + session.units);
      });
    });

    this.selectedTicketsBySessionId = newTicketsBySessionId;
  }

  #recalculateSelectedTicketsBySessionType(): void {
    const newTicketsBySessionType = new Map<string, number>();

    if (!this.nonConfirmedCart?.sessionItemsByDatetime) {
      this.selectedTicketsBySessionType = newTicketsBySessionType;
      return;
    }

    this.nonConfirmedCart.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        const sessionTypeName = session.sessionType?.label ?? session.sessionName ?? '';
        if (sessionTypeName) {
          const currentCount = newTicketsBySessionType.get(sessionTypeName) || 0;
          newTicketsBySessionType.set(sessionTypeName, currentCount + session.units);
        }
      });
    });

    this.selectedTicketsBySessionType = newTicketsBySessionType;
  }

  #releaseCartLineSeatingSelection(sessionId: number): void {
    const sessionIdStr = sessionId.toString();
    const seatInfos = this.selectedTicketsSeatsBySessionId.get(sessionIdStr);
    if (!seatInfos?.length) {
      return;
    }
    const seatReferences = seatInfos.map(seat => seat.seatReference).filter((ref): ref is string => Boolean(ref));
    if (seatReferences.length > 0) {
      this.seatingSelectorRef?.releaseSeatsByReference(seatReferences);
    }
    this.selectedTicketsSeatsBySessionId.delete(sessionIdStr);
    this.seatingHoldTokensBySessionId.delete(sessionIdStr);
  }

  /**
   * Releases the seats a date/timeslot change dropped, so they become selectable again straight away
   * instead of staying held until the provider expires the token.
   *
   * Two mechanisms, and they are not interchangeable: when no surviving session shares the dropped
   * hold token the whole token is expired backend-side, which also covers the date change tearing the
   * map down in the same tick; when the token is shared (multiplan preserving another plan's seats)
   * only the dropped seat references are released through the still-mounted map.
   */
  #releaseDroppedSeatingSelection(snapshot: OssSeatingSelectionSnapshot | null): void {
    if (snapshot === null) {
      return;
    }
    const survivingSessionIds = this.#getSessionIdsHoldingSeats();
    const droppedSessionIds = [...snapshot.seatReferencesBySessionId.keys()].filter(sessionId => !survivingSessionIds.has(sessionId));
    if (droppedSessionIds.length === 0) {
      return;
    }

    const survivingHoldTokens = new Set<string>();
    snapshot.holdTokensBySessionId.forEach((holdToken, sessionId) => {
      if (survivingSessionIds.has(sessionId)) {
        survivingHoldTokens.add(holdToken);
      }
    });
    const isHoldTokenShared = droppedSessionIds.some(sessionId => {
      const holdToken = snapshot.holdTokensBySessionId.get(sessionId) ?? snapshot.state?.hold_token;
      return holdToken != null && survivingHoldTokens.has(holdToken);
    });

    if (isHoldTokenShared) {
      const seatReferences = [...new Set(droppedSessionIds.flatMap(sessionId => snapshot.seatReferencesBySessionId.get(sessionId) ?? []))];
      snapshot.releaseSeatsByReference?.(seatReferences);
    } else {
      snapshot.expireHoldToken?.();
    }

    droppedSessionIds.forEach(sessionId => {
      this.selectedTicketsSeatsBySessionId.delete(sessionId);
      this.seatingHoldTokensBySessionId.delete(sessionId);
    });
  }

  #resetState(): void {
    this.#cleanupActiveEffects();
    this.#areEffectsInitialized = false;
    this.#hasTourBeenInitialized = false;
    this.clearCart();
    this.nonConfirmedCart = null;
    this.clearSelectedTickets();
    this.ticketTypes = [];
    this.activeTab.set({ tabIndex: 0, type: OssTab.TICKETS_AND_ADDONS });
    this.#updateAvailableTabs();
    this.activeCustomTabIndex.set(0);
    this.#clearCustomTileSessions();
    this.customTabSignals.set([]);
    this.regularSessionAvailabilitySummaryByDateList = [];
    this.selectedSession = null;
    this.productSessions = [];
    this.productTypes = [];
    this.isLoadingNewSearch.set(false);
    this.#tourResetClickCount = 0;
    this.#clearTourResetTimeout();
  }

  #resolvePlanConfigFromActiveSelection(): OSSPlanConfig | null {
    const activePlanConfig = this.activeOssPlanConfig();
    if (activePlanConfig === null || !this.#isStoredPlanValid(activePlanConfig)) {
      return null;
    }
    if (!this.#isStoredPlanOnSaleForCurrentSetup(activePlanConfig)) {
      return null;
    }
    return activePlanConfig;
  }

  #resolvePlanConfigFromModifyOrderParams(): OSSPlanConfig | null {
    if (!this.#isModifyOrderEntry()) {
      return null;
    }
    const params = this.#activatedRoute.snapshot.queryParams;
    const planId = Number(params['planId']);
    if (Number.isNaN(planId)) {
      return null;
    }
    const plan = this.#onSalePlans.find(onSalePlan => onSalePlan.id === planId);
    if (plan === undefined) {
      return null;
    }
    const venueId = Number(params['venueId']);
    return this.#getOssPlanConfigFromPlan(plan, Number.isNaN(venueId) ? undefined : venueId);
  }

  #resolvePlanConfigFromMatchingActivePlan(): OSSPlanConfig | null {
    const activePlan = this.activePlan();
    const matchedActivePlan = this.availablePlans().find(plan => plan.id === activePlan?.id);
    if (matchedActivePlan === undefined) {
      return null;
    }

    const preferredPlaceId = Number(this.activeOssPlanConfig()?.placeId);
    return this.#getOssPlanConfigFromPlan(matchedActivePlan, Number.isNaN(preferredPlaceId) ? undefined : preferredPlaceId);
  }

  #resolveRestorablePlanConfig(): OSSPlanConfig | null {
    const matchingActivePlanConfig = this.#resolvePlanConfigFromMatchingActivePlan();
    if (matchingActivePlanConfig !== null) {
      return matchingActivePlanConfig;
    }
    return this.#resolvePlanConfigFromActiveSelection();
  }

  #restoreMerchandisingAfterModifyOrderAbort(): void {
    this.hasProductCatalog.set(Boolean(this.activeOnsiteSetup()?.retail_setup_id));
    this.#updateAvailableTabs();
    this.changeDetectorRef.markForCheck();
  }

  #restoreTicketCountsFromCart(datetime: string): void {
    const byDatetime = this.nonConfirmedCart?.sessionItemsByDatetime;
    if (!byDatetime?.size) {
      return;
    }

    const cartSessions: CartSession[] = [];
    if (this.allowMultiTimeSlotSelection) {
      for (const sessions of byDatetime.values()) {
        if (sessions?.length) {
          cartSessions.push(...sessions);
        }
      }
    } else {
      const forDatetime = byDatetime.get(datetime);
      if (forDatetime?.length) {
        cartSessions.push(...forDatetime);
      }
    }

    if (cartSessions.length === 0) {
      return;
    }

    const { bySessionId, bySessionType } = cartSessions.reduce<{
      bySessionId: Map<string, number>;
      bySessionType: Map<string, number>;
    }>(
      (acc, session) => {
        if (session.sessionType?.isShopProduct) {
          return acc;
        }
        const sessionIdStr = session.sessionId.toString();
        const prevUnits = acc.bySessionId.get(sessionIdStr) ?? 0;
        acc.bySessionId.set(sessionIdStr, prevUnits + session.units);
        const typeKey = session.sessionType?.label ?? session.sessionName ?? '';
        const currentUnits = acc.bySessionType.get(typeKey) ?? 0;
        acc.bySessionType.set(typeKey, currentUnits + session.units);
        return acc;
      },
      { bySessionId: new Map<string, number>(), bySessionType: new Map<string, number>() },
    );

    this.selectedTicketsBySessionId = bySessionId;
    this.selectedTicketsBySessionType = bySessionType;
  }

  #savePlanToCurrentConfig(plan: OSSPlanConfig): void {
    const currentConfig = this.#ossConfigStorageService.getConfiguration();
    if (currentConfig === null) {
      return;
    }
    this.#ossConfigStorageService.setConfiguration({
      ...currentConfig,
      plan,
    });
  }

  #selectSinglePlanIfOnlyOneAvailable(): boolean {
    const plans = this.availablePlans();
    if (plans.length !== 1) {
      return false;
    }

    const plan = plans[0];
    if ((plan.places?.length ?? 0) !== 1) {
      return false;
    }

    const config = this.#getOssPlanConfigFromPlan(plan);
    if (config === null) {
      return false;
    }

    this.#updatePlanSelected(Number(config.id));
    this.activeOssPlanConfig.set(config);
    this.#savePlanToCurrentConfig(config);
    return true;
  }

  #setupTimeslotActivationListener(): void {
    this.#activateTimeslot$
      .pipe(
        switchMap((payload: TimeslotActivationFromCartPayload) => {
          this.isPreservingCart = true;
          const plan = this.availablePlansById().get(payload.planId);
          const targetConfig = plan ? this.#getOssPlanConfigFromPlan(plan, payload.venueId) : null;
          if (targetConfig === null) {
            return EMPTY;
          }
          const current = this.activeOssPlanConfig();
          const shouldApplyPlanConfig = current === null || current.id !== targetConfig.id || current.placeId !== targetConfig.placeId;
          const afterPlanReady$ = shouldApplyPlanConfig
            ? defer(() => {
                this.#handlePlanSelected(targetConfig);
                return this.sessionAvailableReady.pipe(skip(1), take(1));
              })
            : of(void 0);
          return afterPlanReady$.pipe(
            concatMap(() => {
              if (this.#canActivateCartTimeslotWithoutRefetch(payload, shouldApplyPlanConfig)) {
                return of(payload.datetime);
              }

              const targetDate = moment(payload.datetime).tz(this.timezone);
              this.selectDate(new DateAvailability(targetDate.format('YYYY-MM-DD'), true));
              return this.sessionAvailableReady.pipe(
                skip(1),
                take(1),
                map(() => payload.datetime),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((datetime: string) => {
        this.#activatePendingTimeslot(datetime);
      });
  }

  #shouldShowDeviceSelector(paymentType?: PaymentType): boolean {
    return this.shouldShowDeviceSelector(paymentType, this.activeOnsiteSetup(), this.#paymentConfigStorageService.getConfiguration());
  }

  #showCustomTabDateSelectorModal(hasCloseButton: boolean) {
    this.isCustomTabDateSelectorModalOpen.set(true);
    const modal = this.#modalService.open(OssDateSelectorModalComponent, {
      backdrop: hasCloseButton,
      keyboard: hasCloseButton,
      modalDialogClass: 'oss-onsite-setup-selector-modal',
    });
    let sessionReadySubscription = Subscription.EMPTY;
    modal.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((selectedDatetime: string | null) => {
      if (selectedDatetime) {
        this.#getQuickTilesByDateTime(selectedDatetime);
      }
      sessionReadySubscription.unsubscribe();
      this.isCustomTabDateSelectorModalOpen.set(false);
    });
    modal.dismissed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      sessionReadySubscription.unsubscribe();
      this.isCustomTabDateSelectorModalOpen.set(false);
    });
    const updateModalProperties = () => {
      modal.componentInstance.allowMultiTimeSlot = this.allowMultiTimeSlotSelection;
      modal.componentInstance.datesAvailability = this.datesAvailability;
      modal.componentInstance.displayedSessionType = this.displayedSessionType;
      modal.componentInstance.displayedSessionTypeChange = this.handleDisplayedSessionTypeChange.bind(this);
      modal.componentInstance.hasCloseButton = hasCloseButton;
      modal.componentInstance.handleShowAvailabilityFromDateChange = this.handleShowAvailabilityFromDateChange.bind(this);
      modal.componentInstance.loadMore = this.loadMoreDays.bind(this);
      modal.componentInstance.locale = this.locale;
      modal.componentInstance.isLoadingDates = this.isLoadingDates;
      modal.componentInstance.isLoadingSessions = this.isLoadingSessions || this.isLoadingDateSessions;
      modal.componentInstance.regularSessionAvailabilitySummaryByDate = this.regularSessionAvailabilitySummaryByDateList;
      modal.componentInstance.selectedAvailabilityFromDate = this.selectedAvailabilityFromDate;
      modal.componentInstance.selectedDateAvailability = this.selectedDateAvailability;
      modal.componentInstance.selectedDateChange = this.selectDate.bind(this);
      modal.componentInstance.selectedSessionChange = this.selectSession;
      modal.componentInstance.sessionSelectorType = this.sessionSelectorType;
      modal.componentInstance.shouldShowDateSelector = this.onsiteSetupSelected?.max_purchasable_days > 1;
      modal.componentInstance.showCapacity = this.includeTimeSlotCapacity;
      modal.componentInstance.showLoadMoreButton =
        this.nextAvailableDate && (!this.onsiteSetupSelected || this.onsiteSetupSelected?.max_purchasable_days > 1);
      modal.componentInstance.ticketTypes = this.dateSelectorTicketTypes;
      modal.componentInstance.timezone = this.timezone;
      modal.componentInstance.selectedSession = this.#modalPreferredSessionSummary();

      modal.componentInstance.triggerChangeDetection();
    };
    sessionReadySubscription = this.sessionAvailableReady.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      updateModalProperties();
    });
  }

  #showModifyOrderValidationModal(payload: {
    messageKey: string;
    titleKey: string;
    alertTitleKey?: string;
    interpolationParams?: Record<string, string>;
    mode?: 'error' | 'warning';
  }): Observable<boolean> {
    const params = payload.interpolationParams;
    const title = this.#translateService.instant(payload.titleKey, params);
    const alertTitle = payload.alertTitleKey ? this.#translateService.instant(payload.alertTitleKey, params) : undefined;
    const message = this.#translateService.instant(payload.messageKey, params);
    const payloadMode = payload.mode ?? 'error';
    const modalMode = payloadMode === 'warning' ? 'confirm' : 'info';

    const dialogRef = this.#cdkDialog.open<boolean | void, OssModifyOrderValidationModalData>(OssModifyOrderValidationModalComponent, {
      data: { alertTitle, message, mode: modalMode, title },
      disableClose: true,
    });

    return dialogRef.closed.pipe(
      take(1),
      map((result: boolean | void): boolean => result === true),
    );
  }

  #showOnsiteSetupModal(hasCloseButton: boolean, preselection?: { onsiteSetupId?: string; venueId?: string }): void {
    this.#onsiteSetupModalShown = true;
    const dialogRef = this.#dialogService.openModal<OssOnsiteSetupModalResult, OssOnsiteSetupModalData>(OssOnsiteSetupModalComponent, {
      data: {
        hasCloseButton,
        hasActiveShiftAndActiveOnsiteSetup: Boolean(this.activeShift()) && Boolean(this.activeOnsiteSetup()),
        preselectedOnsiteSetupId: preselection?.onsiteSetupId,
        preselectedVenueId: preselection?.venueId,
      },
      disableCloseShortcuts: !hasCloseButton,
      injector: this.#injector,
      size: 'md',
    });

    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((result: OssOnsiteSetupModalResult | undefined) => {
      if (result) {
        this.#handleSetupSelected(result);
        return;
      }
      this.#onsiteSetupModalShown = false;
      this.onsiteSetupStore.markSelectionDismissed();
    });
  }

  protected exitReservationSettlement(): void {
    const reservationId = this.reservationSettlementSessionService.session()?.reservationId;
    this.#endReservationSettlement();
    if (reservationId == null) {
      return;
    }
    this.#router.navigate(['/reservations/list', reservationId, 'checkout']);
  }

  protected startReservationSettlementIfNeeded(): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    const queryParams = {
      mode: this.#settlementModeParam(),
      reservation_cart_id: this.#settlementCartIdParam(),
      reservation_id: this.#settlementReservationIdParam(),
    };
    if (!this.reservationSettlementSessionService.isEntry(queryParams)) {
      if (this.isReservationSettlementMode() || this.reservationSettlementSeededCartId !== null) {
        this.#endReservationSettlement();
      }
      return;
    }
    if (partnerId == null) {
      this.#rejectReservationSettlementEntry();
      return;
    }
    this.reservationSettlementSessionService
      .start({
        partnerId,
        queryParams,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: ReservationSettlementStartResult) => {
        if (result.status === 'rejected') {
          this.#rejectReservationSettlementEntry();
          return;
        }
        this.isReservationSettlementRejected.set(false);
        this.isReservationSettlementMismatch.set(false);
        this.#seedReservationSettlementCart(result.session);
      });
  }

  #clearSeededReservationSettlementCart(): void {
    this.cart = null;
    this.nonConfirmedCart = null;
    this.cartTotalMoney = new Money(0, this.currency || '');
    this.clearSelectedTicketsReferences();
    this.resetCartPresentation();
  }

  #endReservationSettlement(): void {
    const hasSeededCart = this.reservationSettlementSeededCartId !== null;
    this.clearReservationSettlementSession();
    if (hasSeededCart) {
      this.#clearSeededReservationSettlementCart();
      this.removeAppliedDiscount();
    }
  }

  #rejectReservationSettlementEntry(): void {
    this.#endReservationSettlement();
    this.isReservationSettlementRejected.set(true);
    this.clearReservationSettlementParams();
    this.changeDetectorRef.markForCheck();
  }

  #seedReservationSettlementCart(session: ReservationSettlementSession): void {
    if (this.reservationSettlementSeededCartId === session.cartId && this.nonConfirmedCart != null) {
      return;
    }
    this.reservationSettlementSeededCartId = session.cartId;
    this.allowMultiTimeSlotSelection = true;
    this.isPreservingCart = true;
    const seededCart = session.cart.clone();
    this.coupon = adoptReservationSettlementCoupon(seededCart);
    if (this.coupon !== null) {
      this.couponCodeApplied.next(true);
    }
    this.cart = seededCart;
    this.nonConfirmedCart = seededCart;
    this.cartTotalMoney = new Money(seededCart.total?.amount ?? 0, seededCart.total?.currency || this.currency || '');
    this.#recalculateSelectedTicketsBySessionId();
    this.#recalculateSelectedTicketsBySessionType();
    this.changeDetectorRef.markForCheck();
  }

  #seedModifyOrderCartIfNeeded(): void {
    if (this.#isModifyOrderCartSeeded || !this.isModifyOrderMode()) {
      return;
    }
    const orderCart = this.modifiedOrder()?.cart;
    if (!orderCart) {
      return;
    }
    this.#isModifyOrderCartSeeded = true;
    this.allowMultiTimeSlotSelection = true;
    this.isPreservingCart = true;
    this.#moveShopProductsToProductsBucket(orderCart);
    const seededCart = orderCart.clone();
    seededCart.appliedCoupon = null;
    this.#fillMissingUnitPricesFromLineTotals(seededCart);
    if (this.#allCartLinesHaveUnitPrice(seededCart)) {
      seededCart.calculateTotal();
    }
    this.nonConfirmedCart = seededCart;
    this.cartTotalMoney = new Money(seededCart.total?.amount ?? 0, seededCart.total?.currency || this.currency || '');
    this.#recalculateSelectedTicketsBySessionId();
    this.#recalculateSelectedTicketsBySessionType();
    this.applyModifyOrderSharedAvailabilityRules();
    this.changeDetectorRef.markForCheck();
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

  #fillMissingUnitPricesFromLineTotals(cart: Cart): void {
    cart.sessionItemsByDatetime?.forEach(sessions =>
      sessions.forEach(session => {
        if (session.unitPrice == null && session.price != null && session.units > 0) {
          session.unitPrice = new Money(session.price.amount / session.units, session.price.currency);
        }
      }),
    );
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

  #showOrderModificationBannerIfNeeded(): void {
    const orderId = this.#activatedRoute.snapshot.queryParams['modified_order_id'];
    if (orderId == null || orderId === '') {
      return;
    }
    this.#getOrderForModificationFlow(orderId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(order => {
        if (this.#modifyOrderFlowAborted) {
          return;
        }
        if (order == null) {
          this.#handleMissingOrderDataInModifyOrderFlow();
          return;
        }
        this.modifiedOrder.set(order);
        this.#seedModifyOrderCartIfNeeded();
        if (this.regularSessionAvailabilitySummaryByDateList?.length && !this.#isModifyOrderTimeSlotApplied) {
          this.#applyModifyOrderTimeSlotPreselection();
          this.loadOneStepFreeSeatingMap();
        }
      });
  }

  #showOrderOrProductNotFoundToast(code: string): void {
    const messageKey = this.hasProductCatalog()
      ? 'boxOffice.cart.toastBanner.errorMessage'
      : 'boxOffice.cart.toastBanner.orderNotFoundMessage';

    const message = this.#translateService.instant(messageKey, { code });
    this.showScannedCodeNotFoundToast(message);
  }

  #showPlanSelectionModal(): void {
    if (this.#planSelectionModalShown) {
      return;
    }

    const plans = this.availablePlans();
    if (!plans?.length || !this.#hasSelectablePlanPlaces(plans)) {
      return;
    }

    this.#planSelectionModalShown = true;
    const previousPlanConfig = this.activeOssPlanConfig();
    const dialogRef = this.#dialogService.openModal<OssPlanSelectionModalResult, OssPlanSelectionModalData>(
      OssPlanSelectionModalComponent,
      {
        data: {
          currentPlanConfig: previousPlanConfig,
          disabledPlanIds: this.#getDisabledPlanIdsForPlanSelection(),
          hasCloseButton: true,
          plans,
        },
        disableCloseShortcuts: false,
        size: 'md',
      },
    );

    this.#fzTrackingService.track(posPlaceEventSelectorModalOpened());

    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(config => {
      const planPlaceChangeData = buildPlanPlaceSelectorChangeData(previousPlanConfig, config, plans);
      if (planPlaceChangeData) {
        this.#fzTrackingService.track(posPlaceEventSelectorModalClosed(planPlaceChangeData));
      }
      if (config) {
        this.#planSelectionModalShown = false;
        this.#handlePlanSelected(config);
        return;
      }
      this.#planSelectionStore.markSelectionDismissed();
      this.#planSelectionModalShown = false;
    });
  }

  #hasSelectablePlanPlaces(plans: Plan[]): boolean {
    return plans.some(plan => plan.places?.some(place => place.city != null) ?? false);
  }

  #watchPlanPlaceSelectorAutoOpen(): void {
    effect(
      () => {
        const shouldOpen = this.#planSelectionStore.shouldAutoOpenPlanPlaceSelector();
        const hasActiveSetup = this.activeOnsiteSetup();
        const hasActivePlan = this.activePlan() || this.activeOssPlanConfig();
        if (shouldOpen && hasActiveSetup && !hasActivePlan && !this.#planSelectionModalShown) {
          untracked(() => {
            this.#openPlanPlaceSelector();
          });
        }
      },
      { injector: this.#injector },
    );
  }

  getDisabledPlanIdsForPlanSelectionModal(): number[] {
    return Array.from(this.#getDisabledPlanIdsForPlanSelection());
  }

  #getDisabledPlanIdsForPlanSelection(): Set<number> {
    const disabledPlanIds = new Set<number>();
    const sourceCart = this.nonConfirmedCart ?? this.cart;
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

  #showTimeslotMismatchWarning(cartDatetime: string): Observable<boolean> {
    const titlePrefix = this.#translateService.instant('oneStopShop.timeslotWarningModal.titlePrefix');

    const dialogRef = this.#cdkDialog.open<boolean, OssTimeslotWarningModalData>(OssTimeslotWarningModalComponent, {
      data: {
        newlySelectedDatetime: this.#formatDatetime(this.currentSelectedDatetime),
        title: `${titlePrefix} ${this.#formatDatetime(cartDatetime)}`,
      },
      disableClose: true,
    });

    return dialogRef.closed.pipe(map(result => result === true));
  }

  #syncActivePlanWithStoredPlan(storedPlan: OSSPlanConfig): void {
    if (this.activeOssPlanConfig() !== null) {
      return;
    }
    this.#updatePlanSelected(Number(storedPlan.id));
    this.activeOssPlanConfig.set(storedPlan);
  }

  #syncSecondScreenLoggedOutBannerCustomText(onsiteSetup: OnsiteSetup): void {
    const isFlagEnabled = this.optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.ENABLE_SECOND_SCREEN_CUSTOM_TEXT_FOR_LOGGED_OUT_BANNER,
      team: 'b2b-shops',
    });
    const name = onsiteSetup?.name?.trim();
    if (isFlagEnabled === true && name) {
      this.#secondScreenLoggedOutBannerStorageService.setSecondScreenLoggedOutBannerText(name);
      return;
    }
    this.#secondScreenLoggedOutBannerStorageService.removeSecondScreenLoggedOutBannerText();
  }

  #syncSecondScreenSeatingMapVisibility(isVisible: boolean): void {
    if (this.isSeatingMapFullscreen() === isVisible) {
      return;
    }
    this.isSeatingMapFullscreen.set(isVisible);
    this.setOboSecondScreenSeatingMapFullscreen(isVisible);
  }

  #tabContainsSession(tabData: OssCustomTabData, sessionId: number): boolean {
    if (!tabData.tilesData) {
      return false;
    }
    return tabData.tilesData.customTiles.some(tile => {
      return tile.customTile.sessions.some(session => session.id === sessionId);
    });
  }

  #toggleFooter(isActive: boolean): void {
    const toggleFooterEvent = new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, {
      detail: {
        isActive,
      },
    });
    window.dispatchEvent(toggleFooterEvent);
  }

  #toggleSidebar(isOpen: boolean): void {
    const toggleSidebarEvent = new CustomEvent(TOGGLE_SIDEBAR_EVENT_KEY, {
      detail: {
        isOpen,
      },
    });
    window.dispatchEvent(toggleSidebarEvent);
  }

  #trackCartCleared(source: PosCartClearedSource): void {
    this.#fzTrackingService.track(
      posCartCleared({
        planId: this.activePlan()?.id ?? null,
        source,
      }),
    );
  }

  #trackTabSwitched(fromTabIndex: number, toTabIndex: number): void {
    this.#fzTrackingService.track(
      posTabSwitched({
        fromTab: this.#getTabTrackingName(fromTabIndex),
        toTab: this.#getTabTrackingName(toTabIndex),
      }),
    );
  }

  #updateAvailableTabs(): void {
    const baseTabs: OssTab[] = this.manageAsFreeSeatingMap ? [OssTab.SEATING] : [OssTab.TICKETS_AND_ADDONS];
    const onsiteSetup = this.activeOnsiteSetup();
    if (!onsiteSetup) {
      if (this.availableTabs().length !== baseTabs.length || this.availableTabs()[0] !== baseTabs[0]) {
        this.availableTabs.set(baseTabs);
      }
      return;
    }
    if (this.manageAsFreeSeatingMap && this.#hasAddonsOrNonSeatingTickets()) {
      baseTabs.push(OssTab.TICKETS_AND_ADDONS);
    }
    const customTabs = onsiteSetup.custom_tabs || [];
    const customTabsTabs = customTabs.map(() => OssTab.CUSTOM_TABS);
    const newTabs = customTabs.length > 0 ? [...baseTabs, ...customTabsTabs] : baseTabs;
    const currentTabs = this.availableTabs();
    if (currentTabs.length !== newTabs.length || currentTabs.some((tab, i) => tab !== newTabs[i])) {
      this.availableTabs.set(newTabs);
      this.#ensureActiveTabIsValid(newTabs);
    }
  }

  #updateCustomTabData(index: number, newData: OssCustomTabData): void {
    const tabSignals = this.customTabSignals();
    if (tabSignals[index]) {
      tabSignals[index].set(newData);
    }
  }

  #updateCustomTilesAvailability(sessionId: number, sessionTicketsSelected: number | null = null): void {
    if (!this.nonConfirmedCart) {
      return;
    }
    let totalCartTicketsForSession = 0;
    this.nonConfirmedCart.sessionItemsByDatetime?.forEach(sessions => {
      const cartSession = sessions.find(session => session.sessionId === sessionId);
      if (cartSession) {
        totalCartTicketsForSession = cartSession.units;
      }
    });
    const currentTicketCount = sessionTicketsSelected !== null ? sessionTicketsSelected : totalCartTicketsForSession;
    this.customTabSignals().forEach((tabSignal, tabIndex) => {
      const tabData = tabSignal();
      if (!tabData?.tilesData) {
        return;
      }

      const hasSession = this.#tabContainsSession(tabData, sessionId);
      if (!hasSession) {
        return;
      }
      const updatedTilesData = this.#updateSessionInTilesData(tabData.tilesData, sessionId, currentTicketCount);
      this.#updateCustomTabData(tabIndex, {
        ...tabData,
        tilesData: updatedTilesData,
      });
    });
  }

  #updateOnsiteSetupSelected(onsiteSetupId: string): void {
    this.#onsiteSetupsService
      .getOnsiteSetup(onsiteSetupId)
      .pipe(
        switchMap(onsiteSetup =>
          this.#onsiteSetupsPresetCouponsService.getPresetCouponsByOnsiteSetup(onsiteSetup).pipe(
            map(() => onsiteSetup),
            catchError(() => of(onsiteSetup)),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.#onsiteSetupModalShown = false;
          this.#resetState();
          this.activeOnsiteSetup.set(null);
          this.#ossConfigStorageService.removeConfiguration();
          this.#onsiteSetupsStorageService.removeConfiguration();
          this.#loadOnsiteSetupWithoutConfig();
        },
        next: (onsiteSetup: OnsiteSetup) => {
          this.#onsiteSetupModalShown = false;
          this.#resetState();
          this.onsiteSetupStore.clearSelectionDismissed();
          this.#patchStoredConfigWithCountryCode(onsiteSetup);
          const currentPlaceId = this.#getCurrentPlaceId();
          const onsiteSetupWithPlaceId = currentPlaceId !== null ? { ...onsiteSetup, place_id: currentPlaceId } : onsiteSetup;
          const effectiveOnsiteSetup = { ...onsiteSetupWithPlaceId, obo_flow_type: OboFlowTypeEnum.one_stop_shop };
          this.#onsiteSetupsStorageService.setConfiguration(effectiveOnsiteSetup as OnsiteSetup);
          this.onsiteSetupSelected = effectiveOnsiteSetup;
          this.activeOnsiteSetup.set(effectiveOnsiteSetup);
          this.#syncSecondScreenLoggedOutBannerCustomText(effectiveOnsiteSetup);
          this.hasProductCatalog.set(Boolean(effectiveOnsiteSetup.retail_setup_id));
          this.applyOnsiteSetup();
          this.#pairPayHereOnSetupLoad(effectiveOnsiteSetup);
          this.#updateAvailableTabs();
          this.changeDetectorRef.markForCheck();
        },
      });
  }
  #getCurrentPlaceId(): number | null {
    const currentOnsiteSetupStorage = this.#onsiteSetupsStorageService.getConfiguration();
    if (!currentOnsiteSetupStorage) {
      return null;
    }
    return currentOnsiteSetupStorage.place_id ?? null;
  }

  #updatePlanSelected(planId: number): void {
    const previousPlanId = this.plan?.id ?? null;
    this.#planService
      .getPlan(this.#partnerService.getPartner()!.id, planId)
      .pipe(take(1))
      .subscribe(({ data }) => {
        if (data) {
          this.plan = data;
          this.activePlan.set(this.plan);
          if (previousPlanId !== data.id) {
            // The member's perks were fetched for the plan we just left — MSM-820.
            this.clearMembershipsMember();
          }
        }
      });
  }

  #updateSessionInTilesData(tilesData: OssCustomTilesData, sessionId: number, currentTicketCount: number): OssCustomTilesData {
    return {
      ...tilesData,
      customTiles: tilesData.customTiles.map(tile => ({
        ...tile,
        customTile: {
          ...tile.customTile,
          sessions: tile.customTile.sessions.map(session => {
            if (session.id === sessionId) {
              const newUnavailableState = currentTicketCount >= session.maximumTicketsAllowedPerBooking;
              const clonedSession = session.clone();
              clonedSession.isUnavailable = newUnavailableState;
              return clonedSession;
            }
            return session;
          }),
        },
      })),
    };
  }
}
