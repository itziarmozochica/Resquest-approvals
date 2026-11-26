import { Dialog } from '@angular/cdk/dialog';
import { AsyncPipe, CurrencyPipe, NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ErrorHandler,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  Signal,
  TemplateRef,
  untracked,
  ViewChild,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { ScannerService } from '@fz-original/app/app/services/scanner/scanner.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { ConfirmationDialogComponent } from '@fz-original/app/memberships/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogService } from '@fz-original/app/memberships/services/confirmation-dialog/confirmation-dialog.service';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { MemberAccountMembership } from '@fz-original/app/modules/box-office/memberships/models/member-account.model';
import {
  memberAccountBadge,
  type MemberAccountBadge,
} from '@fz-original/app/modules/box-office/memberships/utils/member-account-badge.util';
import { OssButtonsSectionComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-buttons-section/oss-buttons-section.component';
import { OssCartDetailComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-cart-detail/oss-cart-detail.component';
import { OssFiscalActionsComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-fiscal-actions/oss-fiscal-actions.component';
import { OssHierarchyTilesComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-hierarchy-tiles/oss-hierarchy-tiles.component';
import { OssTicketSelectorComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-ticket-selector/oss-ticket-selector.component';
import { OssTicketsSectionComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-tickets-section/oss-tickets-section.component';
import { OssDateSelectorModalComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-date-selector-modal/oss-date-selector-modal.component';
import { OssLinkedDeviceModalComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-linked-device-modal/oss-linked-device-modal.component';
import { OssModifiedOrderModalDialogData } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-modified-order-modal/oss-modified-order-modal-dialog-data.model';
import { OssModifiedOrderModalComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-modified-order-modal/oss-modified-order-modal.component';
import {
  OssModifyOrderValidationModalComponent,
  OssModifyOrderValidationModalData,
} from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-modify-order-validation-modal/oss-modify-order-validation-modal.component';
import { OssOnsiteSetupModalComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-onsite-setup-modal/oss-onsite-setup-modal.component';
import {
  type OssOnsiteSetupModalData,
  type OssOnsiteSetupModalResult,
} from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-onsite-setup-modal/oss-onsite-setup-modal.model';
import { OssPlanSelectionModalComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-plan-selection-modal/oss-plan-selection-modal.component';
import {
  type OssPlanSelectionModalData,
  type OssPlanSelectionModalResult,
} from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-plan-selection-modal/oss-plan-selection-modal.model';
import { OssSearchComponent } from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-search/oss-search.component';
import {
  OssTimeslotWarningModalComponent,
  OssTimeslotWarningModalData,
} from '@fz-original/app/modules/box-office/one-stop-shop/containers/oss-timeslot-warning-modal/oss-timeslot-warning-modal.component';
import { OSSOnsiteSetupConfig, OSSPlanConfig, OssTab } from '@fz-original/app/modules/box-office/one-stop-shop/models';
import { OssMomentDatePipe } from '@fz-original/app/modules/box-office/one-stop-shop/pipes/oss-moment-date.pipe';
import { OssOnsiteSetupStore } from '@fz-original/app/modules/box-office/one-stop-shop/store/oss-onsite-setup.store';
import { OssPlanSelectionStore } from '@fz-original/app/modules/box-office/one-stop-shop/store/oss-plan-selection.store';
import { posSearchOpened } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-search-opened.event';
import { posTabSwitched } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-tab-switched.event';
import { TrackPosCheckoutPromoCodesService } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/services/track-pos-checkout-promo-codes.service';
import { SquareConnectionModalComponent } from '@fz-original/app/modules/box-office/shared/components/square-connection-modal/square-connection-modal.component';
import type { CheckoutQuickAction } from '@fz-original/app/modules/box-office/shared/services/checkout-payment-options/checkout-payment-options.service';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { SplitPaymentRetryUiService } from '@fz-original/app/modules/box-office/shared/services/split-payment/split-payment-retry-ui.service';
import { CashChangeCalculatorModalComponent } from '@fz-original/app/modules/box-office/ticketing/components/cash-change-calculator-modal/cash-change-calculator-modal.component';
import { ConfirmModalComponent } from '@fz-original/app/modules/box-office/ticketing/components/confirm-modal/confirm-modal.component';
import { FilterProductSessionsPipe } from '@fz-original/app/modules/box-office/ticketing/filter-product-sessions.pipe';
import { TicketingUnsavedChangesBypassService } from '@fz-original/app/modules/box-office/ticketing/services/ticketing-unsaved-changes-bypass.service';
import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import type { CheckoutPreselectedMethod } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { CheckoutModalFlowService } from '@fz-original/app/modules/checkout/checkout-modal/services/checkout-modal-flow.service';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { PaymentLinkService } from '@fz-original/app/modules/reservation/services/payment-link.service';
import { ScannerComponent } from '@fz-original/app/modules/validation/components/scanner/scanner.component';
import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { BookingQuestionsModalService } from '@fz-original/app/shared/booking-questions/booking-questions-modal.service';
import { BookingQuestionsModalComponent } from '@fz-original/app/shared/components/booking-questions-modal/booking-questions-modal.component';
import {
  ContactInformationModalComponent,
  ContactInformationModalData,
  type ContactInformationModalResult,
} from '@fz-original/app/shared/components/contact-information-modal/contact-information-modal.component';
import { CouponCodeSelectorComponent } from '@fz-original/app/shared/components/coupon-code-selector/coupon-code-selector.component';
import { type CouponCodeModalResult } from '@fz-original/app/shared/components/coupon-code-selector/coupon-modals.model';
import { type CouponCodeEvent } from '@fz-original/app/shared/components/coupon-code/coupon-code-event';
import { CouponCodeModalComponent } from '@fz-original/app/shared/components/coupon-code/coupon-code-modal/coupon-code-modal.component';
import { getDateSelectorTitleKey } from '@fz-original/app/shared/components/date-selector/date-selector.util';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { CreateEventEntryService } from '@fz-original/app/shared/layout/create-event-entry/create-event-entry.service';
import { TOGGLE_FOOTER_EVENT_KEY } from '@fz-original/app/shared/layout/footer/toggle-footer-event-key';
import { ModalContentModule } from '@fz-original/app/shared/layout/modal/modal-content.module';
import { TOGGLE_SIDEBAR_EVENT_KEY } from '@fz-original/app/shared/layout/sidebar/toggle-sidebar-event-key';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { CustomerType } from '@fz-original/app/shared/models/customer/customer-type.enum';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { ActionAttention, MenuItem } from '@fz-original/app/shared/models/header/header.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import {
  unsavedCartChangesModalConfig,
  WithBeforeUnloadHostHandlers,
  WithUnsavedChangesGuardComponent,
} from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { SeatingSelectorComponent } from '@fz-original/app/shared/seating-selector/components/seating-selector/seating-selector.component';
import { SeatingSelectorModule } from '@fz-original/app/shared/seating-selector/seating-selector.module';
import { RealTimeSelection } from '@fz-original/app/shared/seating-selector/services/seating-selector-messenger/messages/real-time-selection-change-message';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { EntryPointClientService } from '@fz-original/app/shared/services/entry-point-client/entry-point-client.service';
import { ErrorModalService } from '@fz-original/app/shared/services/error-modal/error-modal.service';
import { FiscalComplianceBlockModalService } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-modal.service';
import { HeaderStateService } from '@fz-original/app/shared/services/header/header-state.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { discardOnPageHideIfUnsavedChanges, preventUnloadIfUnsavedChanges } from '@fz-original/app/shared/utils/cart-unsaved-changes.util';
import { EmptyStateComponent } from '@fz-shop-products/src/public-api';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { partyQuantityTotal } from '@fz/ticketing';
import {
  IgntAlertComponent,
  IgntButtonComponent as IgntCommonButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
  IgntDialogService,
  IgntToastService,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
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
import { BehaviorSubject, merge, Observable, of, Subject, Subscription } from 'rxjs';
import { filter, finalize, map, scan, switchMap, take, takeUntil } from 'rxjs/operators';

import {
  MembershipsAcceptTermsModalComponent,
  MembershipsAcceptTermsModalData,
} from '../../../memberships/components/accept-terms-modal/accept-terms-modal.component';
import { MembershipsData } from '../../../memberships/models/memberships.model';
import { ossIdentifyMemberActionId, ossIdentifyMemberMenuItem } from '../../../one-stop-shop/utils/oss-identify-member-action.util';
import { HardwareMismatchModalComponent } from '../../components/hardware-mismatch-modal/hardware-mismatch-modal.component';
import { type PosModificationPaymentLink } from '../../models/modification-payment-link.model';
import { PosHardwareCheckResolution } from '../../models/pos-hardware-check.model';
import type { PosPartyHeaderSelection } from '../../models/pos-party-header-selection.model';
import { posPartyMembersActionId } from '../../models/pos-party-members-action.model';
import { PosUiRequest, PosUiRequestKind, PosUiRequestResultMap, type PosHardwareMismatchContext } from '../../models/pos-ui-request.model';
import { toOssTab } from '../../models/store/pos-ticket-selector-store.model';
import { providePointOfSale } from '../../providers/point-of-sale.provider';
import { PosMemberAccountService } from '../../services/member-account/pos-member-account.service';
import { PosMembershipsService } from '../../services/memberships/pos-memberships.service';
import { PosModificationPaymentLinkService } from '../../services/modification-payment-link/pos-modification-payment-link.service';
import { PosOnsiteSetupRefreshService } from '../../services/onsite-setup-refresh/pos-onsite-setup-refresh.service';
import { PosUiPortService } from '../../services/pos-ui-port/pos-ui-port.service';
import { injectPosViewUpdateService } from '../../services/pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../../services/purchase/pos-purchase.service';
import { PosSeatingService } from '../../services/seating/pos-seating.service';
import { PosSecondScreenService } from '../../services/second-screen/pos-second-screen.service';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosTicketSelectorStore } from '../../store/pos-ticket-selector.store';
import { POS_TICKET_SELECTOR_REARCHITECT } from '../../tokens/pos-ticket-selector-rearchitect.token';
import { TICKETING_STRATEGY } from '../../tokens/ticketing-strategy.token';
import { formatExpiryForDisplay } from '../../utils/modification-payment-link-expiry.util';
import {
  posIdentifyMemberAccountActionId,
  posIdentifyMemberAccountMenuItem,
  posRemoveMemberAccountActionId,
  posRemoveMemberAccountMenuItem,
} from '../../utils/pos-identify-member-account-action.util';
import { buildPartyHeaderSelection } from '../../utils/pos-party-header-selection.util';
import { PosDateSelectorComponent } from '../pos-date-selector/pos-date-selector.component';
import { PosPartyHandheldModalService } from '../pos-party-handheld-modal/services/pos-party-handheld-modal.service';
import { PosTicketSelectorComponent } from '../pos-ticket-selector/pos-ticket-selector.component';

/** The 5-click tour-reset easter egg. */
const tourResetClickThreshold = 5;
const tourResetTimeoutMs = 2000;

/**
 * Rearchitected `/box-office` Point of Sale page.
 *
 * UI-only container: it owns the template, the ViewChild wiring, modal opening and pure view state
 * (visible tab, search overlay, tour, mobile sliders). All business state and commands live in
 * the `TICKETING_STRATEGY` implementation injected as `core` — `PointOfSaleTicketing` and the domain
 * services behind it.
 */
@Component({
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'showConfirmOnReload($event)',
    '(window:pagehide)': 'onPageHide($event)',
  },
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
    PosTicketSelectorComponent,
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
    PosDateSelectorComponent,
    IgntTourComponent,
    IgntTourAnchorDirective,
    IgntTagComponent,
    IgntAlertComponent,
    IgntCommonButtonComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntCheckboxComponent,
    OssFiscalActionsComponent,
    OssMomentDatePipe,
    OssModifyOrderValidationModalComponent,
    EmptyStateComponent,
    SeatingSelectorModule,
  ],
  providers: [providePointOfSale()],
  selector: 'app-point-of-sale',
  styleUrl: './point-of-sale.component.scss',
  templateUrl: './point-of-sale.component.html',
})
export class PointOfSaleComponent implements OnInit, OnDestroy, WithBeforeUnloadHostHandlers, WithUnsavedChangesGuardComponent {
  static readonly paymentLinkToastDurationMs = 10_000;

  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #bookingQuestionsModalService = inject(BookingQuestionsModalService);
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #cartService = inject(CartService);
  readonly #cdkDialog = inject(Dialog);
  readonly #checkoutModalFlowService = inject(CheckoutModalFlowService);
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #confirmationDialogService = inject(ConfirmationDialogService);
  readonly #createEventEntryService = inject(CreateEventEntryService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #entryPointClientService = inject(EntryPointClientService);
  readonly #errorHandler = inject(ErrorHandler);
  readonly #errorModalService = inject(ErrorModalService);
  readonly #fiscalComplianceBlockModalService = inject(FiscalComplianceBlockModalService);
  /** Pure-UI events only (search opened, tab switched) — the domain events live in the strategies. */
  readonly #fzTrackingService = inject(FzTrackingService);
  readonly #headerStateService = inject(HeaderStateService);
  readonly #igntToastService = inject(IgntToastService);
  readonly #injector = inject(Injector);
  readonly #modalService = inject(NgbModal);
  readonly #paymentLinkService = inject(PaymentLinkService);
  readonly #planSelectionStore = inject(OssPlanSelectionStore);
  readonly #posTicketingState = inject(PosTicketingState);
  readonly #reservationSettlementSessionService = inject(ReservationSettlementSessionService);
  readonly #router = inject(Router);
  readonly #scannerService = inject(ScannerService);
  readonly #splitPaymentRetryUiService = inject(SplitPaymentRetryUiService);
  readonly #ticketSelectorStore = inject(PosTicketSelectorStore);
  readonly #toastService = inject(ToastService);
  readonly #tourService = inject(IgntTourService);
  readonly #trackPosCheckoutPromoCodesService = inject(TrackPosCheckoutPromoCodesService);
  readonly #translateService = inject(TranslateService);
  readonly #uiPort = inject(PosUiPortService);
  readonly #unsavedChangesBypassService = inject(TicketingUnsavedChangesBypassService);
  #addAdditionalCouponDialogRef: IgntDialogRef<CouponCodeModalResult> | null = null;
  #modifiedOrderRef: IgntDialogRef<void> | null = null;
  #releaseTicketsRef: IgntDialogRef<void> | null = null;
  readonly #checkoutModalClosures = toSignal(this.#checkoutPaymentDriver.sessionEnded$.pipe(scan(count => count + 1, 0)), {
    initialValue: 0,
  });
  /**
   * Declared **above** `core` on purpose: legacy relies on scattered `ChangeDetectorRef` calls through
   * the inheritance chain, and the strategies reach those call sites through this bridge. Field
   * initialisers run top-down, so registering here is what guarantees every strategy is constructed
   * against an already-registered bridge — a `register()` in the constructor body would run after the
   * `core` initialiser below, leaving construction-time calls as silent no-ops.
   */
  readonly #viewUpdateService = injectPosViewUpdateService();

  /** Single entry point to the business layer. Everything the template binds as `core.*`. */
  protected readonly core = inject(TICKETING_STRATEGY);

  /**
   * The identify-member domain, plugged in as lego rather than through the frozen facade — see
   * `docs/guidelines/ticketing-rearchitect.md`. MUST stay **below** `core`: constructing it eagerly
   * injects `PosCartService`, which must not be built ahead of the facade's own cascade.
   */
  readonly #memberships = inject(PosMembershipsService);

  readonly #memberAccount = inject(PosMemberAccountService);

  /** The background check of a setup applied from storage, plugged in as lego; kept **below** `core` like `#memberships`. */
  readonly #onsiteSetupRefresh = inject(PosOnsiteSetupRefreshService);

  /** The By party phone sheet (B2BS-1879), plugged in as lego; kept **below** `core` like `#memberships`. */
  readonly #partyHandheldModal = inject(PosPartyHandheldModalService);
  #hasAutoOpenedPartySheet = false;

  /**
   * The direct-cash shortcut, plugged in as lego rather than through the frozen facade — see
   * `docs/guidelines/ticketing-rearchitect.md`. The purchase domain is already part of the
   * facade's cascade, so this resolves the same instance; kept **below** `core` on the same
   * field-order rule as `#memberships`.
   */
  readonly #purchase = inject(PosPurchaseService);

  readonly #secondScreen = inject(PosSecondScreenService);

  /**
   * The real-time seating snapshot (GIT-1269), plugged in as lego rather than through the frozen
   * facade — see `docs/guidelines/ticketing-rearchitect.md`. The seating domain is already part of
   * the facade's cascade, so this resolves the same instance; kept **below** `core` on the same
   * field-order rule as `#memberships`.
   */
  readonly #seating = inject(PosSeatingService);

  /**
   * The modification payment link (GAME-1976), plugged in as lego: it answers the checkout modal's
   * link request and publishes the outcome the page shows. Kept **below** `core` on the same
   * field-order rule as `#memberships`.
   */
  readonly #modificationPaymentLink = inject(PosModificationPaymentLinkService);

  /** Reused as-is by the duplicated template's onsite-setup empty state. */
  protected readonly onsiteSetupStore = inject(OssOnsiteSetupStore);

  /** Which ticket selector renders the tab region, decided once per page from `pos_ticket_selector_rearchitect`. */
  protected readonly isTicketSelectorRearchitectEnabled: boolean = inject(POS_TICKET_SELECTOR_REARCHITECT);
  /** The phone cart bar's height (`.sticky-panel`), handed to the ticket selector so the taxes note clears it while the bar shows. */
  protected readonly cartBarClearance: string = '5.5rem';

  /**
   * The reservation settlement surface stays off the frozen `TicketingStrategy` contract
   * (`docs/guidelines/ticketing-rearchitect.md`): the component reads the session service and the POS
   * state directly.
   */
  protected readonly isReservationSettlementMismatch: WritableSignal<boolean> = this.#posTicketingState.isReservationSettlementMismatch;
  protected readonly isReservationSettlementRejected: WritableSignal<boolean> = this.#posTicketingState.isReservationSettlementRejected;
  protected readonly reservationSettlementMismatchCopy: Signal<{ description: string; title: string }> = computed(() =>
    this.#posTicketingState.reservationSettlementMismatchReason() === 'amount'
      ? {
          description: 'boxOffice.reservationSettlementBanner.amountChangedDescription',
          title: 'boxOffice.reservationSettlementBanner.amountChangedTitle',
        }
      : {
          description: 'boxOffice.reservationSettlementBanner.mismatchDescription',
          title: 'boxOffice.reservationSettlementBanner.mismatchTitle',
        },
  );

  PaymentTypeEnum = PaymentType;
  seatingProviderEnum = SeatingProviderEnum;

  // ---------------------------------------------------------------------------
  // Component-local UI state (NOT business state — stays out of the strategies)
  // ---------------------------------------------------------------------------

  /** Legacy-shaped read of the store's active tab, for the buttons section and the legacy tab strip. */
  activeTab: Signal<{ tabIndex: number; type: OssTab }> = computed(() => {
    const activeTab = this.#ticketSelectorStore.activeTab();

    return { tabIndex: activeTab.index, type: toOssTab(activeTab.kind) };
  });
  activeTabIndex: Signal<number> = computed(() => this.activeTab().tabIndex);

  /** Viewport flags. */
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');

  /** Cart panel / search overlay / mobile date slider / modal open flags. */
  isCartDetailOpened = false;
  isSearchVisible: WritableSignal<boolean> = signal(false);
  isCustomTabDateSelectorModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  showMobileDateSelector: WritableSignal<boolean> = signal(false);

  protected get mobileDateSelectorTitleKey(): string {
    return getDateSelectorTitleKey(this.core.sessionSelectorType, false);
  }

  protected readonly isReleaseTicketsEnabled = computed(
    () => this.core.releaseTicketsSelectedCount() === this.core.releaseTicketsRequiredCount(),
  );

  /** Guided tour. */
  isTourOpen = false;
  tourConfig: IgntTourConfig = {
    continueOnError: true,
    showProgress: true,
    steps: [],
    tourStorageKey: StorageKey.ossTourCompleted,
  };

  /** Plan/place selector visibility comes straight from the (component-provided) store. */
  protected readonly shouldShowPlanPlaceSelector = computed(() => this.#planSelectionStore.shouldShowPlanPlaceSelector());
  protected readonly ticketSelectorPlaceholder = computed(() => this.#planSelectionStore.ticketSelectorPlaceholder());
  /** Opened from Odoo, the onsite setup belongs to the Odoo till the cashier came from, so it is not changed here. */
  protected readonly canChangeOnsiteSetup: Signal<boolean> = computed(
    () => this.#entryPointClientService.entryPointClient() !== EntryPointClient.Odoo,
  );

  @ViewChild(OssCartDetailComponent) ossCartDetailComponent!: OssCartDetailComponent;
  @ViewChild('ossSearchComponent') ossSearchComponent!: OssSearchComponent;
  @ViewChild('tourComponent') tourComponent!: IgntTourComponent;
  readonly headerCenterTemplate = viewChild<TemplateRef<unknown>>('headerCenterTemplate');
  readonly releaseTicketsTemplate = viewChild<TemplateRef<unknown>>('releaseTicketsTemplate');
  @ViewChild('manageOrderTourTemplate') manageOrderTourTemplate!: TemplateRef<unknown>;
  @ViewChild('seatingSelector', { read: SeatingSelectorComponent, static: false })
  seatingSelectorRef?: SeatingSelectorComponent;

  /** The tour is offered once per resolved setup. */
  #hasTourBeenInitialized = false;
  /** Easter-egg click bookkeeping. */
  #tourResetClickCount = 0;
  #tourResetClickTimeout: ReturnType<typeof setTimeout> | null = null;

  /** The header's feature menu (setup + linked device). */
  readonly #featureMenuItems: Signal<MenuItem[]> = computed(() => {
    const items: MenuItem[] = [];

    if (this.canChangeOnsiteSetup()) {
      items.push({
        icon: ['fal', 'cog'],
        id: 'oss-change-setup',
        label: this.#translateService.instant('oneStopShop.mobileMenu.changeSetup'),
        tag: this.core.displayedOnsiteSetup(),
        tagSentiment: 'info',
      });
    }

    // `activePlan()` is the reactive read that makes this `computed()` re-run on a plan change;
    // `canIdentifyMember()` and `canIdentifyMemberAccount()` read the plain `plan` field and cannot provide it.
    if (this.core.activePlan()?.id != null) {
      if (this.canIdentifyMember()) {
        items.push(
          ossIdentifyMemberMenuItem(
            this.#translateService.instant('boxOffice.memberships.identifyMember.button'),
            this.membershipsData.member?.holder.name ?? null,
          ),
        );
      }

      if (this.canIdentifyMemberAccount()) {
        items.push(
          posIdentifyMemberAccountMenuItem(
            this.#translateService.instant('boxOffice.memberAccount.identify.button'),
            this.#memberAccountMenuBadge(),
          ),
        );

        if (this.memberAccountMemberships.length > 0) {
          items.push(posRemoveMemberAccountMenuItem(this.#translateService.instant('boxOffice.memberAccount.removeConfirmation.button')));
        }
      }
    }

    if (this.core.isLinkDeviceButtonVisible()) {
      items.push({
        icon: ['fal', 'mobile'],
        id: 'oss-link-device',
        label: this.#translateService.instant('oneStopShop.mobileMenu.linkDevice'),
        tag: this.core.displayedDeviceId(),
        tagSentiment: 'info',
      });
    }
    return items;
  });

  /** The header's contextual actions for the active tab; in party mode the person button follows the date one. */
  readonly #headerActions: Signal<MenuItem[]> = computed(() => {
    const actions: MenuItem[] = [];
    const tabKind = this.#ticketSelectorStore.activeTab().kind;

    if (tabKind === 'party-members' || tabKind === 'seating' || tabKind === 'tickets') {
      actions.push({
        icon: ['fas', 'calendar'],
        id: 'oss-calendar',
        label: this.#translateService.instant('menu.calendar'),
      });
      if (this.#ticketSelectorStore.isPartyMembersMode()) {
        actions.push({
          ...this.#partyActionAttention(),
          icon: ['fas', 'users'],
          id: posPartyMembersActionId,
          label: this.#translateService.instant('boxOffice.partyMembers.handheld.partyMembers'),
        });
      }
    } else if (tabKind === 'custom') {
      actions.push({
        icon: ['fas', 'search'],
        id: 'oss-search',
        label: this.#translateService.instant('oneStopShop.mobileMenu.search'),
      });
    }

    return actions;
  });

  /** In party mode the header line never falls back to the per ticket datetime, so it stays blank until a party is picked. */
  readonly isPartyMembersMode: Signal<boolean> = computed(() => this.#ticketSelectorStore.isPartyMembersMode());

  /** The handheld header line in party mode: the day, the hour and the party size, blank until a party is picked. */
  readonly partyHeaderSelection: Signal<PosPartyHeaderSelection | null> = computed(() => {
    this.#viewUpdateService.viewVersion();

    return buildPartyHeaderSelection({
      hourFilter: this.#ticketSelectorStore.partyResolvedHourFilter(),
      isPartyMembersMode: this.#ticketSelectorStore.isPartyMembersMode(),
      locale: this.core.locale,
      nowLabel: this.#translateService.instant('boxOffice.partyMembers.now'),
      quantities: this.#ticketSelectorStore.partyQuantities(),
      selectedDate: this.#ticketSelectorStore.partySelectedDate(),
      timeZone: this.#ticketSelectorStore.partyTimeZone(),
    });
  });

  // ---------------------------------------------------------------------------
  // WithUnsavedChangesGuardComponent + WithBeforeUnloadHostHandlers (OSS flow only, no legacy branch)
  // ---------------------------------------------------------------------------

  readonly unsavedChangesModalConfig = unsavedCartChangesModalConfig;

  areChangesUnsaved = (): boolean => this.core.cartHasItems();

  acceptFunction = (): Observable<void> => this.core.discardCartBeforeNavigation();

  getUnloadDiscardCartQuery = (): DiscardCartQuery | null => this.core.getUnloadDiscardCartQuery();

  shouldBypassUnsavedChangesGuard = (): boolean => this.#unsavedChangesBypassService.consumePendingBypass();

  releaseSeats = (): void => {
    if ((this.seatingSelectorRef?.seatsCounter ?? 0) > 0) {
      this.seatingSelectorRef?.clearSelection({ expireHoldToken: true });
    }
  };

  showConfirmOnReload = preventUnloadIfUnsavedChanges;

  onPageHide = (event: PageTransitionEvent): void => {
    if (this.#unsavedChangesBypassService.hasPendingBypass()) {
      return;
    }
    discardOnPageHideIfUnsavedChanges(this, this.#cartService, event);
  };

  constructor() {
    // Single subscription: the strategies request UI steps, this component owns the modals.
    this.#uiPort.requests$.pipe(takeUntilDestroyed()).subscribe((request: PosUiRequest) => this.#handleUiRequest(request));

    // View handles the business layer drives imperatively (`ViewChild`s are only available later, so
    // the callbacks read them lazily).
    this.core.registerSeatingViewHandlers({
      clearSeatingSelection: () => this.seatingSelectorRef?.clearSelection(),
      finishSeating: () => this.#finishSeating(),
      hasSeatingView: () => this.seatingSelectorRef != null,
      releaseSeats: () => this.releaseSeats(),
      releaseSeatsByReference: (seatReferences: string[]) => this.seatingSelectorRef?.releaseSeatsByReference(seatReferences),
    });
    // Real-time only view handle (GIT-1271), registered on the lego seating service rather than through
    // the frozen facade contract: hands the basket back to the OneBox map after a failed checkout.
    this.#seating.registerSendCartErrorHandler(() => this.seatingSelectorRef?.sendCartError());
    this.core.registerCartDetailViewHandlers({
      clearAllCartItemsWithoutConfirmation: () => this.#clearAllCartItemsWithoutConfirmation(),
    });
    this.core.registerAvailabilityUiHandlers({
      activateSeatingTabIfAvailable: () => this.#ticketSelectorStore.activateSeatingTabIfAvailable(),
      activeTabIndex: () => this.#ticketSelectorStore.activeTabIndex(),
      hideMobileDateSelector: () => this.#hideMobileDateSelectorOnMobile(),
      resetSeatingTabAutoNavigation: () => this.#ticketSelectorStore.resetSeatingTabAutoNavigation(),
    });
    this.#destroyRef.onDestroy(() => {
      this.#modifiedOrderRef?.close();
      this.#releaseTicketsRef?.close();
    });
    effect(() => {
      if (!this.core.modifiedOrder()) {
        untracked(() => this.#modifiedOrderRef?.close());
      }
    });
    effect(() => {
      const isOpen = this.core.isReleaseTicketsSheetOpen();
      const template = this.releaseTicketsTemplate();
      // Re-check once a checkout modal closes: the release step waits until no checkout modal is on screen.
      this.#checkoutModalClosures();
      untracked(() => {
        this.#syncReleaseTicketsDialog(isOpen, template);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  canChangePlan(): boolean {
    return this.#purchase.canChangePlan();
  }

  canIdentifyMemberAccount(): boolean {
    return this.#memberAccount.canIdentifyMemberAccount() && !this.isReservationSettlementMode();
  }

  canIdentifyMember(): boolean {
    return this.#memberships.canIdentifyMember();
  }

  /** No-op while a payment is in flight: the payment spinner does not trap focus, so the keyboard can still reach the button. */
  clearAllCart(): void {
    if (this.core.paymentInProgress) {
      return;
    }
    if (this.ossCartDetailComponent) {
      this.ossCartDetailComponent.clearAllCartItems();
    }
  }

  // ---------------------------------------------------------------------------
  // Template handlers — pure UI (delegate business work to `core`, or to a lego domain service)
  // ---------------------------------------------------------------------------

  handleCouponModalClosed(): void {
    this.core.handleCouponModalClosed();
  }

  footerQuickActions(): CheckoutQuickAction[] {
    return this.#purchase.footerQuickActions();
  }

  identifyMemberAccount(): void {
    this.#memberAccount.identifyMemberAccount();
  }

  identifyMembershipsMember(): void {
    this.#memberships.identifyMembershipsMember();
  }

  isSeatingMapMirrorAvailable(): boolean {
    return this.#secondScreen.isSeatingMapMirrorAvailable();
  }

  get memberAccountMemberships(): Array<MemberAccountMembership> {
    return this.#memberAccount.memberships;
  }

  get membershipsData(): MembershipsData {
    return this.#memberships.membershipsData;
  }

  modalCouponCodeOpened(): void {
    this.core.modalCouponCodeOpened();
  }

  modifyOrderCarriedAdjustment(): Money | null {
    return this.#purchase.getModifyOrderCarriedAdjustment();
  }

  modifyOrderTotal(): Money | null {
    return this.#purchase.getModifyOrderTotal();
  }

  navigateToBoxOfficeSettings(): void {
    this.#router.navigate(['/box-office/settings']);
  }

  navigateToCreateEvent(): void {
    this.#createEventEntryService.handleHeaderCreateEvent();
  }

  ngOnDestroy(): void {
    this.#purchase.clearReservationSettlementSession();
    this.core.resetSecondScreenSeatingMapVisibility();
    this.#toggleFooter(true);
    this.#toggleSidebar(false);
    this.#clearTourResetTimeout();
    this.#headerStateService.clearHeaderActions();
    this.#headerStateService.clearFeatureMenuItems();
    this.#headerStateService.clearCenterContent();
  }

  ngOnInit(): void {
    this.#toggleFooter(false);
    this.#toggleSidebar(false);
    this.#initializeFeatureMenuItems();
    this.#initializeHeaderActions();
    this.#initializePartyAutoOpen();
    this.#initializeScannerService();
    // Must precede the resolution below: `shiftMismatch$` is published *during* `resolveDeepLinkSetup`.
    this.#subscribeToBusinessLayerStreams();
    this.#initializeHeaderCenterContent();
    this.core.resetSecondScreenSeatingMapVisibility();
    this.#resolveSetupAndBootstrap();
  }

  onCloseSearch(): void {
    this.isSearchVisible.set(false);
  }

  /** Square pairs through its own modal, every other gateway through the selector. */
  onLinkDeviceButtonClick(): void {
    this.core.onLinkDeviceButtonClick();
  }

  onOnsiteSetupSelectedFromSlider(result: OSSOnsiteSetupConfig | undefined): void {
    this.core.handleSetupSelectorClosedFromSlider(result);
  }

  /** Five clicks on the setup title re-offer the guided tour. */
  onOnSiteSetupTitleClick(): void {
    this.#clearTourResetTimeout();
    this.#tourResetClickCount++;
    if (this.#tourResetClickCount === tourResetClickThreshold) {
      this.#tourResetClickCount = 0;
      this.#tourService.resetTourCompletion(StorageKey.ossTourCompleted);
      this.startTourModal();
      return;
    }
    this.#tourResetClickTimeout = setTimeout(() => {
      this.#tourResetClickCount = 0;
      this.#tourResetClickTimeout = null;
    }, tourResetTimeoutMs);
  }

  onPlanSelectedFromSlider(config: OSSPlanConfig | undefined): void {
    this.core.handlePlanSelectorClosedFromSlider(config);
  }

  /** The retail search adds one unit and scrolls the cart to it on desktop. */
  onSessionSelected(session: ProductSession): void {
    const previousCount = this.core.selectedTicketsBySessionId.get(session.id.toString()) ?? 0;
    this.core.addProductSessionToCart(session, true);
    this.core.trackPosCartItemQuantityChange({ newCount: previousCount + 1, previousCount, sessionId: session.id, source: 'from_search' });
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

  onTourComplete(): void {
    this.isTourOpen = false;
  }

  openQuickPayment(method: CheckoutPreselectedMethod): void {
    this.#purchase.openQuickPayment(method);
  }

  scrollToCartItem = (sessionId: number): void => {
    if (this.ossCartDetailComponent) {
      this.ossCartDetailComponent.scrollToSessionItem(sessionId);
    }
  };

  protected releaseTickets(): void {
    if (this.isReleaseTicketsEnabled()) {
      this.core.onReleaseTickets();
    }
  }

  removeMemberAccount(): void {
    this.#memberAccount.removeMemberAccount();
  }

  removeMembershipsMember(): void {
    this.#memberships.removeMembershipsMember();
  }

  selectNewDate(): void {
    if (this.isReservationSettlementMode()) {
      return;
    }
    this.#showCustomTabDateSelectorModal(true);
  }

  exitReservationSettlement(): void {
    this.#purchase.exitReservationSettlement();
  }

  isReservationSettlementMode(): boolean {
    return this.#reservationSettlementSessionService.session() !== null;
  }

  selectNewPlan(): void {
    this.selectPlan();
  }

  selectOnsiteSetup(): void {
    this.core.openSetupSelector();
  }

  selectPlan(): void {
    if (this.isReservationSettlementMode()) {
      return;
    }
    this.core.openPlanSelector();
  }

  selectTab(tabIndex: number): void {
    const currentTab = this.activeTab();
    const previousTab = currentTab.type;
    const selectedTab = this.core.availableTabs()[tabIndex];
    if (currentTab.tabIndex !== tabIndex) {
      this.#trackTabSwitched(currentTab.tabIndex, tabIndex);
    }
    this.#ticketSelectorStore.selectTab(tabIndex);
    if (selectedTab === OssTab.TICKETS_AND_ADDONS && previousTab === OssTab.CUSTOM_TABS) {
      this.core.updateTicketTypeFields();
    }
  }

  /**
   * Whether the mounted real-time map belongs to the previous date and is waiting for the new session
   * (`PosAvailabilityService.selectDate`); the template makes it inert meanwhile. Bare member, read off
   * the state like the reservation-settlement flags. Tied to `isRealTimeSeating` so any teardown that
   * nulls the map state lifts the overlay, whichever path forgot to clear the flag.
   */
  isRealTimeMapAwaitingSession(): boolean {
    return this.#posTicketingState.isRealTimeMapAwaitingSession && this.#posTicketingState.isRealTimeSeating;
  }

  /** `(realTimeSelectionChange)` of the seating selector — bare template member, like the other lego wrappers. */
  setRealTimeSelection(selection: RealTimeSelection): void {
    this.#seating.setRealTimeSelection(selection);
  }

  /** `(sessionStarted)` of the seating selector — lifts the inert wait of a kept real-time map. */
  onRealTimeSessionStarted(): void {
    this.#seating.onRealTimeSessionStarted();
  }

  showModifiedOrderModal(): void {
    if (!this.core.modifiedOrder()) {
      return;
    }
    const data: OssModifiedOrderModalDialogData = { mode: this.core.modifiedOrderMode, order: this.core.modifiedOrder };
    this.#modifiedOrderRef = this.#dialogService.openModal(OssModifiedOrderModalComponent, { data, injector: this.#injector, size: 'sm' });
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
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.isTourOpen = true;
          this.tourComponent.startTour();
          return;
        }
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
      });
  }

  translateTabIndexToCustomTabsIndex(index: number): number {
    const tabs = this.core.availableTabs();
    const firstCustomTabIndex = tabs.indexOf(OssTab.CUSTOM_TABS);
    if (firstCustomTabIndex === -1) {
      return 0;
    }
    return index - firstCustomTabIndex;
  }

  // ---------------------------------------------------------------------------
  // Boot sequence
  // ---------------------------------------------------------------------------

  #buildTourSteps(): IgntTourStep[] {
    const steps: IgntTourStep[] = [
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'tabsSelection', 'bottom'),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'tileSelection', 'bottom'),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'dateAndTimeSelector', 'right'),
      this.#tourService.createTourStep('oneStopShop.tour.steps', 'selectPlanPlace', 'bottom'),
      this.#createManageYourOrderTourStep(),
    ];
    if (this.canChangeOnsiteSetup()) {
      steps.push(this.#tourService.createTourStep('oneStopShop.tour.steps', 'setupSelection', 'left'));
    }
    if (this.core.hasProductCatalog()) {
      steps.splice(4, 0, this.#tourService.createTourStep('oneStopShop.tour.steps', 'search', 'bottom'));
    }
    if (this.core.isLinkDeviceButtonVisible()) {
      steps.push(this.#tourService.createTourStep('oneStopShop.tour.steps', 'adyenDeviceSelection', 'left'));
    }
    // `hasShift()` — the same predicate the setup applies to `hasShiftsEnabled`.
    if (this.core.hasShiftsEnabled) {
      steps.splice(5, 0, this.#tourService.createTourStep('oneStopShop.tour.steps', 'shift', 'bottom'));
    }
    return steps;
  }

  #checkAndShowTourModal(): void {
    if (this.isMobile() || this.isTablet()) {
      return;
    }
    const steps = this.#buildTourSteps();
    this.tourConfig = { ...this.tourConfig, steps };
    this.#tourService.setSteps(steps);
    if (!this.#tourService.isTourCompleted(this.tourConfig.tourStorageKey)) {
      setTimeout(() => {
        this.startTourModal();
      }, 1000);
    }
  }

  /** The cart-detail leg of `clearCartFromCartDetail`. */
  #clearAllCartItemsWithoutConfirmation(): void {
    if (this.ossCartDetailComponent) {
      this.ossCartDetailComponent.clearAllCartItemsWithoutConfirmation();
      return;
    }
    // No panel mounted, so the plain confirmed-clear body runs instead.
    this.core.onClearAllConfirmed();
  }

  #clearTourResetTimeout(): void {
    if (this.#tourResetClickTimeout) {
      clearTimeout(this.#tourResetClickTimeout);
      this.#tourResetClickTimeout = null;
    }
  }

  /**
   * Closes the step the UI still shows when the business layer drops its request first, as the purchase
   * pipeline does when the real-time basket expires before the payment is engaged (GIT-1564). Every
   * handler whose step stays on screen while it waits wires it.
   */
  #closeWhenUiRequestCancelled(request: PosUiRequest, close: () => void): void {
    this.#uiPort.requestCancelled(request).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(close);
  }

  #createManageYourOrderTourStep(): IgntTourStep {
    const translationsPath = 'oneStopShop.tour.steps.manageYourOrder';

    const step: IgntTourStep = {
      content: this.#translateService.instant(`${translationsPath}.content`),
      position: 'left',
      stepIdentifier: 'manageYourOrder',
      title: this.#translateService.instant(`${translationsPath}.title`),
    };

    if (this.core.allowMultiTimeSlotSelection && this.manageOrderTourTemplate) {
      step.contentTemplate = this.manageOrderTourTemplate;
    }

    return step;
  }

  #dateSelectorTicketTypes(): Map<string, number> {
    if (this.core.isTabDateDependant(this.#ticketSelectorStore.activeTabIndex())) {
      return new Map();
    }
    return new FilterProductSessionsPipe().transform(this.core.selectedTicketsBySessionType, this.core.productSessions);
  }

  // ---------------------------------------------------------------------------
  // Modals owned by the component
  // ---------------------------------------------------------------------------

  /** Logs and aborts when no seating map is mounted. */
  #finishSeating(): void {
    if (!this.seatingSelectorRef) {
      this.#datadogLogService.logWarn('[PointOfSale] finishSeating called with undefined seatingSelectorRef');
      return;
    }
    this.seatingSelectorRef.finishSeatingSelection();
  }

  #getTabTrackingName(tabIndex: number): string {
    const tabType = this.core.availableTabs()[tabIndex];
    if (tabType === OssTab.CUSTOM_TABS) {
      return this.core.customTabNames()[this.translateTabIndexToCustomTabsIndex(tabIndex)] ?? tabType;
    }
    return tabType;
  }

  /** The three blocking yes/no modals, discriminated exactly as `PosConfirmContext` is. */
  #handleConfirmRequest(request: PosUiRequest<'confirm'>): void {
    const { context } = request;

    if (context.variant === 'modifyOrderValidation') {
      // `mode: 'info'` is terminal; the strategy ignores the answer.
      const dialogRef = this.#cdkDialog.open<boolean | void, OssModifyOrderValidationModalData>(OssModifyOrderValidationModalComponent, {
        data: {
          alertTitle: context.alertTitle,
          message: context.message,
          mode: context.mode,
          title: context.title,
        },
        disableClose: true,
      });
      this.#closeWhenUiRequestCancelled(request, () => {
        dialogRef.close();
      });
      this.#settleUiRequest(request, dialogRef.closed.pipe(map((result: boolean | void): boolean => result === true)));
      return;
    }

    if (context.variant === 'timeslotMismatch') {
      const dialogRef = this.#cdkDialog.open<boolean, OssTimeslotWarningModalData>(OssTimeslotWarningModalComponent, {
        data: {
          newlySelectedDatetime: context.newlySelectedDatetime,
          title: context.title,
        },
        disableClose: true,
      });
      this.#closeWhenUiRequestCancelled(request, () => {
        dialogRef.close();
      });
      this.#settleUiRequest(request, dialogRef.closed.pipe(map((result: boolean | undefined): boolean => result === true)));
      return;
    }

    // `#openShiftConfirmationModal` — the whole config comes from one translation prefix.
    const translate = (key: string): string => this.#translateService.instant(`${context.translationPrefix}.${key}`);
    const modal = this.#modalService.open(ConfirmModalComponent, {
      backdrop: 'static',
      windowClass: 'ticketing-confirmation-modal',
    });
    const component = modal.componentInstance as ConfirmModalComponent;
    component.config = {
      leftButtonText: translate('leftButton').toUpperCase(),
      message: translate('message'),
      rightButtonText: translate('rightButton').toUpperCase(),
      title: translate('title'),
    };
    const response$: Observable<boolean> = component.response.pipe(
      take(1),
      finalize(() => modal.close()),
    );
    this.#closeWhenUiRequestCancelled(request, () => {
      modal.dismiss();
    });
    this.#settleUiRequest(request, merge(modal.dismissed.pipe(map((): boolean => false)), response$));
  }

  /**
   * Opens the modal a strategy asked for and feeds the result back into its pipeline.
   * Strategies never touch NgbModal/Dialog themselves.
   */
  #handleUiRequest(request: PosUiRequest): void {
    switch (request.kind) {
      case 'contactInfo': {
        // `IgntDialogService`, no injector, close shortcuts disabled.
        const dialogRef = this.#dialogService.openModal<ContactInformationModalResult, ContactInformationModalData>(
          ContactInformationModalComponent,
          {
            data: request.context,
            disableCloseShortcuts: true,
            size: 'sm',
          },
        );
        this.#closeWhenUiRequestCancelled(request, () => {
          dialogRef.close();
        });
        this.#settleUiRequest(
          request,
          dialogRef.closed$.pipe(
            // Anything that is not a `USER` customer (including a dismissal) aborts the flow.
            map((result: ContactInformationModalResult): Customer | null =>
              result != null && typeof result === 'object' && 'type' in result && result.type === CustomerType.USER ? result : null,
            ),
          ),
        );
        break;
      }
      case 'bookingQuestions': {
        const { context } = request;
        const answered$: Observable<boolean> =
          context.phase === 'pre'
            ? this.#bookingQuestionsModalService.handlePreBookingQuestions(context.cart as Cart, context.customer)
            : this.#bookingQuestionsModalService.handlePostBookingQuestions(
                new Order({ cart: context.cart ?? undefined, id: context.orderId }),
              );
        // The questions load before the modal opens: a cancellation in between stops the load, so the
        // modal never opens, and one after it closes the modal.
        this.#closeWhenUiRequestCancelled(request, () => {
          this.#cdkDialog.getDialogById(BookingQuestionsModalComponent.bookingQuestionsModalId)?.close(false);
        });
        this.#settleUiRequest(request, answered$.pipe(takeUntil(this.#uiPort.requestCancelled(request))));
        break;
      }
      case 'checkout': {
        // The payment configuration was already resolved by the strategy. Closing the modal without
        // picking a method completes `openAndAwaitMethod` empty, which abandons the request.
        this.#settleUiRequest(request, this.#checkoutModalFlowService.openAndAwaitMethod(request.context));
        this.#closeWhenUiRequestCancelled(request, () => {
          this.#checkoutModalFlowService.dismissActiveModal();
        });
        break;
      }
      case 'cashCalculator': {
        const modal = this.#modalService.open(CashChangeCalculatorModalComponent, {
          backdrop: 'static',
          injector: this.#injector,
          keyboard: false,
        });
        const instance = modal.componentInstance as CashChangeCalculatorModalComponent;
        instance.cart = request.context.cart;
        instance.cashModalMandatory = request.context.cashModalMandatory;
        instance.trackViewEvent = request.context.trackViewEvent;
        this.#closeWhenUiRequestCancelled(request, () => {
          modal.dismiss();
        });
        this.#settleUiRequest(request, merge(instance.cashReceived, modal.dismissed.pipe(map((): { amount: number } | null => null))));
        break;
      }
      case 'confirm': {
        this.#handleConfirmRequest(request);
        break;
      }
      case 'error': {
        // `showModal` — `logError` is forwarded as-is so the modal's own Mixpanel event keeps the same
        // on/off behaviour.
        const { error, errorCode, logError, message, title, windowClass } = request.context;
        this.#errorModalService.open({ error, errorCode, logError, message, title, windowClass });
        this.#uiPort.respond(request, undefined);
        break;
      }
      case 'fiscalComplianceBlock': {
        this.#fiscalComplianceBlockModalService.open(request.context.code, () => this.#checkoutModalFlowService.dismissActiveModal());
        this.#uiPort.respond(request, undefined);
        break;
      }
      case 'hardwareMismatch': {
        const dialogRef = this.#dialogService.openModal<PosHardwareCheckResolution, PosHardwareMismatchContext>(
          HardwareMismatchModalComponent,
          {
            data: request.context,
            // `md`: the three warning buttons overflow the 480px `sm` shell.
            size: 'md',
          },
        );
        this.#closeWhenUiRequestCancelled(request, () => {
          dialogRef.close();
        });
        this.#settleUiRequest(
          request,
          dialogRef.closed$.pipe(
            // ✕ and Escape close without a resolution: the operator cancelled.
            map(
              (resolution: PosHardwareCheckResolution | undefined): PosHardwareCheckResolution =>
                resolution ?? PosHardwareCheckResolution.cancelled,
            ),
          ),
        );
        break;
      }
      case 'membershipsAcceptTerms': {
        const dialogRef = this.#dialogService.openModal<boolean, MembershipsAcceptTermsModalData>(MembershipsAcceptTermsModalComponent, {
          data: { email: request.context.email, fullName: request.context.fullName },
          disableCloseShortcuts: true,
          size: 'sm',
        });
        this.#closeWhenUiRequestCancelled(request, () => {
          dialogRef.close();
        });
        this.#settleUiRequest(
          request,
          dialogRef.closed$.pipe(filter((accepted: boolean | undefined): accepted is true => accepted === true)),
        );
        break;
      }
      default: {
        const unhandledRequest: never = request;
        throw new Error(`Unhandled PosUiRequest: ${JSON.stringify(unhandledRequest)}`);
      }
    }
  }

  /** Only mobile/tablet hide the date slider after a session is picked. */
  #hideMobileDateSelectorOnMobile(): void {
    if (this.isMobile() || this.isTablet()) {
      this.showMobileDateSelector.set(false);
    }
  }

  #initializeCustomTilesTicketTypesEffect(): void {
    const effectRef = effect(
      () => {
        const activeTabData = this.core.activeCustomTab();
        const activeTabKind = this.#ticketSelectorStore.activeTab().kind;
        const tilesData = activeTabData?.tilesData;

        if (!tilesData || activeTabKind !== 'custom') {
          return;
        }

        this.#posTicketingState.selectionVersion();

        untracked(() => {
          this.core.addCustomTileSessionsToTicketTypes(tilesData);
          this.core.addProductSessionsByCustomTabsProductSessions(tilesData);
        });
      },
      { injector: this.#injector },
    );
    this.core.registerResettableEffect(effectRef);
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
      if (actionId === posIdentifyMemberAccountActionId) {
        this.identifyMemberAccount();
      }
      if (actionId === posRemoveMemberAccountActionId) {
        this.removeMemberAccount();
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
        this.#openDateSelection();
      }
      if (actionId === posPartyMembersActionId) {
        this.#partyHandheldModal.openPartyMembers();
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

  /**
   * A handheld that lands in party mode with no party opens the party sheet once, as soon as the day's members
   * are known; after Cancel the page keeps its empty state and the header arrow instead of reopening it.
   */
  #initializePartyAutoOpen(): void {
    effect(
      () => {
        const shouldOpen =
          !this.#hasAutoOpenedPartySheet &&
          (this.isMobile() || this.isTablet()) &&
          this.#ticketSelectorStore.isPartyMembersMode() &&
          this.#ticketSelectorStore.partyMembers().length > 0 &&
          partyQuantityTotal(this.#ticketSelectorStore.partyQuantities()) === 0;

        if (shouldOpen) {
          this.#hasAutoOpenedPartySheet = true;
          untracked(() => this.#partyHandheldModal.openPartyMembers());
        }
      },
      { injector: this.#injector },
    );
  }

  // ---------------------------------------------------------------------------
  // Pure-UI internals
  // ---------------------------------------------------------------------------

  /** The barcode/keyboard scanner feeds the business layer's dispatch. */
  #initializeScannerService(): void {
    this.#scannerService
      .observeScanCode()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((code: string) => {
        this.core.handleProductScannedCode(code);
      });
  }

  #memberAccountMenuBadge(): string | null {
    const badge: MemberAccountBadge | null = memberAccountBadge(this.memberAccountMemberships);
    if (badge === null) {
      return null;
    }

    return this.#translateService.instant(badge.key, badge.params);
  }

  /**
   * The per-setup initialiser block.
   *
   * `PosSetupService` runs positions 1-2 (`#initializeAvailablePlans`, `#initializeCustomTabsData`)
   * itself and then emits `setupBootstrap$`; the rest follows in the same order, with the custom-tiles
   * effect (position 3) here because it depends on the visually active tab.
   */
  #onSetupBootstrap(): void {
    this.#initializeCustomTilesTicketTypesEffect();
    this.core.initialiseResolvedSetupEffects();
  }

  /**
   * Parity with `OssTicketingComponent.openAddAdditionalCouponModal` (B2BS-1447): opens
   * `CouponCodeModalComponent` via `IgntDialogService`. The modal stays open across attempts and
   * only closes once the apply left no error behind; "Open scanner" reopens with the scanned code.
   */
  #openAddAdditionalCouponModal(inputCode?: string): void {
    this.core.couponError.next(null);
    const couponCode$ = new Subject<CouponCodeEvent>();
    const scannedCode$ = new BehaviorSubject<string | null>(null);

    this.#addAdditionalCouponDialogRef = this.#dialogService.openModal<CouponCodeModalResult>(CouponCodeModalComponent, {
      data: {
        couponCode$,
        error: this.core.couponError,
        hasNavigation: false,
        inputCode,
        lazyCouponType: null,
        scannedCode: scannedCode$,
        subtitleKey: 'oneStopShop.couponCodeSelector.subtitle',
        title: this.#translateService.instant('oneStopShop.couponCodeSelector.title'),
      },
      size: 'sm',
    });

    couponCode$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(({ code }: CouponCodeEvent) => {
      this.core
        .applyCouponOneStep$(code, null)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          if (this.core.couponError.getValue() === null && this.#addAdditionalCouponDialogRef) {
            this.#addAdditionalCouponDialogRef.close();
            this.#addAdditionalCouponDialogRef = null;
          }
        });
    });

    this.#addAdditionalCouponDialogRef.closed$
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: CouponCodeModalResult) => {
        this.#addAdditionalCouponDialogRef = null;
        if (result === 'Open scanner') {
          this.#trackPosCheckoutPromoCodesService.trackOpenManualScanner('additional');
          const scannerRef = this.#dialogService.openModal<string>(ScannerComponent, { size: 'sm' });
          scannerRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((scannedValue: string | undefined) => {
            this.#openAddAdditionalCouponModal(scannedValue);
          });
        }
      });
  }

  #partyActionAttention(): ActionAttention {
    const partySize = partyQuantityTotal(this.#ticketSelectorStore.partyQuantities());

    return partySize > 0 ? { badge: String(partySize) } : {};
  }

  /** Party mode opens the date sheet; every other tab keeps the lateral date selector. */
  #openDateSelection(): void {
    if (this.#ticketSelectorStore.isPartyMembersMode()) {
      this.#partyHandheldModal.openDate();

      return;
    }

    this.showMobileDateSelector.set(true);
  }

  #openSearch(): void {
    this.isSearchVisible.set(true);
    this.#fzTrackingService.track(posSearchOpened());
  }

  /**
   * Deep-link setup resolution, then the ticketing bootstrap. Rendering is not gated behind a
   * `*ngIf` — the copied template renders its own pre-resolution empty state.
   *
   * Parity-locked: `core.initialise()` lives inside the `canBootstrap` branch, not in `ngOnInit`. On
   * a shift mismatch `canBootstrap` is `false`, so none of the per-mount listeners may run and only
   * the end-shift modal shows. In every path `initialise()` must precede `resolveOnsiteSetup()`.
   */
  #resolveSetupAndBootstrap(): void {
    this.core
      .resolveDeepLinkSetup()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((canBootstrap: boolean) => {
        if (!canBootstrap) {
          this.#viewUpdateService.markForCheck();
          return;
        }
        // Runs every per-mount listener the business layer owns.
        this.core.initialise();
        const params = this.#activatedRoute.snapshot.queryParams;
        this.core
          .resolveOnsiteSetup(params['onsiteSetupId'], params['venueId'])
          .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
          .subscribe();
      });
  }

  /**
   * Settles `request` from `result$`: the first emission responds, and a completion that carried no
   * emission abandons the request so the requesting pipeline completes silently and still runs its
   * `finalize`.
   *
   * **Every** asynchronous branch of {@link #handleUiRequest} must go through here rather than
   * calling `respond` from a next-only callback: handler observables can legitimately complete empty
   * (closing the checkout modal without picking a method), which would otherwise park the purchase
   * pipeline forever with `isCheckoutModalFlow` stuck at `true`. A handler that errors is abandoned the
   * same way and surfaces the generic error modal.
   */
  #settleUiRequest<Kind extends PosUiRequestKind>(request: PosUiRequest<Kind>, result$: Observable<PosUiRequestResultMap[Kind]>): void {
    let hasResponded = false;
    result$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
      complete: () => {
        if (!hasResponded) {
          this.#uiPort.respondComplete(request);
        }
      },
      // A failing handler abandons the request like an empty one, so the pipeline never stays parked,
      // and tells the operator the step did not go through. The request is settled first: the global
      // handler (Sentry, Datadog) is not ours and must not leave the pipeline parked if it throws.
      error: (error: unknown) => {
        this.#uiPort.respondComplete(request);
        this.#errorHandler.handleError(error);
        this.#errorModalService.open({ message: 'errors.generic' });
      },
      next: (result: PosUiRequestResultMap[Kind]) => {
        hasResponded = true;
        this.#uiPort.respond(request, result);
      },
    });
  }

  #showCustomTabDateSelectorModal(hasCloseButton: boolean): void {
    this.isCustomTabDateSelectorModalOpen.set(true);
    const modal = this.#modalService.open(OssDateSelectorModalComponent, {
      backdrop: hasCloseButton,
      keyboard: hasCloseButton,
      modalDialogClass: 'oss-onsite-setup-selector-modal',
    });
    let sessionReadySubscription = Subscription.EMPTY;
    modal.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((selectedDatetime: string | null) => {
      if (selectedDatetime) {
        this.core.loadQuickTilesByDateTime(selectedDatetime);
      }
      sessionReadySubscription.unsubscribe();
      this.isCustomTabDateSelectorModalOpen.set(false);
    });
    modal.dismissed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      sessionReadySubscription.unsubscribe();
      this.isCustomTabDateSelectorModalOpen.set(false);
    });
    const updateModalProperties = (): void => {
      modal.componentInstance.allowMultiTimeSlot = this.core.allowMultiTimeSlotSelection;
      modal.componentInstance.datesAvailability = this.core.datesAvailability;
      modal.componentInstance.displayedSessionType = this.core.displayedSessionType;
      modal.componentInstance.displayedSessionTypeChange = (sessionType: SessionAvailabilitySummaryByDateType) =>
        this.core.handleDisplayedSessionTypeChange(sessionType);
      modal.componentInstance.hasCloseButton = hasCloseButton;
      modal.componentInstance.handleShowAvailabilityFromDateChange = (date: string) => this.core.handleShowAvailabilityFromDateChange(date);
      modal.componentInstance.loadMore = (daysWithActiveSession?: number) => this.core.loadMoreDays(daysWithActiveSession);
      modal.componentInstance.locale = this.core.locale;
      modal.componentInstance.isLoadingDates = this.core.isLoadingDates;
      modal.componentInstance.isLoadingSessions = this.core.isLoadingSessions || this.core.isLoadingDateSessions;
      modal.componentInstance.regularSessionAvailabilitySummaryByDate = this.core.regularSessionAvailabilitySummaryByDateList;
      modal.componentInstance.selectedAvailabilityFromDate = this.core.selectedAvailabilityFromDate;
      modal.componentInstance.selectedDateAvailability = this.core.selectedDateAvailability;
      modal.componentInstance.selectedDateChange = (dateAvailability: DateAvailability) => this.core.selectDate(dateAvailability);
      // Parity-locked: dead in practice, but must stay assigned. The modal declares
      // `selectedSessionChange` as a *data* property (oss-date-selector-modal.component.ts:54) and
      // never invokes it — the picked timeslot only ever reaches us through `modal.closed` above. An
      // unbound method reference here would throw if ever called; this bound closure is the harmless
      // equivalent.
      modal.componentInstance.selectedSessionChange = (session: SessionAvailabilitySummaryByDate) => this.core.selectSession(session);
      modal.componentInstance.sessionSelectorType = this.core.sessionSelectorType;
      modal.componentInstance.shouldShowDateSelector = this.core.onsiteSetupSelected?.max_purchasable_days > 1;
      modal.componentInstance.showCapacity = this.core.includeTimeSlotCapacity;
      modal.componentInstance.showLoadMoreButton =
        this.core.nextAvailableDate && (!this.core.onsiteSetupSelected || this.core.onsiteSetupSelected?.max_purchasable_days > 1);
      modal.componentInstance.ticketTypes = this.#dateSelectorTicketTypes();
      modal.componentInstance.timezone = this.core.timezone;
      modal.componentInstance.selectedSession = this.core.modalPreferredSessionSummary();

      modal.componentInstance.triggerChangeDetection();
    };
    sessionReadySubscription = this.core.sessionAvailableReady.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      updateModalProperties();
    });
  }

  /** The deep link landed on a setup the open shift disagrees with. */
  #showEndShiftRequiredModal(): void {
    const modal = this.#modalService.open(OssOnsiteSetupModalComponent, {
      backdrop: true,
      keyboard: true,
      modalDialogClass: 'oss-onsite-setup-selector-modal',
    });
    modal.componentInstance.hasCloseButton = true;
    modal.componentInstance.hasActiveShiftAndActiveOnsiteSetup = true;
  }

  #showLinkedDeviceModal(paymentConfiguration: PaymentConfiguration): void {
    const modalRef = this.#modalService.open(OssLinkedDeviceModalComponent, {
      backdrop: 'static',
      injector: this.#injector,
      keyboard: false,
      modalDialogClass: 'oss-linked-device-modal',
      size: 'md',
    });
    modalRef.componentInstance.paymentConfiguration = paymentConfiguration;
    // Subscribes to `closed` only: a dismissed modal never resumes the interrupted payment. The
    // configuration this modal was opened with is handed back rather than re-read from the strategy,
    // so interleaved opens can't resolve against each other's config.
    modalRef.closed
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: string | undefined) => this.core.handleLinkedDeviceSelectorClosed(paymentConfiguration, result));
  }

  /**
   * The cart is discarded first, as leaving the page would, so the reload skips the unsaved-changes prompt.
   * Once the check is cancelled the modal is about a setup no longer being resolved, so it closes without confirming,
   * and an OK still discarding the cart stops before it reloads with that stale setup.
   */
  #showOnsiteSetupMessageModal(keyPrefix: string, onConfirm: () => void): void {
    const dialogRef = this.#dialogService.openMessageModal(
      this.#translateService.instant(`${keyPrefix}.title`),
      this.#translateService.instant(`${keyPrefix}.message`),
    );
    this.#onsiteSetupRefresh.cancelled$
      .pipe(take(1), takeUntil(dialogRef.closed$), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => dialogRef.close());
    dialogRef.closed$
      .pipe(
        take(1),
        filter((confirmed: boolean | undefined) => confirmed === true),
        switchMap(() => (this.areChangesUnsaved() ? this.acceptFunction() : of(undefined))),
        takeUntil(this.#onsiteSetupRefresh.cancelled$),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => onConfirm());
  }

  #showOnsiteSetupModal(data: OssOnsiteSetupModalData): void {
    if (this.isMobile() || this.isTablet()) {
      this.#headerStateService.closeMenu();
    }
    const dialogRef = this.#dialogService.openModal<OssOnsiteSetupModalResult, OssOnsiteSetupModalData>(OssOnsiteSetupModalComponent, {
      data,
      disableCloseShortcuts: !data.hasCloseButton,
      injector: this.#injector,
      size: 'md',
    });

    dialogRef.closed$
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: OssOnsiteSetupModalResult | undefined) => this.core.handleSetupSelectorClosed(result));
  }

  /** The opened-event tracking lives in the strategy. */
  #showPlanSelectionModal(data: OssPlanSelectionModalData): void {
    const dialogRef = this.#dialogService.openModal<OssPlanSelectionModalResult, OssPlanSelectionModalData>(
      OssPlanSelectionModalComponent,
      {
        data,
        disableCloseShortcuts: false,
        size: 'md',
      },
    );

    dialogRef.closed$
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((config: OssPlanSelectionModalResult | undefined) => this.core.handlePlanSelectorClosed(config));
  }

  /**
   * Every fire-and-forget stream the business layer publishes: the result never feeds a pipeline, so
   * the component just performs the UI side effect.
   */
  #openModificationPaymentLink(paymentLink: PosModificationPaymentLink): void {
    const expiresAt = formatExpiryForDisplay(
      paymentLink.expiresAt,
      this.#modificationPaymentLink.timezone(),
      this.#translateService.currentLang,
    );
    this.#igntToastService.positive(this.#translateService.instant('boxOffice.modificationPaymentLink.created', { expiresAt }), {
      duration: PointOfSaleComponent.paymentLinkToastDurationMs,
    });
    this.#paymentLinkService.openModal({
      availableLanguages: paymentLink.availableLanguages,
      cartId: paymentLink.cartId,
      defaultLanguage: paymentLink.defaultLanguage,
      onModalClosed: () => this.#modificationPaymentLink.navigateToReservation(paymentLink),
      // The reservation exists even when its URLs fail to load: open it so staff can share the link from there.
      onModalUnavailable: () => this.#modificationPaymentLink.navigateToReservation(paymentLink),
      placeId: paymentLink.placeId,
      planId: paymentLink.planId,
      reservationEmail: paymentLink.customerEmail,
      reservationId: paymentLink.reservationId,
    });
  }

  #subscribeToBusinessLayerStreams(): void {
    this.core.setupBootstrap$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#onSetupBootstrap());

    this.#modificationPaymentLink.paymentLinkCreated$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((paymentLink: PosModificationPaymentLink) => this.#openModificationPaymentLink(paymentLink));

    this.#modificationPaymentLink.checkoutEnded$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((messageKey: string) => this.#errorModalService.open({ message: messageKey }));

    this.core.onsiteSetupSelectorRequests$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((data: OssOnsiteSetupModalData) => this.#showOnsiteSetupModal(data));

    this.core.planSelectorRequests$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((data: OssPlanSelectionModalData) => this.#showPlanSelectionModal(data));

    // Component-owned half of `#resetState`.
    this.core.stateReset$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#ticketSelectorStore.resetActiveTab();
      this.#hasTourBeenInitialized = false;
      this.#tourResetClickCount = 0;
      this.#clearTourResetTimeout();
    });

    this.core.tourInitializationRequested$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (this.#hasTourBeenInitialized) {
        return;
      }
      this.#hasTourBeenInitialized = true;
      this.#checkAndShowTourModal();
    });

    this.core.additionalCouponModalRequested$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#openAddAdditionalCouponModal());

    this.core.shiftMismatch$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#showEndShiftRequiredModal());

    this.core.linkedDeviceSelectorRequests$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(request => this.#showLinkedDeviceModal(request.paymentConfiguration));

    this.core.squareConnectionSelectorRequests$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(request => {
      const modalRef = this.#modalService.open(SquareConnectionModalComponent);
      modalRef.componentInstance.squareConfiguration = request.squareConfiguration;
      modalRef.componentInstance.deviceId = request.deviceId;
      modalRef.componentInstance.planId = request.planId;
      modalRef.result.then(
        // The request's own configuration is echoed back so interleaved opens can never resolve
        // against each other's config.
        (result: { deviceId: string | undefined } | null) =>
          this.core.handleSquareConnectionSelectorClosed(request.paymentConfiguration, result),
        // A dismissed Square modal is intentionally a no-op.
        () => {},
      );
    });

    this.core.closeSearchRequested$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.onCloseSearch());

    this.core.splitPaymentCancellationError$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(({ cartId, partnerId, transactionId }) =>
        this.#splitPaymentRetryUiService.showCancellationErrorModal(partnerId, cartId, transactionId),
      );

    this.core.closeCartDetailWhenEmpty$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (!this.core.cartHasItems() && this.isCartDetailOpened) {
        this.isCartDetailOpened = false;
        this.#viewUpdateService.markForCheck();
      }
    });

    this.core.scrollToCartItem$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((sessionId: number) => this.scrollToCartItem(sessionId));

    this.#onsiteSetupRefresh.removed$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(removedOnsiteSetupId =>
        this.#showOnsiteSetupMessageModal('boxOffice.onsiteSetupRemovedModal', () =>
          this.#onsiteSetupRefresh.reloadWithoutOnsiteSetup(removedOnsiteSetupId),
        ),
      );

    this.#onsiteSetupRefresh.updated$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(latestOnsiteSetup =>
        this.#showOnsiteSetupMessageModal('boxOffice.onsiteSetupUpdatedModal', () =>
          this.#onsiteSetupRefresh.reloadWithLatestOnsiteSetup(latestOnsiteSetup),
        ),
      );
  }

  #syncReleaseTicketsDialog(isOpen: boolean, template: TemplateRef<unknown> | undefined): void {
    if (!isOpen) {
      this.#releaseTicketsRef?.close();
      this.#releaseTicketsRef = null;
      return;
    }
    if (template !== undefined && this.#releaseTicketsRef === null && !this.#checkoutPaymentDriver.isActive()) {
      this.#releaseTicketsRef = this.#dialogService.openModal(template, { disableCloseShortcuts: true, size: 'sm' });
    }
  }

  #toggleFooter(isActive: boolean): void {
    window.dispatchEvent(new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, { detail: { isActive } }));
  }

  #toggleSidebar(isOpen: boolean): void {
    window.dispatchEvent(new CustomEvent(TOGGLE_SIDEBAR_EVENT_KEY, { detail: { isOpen } }));
  }

  /** A pure-UI event. */
  #trackTabSwitched(fromTabIndex: number, toTabIndex: number): void {
    this.#fzTrackingService.track(
      posTabSwitched({
        fromTab: this.#getTabTrackingName(fromTabIndex),
        toTab: this.#getTabTrackingName(toTabIndex),
      }),
    );
  }
}
