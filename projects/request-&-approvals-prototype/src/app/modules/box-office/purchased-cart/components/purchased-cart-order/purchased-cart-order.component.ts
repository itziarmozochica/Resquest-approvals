import { CurrencyPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  input,
  OnInit,
  output,
  Output,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { ImageCollageComponent } from '@fz-original/app/shared/components/image-collage/image-collage.component';
import { ImageCollage } from '@fz-original/app/shared/components/image-collage/models/image-collage.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { TicketReleaseConditionAction } from '@fz-original/app/shared/models/order/release-condition.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { MomentDatePipe } from '@fz-original/app/shared/pipes/moment-date.pipe';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ReceiptPrinterType } from '../../../shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '../../../shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfiguration } from '../../../shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '../../../shared/services/payment/payment-config-storage.service';
import { canPrintOnAdyenTerminal } from '../../../shared/utils/adyen-terminal-printing.util';
import { OneStepMultiCartDetailSessionsComponent } from '../../../ticketing/components/one-step-multi-cart-detail-sessions/one-step-multi-cart-detail-sessions.component';
import { FlexibleBundlePurchase } from '../../models/flexible-bundle-purchase.model';
import { PurchasedCartDiscountLine, PurchasedCartDiscountLineType } from '../../models/purchased-cart-discount-line.model';

export interface SessionsByDatetimeAndVenue {
  datetime: string;
  venueName: string;
  sessions: CartSession[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntLinkComponent,
    IgntTagComponent,
    IgntWrapperCardComponent,
    ImageCollageComponent,
    NgIf,
    NgTemplateOutlet,
    OneStepMultiCartDetailSessionsComponent,
    PipesModule,
    TranslateModule,
  ],
  providers: [MomentDatePipe],
  selector: 'app-purchased-cart-order',
  standalone: true,
  styleUrls: ['./purchased-cart-order.component.scss'],
  templateUrl: './purchased-cart-order.component.html',
})
export class PurchasedCartOrderComponent implements OnInit {
  static readonly KEY_SEPARATOR = '|||';

  @Input({ required: true }) mainPlan!: Plan;
  @Input({ required: true }) cartSessionsByDatetime!: Map<string, CartSession[]>;
  @Input({ required: true }) order!: Order;
  @Input({ required: true }) showValidateButton!: boolean;

  readonly agreementAction = input<TicketReleaseConditionAction | null>(null);
  readonly agreementBlocked = input(false);
  readonly agreementNoticeVisible = input(false);
  readonly flexibleBundle = input<FlexibleBundlePurchase | null>(null);
  @Input() isFiscalReprintEnabled = false;
  @Input() isReprintingFiscalReceipt = false;
  @Input() isValidating = false;

  readonly openAgreementList = output<void>();
  @Output() validateTickets = new EventEmitter<unknown>();
  @Output() openTickets = new EventEmitter<unknown>();
  @Output() openDeliveryNote = new EventEmitter<unknown>();
  @Output() printReceipt = new EventEmitter<unknown>();

  readonly #translate = inject(TranslateService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #momentDatePipe = inject(MomentDatePipe);
  #optimizelyService = inject(OptimizelyService);
  #userService = inject(UserService);
  #dualScreenStorageService = inject(DualScreenStorageService);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #router = inject(Router);
  readonly #breakpointStateService = inject(BreakpointStateService);

  locale: string = this.#translate.currentLang;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isDualScreen: boolean = this.#dualScreenStorageService.containsData();
  isMobilePos: boolean = this.#paymentConfigStorageService.isMobilePos();
  hasAdyenDeviceConfig: boolean = this.#checkAdyenConfig();
  isEpsonReceiptPrinter: boolean = this.#onsiteSetupsStorageService.getConfiguration()?.receipt_printer_type === ReceiptPrinterType.epson;
  hasViewTicketDisabled =
    this.#optimizelyService.isFeatureEnabled('do_not_print_tickets_after_selling') || !this.#userService.hasPermission('can_reprint');
  #onsiteAgreementsEnabled: boolean = this.#optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_ONSITE_AGREEMENTS) === true;

  /**
   * The entry point to the agreement documents is flag-gated, and the backend can also switch the
   * affordance off per order through `releaseCondition.action.isEnabled`. With no action at all we
   * still offer it behind a local label, so a blocked order is never a dead end.
   */
  protected readonly showAgreementAction: Signal<boolean> = computed(() => {
    const action = this.agreementAction();
    return this.agreementBlocked() && this.#onsiteAgreementsEnabled && (action === null || action.isEnabled);
  });

  get shouldOpenInNewTab(): boolean {
    return !this.isDualScreen && !this.isMobilePos;
  }

  loadingDeliveryNote: WritableSignal<boolean> = signal<boolean>(false);
  orderAmount: WritableSignal<Money | null> = signal<Money | null>(null);
  productItems: WritableSignal<CartSession[]> = signal<CartSession[]>([]);
  sessionItemsByDatetimeAndVenue: WritableSignal<SessionsByDatetimeAndVenue[]> = signal<SessionsByDatetimeAndVenue[]>([]);
  uniqueVenueNames: Signal<string[]> = computed(() =>
    Array.from(
      new Set(
        this.sessionItemsByDatetimeAndVenue()
          .map(item => item.venueName)
          .filter(Boolean),
      ),
    ),
  );
  planHasMultipleVenues: Signal<boolean> = computed(() => this.uniqueVenueNames().length > 1);
  protected readonly bundleScheduledSlots = computed(() =>
    (this.flexibleBundle()?.scheduling.scheduledSlots ?? []).map(slot => ({
      attractionNames: slot.attractionNames,
      label: this.#momentDatePipe.transform(slot.startsAt, 'EEE, MMM d, y h:mm a', slot.timezone ?? undefined, this.locale) ?? '',
      startsAt: slot.startsAt,
    })),
  );
  protected readonly bundlePendingAttractionNames = computed(() => this.flexibleBundle()?.scheduling.pendingAttractionNames ?? []);
  validationsUrl: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly mainPlanCoverImage = computed<ImageCollage>(() => ({
    alt: `${this.mainPlan.name} - Cover image`,
    url: this.mainPlan.pictureURL ?? '',
  }));
  protected readonly discountLines = computed(() => this.#getDiscountLines());
  protected readonly discountLineType = PurchasedCartDiscountLineType;

  ngOnInit() {
    this.orderAmount.set(this.#getOrderAmount());
    this.validationsUrl.set(this.#getOrderValidationUrl());
    this.#splitProductAndSessionItems();
  }

  trackByDatetimeAndVenue(_index: number, item: SessionsByDatetimeAndVenue): string {
    return `${item.datetime}${PurchasedCartOrderComponent.KEY_SEPARATOR}${item.venueName}`;
  }

  getCouponDiscount(coupon: Coupon): Money {
    return new Money(-coupon.discount.amount, coupon.discount.currency);
  }

  deliveryNote(): void {
    this.loadingDeliveryNote.set(true);
    this.openDeliveryNote.emit();
  }

  /** Ignite disables via `aria-disabled`, so the host still receives clicks. */
  validateTicketsClick(): void {
    if (this.agreementBlocked()) {
      return;
    }
    this.validateTickets.emit();
  }

  openTicketsClick(): void {
    if (this.agreementBlocked()) {
      return;
    }
    this.openTickets.emit();
  }

  navigateToValidations(event: MouseEvent): void {
    if (!this.shouldOpenInNewTab) {
      event.preventDefault();
      const url = this.validationsUrl();
      if (url) {
        this.#router.navigateByUrl(url);
      }
    }
  }

  #getOrderAmount(): Money | null {
    const bundleTotal = this.flexibleBundle()?.total ?? null;
    if (bundleTotal !== null) {
      return bundleTotal;
    }

    if (this.order.cart?.total) {
      return this.order.cart.total;
    }

    if (
      this.cartSessionsByDatetime.size === 0 ||
      Array.from(this.cartSessionsByDatetime.values()).every(cartSessions => cartSessions.length === 0)
    ) {
      return null;
    }

    let totalAmount = 0;
    let currency: string | undefined;
    for (const cartSessions of this.cartSessionsByDatetime.values()) {
      cartSessions.forEach(cartSession => {
        if (!cartSession.price || !cartSession.totalSurchargePerTicket) {
          return;
        }
        if (!currency) {
          currency = cartSession.price.currency;
        }
        if (cartSession.autoAppliedPlanDiscountsInfo) {
          // 'unitPriceWithDiscount' property is the price of single unit with discount
          totalAmount +=
            cartSession.autoAppliedPlanDiscountsInfo.unitPriceWithDiscount.amount * cartSession.units +
            cartSession.totalSurchargePerTicket.amount;
        } else {
          // 'price' property is the total sum of (unitPrice * units)
          totalAmount += cartSession.price.amount + cartSession.totalSurchargePerTicket.amount;
        }
      });
    }

    if (this.order.cart?.appliedCoupon?.discount) {
      totalAmount -= this.order.cart.appliedCoupon.discount.amount;
    }

    return new Money(totalAmount, currency!);
  }

  #getDiscountLines(): PurchasedCartDiscountLine[] {
    const breakdown = this.flexibleBundle()?.breakdown;
    const coupon = breakdown !== undefined ? breakdown.coupon : this.#getOrderCoupon();
    const bundleDiscount = breakdown?.bundleDiscount ?? null;

    return [
      ...(coupon !== null
        ? [{ amount: this.getCouponDiscount(coupon), label: coupon.code, type: PurchasedCartDiscountLineType.Coupon }]
        : []),
      ...(bundleDiscount !== null
        ? [
            {
              amount: bundleDiscount,
              label: this.#translate.instant('boxOffice.purchaseConfirmation.bundleDiscount'),
              type: PurchasedCartDiscountLineType.BundleDiscount,
            },
          ]
        : []),
    ];
  }

  #getOrderCoupon(): Coupon | null {
    return this.order.cart?.coupons?.discounts?.length ? null : (this.order.cart?.appliedCoupon ?? null);
  }

  #getOrderValidationUrl(): string {
    return this.#router.serializeUrl(this.#router.createUrlTree(['/validation'], { queryParams: { type: 'order', id: this.order.id } }));
  }

  #checkAdyenConfig(): boolean {
    const paymentConfig: PaymentConfiguration | undefined = this.#paymentConfigStorageService.getConfiguration();

    return Boolean(paymentConfig?.deviceId) && canPrintOnAdyenTerminal(paymentConfig, this.#onsiteSetupsStorageService.getConfiguration());
  }

  #splitProductAndSessionItems(): void {
    const productItems: CartSession[] = [];
    const sessionItemsByDatetimeAndVenue: Map<string, CartSession[]> = new Map<string, CartSession[]>();

    this.cartSessionsByDatetime.forEach((cartSessions: CartSession[], datetime: string) => {
      cartSessions.forEach((cartSession: CartSession) => {
        if (cartSession.sessionType?.isShopProduct) {
          productItems.push(cartSession);
          return;
        }

        const venueName = cartSession.sessionVenueName ?? '';
        const key = `${datetime}${PurchasedCartOrderComponent.KEY_SEPARATOR}${venueName}`;

        if (!sessionItemsByDatetimeAndVenue.has(key)) {
          sessionItemsByDatetimeAndVenue.set(key, [cartSession]);
          return;
        }
        sessionItemsByDatetimeAndVenue.get(key)?.push(cartSession);
      });
    });

    this.productItems.set(productItems);
    this.sessionItemsByDatetimeAndVenue.set(this.#sortSessionsByVenueNameAndDatetime(sessionItemsByDatetimeAndVenue));
  }

  #sortSessionsByVenueNameAndDatetime(sessionItemsByDatetimeAndVenue: Map<string, CartSession[]>): SessionsByDatetimeAndVenue[] {
    const entries = Array.from(sessionItemsByDatetimeAndVenue.entries());
    entries.sort((a, b) => {
      const venueNameA = a[1][0]?.sessionVenueName ?? '';
      const venueNameB = b[1][0]?.sessionVenueName ?? '';
      const venueComparison = venueNameA.localeCompare(venueNameB);

      if (venueComparison === 0) {
        const [datetimeA] = a[0].split(PurchasedCartOrderComponent.KEY_SEPARATOR);
        const [datetimeB] = b[0].split(PurchasedCartOrderComponent.KEY_SEPARATOR);
        return datetimeA.localeCompare(datetimeB);
      }

      return venueComparison;
    });

    return entries.map(([key, sessions]) => {
      const [datetime, venueName] = key.split(PurchasedCartOrderComponent.KEY_SEPARATOR);
      return { datetime, venueName, sessions };
    });
  }

  getLabelForDatetimeSessions(item: SessionsByDatetimeAndVenue): string {
    const firstCartSession: CartSession | null = item.sessions.length !== 0 ? item.sessions[0] : null;
    const timezone = firstCartSession?.sessionTimezone || undefined;
    return this.#momentDatePipe.transform(item.datetime, 'EEE, MMM d, y h:mm a', timezone, this.locale) ?? '';
  }

  getVenueNameForSessions(item: SessionsByDatetimeAndVenue): string {
    return item.venueName;
  }
}
