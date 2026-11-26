import { DOCUMENT, NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';

import { PlanDiscount } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { calculateTotalDiscount } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { UpdateTicketTypeCounter } from '@fz-original/app/modules/box-office/one-stop-shop/models';
import { getDisplayableUnitsAvailable } from '@fz-original/app/modules/box-office/one-stop-shop/utils/oss-tile-availability.util';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { getReservedUnitsBySessionId } from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-reserved-units.util';
import { TicketSelectorLevelOboComponent } from '@fz-original/app/shared/components/ticket-selector-level-obo/ticket-selector-level-obo.component';
import { TicketSelectorComponent } from '@fz-original/app/shared/components/ticket-selector/ticket-selector.component';
import { InputMobileBehaviorModule } from '@fz-original/app/shared/directives/input-mobile-behavior/input-mobile-behavior.module';
import { Money } from '@fz-original/app/shared/models/money.model';
import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { sessionTypeColorsAnswer } from '@fz-original/app/shared/tags/utils/session-type-colors.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntTourAnchorDirective } from '@ignite/legacy/components/ignt-ui-tour/ignt-tour-anchor.directive';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';

import { OssTileCategory, OssTileType } from '../../models';
import { posProductTileTapped } from '../../tracking/events/pos-product-tile-tapped.event';
import { OssTileComponent } from '../oss-tile/oss-tile.component';

@Component({
  selector: 'app-oss-ticket-selector',
  standalone: true,
  templateUrl: './oss-ticket-selector.component.html',
  styleUrls: ['./oss-ticket-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntIconComponent,
    TicketSelectorLevelOboComponent,
    TranslateModule,
    ReactiveFormsModule,
    NgIf,
    NgForOf,
    InputMobileBehaviorModule,
    OssTileComponent,
    IgntSkeletonBaseComponent,
    NgTemplateOutlet,
    IgntTourAnchorDirective,
  ],
})
export class OssTicketSelectorComponent extends TicketSelectorComponent implements OnDestroy, OnInit {
  #cdr = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  #isIncrementFlushScheduled = false;
  #pendingIncrementedSessionIds: ReadonlySet<number> = new Set<number>();
  readonly #zone = inject(NgZone);
  readonly #flushPendingIncrements = (): void => {
    if (this.#pendingIncrementedSessionIds.size === 0) {
      return;
    }
    const sessionIds = [...this.#pendingIncrementedSessionIds];
    this.#pendingIncrementedSessionIds = new Set<number>();
    this.#zone.run(() => {
      sessionIds.forEach(sessionId => this.ticketIncremented.emit(sessionId));
      this.#emitTicketTypeCounterChangeFromForm();
    });
  };
  readonly #fzTracking = inject(FzTrackingService);
  readonly #optimizely = inject(OptimizelyService);
  // `null` until the Optimizely SDK is ready: asked again on the next render instead of freezing the stripe.
  #sessionTypeColorsAnswer: boolean | null = null;
  readonly #reservationSettlementSession = inject(ReservationSettlementSessionService);
  readonly #reservedUnitsBySessionId = computed(() => getReservedUnitsBySessionId(this.#reservationSettlementSession.session()?.cart));
  #lastDiscounts: PlanDiscount[] | null = null;
  #priceWithDiscountByTicketType = new WeakMap<TicketType, { price: Money | null | undefined; value: Money | null }>();
  #suppressValueChangeCounterEmit = false;
  addUnitBySessionId = output<number>();
  allowMultiTimeSlot = input(false);
  discounts = input<PlanDiscount[] | null>(null);
  ignoreMaximumTicketsAllowedPerBooking = input(false);
  isCartLocked = input(false);
  isInOverrideZone = input(false);
  isLoading = input(false);
  protected readonly OssTileCategory = OssTileCategory;
  protected readonly OssTileType = OssTileType;
  ticketIncremented = output<number>();
  ticketTypeDetailsMap = new Map<number, string>();
  tourAnchorId = input<string | undefined>();
  @Input() updateTicketTypeCounter: Subject<UpdateTicketTypeCounter> = new Subject();

  getPriceWithDiscount(ticketType: TicketType): Money | null {
    const discounts = this.discounts();
    if (discounts !== this.#lastDiscounts) {
      this.#lastDiscounts = discounts;
      this.#priceWithDiscountByTicketType = new WeakMap<TicketType, { price: Money | null | undefined; value: Money | null }>();
    }

    const cached = this.#priceWithDiscountByTicketType.get(ticketType);
    if (cached !== undefined && cached.price === ticketType.price) {
      return cached.value;
    }

    const priceWithDiscount = this.#calculatePriceWithDiscount(ticketType);
    this.#priceWithDiscountByTicketType.set(ticketType, { price: ticketType.price, value: priceWithDiscount });
    return priceWithDiscount;
  }

  getTileUnitsAvailable(availableTickets: number | null | undefined): number | null {
    return this.showTicketAvailabilityInfo ? getDisplayableUnitsAvailable(availableTickets) : null;
  }

  isTileOutOfStock(availableTickets: number | null | undefined): boolean {
    return availableTickets === 0;
  }

  #calculatePriceWithDiscount(ticketType: TicketType): Money | null {
    const price = ticketType.price;
    if (price == null || price.amount <= 0) {
      return null;
    }

    const discount = this.discounts()?.find(planDiscount => planDiscount.ticketTypeId === ticketType.id);
    if (discount === undefined || discount.discount <= 0) {
      return null;
    }

    return calculateTotalDiscount(price.amount, price.currency, { amount: discount.discount, type: discount.discountType });
  }

  protected override addControlsValidators(): void {
    [...this.selectedTicketTypes].forEach(ticketType => {
      const maxValue = this.getEffectiveMax(ticketType);
      if (!ticketType.sessionId) return;
      const control = this.getFormControlByName(ticketType.sessionId);
      control?.setValidators([this.#getMinValidator(ticketType), Validators.max(maxValue)]);
    });
  }

  override getEffectiveMax(ticketType: TicketType): number {
    const effectiveMax = super.getEffectiveMax(ticketType);
    if (!this.isCartLocked() || ticketType.sessionId === undefined) {
      return effectiveMax;
    }
    const reservedUnits = this.#reservedUnitsBySessionId().get(ticketType.sessionId);
    return reservedUnits === undefined ? effectiveMax : Math.max(effectiveMax, reservedUnits);
  }

  protected override snapToStep(value: number, ticketType: TicketType): number {
    if (this.isCartLocked() && ticketType.sessionId !== undefined && value === this.#reservedUnitsBySessionId().get(ticketType.sessionId)) {
      return value;
    }
    return super.snapToStep(value, ticketType);
  }

  override increaseTicketCounter(ticketType: TicketType): void {
    if (this.isCartLocked()) {
      return;
    }
    if (ticketType.sessionId === undefined) {
      return;
    }
    if (this.isIncreaseDisabled(ticketType.sessionId ?? 0, this.getEffectiveMax(ticketType))) {
      return;
    }
    this.#fzTracking.track(
      posProductTileTapped({
        tileType: ticketType.isAddon ? 'add-on' : 'ticket',
      }),
    );
    const sessionId = ticketType.sessionId;
    const before = this.getFormControlByName(sessionId)?.value;
    this.#suppressValueChangeCounterEmit = true;
    try {
      super.increaseTicketCounter(ticketType);
    } finally {
      this.#suppressValueChangeCounterEmit = false;
    }
    const after = this.getFormControlByName(sessionId)?.value;
    if (before !== after) {
      this.#scheduleIncrementFlush(sessionId);
    }
  }

  protected override clearEmpty(formGroup: UntypedFormGroup): void {
    Object.entries(formGroup.controls).forEach(([name, control]) => {
      if (control.value === '0') {
        control.setValue('', { emitEvent: false });
      }
      const stillShown = this.selectedTicketTypes.some(tt => tt.sessionId?.toString() === name);
      if (!stillShown && !this.ticketTypes.some(tt => tt.sessionId?.toString() === name) && control.value !== '0' && control.value !== '') {
        control.setValue('', { emitEvent: false });
      }
    });
  }

  hasSelectedTickets(ticketType: TicketType): boolean {
    if (ticketType.sessionId === undefined) {
      return false;
    }
    return (parseInt(this.getFormControlByName(ticketType.sessionId)?.value) || 0) > 0;
  }

  isDisabled(ticketType: TicketType): boolean {
    if (this.isCartLocked()) {
      return true;
    }
    return this.isIncreaseDisabled(ticketType.sessionId ?? 0, this.getEffectiveMax(ticketType));
  }

  protected override getTicketCountersMap(): Map<string, number> {
    const result: Iterable<[string, number]> = Object.entries(this.ticketsFormGroup?.controls ?? {}).map(([key, control]) => [
      key,
      Number(control.value || '0'),
    ]);

    const mergedMap = new Map(result);

    if (!this.allowMultiTimeSlot()) {
      return mergedMap;
    }

    const displayedTicketTypeIds: Set<string> = new Set(
      this.selectedTicketTypes.map(ticketType => ticketType.sessionId?.toString()).filter((id): id is string => id !== undefined),
    );

    this.ticketTypeCounterBySessionId.forEach((value, key) => {
      if (!displayedTicketTypeIds.has(key)) {
        mergedMap.set(key, value);
      }
    });

    return mergedMap;
  }

  protected override initializeCountersWithTicketTypesAlreadySelected() {
    return this.seedCountersFromEmittedSelection(this.allowMultiTimeSlot());
  }

  protected tileColorOf(ticketType: TicketType): string | null {
    return this.#hasSessionTypeColors() ? (ticketType.tileColor ?? null) : null;
  }

  #hasSessionTypeColors(): boolean {
    this.#sessionTypeColorsAnswer ??= sessionTypeColorsAnswer(this.#optimizely);

    return this.#sessionTypeColorsAnswer ?? false;
  }

  ossTileLabel(ticketType: TicketType): string {
    return ticketType.getDisplayName(this.hasExplodePipe) ?? '';
  }

  override ngOnDestroy(): void {
    this.#removeFlushBeforeInputListeners();
    this.#flushPendingIncrements();
    super.ngOnDestroy();
  }

  ngOnInit() {
    this.#zone.runOutsideAngular(() => {
      this.#document.addEventListener('pointerdown', this.#flushPendingIncrements, true);
      this.#document.addEventListener('keydown', this.#flushPendingIncrements, true);
    });

    this.getCurrentFormGroupChanges()
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        tap(({ formGroup }) => {
          this.clearEmpty(formGroup);
          this.updateInputsDisableStatus(formGroup);
          // this.hasErrors.emit(this.ticketsFormGroup?.invalid ?? false); // todo at least for products we don't need it
        }),
        filter(() => !this.#suppressValueChangeCounterEmit && (this.ticketsFormGroup?.valid ?? false)),
        map(() => this.getTicketCountersMap()),
        distinctUntilChanged((a, b) => this.areTicketCountersMapEquals(a, b)),
      )
      .subscribe(counters => {
        let updatedSessionId: number;
        counters.forEach((updatedCount, sessionId) => {
          if (
            (updatedCount != 0 && !this.ticketTypeCounterBySessionId.has(sessionId)) ||
            this.ticketTypeCounterBySessionId.has(sessionId)
          ) {
            const originalCount = this.ticketTypeCounterBySessionId.get(sessionId);
            if (originalCount !== updatedCount) {
              updatedSessionId = parseInt(sessionId);
              if (this.mergedSelectableTicketTypes.find(ticketType => ticketType.sessionId === updatedSessionId)) {
                const countersBySessionType: Map<string, number> = this.calculateCountersBySessionType(counters);
                this.ticketTypeCounterChange.emit({ bySessionId: counters, bySessionType: countersBySessionType });
              }
            }
          }
        });
      });

    this.updateTicketTypeCounter.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((update: UpdateTicketTypeCounter) => {
      const control = this.getFormControlByName(update.sessionId);
      if (control) {
        control.setValue(update.newCounter.toString(), { emitEvent: false });
        this.#cdr.markForCheck();
      }
    });
  }

  protected override updateInputsDisableStatus(formGroup: UntypedFormGroup): void {
    if (!this.ignoreMaximumTicketsAllowedPerBooking()) {
      super.updateInputsDisableStatus(formGroup);
      return;
    }

    const selectedTicketTypesBySessionId = this.selectedTicketTypes.reduce<Record<string, TicketType>>(
      (acc, ticketType) => (ticketType.sessionId !== undefined ? { ...acc, [ticketType.sessionId.toString()]: ticketType } : acc),
      {},
    );

    const controls = Object.entries(formGroup.controls);
    const areAllCountersEmpty = controls.every(([name, control]) => {
      const ticketType = selectedTicketTypesBySessionId[name];
      return !ticketType || ticketType.isAddon || !control.value || control.value === '0';
    });

    controls.forEach(([name, control]) => {
      const ticketType = selectedTicketTypesBySessionId[name];
      if (ticketType !== undefined) {
        const { isPurchasable, minimum } = ticketType;
        const rawMax = ticketType[this.maxLimitField as keyof TicketType] as number | undefined;
        const effectiveMin = this.getEffectiveMin(ticketType);
        const effectiveMax = this.getEffectiveMax(ticketType);
        const hasDefinedMax = typeof rawMax === 'number' && Number.isFinite(rawMax);
        const canSelectTickets = this.isStepQuantityEnabled
          ? isPurchasable && hasDefinedMax && effectiveMax >= effectiveMin && effectiveMax > 0
          : isPurchasable && hasDefinedMax && rawMax >= minimum && rawMax > 0;

        const hasEmptyValue = !control.value || control.value === '0';
        if (canSelectTickets && (areAllCountersEmpty || !hasEmptyValue || this.allowMultiSession || ticketType.isAddon)) {
          control.enable({ emitEvent: false });
        } else {
          control.disable({ emitEvent: false });
        }
      }
    });
  }

  #emitTicketTypeCounterChangeFromForm(): void {
    const counters = this.getTicketCountersMap();
    const countersBySessionType = this.calculateCountersBySessionType(counters);
    this.ticketTypeCounterChange.emit({ bySessionId: counters, bySessionType: countersBySessionType });
  }

  #getMinValidator(ticketType: TicketType) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = parseInt(control.value);
      return value !== 0 && value < ticketType.minimum ? { min: { value } } : null;
    };
  }

  #removeFlushBeforeInputListeners(): void {
    this.#document.removeEventListener('pointerdown', this.#flushPendingIncrements, true);
    this.#document.removeEventListener('keydown', this.#flushPendingIncrements, true);
  }

  #scheduleIncrementFlush(sessionId: number): void {
    this.#pendingIncrementedSessionIds = new Set([...this.#pendingIncrementedSessionIds, sessionId]);
    if (this.#isIncrementFlushScheduled) {
      return;
    }
    this.#isIncrementFlushScheduled = true;
    this.#zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.#isIncrementFlushScheduled = false;
          this.#flushPendingIncrements();
        });
      });
    });
  }
}
