import { DragDropModule } from '@angular/cdk/drag-drop';
import { CurrencyPipe, KeyValue, KeyValuePipe, NgForOf, NgIf, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  output,
  Output,
  Signal,
  signal,
  SimpleChanges,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ConfirmationDialogService } from '@fz-original/app/memberships/services/confirmation-dialog/confirmation-dialog.service';
import { PlanDiscount } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { CartLinePriceEditorComponent } from '@fz-original/app/shared/cart/components/cart-line-price-editor/cart-line-price-editor.component';
import { CART_DETAIL_SERVICE, CartDetailService } from '@fz-original/app/shared/cart/services/cart-detail.service';
import { CartDetailComponent } from '@fz-original/app/shared/components/cart-detail/cart-detail.component';
import { CartSessionManualPriceChange } from '@fz-original/app/shared/models/cart/cart-session-manual-price.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { ChannelTranslatePipe } from '@fz-original/app/shared/pipes/channel-translate/channel-translate.pipe';
import { CartUtil, RealTimeSeatCard } from '@fz-original/app/shared/utils/cart.util';
import { safeStepQuantity, snapToStep, stepDown, stepUp } from '@fz-original/app/shared/utils/ticket-step.util';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { UpdateTicketTypeCounter } from '../../models';
import { OssMomentDatePipe } from '../../pipes/oss-moment-date.pipe';
import { CART_LINE_PRICE_CONTROL } from './cart-line-price-control.token';
import { NativeSwipeHorizontalDirective } from './native-swipe-horizontal.directive';
import { UNAVAILABLE_CART_SESSION_IDS } from './unavailable-cart-session-ids.token';

export interface SessionsByDatetimeAndVenue {
  datetime: string;
  venueId: number | undefined;
  sessions: CartSession[];
}

export interface SessionsByPlan {
  productSessions: CartSession[];
  regularSessions: SessionsByDatetimeAndVenue[];
}

const CLEAR_ALL_GHOST_CLASS = 'cart-clear-all-ghost';
const CLEAR_ALL_ROW_SELECTOR =
  '.swipe-container, .cart-ticket-item, .cart-plan-header, .cart-ticket-list__title-wrapper, .cart-coupon-item';
const CLEAR_ALL_STAGGER_MS = 45;
const CLEAR_ALL_MAX_DELAY_MS = 270;
const CLEAR_ALL_PEEK_MS = 110;
const CLEAR_ALL_SLIDE_MS = 260;
const CLEAR_ALL_FADE_MS = 150;
const CLEAR_ALL_SAFETY_TIMEOUT_MS = 1000;

export interface TimeslotActivationFromCartPayload {
  datetime: string;
  planId: number;
  venueId?: number;
}

@Component({
  selector: 'app-oss-cart-detail',
  standalone: true,
  templateUrl: './oss-cart-detail.component.html',
  styleUrls: ['./oss-cart-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    TitleCasePipe,
    ChannelTranslatePipe,
    {
      provide: CartDetailService,
      useFactory: () => inject(CART_DETAIL_SERVICE, { optional: true }) ?? new CartDetailService(),
    },
  ],
  imports: [
    TranslateModule,
    NgIf,
    NgTemplateOutlet,
    KeyValuePipe,
    CurrencyPipe,
    NgForOf,
    IgntFieldErrorComponent,
    IgntIconComponent,
    OssMomentDatePipe,
    ReactiveFormsModule,
    DragDropModule,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntTagComponent,
    NativeSwipeHorizontalDirective,
    CartLinePriceEditorComponent,
  ],
})
export class OssCartDetailComponent extends CartDetailComponent implements OnChanges, OnInit {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #confirmationDialogService = inject(ConfirmationDialogService);
  #destroyRef = inject(DestroyRef);
  #formBuilder = inject(FormBuilder);
  readonly #linePriceControl = inject(CART_LINE_PRICE_CONTROL, { optional: true });
  /** `${datetime}|${sessionId}` of the single line whose price editor is open. */
  readonly #editingLinePriceKey: WritableSignal<string | null> = signal<string | null>(null);
  #clearAllGhost: HTMLElement | null = null;
  #clearAllGhostTimeoutId: ReturnType<typeof setTimeout> | null = null;
  readonly #hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  #translate = inject(TranslateService);
  readonly #unavailableSessionIds = inject(UNAVAILABLE_CART_SESSION_IDS, { optional: true });
  readonly #zone = inject(NgZone);

  @Input() addCounterSessionId: Subject<number> = new Subject<number>();
  @ViewChild('cartContainer', { static: false }) cartContainer!: ElementRef<HTMLDivElement>;
  @Input() couponDiscount: Coupon | null = null;
  @Input() forceDisableIncreaseCounter = false;
  couponsCount = input<number>(0);
  couponRemainingBalance = input<Money | null>(null);
  planDiscounts = input<PlanDiscount[] | null>(null);
  @Output() discountRemoved = new EventEmitter<void>();
  @Input() currentVenueId: number | null = null;
  @Input() currentPlanId: number | null = null;
  @Input() currentSelectedDatetime: string | null = null;
  @Input() isMobile = false;
  @Input() plansById: Map<number, Plan> = new Map();

  isLoadingTimeslot: WritableSignal<boolean> = signal<boolean>(false);
  itemAddedEffect: WritableSignal<string | null> = signal<string | null>(null);
  itemRemovedEffect: WritableSignal<string | null> = signal<string | null>(null);
  hasMultiplePlansInCart: WritableSignal<boolean> = signal<boolean>(false);
  hasDifferentPlanThanSelected: WritableSignal<boolean> = signal<boolean>(false);
  isCartLocked = input(false);
  sessionsByPlan: WritableSignal<Map<number, SessionsByPlan>> = signal<Map<number, SessionsByPlan>>(new Map());
  readonly #realTimeSeatCardsByLineKey: WritableSignal<Map<string, RealTimeSeatCard[]>> = signal<Map<string, RealTimeSeatCard[]>>(
    new Map(),
  );
  /** Keyed by `datetime|sessionId`, the same pair the template iterates, so a cloned or rebuilt line still finds its cards. */
  protected readonly realTimeSeatCardsByLineKey: Signal<Map<string, RealTimeSeatCard[]>> = this.#realTimeSeatCardsByLineKey.asReadonly();
  @Input({ required: true }) productTicketTypes: TicketType[] = [];
  venueNamesById: WritableSignal<Map<number, string>> = signal<Map<number, string>>(new Map());
  ticketsFormGroup: FormGroup = this.#formBuilder.group({});
  @Input({ required: true }) ticketTypes: TicketType[] = [];
  @Output() ticketTypesCounterChange: EventEmitter<{
    bySessionId: Map<string, number>;
    bySessionType: Map<string, number>;
  }> = new EventEmitter<{ bySessionId: Map<string, number>; bySessionType: Map<string, number> }>();
  timeslotActivated = output<TimeslotActivationFromCartPayload>();
  @Input({ required: true }) timezone!: string;
  @Output() clearAllConfirmed = new EventEmitter<void>();
  @Output() updatedSessionIdCounter = new EventEmitter<UpdateTicketTypeCounter>();

  clearAllCartItems(): void {
    if (this.isCartLocked()) {
      return;
    }
    this.#confirmationDialogService
      .confirm({
        title: this.#translate.instant('oneStopShop.cart.clearAllModal.title'),
        message: this.#translate.instant('oneStopShop.cart.clearAllModal.message'),
        acceptLabel: this.#translate.instant('oneStopShop.cart.clearAllModal.acceptButton'),
        cancelLabel: this.#translate.instant('oneStopShop.cart.clearAllModal.cancelButton'),
        isDanger: true,
        customStyle: true,
      })
      .subscribe(result => {
        if (result) {
          this.#playClearAllGhostAnimation();
          this.clearAllCartItemsWithoutConfirmation();
        }
      });
  }

  clearAllCartItemsWithoutConfirmation(): void {
    if (this.isCartLocked()) {
      return;
    }
    if (!this.cart || !this.cart.sessionItemsByDatetime) {
      this.clearAllConfirmed.emit();
      return;
    }
    const sessionIds = Object.keys(this.ticketsFormGroup.controls);
    const cartSessions = Array.from(this.cart.sessionItemsByDatetime.values()).flat();

    if (this.couponDiscount) {
      this.couponDiscount = null;
      this.discountRemoved.emit();
    }

    sessionIds.forEach(sessionId => {
      const cartSession = cartSessions.find(session => session.sessionId === parseInt(sessionId));
      if (cartSession) {
        this.#updateTicketsCounter(cartSession, 0);
      }
    });
    this.clearAllConfirmed.emit();
  }

  decreaseTicketCounter(cartSession: CartSession, datetime?: string): void {
    if (this.isCartLocked()) {
      return;
    }
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === cartSession.sessionId);
    if (!ticketType) return;

    const originalCounter = parseInt(this.getFormControlByName(cartSession.sessionId ?? '')?.value) || 0;
    const counter = this.#stepDown(originalCounter, ticketType);

    this.#updateTicketsCounter(cartSession, counter, datetime);
    this.#triggerItemRemovedEffect(this.getCartItemEffectKey(cartSession, datetime));
  }

  decreaseRemovesLine(session: CartSession): boolean {
    if (this.isCartSessionSeatingLine(session)) {
      return true;
    }
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === session.sessionId);
    const minimum = ticketType ? this.#effectiveMinimum(ticketType) : 1;
    return session.units <= minimum;
  }

  getCartSessionBookingFee(session: CartSession): Money | null {
    const fee = session.totalSurchargePerTicket;
    return fee && fee.amount > 0 ? fee : null;
  }

  getPartySizeWarnings(sessions: CartSession[]): string[] {
    if (this.isCartLocked()) {
      return [];
    }
    return CartUtil.getPartySizeWarnings(sessions, this.#translate);
  }

  getSessionPriceWithoutDiscount(session: CartSession): Money | null {
    const discountsInfo = session.autoAppliedPlanDiscountsInfo;
    if (
      !this.cart ||
      !this.planDiscounts()?.length ||
      !discountsInfo ||
      discountsInfo.unitPriceWithoutDiscount.amount <= discountsInfo.unitPriceWithDiscount.amount
    ) {
      return null;
    }
    return this.cart.getCartSessionPrice(session.units, discountsInfo.unitPriceWithoutDiscount);
  }

  getFormControlByName(name: number | string): AbstractControl | null {
    return this.ticketsFormGroup.get([name.toString()]);
  }

  getMaxValueBySessionId(sessionId: number): number {
    return this.#allTicketTypes().find(ticket => ticket.sessionId === sessionId)?.maximum ?? 1;
  }

  increaseTicketCounter(cartSession: CartSession, datetime?: string) {
    if (this.isCartLocked()) {
      return;
    }
    if (this.isSessionUnavailable(cartSession) || this.#isCapacityIncreaseBlocked(cartSession)) {
      return;
    }
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === cartSession.sessionId);
    if (!ticketType) return;

    const originalCounter = parseInt(this.getFormControlByName(cartSession.sessionId ?? '')?.value) || 0;
    const counter = this.#stepUp(originalCounter, ticketType);

    this.#updateTicketsCounter(cartSession, counter, datetime);
    this.#triggerItemAddedEffect(this.getCartItemEffectKey(cartSession, datetime));
  }

  isDecreaseDisabled(session: CartSession, datetime: string): boolean {
    if (this.isCartLocked()) {
      return true;
    }
    if (this.isLoadingTimeslot()) {
      return true;
    }
    return !this.#isSessionEditable(session, datetime);
  }

  isIncreaseDisabled(session: CartSession, datetime: string): boolean {
    if (this.isSessionUnavailable(session)) {
      return true;
    }
    if (this.isCartLocked()) {
      return true;
    }
    if (this.isLoadingTimeslot()) {
      return true;
    }
    if (this.isCartSessionSeatingLine(session)) {
      return true;
    }
    if (!this.#isSessionEditable(session, datetime)) {
      return true;
    }
    if (this.#isCapacityIncreaseBlocked(session)) {
      return true;
    }
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === session.sessionId);
    if (!ticketType) {
      return session.units === this.getMaxValueBySessionId(session.sessionId);
    }

    return this.#stepUp(session.units, ticketType) === session.units;
  }

  isInputDisabled(session: CartSession, datetime: string): boolean {
    if (this.isSessionUnavailable(session)) {
      return true;
    }
    if (this.isCartLocked()) {
      return true;
    }
    if (this.isLoadingTimeslot()) {
      return true;
    }
    if (this.isCartSessionSeatingLine(session)) {
      return true;
    }
    if (session.sessionType?.isShopProduct) {
      return false;
    }
    return !this.#isSessionEditable(session, datetime);
  }

  isTimeslotGroupInactive(planId: number | null, datetime: string, venueId: number | undefined): boolean {
    if (this.currentPlanId != null && planId != null && planId !== this.currentPlanId) {
      return true;
    }
    if (this.currentVenueId != null && venueId !== undefined && venueId !== this.currentVenueId) {
      return true;
    }
    if (this.currentSelectedDatetime !== null && this.currentSelectedDatetime !== datetime) {
      return true;
    }
    return false;
  }

  hasMultipleTimeslotsInPlan(planSessions: SessionsByPlan): boolean {
    return this.#getRegularTimeslotGroupsWithSessions(planSessions).length > 1;
  }

  hasSingleTimeslotInPlan(planSessions: SessionsByPlan): boolean {
    return this.#getRegularTimeslotGroupsWithSessions(planSessions).length === 1;
  }

  shouldShowPlanLevelEdit(planId: number, planSessions: SessionsByPlan): boolean {
    const [singleTimeslot] = this.#getRegularTimeslotGroupsWithSessions(planSessions);
    if (!singleTimeslot) {
      return false;
    }
    const hasSeatingSessions = singleTimeslot.sessions.some(session => this.isCartSessionSeatingLine(session));
    if (hasSeatingSessions) {
      return false;
    }

    return this.isTimeslotGroupInactive(planId, singleTimeslot.datetime, singleTimeslot.venueId);
  }

  shouldShowTimeslotLevelEdit(planId: number, planSessions: SessionsByPlan, timeslotGroup: SessionsByDatetimeAndVenue): boolean {
    if (!this.isTimeslotGroupInactive(planId, timeslotGroup.datetime, timeslotGroup.venueId)) {
      return false;
    }
    if (this.hasMultipleTimeslotsInPlan(planSessions)) {
      return true;
    }
    const hasSeatingSessions = timeslotGroup.sessions.some(session => this.isCartSessionSeatingLine(session));
    return !hasSeatingSessions && !this.shouldShowPlanHeaders();
  }

  activateSingleTimeslotForPlan(planId: number, planSessions: SessionsByPlan): void {
    const [singleTimeslot] = this.#getRegularTimeslotGroupsWithSessions(planSessions);
    if (!singleTimeslot) {
      return;
    }

    this.timeslotActivated.emit({
      datetime: singleTimeslot.datetime,
      planId,
      venueId: singleTimeslot.venueId,
    });
  }

  getActivateTimeslotLabelKey(planId: number, venueId: number | undefined): string {
    if (this.currentPlanId != null && planId !== this.currentPlanId) {
      return 'oneStopShop.cart.activateEventAndTimeSlot';
    }
    if (this.currentVenueId != null && venueId !== undefined && venueId !== this.currentVenueId) {
      return 'oneStopShop.cart.activateEventAndTimeSlot';
    }
    return 'oneStopShop.cart.activateTimeSlot';
  }

  getCompactSeatLabelsForUi(session: CartSession): string[] {
    return CartUtil.getCompactSessionSeatLabelsForUi(session);
  }

  isSwipeActionsVisible(session: CartSession, datetime: string): boolean {
    if (this.isCartLocked()) {
      return false;
    }
    return this.#isSessionEditable(session, datetime);
  }

  isCartSessionSeatingLine(session: CartSession): boolean {
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

  #isSessionEditable(session: CartSession, datetime: string): boolean {
    if (session.sessionType?.isShopProduct) {
      return true;
    }
    const planId = session.mainPlanId ?? this.currentPlanId;
    return !this.isTimeslotGroupInactive(planId ?? null, datetime, session.sessionAddressId);
  }

  #getRegularTimeslotGroupsWithSessions(planSessions: SessionsByPlan): SessionsByDatetimeAndVenue[] {
    return planSessions.regularSessions.filter(timeslotGroup => timeslotGroup.sessions.length > 0);
  }

  #mergeProductSessionsBySessionId(productSessions: CartSession[]): CartSession[] {
    const bySessionId = new Map<number, CartSession>();
    for (const session of productSessions) {
      const sessionId = session.sessionId ?? 0;
      const accumulated = bySessionId.get(sessionId);
      if (accumulated) {
        const merged = accumulated.clone();
        merged.units = (accumulated.units ?? 0) + (session.units ?? 0);
        bySessionId.set(sessionId, merged);
      } else {
        bySessionId.set(sessionId, session.clone());
      }
    }
    return Array.from(bySessionId.values());
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes.cart) {
      this.#closeLinePriceEditorIfLineGone();
    }

    if (changes.currentSelectedDatetime && !changes.currentSelectedDatetime.firstChange) {
      this.isLoadingTimeslot.set(true);
    }

    const cartChanged = changes.cart?.currentValue && changes.cart.currentValue !== changes.cart.previousValue;
    if (cartChanged) {
      const currentCart: Cart = changes.cart.currentValue;
      const previousCart: Cart | undefined = changes.cart.previousValue;
      if (currentCart.sessionItemsByDatetime) {
        const productSessionsByPlan = new Map<number, CartSession[]>();
        const regularSessionsByPlan = new Map<number, Map<string, CartSession[]>>();

        currentCart.sessionItemsByDatetime.forEach((sessions, datetime) => {
          sessions.forEach(sessionItem => {
            const planId = sessionItem.mainPlanId ?? this.currentPlanId ?? undefined;
            if (planId == null) {
              return;
            }

            if (sessionItem.sessionType?.isShopProduct === true) {
              if (!productSessionsByPlan.has(planId)) {
                productSessionsByPlan.set(planId, []);
              }
              productSessionsByPlan.get(planId)!.push(sessionItem);
              return;
            }

            const venueId = sessionItem.sessionAddressId;
            const key = `${datetime}|${venueId ?? ''}`;

            if (!regularSessionsByPlan.has(planId)) {
              regularSessionsByPlan.set(planId, new Map<string, CartSession[]>());
            }
            const planSessions = regularSessionsByPlan.get(planId)!;
            if (!planSessions.has(key)) {
              planSessions.set(key, []);
            }
            planSessions.get(key)!.push(sessionItem);
          });
        });

        const productSessionsByPlanDeduplicated = new Map<number, CartSession[]>();
        productSessionsByPlan.forEach((sessions, planId) => {
          productSessionsByPlanDeduplicated.set(planId, this.#mergeProductSessionsBySessionId(sessions));
        });

        const sortedRegularSessionsByPlanAndVenue = this.#sortRegularSessionsByVenueAndDatetime(regularSessionsByPlan);
        this.sessionsByPlan.set(this.#buildSessionsByPlan(productSessionsByPlanDeduplicated, sortedRegularSessionsByPlanAndVenue));
        this.hasMultiplePlansInCart.set(this.sessionsByPlan().size > 1);
        this.#realTimeSeatCardsByLineKey.set(this.#buildRealTimeSeatCardsByLineKey(currentCart.sessionItemsByDatetime));
        this.#updateHasDifferentPlanThanSelected(this.sessionsByPlan());
        this.#syncFormWithCartSessions(currentCart.sessionItemsByDatetime, previousCart?.sessionItemsByDatetime);
        this.#changeDetectorRef.detectChanges();

        if (this.isLoadingTimeslot()) {
          setTimeout(() => {
            this.isLoadingTimeslot.set(false);
            this.#changeDetectorRef.detectChanges();
          });
        }
      }
    }

    if (changes.plansById?.currentValue) {
      this.venueNamesById.set(this.#buildVenueNamesById(changes.plansById.currentValue as Map<number, Plan>));
    }

    if (
      (changes['ticketTypes'] || changes['productTicketTypes']) &&
      this.ticketsFormGroup &&
      Object.keys(this.ticketsFormGroup.controls).length > 0
    ) {
      this.#refreshTicketCounterValidators();
    }
  }

  ngOnInit() {
    super.ngOnInit();
    this.#destroyRef.onDestroy(() => this.#removeClearAllGhost());
    this.addCounterSessionId.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(sessionId => {
      const previousCounter = parseInt(this.getFormControlByName(sessionId)?.value) || 0;
      this.#incrementCounterBySessionId(sessionId);
      const newCounter = parseInt(this.getFormControlByName(sessionId)?.value) || 0;
      if (newCounter === previousCounter) {
        return;
      }
      this.#emitCounterChangeUpdated(false);
      this.updatedSessionIdCounter.emit({ sessionId, newCounter });
    });
  }

  normalizeSessionInput($event: Event, cartSession: CartSession, datetime?: string): void {
    if (this.isCartLocked()) {
      return;
    }
    const input = $event.target as HTMLInputElement;
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === cartSession.sessionId);
    if (!ticketType) return;

    const minimum = this.#effectiveMinimum(ticketType);
    const previousCounter = cartSession.units ?? 0;
    const parsedCounter = parseInt(input.value.length === 0 ? '0' : input.value, 10);
    const normalizedCounter = Number.isNaN(parsedCounter) ? minimum : this.#snap(parsedCounter, ticketType);
    const isIncreaseBlocked = normalizedCounter > previousCounter && this.#isCapacityIncreaseBlocked(cartSession);
    const nextCounter = isIncreaseBlocked ? previousCounter : normalizedCounter;

    input.value = nextCounter.toString();

    if (cartSession.units === nextCounter && this.getFormControlByName(cartSession.sessionId ?? '')?.value === input.value) {
      return;
    }

    this.#updateTicketsCounter(cartSession, nextCounter, datetime);
  }

  onDelete(session: CartSession, datetime?: string) {
    if (this.isCartLocked()) {
      return;
    }
    this.#updateTicketsCounter(session, 0, datetime);
  }

  preventInvalidCharacters(event: Event): boolean {
    const input = (event as InputEvent).data;
    if (input && !this.#isInputValid(input)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  removeAppliedDiscount(): void {
    if (this.isCartLocked()) {
      return;
    }
    this.couponDiscount = null;
    this.discountRemoved.emit();
  }

  scrollToSessionItem(sessionId: number): void {
    this.#zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.#isItemVisibleOnScreen(sessionId);
      });
    });
  }

  selectInputContent(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  trackByDatetimeAndVenue(_index: number, item: SessionsByDatetimeAndVenue): string {
    return `${item.datetime}|${item.venueId ?? ''}`;
  }

  trackByFn(_: number, value: CartSession): string {
    return value.sessionId?.toString() ?? '';
  }

  trackByPlanKey(_index: number, item: KeyValue<number, SessionsByDatetimeAndVenue[]>): number {
    return item.key;
  }

  getCartItemEffectKey(session: CartSession, datetime?: string): string {
    const safeDatetime = datetime ?? session.sessionStartAt ?? '';
    return `${session.mainPlanId ?? ''}|${safeDatetime}|${session.sessionAddressId ?? ''}|${session.sessionId}`;
  }

  #buildUpdateTicketTypeCounterPayload(cartSession: CartSession, newCounter: number, datetime?: string): UpdateTicketTypeCounter {
    const hasValidLineContext = datetime !== undefined && datetime !== 'products';
    return {
      sessionId: cartSession.sessionId,
      newCounter,
      ...(hasValidLineContext
        ? {
            datetime,
            mainPlanId: cartSession.mainPlanId ?? null,
            venueId: cartSession.sessionAddressId ?? null,
          }
        : {}),
    };
  }

  updateSession($event: Event, cartSession: CartSession, datetime?: string): void {
    if (this.isCartLocked()) {
      return;
    }
    const input = $event.target as HTMLInputElement;
    const newCounter = input.value === '' ? '0' : input.value;
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === cartSession.sessionId);
    if (!ticketType) return;

    const minimum = this.#effectiveMinimum(ticketType);
    const previousValue = cartSession.units ?? 0;
    const parsedCounter = parseInt(newCounter, 10);
    if (parsedCounter < minimum) {
      this.getFormControlByName(cartSession.sessionId ?? '')?.setValue(input.value.length === 0 ? '0' : input.value, {
        emitEvent: false,
      });
      return;
    } else {
      cartSession.units = this.#snap(parsedCounter, ticketType);
      input.value = cartSession.units.toString();
    }

    if (cartSession.units > previousValue && this.#isCapacityIncreaseBlocked(cartSession)) {
      cartSession.units = previousValue;
      input.value = previousValue.toString();
    }

    const aggregatedCounter = this.#getAggregatedCounterForSessionId(cartSession.sessionId) ?? cartSession.units;
    this.getFormControlByName(cartSession.sessionId ?? '')?.setValue(aggregatedCounter.toString(), { emitEvent: false });
    if (cartSession.units > previousValue) {
      this.#triggerItemAddedEffect(this.getCartItemEffectKey(cartSession, datetime));
    } else if (cartSession.units < previousValue) {
      this.#triggerItemRemovedEffect(this.getCartItemEffectKey(cartSession, datetime));
    }
    this.updatedSessionIdCounter.emit(this.#buildUpdateTicketTypeCounterPayload(cartSession, cartSession.units, datetime));
    this.#emitCounterChangeUpdated();
  }

  #addControlValidators(sessionId: number): void {
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === sessionId);
    if (!ticketType?.sessionId) {
      return;
    }

    const maxValue = this.getMaxValueBySessionId(ticketType.sessionId);
    const minimum = this.#effectiveMinimum(ticketType);
    const control = this.getFormControlByName(ticketType.sessionId);
    control?.setValidators([this.#getMinValidator(minimum), Validators.max(maxValue)]);
  }

  #effectiveMinimum(ticketType: TicketType): number {
    return ticketType.getEffectiveMin();
  }

  #stepDown(current: number, ticketType: TicketType): number {
    return stepDown(current, this.#effectiveMinimum(ticketType), ticketType.maximum, safeStepQuantity(ticketType.stepQuantity));
  }

  #stepUp(current: number, ticketType: TicketType): number {
    return stepUp(current, this.#effectiveMinimum(ticketType), ticketType.maximum, safeStepQuantity(ticketType.stepQuantity));
  }

  #snap(value: number, ticketType: TicketType): number {
    return snapToStep(value, this.#effectiveMinimum(ticketType), ticketType.maximum, safeStepQuantity(ticketType.stepQuantity));
  }

  #refreshTicketCounterValidators(): void {
    for (const key of Object.keys(this.ticketsFormGroup.controls)) {
      const sessionId = parseInt(key, 10);
      if (Number.isNaN(sessionId)) {
        continue;
      }
      this.#addControlValidators(sessionId);
      this.getFormControlByName(sessionId)?.updateValueAndValidity({ emitEvent: false });
    }
    this.ticketsFormGroup.updateValueAndValidity({ emitEvent: false });
  }

  #addNewControlToFormGroup(sessionId: number, counter: number): void {
    this.ticketsFormGroup.addControl(sessionId.toString(), new FormControl<string>(counter.toString()), { emitEvent: false });
  }

  #allTicketTypes(): TicketType[] {
    return [...this.productTicketTypes, ...this.ticketTypes];
  }

  #findCartSessionBySessionId(sessionId: number): CartSession | undefined {
    if (!this.cart?.sessionItemsByDatetime) {
      return undefined;
    }
    for (const sessions of this.cart.sessionItemsByDatetime.values()) {
      const match = sessions.find(s => s.sessionId === sessionId);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  /** The catalogue price per ticket of a line that offers "Edit price", or `null` when the host gives the line no price control. */
  linePriceCatalogUnitPrice(session: CartSession): Money | null {
    return this.#linePriceControl?.catalogUnitPriceBySessionId().get(session.sessionId) ?? null;
  }

  linePriceControlHint(): string | null {
    return this.#linePriceControl?.disabledHint() ?? null;
  }

  isEditingLinePrice(session: CartSession, datetime: string): boolean {
    return this.#editingLinePriceKey() === this.#linePriceKey(session, datetime);
  }

  openLinePriceEditor(session: CartSession, datetime: string, event: Event): void {
    event.stopPropagation();
    // `ignt-button` keeps firing `(click)` while `[disabled]`, so the handler holds the same condition as the template.
    if (this.#isLinePriceBlocked() || this.linePriceCatalogUnitPrice(session) === null) {
      return;
    }
    this.#editingLinePriceKey.set(this.#linePriceKey(session, datetime));
  }

  applyLinePrice(session: CartSession, datetime: string, change: CartSessionManualPriceChange): void {
    const cartDatetime = this.#cartDatetimeOf(session.sessionId, datetime);
    if (this.#isLinePriceBlocked() || cartDatetime === null) {
      return;
    }
    this.#editingLinePriceKey.set(null);
    this.#linePriceControl?.apply(cartDatetime, session.sessionId, change);
  }

  clearLinePrice(session: CartSession, datetime: string, event: Event): void {
    event.stopPropagation();
    const cartDatetime = this.#cartDatetimeOf(session.sessionId, datetime);
    if (this.#isLinePriceBlocked() || cartDatetime === null) {
      return;
    }
    this.#editingLinePriceKey.set(null);
    this.#linePriceControl?.clear(cartDatetime, session.sessionId);
  }

  closeLinePriceEditor(): void {
    this.#editingLinePriceKey.set(null);
  }

  #isLinePriceBlocked(): boolean {
    return this.#linePriceControl === null || this.linePriceControlHint() !== null || this.isCartLocked() || this.isCartUpdating();
  }

  #linePriceKey(session: CartSession, datetime: string): string {
    return `${datetime}|${session.sessionId}`;
  }

  /** Shop products are grouped under `products` whatever cart key holds them, so the cart key is looked up by session id. */
  #cartDatetimeOf(sessionId: number, datetime: string): string | null {
    const sessionItemsByDatetime = this.cart?.sessionItemsByDatetime;
    if (!sessionItemsByDatetime) {
      return null;
    }
    const holdsSession = (sessions: CartSession[] | undefined): boolean =>
      sessions?.some((cartSession: CartSession) => cartSession.sessionId === sessionId) === true;
    if (holdsSession(sessionItemsByDatetime.get(datetime))) {
      return datetime;
    }
    return Array.from(sessionItemsByDatetime.keys()).find((key: string) => holdsSession(sessionItemsByDatetime.get(key))) ?? null;
  }

  /** A removal or a cleared cart closes the editor, so the same ticket added back does not reopen it. */
  #closeLinePriceEditorIfLineGone(): void {
    const key = this.#editingLinePriceKey();
    if (key === null) {
      return;
    }
    const separator = key.lastIndexOf('|');
    if (this.#cartDatetimeOf(Number(key.slice(separator + 1)), key.slice(0, separator)) === null) {
      this.#editingLinePriceKey.set(null);
    }
  }

  isSessionUnavailable(session: CartSession): boolean {
    return this.#unavailableSessionIds?.().has(session.sessionId) === true;
  }

  #isCapacityIncreaseBlocked(cartSession: CartSession): boolean {
    if (!this.forceDisableIncreaseCounter) {
      return false;
    }
    if (cartSession.sessionType?.isShopProduct) {
      return false;
    }
    return true;
  }

  #isCapacityIncreaseBlockedForSessionId(sessionId: number): boolean {
    if (!this.forceDisableIncreaseCounter) {
      return false;
    }
    if (this.#isShopProductSessionId(sessionId)) {
      return false;
    }
    return true;
  }

  #isShopProductSessionId(sessionId: number): boolean {
    const fromCart = this.#findCartSessionBySessionId(sessionId);
    if (fromCart) {
      return fromCart.sessionType?.isShopProduct === true;
    }
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === sessionId);
    return ticketType?.isShopProduct === true;
  }

  #calculateCountersBySessionId(basedOnCart: boolean): Map<string, number> {
    const countersBySessionId = new Map<string, number>();

    if (basedOnCart) {
      this.cart?.sessionItemsByDatetime?.forEach(sessions => {
        sessions.forEach(session => {
          const sessionId = session.sessionId.toString();
          const currentCount = countersBySessionId.get(sessionId) || 0;
          countersBySessionId.set(sessionId, currentCount + session.units);
        });
      });

      return countersBySessionId;
    }

    if (!this.ticketsFormGroup) {
      return countersBySessionId;
    }

    Object.keys(this.ticketsFormGroup.value).forEach(sessionId => {
      const controlValue = parseInt(this.ticketsFormGroup.value[sessionId]) || 0;
      const currentCount = countersBySessionId.get(sessionId) || 0;
      countersBySessionId.set(sessionId, currentCount + controlValue);
    });

    return countersBySessionId;
  }

  #calculateCountersBySessionType(basedOnCart: boolean): Map<string, number> {
    const countersBySessionType = new Map<string, number>();

    if (basedOnCart) {
      this.cart?.sessionItemsByDatetime?.forEach(sessions => {
        sessions.forEach(session => {
          const sessionTypeName = session.sessionType?.label ?? '';
          const currentCount = countersBySessionType.get(sessionTypeName) || 0;
          countersBySessionType.set(sessionTypeName, currentCount + session.units);
        });
      });

      return countersBySessionType;
    }

    if (!this.ticketsFormGroup) {
      return countersBySessionType;
    }

    Object.keys(this.ticketsFormGroup.value).forEach(sessionId => {
      const controlValue = parseInt(this.ticketsFormGroup.value[sessionId]) || 0;
      const currentCount = countersBySessionType.get(sessionId) || 0;
      const sessionType = this.#allTicketTypes().find(ticket => ticket.sessionId?.toString() === sessionId)?.name ?? '';
      countersBySessionType.set(sessionType, currentCount + controlValue);
    });

    return countersBySessionType;
  }

  #emitCounterChangeUpdated(basedOnCart = true): void {
    const countersBySessionId = this.#calculateCountersBySessionId(basedOnCart);
    const countersBySessionType = this.#calculateCountersBySessionType(basedOnCart);

    this.ticketTypesCounterChange.emit({
      bySessionId: countersBySessionId,
      bySessionType: countersBySessionType,
    });
  }

  #getMinValidator(minimum: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = parseInt(control.value);
      return value !== 0 && value < minimum ? { min: { value } } : null;
    };
  }

  #incrementCounterBySessionId(sessionId: number): void {
    if (this.isCartLocked()) {
      return;
    }
    if (this.#isCapacityIncreaseBlockedForSessionId(sessionId)) {
      return;
    }
    const currentValue = parseInt(this.getFormControlByName(sessionId)?.value) || 0;
    const ticketType = this.#allTicketTypes().find(ticket => ticket.sessionId === sessionId);

    if (!ticketType) {
      return;
    }

    const newValue = this.#stepUp(currentValue, ticketType);

    if (this.getFormControlByName(sessionId)) {
      this.getFormControlByName(sessionId)?.setValue(newValue.toString(), { emitEvent: false });
    } else {
      this.#addNewControlToFormGroup(sessionId, newValue);
      this.#addControlValidators(sessionId);
    }

    this.#triggerItemAddedEffect(this.#resolveItemEffectKeyBySessionId(sessionId));

    this.#zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.#isItemVisibleOnScreen(sessionId);
      }, 100);
    });

    this.#changeDetectorRef.detectChanges();
    this.ticketsFormGroup.updateValueAndValidity();
  }

  #resolveItemEffectKeyBySessionId(sessionId: number): string | null {
    const cart = this.cart;
    if (cart?.sessionItemsByDatetime == null) {
      return null;
    }

    let fallback: string | null = null;
    for (const [datetime, sessions] of cart.sessionItemsByDatetime.entries()) {
      for (const session of sessions) {
        if (session.sessionId !== sessionId) {
          continue;
        }
        const itemEffectKey = this.getCartItemEffectKey(session, datetime);
        fallback ??= itemEffectKey;
        const planId = session.mainPlanId ?? this.currentPlanId;
        if (!this.isTimeslotGroupInactive(planId ?? null, datetime, session.sessionAddressId)) {
          return itemEffectKey;
        }
      }
    }

    return fallback;
  }

  #isInputValid(input: string): boolean {
    return /^[0-9]*$/.test(input);
  }

  #isItemVisibleOnScreen(sessionId: number): boolean {
    const input = document.querySelector(`input[name="${sessionId}"]`) as HTMLInputElement;
    if (!input) return false;

    const item = input.closest('.cart-ticket-list__item') as HTMLElement;
    if (!item) return false;

    const container = document.querySelector('.aside__detail-content') as HTMLElement;
    const scrollContainer = container || document.documentElement;
    const containerRect = scrollContainer.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const isVisible = item.offsetParent !== null;
    const isFullyVisible = itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom;

    if (!isFullyVisible && isVisible) {
      const direction = itemRect.top < containerRect.top ? 'up' : 'down';
      this.#scrollItemIntoView(scrollContainer, item, direction);
    }

    return isFullyVisible && isVisible;
  }

  #scrollItemIntoView(container: HTMLElement, item: HTMLElement, direction: 'up' | 'down'): void {
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const offset =
      direction === 'up'
        ? itemRect.top - containerRect.top - containerRect.height / 2 + itemRect.height / 2
        : itemRect.bottom - containerRect.bottom + containerRect.height / 2 - itemRect.height / 2;

    container.scrollBy({
      top: offset,
      behavior: 'smooth',
    });
  }

  #syncFormWithCartSessions(
    cartSessionsByDatetime: Map<string, CartSession[]>,
    previousCartSessionsByDatetime?: Map<string, CartSession[]> | null,
  ): void {
    const currentUnitsBySessionId = new Map<number, number>();
    for (const cartSessions of cartSessionsByDatetime.values()) {
      for (const cartSession of cartSessions) {
        const sid = cartSession.sessionId ?? 0;
        currentUnitsBySessionId.set(sid, (currentUnitsBySessionId.get(sid) ?? 0) + (cartSession.units ?? 0));
      }
    }

    const previousUnitsBySessionId = new Map<number, number>();
    if (previousCartSessionsByDatetime) {
      for (const previousCartSessions of previousCartSessionsByDatetime.values()) {
        for (const previousCartSession of previousCartSessions) {
          const sessionId = previousCartSession.sessionId ?? 0;
          previousUnitsBySessionId.set(sessionId, (previousUnitsBySessionId.get(sessionId) ?? 0) + (previousCartSession.units ?? 0));
        }
      }
    }

    const formControlKeys = Object.keys(this.ticketsFormGroup.controls);
    for (const controlKey of formControlKeys) {
      const sessionId = parseInt(controlKey);
      if (!currentUnitsBySessionId.has(sessionId)) {
        this.ticketsFormGroup.removeControl(controlKey);
      }
    }

    for (const [sessionId, units] of currentUnitsBySessionId) {
      const previousUnits = previousUnitsBySessionId.get(sessionId) ?? 0;
      const hadControlBeforeSync = this.getFormControlByName(sessionId) != null;
      const shouldTriggerAddEffect = units > previousUnits && (previousCartSessionsByDatetime != null || hadControlBeforeSync);
      this.#updateCounterBySessionId(sessionId, units, false);
      if (shouldTriggerAddEffect) {
        this.#triggerItemAddedEffect(this.#resolveItemEffectKeyBySessionId(sessionId));
      }
    }

    this.ticketsFormGroup.updateValueAndValidity();
  }

  #triggerItemAddedEffect(itemEffectKey: string | null): void {
    if (itemEffectKey == null) {
      return;
    }
    const [planIdPart] = itemEffectKey.split('|');
    const planId = planIdPart.length > 0 ? parseInt(planIdPart, 10) : null;
    if (this.currentPlanId != null && planId !== this.currentPlanId) {
      return;
    }
    this.itemAddedEffect.set(itemEffectKey);
    this.#zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.itemAddedEffect.set(null);
      }, 400);
    });
  }

  #playClearAllGhostAnimation(): void {
    const cartContainer = this.cartContainer?.nativeElement;
    if (!cartContainer || typeof cartContainer.animate !== 'function' || this.#prefersReducedMotion()) {
      return;
    }

    this.#zone.runOutsideAngular(() => {
      this.#removeClearAllGhost();

      const ghost = this.#createClearAllGhost(cartContainer);
      const host = this.#hostElement.nativeElement;
      // The cart list scrolls itself on mobile and inside the host on desktop; the host's scroll resets once the cart empties.
      const scrolledBy = cartContainer.scrollTop + host.scrollTop;
      host.appendChild(ghost);
      ghost.scrollTop = scrolledBy;
      this.#clearAllGhost = ghost;

      const animations = this.#animateClearAllGhostRows(ghost);
      if (animations.length === 0) {
        this.#removeClearAllGhost();
        return;
      }

      Promise.all(animations.map(animation => animation.finished))
        .catch((): void => undefined)
        .then(() => {
          if (this.#clearAllGhost === ghost) {
            this.#removeClearAllGhost();
          }
        });
      this.#clearAllGhostTimeoutId = setTimeout(() => this.#removeClearAllGhost(), CLEAR_ALL_SAFETY_TIMEOUT_MS);
    });
  }

  #animateClearAllGhostRow(row: HTMLElement, delay: number): Animation[] {
    if (!this.#isClearAllGhostLine(row)) {
      return [row.animate([{ opacity: 1 }, { opacity: 0 }], { delay, duration: CLEAR_ALL_FADE_MS, easing: 'ease-out', fill: 'forwards' })];
    }

    const animations: Animation[] = [];
    const swipeContent = row.querySelector<HTMLElement>(':scope > .swipe-content');
    const hasSwipeActions = !!row.querySelector(':scope > .swipe-actions');
    const slideDelay = delay + CLEAR_ALL_PEEK_MS;
    if (swipeContent && hasSwipeActions) {
      animations.push(
        swipeContent.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-20%)' }], {
          delay,
          duration: CLEAR_ALL_PEEK_MS,
          easing: 'ease-out',
          fill: 'forwards',
        }),
      );
    }
    animations.push(
      row.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { offset: 0.7, opacity: 1, transform: 'translateX(-70%)' },
          { opacity: 0, transform: 'translateX(-100%)' },
        ],
        { delay: slideDelay, duration: CLEAR_ALL_SLIDE_MS, easing: 'ease-in', fill: 'forwards' },
      ),
    );
    return animations;
  }

  #animateClearAllGhostRows(ghost: HTMLElement): Animation[] {
    const ghostRect = ghost.getBoundingClientRect();
    const rows = Array.from(ghost.querySelectorAll<HTMLElement>(CLEAR_ALL_ROW_SELECTOR)).filter(
      row => !row.parentElement?.closest('.swipe-container, .cart-ticket-item, .cart-plan-header, .cart-coupon-item'),
    );
    const animations: Animation[] = [];
    let visibleIndex = 0;

    for (const row of rows) {
      const rowRect = row.getBoundingClientRect();
      if (rowRect.bottom <= ghostRect.top || rowRect.top >= ghostRect.bottom) {
        row.style.visibility = 'hidden';
        continue;
      }
      const delay = Math.min(visibleIndex * CLEAR_ALL_STAGGER_MS, CLEAR_ALL_MAX_DELAY_MS);
      if (this.#isClearAllGhostLine(row)) {
        visibleIndex++;
      }
      animations.push(...this.#animateClearAllGhostRow(row, delay));
    }
    return animations;
  }

  #createClearAllGhost(cartContainer: HTMLElement): HTMLElement {
    const ghost = cartContainer.cloneNode(true) as HTMLElement;
    const sourceInputs = cartContainer.querySelectorAll('input');
    ghost.querySelectorAll('input').forEach((input, index) => {
      input.value = sourceInputs[index]?.value ?? '';
    });
    ghost.querySelectorAll('[data-testid]').forEach(element => element.removeAttribute('data-testid'));
    ghost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    ghost.removeAttribute('data-testid');
    ghost.classList.add(CLEAR_ALL_GHOST_CLASS);
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('inert', '');
    Object.assign(ghost.style, {
      top: `${cartContainer.offsetTop}px`,
      left: `${cartContainer.offsetLeft}px`,
      width: `${cartContainer.offsetWidth}px`,
      height: `${cartContainer.offsetHeight}px`,
    });
    return ghost;
  }

  #isClearAllGhostLine(row: HTMLElement): boolean {
    return row.matches('.swipe-container, .cart-ticket-item');
  }

  #prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  #removeClearAllGhost(): void {
    if (this.#clearAllGhostTimeoutId != null) {
      clearTimeout(this.#clearAllGhostTimeoutId);
      this.#clearAllGhostTimeoutId = null;
    }
    this.#clearAllGhost?.remove();
    this.#clearAllGhost = null;
  }

  #triggerItemRemovedEffect(itemEffectKey: string | null): void {
    if (itemEffectKey == null) {
      return;
    }
    this.itemRemovedEffect.set(itemEffectKey);
    this.#zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.itemRemovedEffect.set(null);
      }, 400);
    });
  }

  #updateCounterBySessionId(sessionId: number, units: number | null = null, shouldTriggerAddRemoveEffect = true): void {
    const currentValue = parseInt(this.getFormControlByName(sessionId)?.value) || 0;

    if (this.getFormControlByName(sessionId)) {
      const newValue = units !== null ? units : parseInt(this.getFormControlByName(sessionId)?.value) || 0;
      this.getFormControlByName(sessionId)?.setValue(newValue.toString(), { emitEvent: false });

      if (shouldTriggerAddRemoveEffect && newValue > currentValue) {
        this.#triggerItemAddedEffect(this.#resolveItemEffectKeyBySessionId(sessionId));
      } else if (shouldTriggerAddRemoveEffect && newValue < currentValue) {
        this.#triggerItemRemovedEffect(this.#resolveItemEffectKeyBySessionId(sessionId));
      }
    } else {
      this.#addNewControlToFormGroup(sessionId, units ?? 1);
      this.#addControlValidators(sessionId);
      if (shouldTriggerAddRemoveEffect) {
        this.#triggerItemAddedEffect(this.#resolveItemEffectKeyBySessionId(sessionId));
      }
    }

    this.#changeDetectorRef.detectChanges();
    this.ticketsFormGroup.updateValueAndValidity();
  }

  #updateTicketsCounter(cartSession: CartSession, counter: number, datetime?: string): void {
    cartSession.units = counter;
    const sessionId = cartSession.sessionId;
    const aggregatedCounter = sessionId != null ? this.#getAggregatedCounterForSessionId(sessionId) : null;
    const isProductsContext = datetime === 'products' || cartSession.sessionType?.isShopProduct === true;
    const controlValue = isProductsContext ? counter : (aggregatedCounter ?? counter);
    this.getFormControlByName(cartSession.sessionId ?? '')?.setValue(controlValue.toString(), { emitEvent: false });

    this.updatedSessionIdCounter.emit(this.#buildUpdateTicketTypeCounterPayload(cartSession, counter, datetime));

    this.#emitCounterChangeUpdated(true);
  }

  #getAggregatedCounterForSessionId(sessionId: number): number | null {
    if (this.cart?.sessionItemsByDatetime == null) {
      return null;
    }

    let totalUnits = 0;
    let hasMatchingSession = false;

    this.cart.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        if (session.sessionId === sessionId) {
          totalUnits += session.units ?? 0;
          hasMatchingSession = true;
        }
      });
    });

    return hasMatchingSession ? totalUnits : null;
  }

  getPlanName(planId: number): string {
    return this.plansById.get(planId)?.name ?? '';
  }

  getPlanImageUrl(planId: number): string {
    return this.plansById.get(planId)?.pictureURL ?? '';
  }

  getVenueName(venueId?: number): string {
    if (venueId === undefined) return '';
    return this.venueNamesById().get(venueId) ?? '';
  }

  getVenueNamesForPlan(planId: number): string[] {
    const venueIds = this.#getVenueIdsForSessionsInCartForPlan(planId);

    return Array.from(venueIds)
      .map(id => this.getVenueName(id))
      .filter(name => name !== '');
  }

  shouldShowVenueInTimeslot(planId: number, session: CartSession): boolean {
    const venueIdsForSessionsToBePurchased = this.#getVenueIdsForSessionsInCartForPlan(planId);
    const hasMultipleVenuesForTheSamePlan = venueIdsForSessionsToBePurchased.size > 1;
    if (hasMultipleVenuesForTheSamePlan) {
      return true;
    }

    const isFromCurrentPlan = planId === this.currentPlanId;
    const currentVenueId = this.currentVenueId;
    const sessionVenueId = session.sessionAddressId;
    const isDifferentFromCurrentVenue =
      isFromCurrentPlan && currentVenueId !== null && sessionVenueId !== undefined && currentVenueId !== sessionVenueId;

    return isDifferentFromCurrentVenue;
  }

  #buildRealTimeSeatCardsByLineKey(sessionItemsByDatetime: Map<string, CartSession[]>): Map<string, RealTimeSeatCard[]> {
    const seatCardsByLineKey = new Map<string, RealTimeSeatCard[]>();
    sessionItemsByDatetime.forEach((sessions: CartSession[], datetime: string) => {
      sessions.forEach((session: CartSession) => {
        const seatCards = CartUtil.getRealTimeSeatCards(session);
        if (seatCards.length > 0) {
          seatCardsByLineKey.set(`${datetime}|${session.sessionId}`, seatCards);
        }
      });
    });
    return seatCardsByLineKey;
  }

  #updateHasDifferentPlanThanSelected(sessionsByPlan: Map<number, SessionsByPlan>): void {
    if (!this.currentPlanId) {
      this.hasDifferentPlanThanSelected.set(false);
      return;
    }
    const cartPlanIds = Array.from(sessionsByPlan.keys());
    const hasDifferent = cartPlanIds.some(planId => planId !== this.currentPlanId);
    this.hasDifferentPlanThanSelected.set(hasDifferent);
  }

  shouldShowPlanHeaders(): boolean {
    return this.hasMultiplePlansInCart() || this.hasDifferentPlanThanSelected();
  }

  #getVenueIdsForSessionsInCartForPlan(planId: number): Set<number> {
    const venueIds = new Set<number>();

    const sessionsByDatetimeAndVenue = this.sessionsByPlan().get(planId)?.regularSessions;
    if (!sessionsByDatetimeAndVenue) {
      return venueIds;
    }

    sessionsByDatetimeAndVenue.forEach(item => {
      if (item.venueId != null) {
        venueIds.add(item.venueId);
      }
    });

    return venueIds;
  }

  #buildVenueNamesById(plansById: Map<number, Plan>): Map<number, string> {
    const venueNamesById = new Map<number, string>();
    plansById.forEach(plan => {
      plan.places?.forEach(place => {
        if (place.name) {
          venueNamesById.set(place.id, place.name);
        }
      });
    });
    return venueNamesById;
  }

  #sortRegularSessionsByVenueAndDatetime(tempMap: Map<number, Map<string, CartSession[]>>): Map<number, SessionsByDatetimeAndVenue[]> {
    const result = new Map<number, SessionsByDatetimeAndVenue[]>();
    tempMap.forEach((sessionsByKey, planId) => {
      const entries = Array.from(sessionsByKey.entries());

      entries.sort((a, b) => {
        const [datetimeA, venueIdA] = a[0].split('|');
        const [datetimeB, venueIdB] = b[0].split('|');

        const venueComparison = (venueIdA ?? '').localeCompare(venueIdB ?? '');
        if (venueComparison === 0) {
          return datetimeA.localeCompare(datetimeB);
        }
        return venueComparison;
      });

      const sortedItems: SessionsByDatetimeAndVenue[] = entries.map(([key, sessions]) => {
        const [datetime, venueIdStr] = key.split('|');
        const venueId = venueIdStr ? parseInt(venueIdStr) : undefined;
        return { datetime, venueId, sessions };
      });

      result.set(planId, sortedItems);
    });

    return result;
  }

  #buildSessionsByPlan(
    productsByPlan: Map<number, CartSession[]>,
    regularSessionsByPlanAndVenue: Map<number, SessionsByDatetimeAndVenue[]>,
  ): Map<number, SessionsByPlan> {
    const allPlanIds = new Set<number>();
    productsByPlan.forEach((_sessions, planId) => allPlanIds.add(planId));
    regularSessionsByPlanAndVenue.forEach((_sessions, planId) => allPlanIds.add(planId));

    const sessionsByPlan = new Map<number, SessionsByPlan>();
    allPlanIds.forEach(planId => {
      sessionsByPlan.set(planId, {
        productSessions: productsByPlan.get(planId) ?? [],
        regularSessions: regularSessionsByPlanAndVenue.get(planId) ?? [],
      });
    });
    return sessionsByPlan;
  }
}
