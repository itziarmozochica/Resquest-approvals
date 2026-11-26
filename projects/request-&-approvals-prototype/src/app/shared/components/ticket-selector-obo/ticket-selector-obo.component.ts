import { CurrencyPipe, NgClass, NgFor, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import { Component, Input, OnChanges, output, SimpleChanges } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { PlanDiscount } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { calculateTotalDiscount } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { ChannelService } from '@fz-original/app/shared/services/session-availability/channel.service';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { IconsModule } from '../../icons/icons.module';
import { Money } from '../../models/money.model';
import { TicketType } from '../../models/ticket-type/ticket-type.model';
import { IsAddonWithoutEntryTicketsSelectedPipe } from '../../pipes/is-add-on-without-entry-ticket-selected/is-add-on-without-entry-tickets-selected.pipe';
import { Channel } from '../../services/session-availability/channel.enum';
import { TicketSelectorLevelOboComponent } from '../ticket-selector-level-obo/ticket-selector-level-obo.component';
import { TicketSelectorComponent } from '../ticket-selector/ticket-selector.component';
import { QuantityDraft } from './quantity-draft.model';

@Component({
  selector: 'app-ticket-selector-obo',
  templateUrl: './ticket-selector-obo.component.html',
  styleUrls: ['./ticket-selector-obo.component.scss'],
  standalone: true,
  imports: [
    CurrencyPipe,
    IconsModule,
    IgntIconComponent,
    IgntTagComponent,
    IsAddonWithoutEntryTicketsSelectedPipe,
    NgClass,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TicketSelectorLevelOboComponent,
    TranslateModule,
  ],
})
export class TicketSelectorOboComponent extends TicketSelectorComponent implements OnChanges {
  @Input() allowMultiTimeSlot = false;
  @Input() channel: Channel | null = null;
  /** A prefix is almost always below the minimum (`3` on the way to `30`), so only blur can judge it. */
  @Input() commitQuantityOnBlur = false;
  @Input() hasSeatingEntryTicketsSelected = false;
  @Input() showNewTicketTypeSelector = false;
  @Input() discounts?: Array<PlanDiscount>;

  ticketTypeDetailsMap = new Map<number, string>();
  readonly visibleSessionIdsChange = output<ReadonlySet<string>>();
  readonly quantityDraftChange = output<QuantityDraft | null>();

  #lastVisibleSessionIds: ReadonlySet<string> | null = null;

  readonly #cappedSessionIds = new Set<string>();
  #draftSessionId: string | null = null;
  #pendingCommitSessionId: string | null = null;
  #quantityBeforeEdit = '';

  override ngOnChanges(changes: SimpleChanges): void {
    const releasesDraft = changes['ticketTypes'] !== undefined || changes['ongoingMultiDayTicketGroups'] !== undefined;
    if (releasesDraft) {
      this.#releaseDraftPipeline();
    }
    super.ngOnChanges(changes);
    if (releasesDraft) {
      this.#reportDraftAfterRelease();
    }
    this.#emitVisibleSessionIds();

    const discountsChange = changes['discounts'];
    const hasDiscountsChanged =
      discountsChange && !discountsChange.isFirstChange() && discountsChange.previousValue !== discountsChange.currentValue;
    const shouldUpdatePrices = hasDiscountsChanged || (changes['ticketTypes'] && (this.discounts?.length ?? 0) > 0);

    if (shouldUpdatePrices) {
      const allTicketTypes = [
        ...(this.unhiddenSectionTicketTypes ?? []),
        ...(this.unhiddenAddonSectionTicketTypes ?? []),
        ...(this.hiddenSectionTicketTypes ?? []),
        ...(this.hiddenAddonSectionTicketTypes ?? []),
        ...this.visibleOngoingMultiDayTicketGroups.flatMap(g => g.ticketTypes),
      ];
      allTicketTypes.forEach(ticketType => {
        if (ticketType) {
          ticketType.priceWithDiscount = this.#getDiscountOfTicketType(ticketType);
        }
      });
    }
  }

  protected override getCurrentFormGroupChanges(): Observable<{ changes: unknown; formGroup: UntypedFormGroup }> {
    return super.getCurrentFormGroupChanges().pipe(filter(() => !this.#isHoldingDraft()));
  }

  override selectedLevel(ticketTypes: TicketType[]): void {
    this.#releaseDraftPipeline();
    super.selectedLevel(ticketTypes);
    this.#reportDraftAfterRelease();
    this.#emitVisibleSessionIds();
  }

  #emitVisibleSessionIds(): void {
    const visibleSessionIds = new Set(
      [...this.selectedTicketTypes, ...this.selectedProductTypes]
        .map(ticketType => ticketType.sessionId?.toString())
        .filter((sessionId): sessionId is string => sessionId !== undefined),
    );
    const previous = this.#lastVisibleSessionIds;
    if (previous !== null && previous.size === visibleSessionIds.size && [...visibleSessionIds].every(id => previous.has(id))) {
      return;
    }
    this.#lastVisibleSessionIds = visibleSessionIds;
    this.visibleSessionIdsChange.emit(visibleSessionIds);
  }

  protected override getMinValidator(ticketType: TicketType): ValidatorFn {
    return this.#deferredWhileDrafting(ticketType, super.getMinValidator(ticketType));
  }

  protected override getStepValidator(ticketType: TicketType, effectiveMax: number): ValidatorFn {
    return this.#deferredWhileDrafting(ticketType, super.getStepValidator(ticketType, effectiveMax));
  }

  protected onQuantityFocus(ticketType: TicketType): void {
    const sessionId = this.#sessionIdOf(ticketType);
    if (!this.commitQuantityOnBlur || sessionId === null) {
      return;
    }
    this.#draftSessionId = sessionId;
    this.#pendingCommitSessionId = sessionId;
    this.#quantityBeforeEdit = this.getFormControlByName(sessionId)?.value ?? '';
    this.#cappedSessionIds.delete(sessionId);
  }

  protected onQuantityBlur(ticketType: TicketType): void {
    const sessionId = this.#sessionIdOf(ticketType);
    if (sessionId === null || this.#pendingCommitSessionId !== sessionId) {
      return;
    }
    this.#draftSessionId = null;
    this.#pendingCommitSessionId = null;
    const control = this.getFormControlByName(sessionId);
    control?.setValue(this.#resolveDraftQuantity(control.value, ticketType, sessionId));
    this.quantityDraftChange.emit(null);
  }

  override inputCounterChange(counter: string, ticketType: TicketType): void {
    super.inputCounterChange(counter, ticketType);
    const sessionId = this.#sessionIdOf(ticketType);
    if (ticketType.sessionId !== undefined && this.#pendingCommitSessionId === sessionId) {
      this.quantityDraftChange.emit(this.#toQuantityDraft(counter, ticketType, ticketType.sessionId));
    }
  }

  /** Cancelling the keydown stops the wrapping form's implicit submit from clicking a stepper button. */
  protected onQuantityEnter(event: Event): void {
    if (!this.commitQuantityOnBlur) {
      return;
    }
    event.preventDefault();
    if (event.target instanceof HTMLInputElement) {
      event.target.blur();
    }
  }

  protected getQuantityNotice(ticketType: TicketType): string | undefined {
    const sessionId = this.#sessionIdOf(ticketType);
    const control = this.getFormControlByName(sessionId ?? '');
    const error = this.getControlError(control);
    if (error !== undefined) {
      return error;
    }
    if (sessionId === null || !this.#cappedSessionIds.has(sessionId)) {
      return undefined;
    }
    return Number(control?.value || '0') === this.getEffectiveMaxForInput(ticketType) ? 'max' : undefined;
  }

  #deferredWhileDrafting(ticketType: TicketType, validate: ValidatorFn): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null =>
      this.#draftSessionId !== null && this.#draftSessionId === this.#sessionIdOf(ticketType) ? null : validate(control);
  }

  #forgetCappedQuantity(ticketType: TicketType): void {
    const sessionId = this.#sessionIdOf(ticketType);
    if (sessionId !== null) {
      this.#cappedSessionIds.delete(sessionId);
    }
  }

  #isHoldingDraft(): boolean {
    return this.#draftSessionId !== null && this.getFormControlByName(this.#draftSessionId) !== null;
  }

  #toQuantityDraft(raw: string, ticketType: TicketType, sessionId: number): QuantityDraft | null {
    const typed = Number.parseInt(raw, 10);
    const isInRange = typed > 0 && typed >= this.getEffectiveMin(ticketType) && typed <= this.getEffectiveMaxForInput(ticketType);
    if (!isInRange) {
      return null;
    }
    // Blur commits the step-snapped value, so the draft must name the same quantity.
    const units = this.snapToStep(typed, ticketType);
    return units !== Number.parseInt(this.#quantityBeforeEdit || '0', 10) ? { sessionId, units } : null;
  }

  #releaseDraftPipeline(): void {
    this.#draftSessionId = null;
    this.#cappedSessionIds.clear();
  }

  /** The host holds the last draft it was sent, so it must hear when the row it named is no longer shown. */
  #reportDraftAfterRelease(): void {
    const sessionId = this.#pendingCommitSessionId;
    if (sessionId === null) {
      return;
    }
    const ticketType = [...this.selectedTicketTypes, ...this.selectedProductTypes].find(
      candidate => this.#sessionIdOf(candidate) === sessionId,
    );
    const control = this.getFormControlByName(sessionId);
    this.quantityDraftChange.emit(
      ticketType?.sessionId !== undefined && control !== null
        ? this.#toQuantityDraft(String(control.value ?? ''), ticketType, ticketType.sessionId)
        : null,
    );
  }

  #resolveDraftQuantity(raw: string, ticketType: TicketType, sessionId: string): string {
    if (raw.trim() === '') {
      return '';
    }
    const typed = Number.parseInt(raw, 10);
    if (Number.isNaN(typed)) {
      return this.#quantityBeforeEdit;
    }
    if (typed === 0) {
      return '0';
    }
    if (typed < this.getEffectiveMin(ticketType)) {
      return this.#quantityBeforeEdit;
    }
    if (typed > this.getEffectiveMaxForInput(ticketType)) {
      this.#cappedSessionIds.add(sessionId);
    }
    return this.snapToStep(typed, ticketType).toString();
  }

  #sessionIdOf(ticketType: TicketType): string | null {
    return ticketType.sessionId === undefined ? null : ticketType.sessionId.toString();
  }

  protected override addControlsValidators(): void {
    [...this.selectedProductTypes, ...this.selectedTicketTypes].forEach(ticketType => {
      const effectiveMax = this.#getMaxValue(ticketType);
      if (!ticketType.sessionId) return;
      const control = this.getFormControlByName(ticketType.sessionId);
      control?.setValidators([
        this.getMinValidator(ticketType),
        Validators.max(effectiveMax),
        ...(this.isStepQuantityEnabled ? [this.getStepValidator(ticketType, effectiveMax)] : []),
      ]);
    });
  }

  override decreaseTicketCounter(ticketType: TicketType): void {
    this.#forgetCappedQuantity(ticketType);
    super.decreaseTicketCounter(ticketType);
  }

  protected override getTicketCountersMap(): Map<string, number> {
    const result: Iterable<[string, number]> = Object.entries(this.ticketsFormGroup?.controls ?? {}).map(([key, control]) => [
      key,
      Number(control.value || '0'),
    ]);

    const mergedMap = new Map(result);

    if (!this.allowMultiTimeSlot) {
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

  override increaseTicketCounter(ticketType: TicketType): void {
    this.#forgetCappedQuantity(ticketType);
    if (ticketType.sessionId === undefined) {
      return;
    }
    const effectiveMax = this.#getMaxValue(ticketType);
    if (this.isIncreaseDisabled(ticketType.sessionId, effectiveMax)) {
      return;
    }
    const step = this.getSafeStep(ticketType);
    const effectiveMin = this.getEffectiveMin(ticketType);
    const rawCounter = Number(this.getFormControlByName(ticketType.sessionId)?.value) || 0;
    const snappedCounter = rawCounter === 0 ? 0 : this.snapToStep(rawCounter, ticketType);
    let counter = rawCounter < effectiveMin ? effectiveMin : snappedCounter + step;
    counter = Math.min(counter, effectiveMax);
    this.getFormControlByName(ticketType.sessionId)?.setValue(counter.toString());
    if (!ticketType.isAddon && !ticketType.isShopProduct) {
      this.entryTicketTypesSelected++;
    }
  }

  protected override initializeCountersWithTicketTypesAlreadySelected() {
    return this.seedCountersFromEmittedSelection(this.allowMultiTimeSlot);
  }

  isInvitationChannel(): boolean {
    return this.channel != null ? ChannelService.isInvitation(this.channel) : false;
  }

  isTicketTypeSelected(ticketType: TicketType): boolean {
    if (ticketType.sessionId === undefined) {
      return false;
    }
    const control = this.getFormControlByName(ticketType.sessionId);
    const value = control?.value;
    if (!value) {
      return false;
    }
    const numericValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return !isNaN(numericValue) && numericValue > 0;
  }

  toggleTicketTypeDetails(ticketType: TicketType): void {
    if (ticketType.sessionId !== undefined && this.ticketTypeDetailsMap.has(ticketType.sessionId)) {
      this.ticketTypeDetailsMap.delete(ticketType.sessionId);
    } else {
      if (ticketType.sessionId !== undefined && ticketType.details !== undefined) {
        this.ticketTypeDetailsMap.set(ticketType.sessionId, ticketType.details);
      }
    }
  }

  protected getInputWidth(value: string | null): string {
    const length = Math.min(Math.max((value ?? '').length, 1), 13);
    if (length <= 4) {
      return '64px';
    }
    return `calc(${length + 1}ch + 1.5rem)`;
  }

  hasDiscountTicketType(ticketType: TicketType): boolean {
    if (!ticketType.price || !ticketType.priceWithDiscount) {
      return false;
    }
    return ticketType.priceWithDiscount.amount > 0 && ticketType.price.amount > 0;
  }

  getMaxValueForTicket(ticketType: TicketType): number {
    return this.#getMaxValue(ticketType);
  }

  override getEffectiveMax(ticketType: TicketType): number {
    return this.#getMaxValue(ticketType);
  }

  protected override getEffectiveMaxForInput(ticketType: TicketType): number {
    return this.getMaxValueForTicket(ticketType);
  }

  #getMaxValue(ticketType: TicketType): number {
    if (!this.isInvitationChannel()) {
      return super.getEffectiveMax(ticketType);
    }
    const rawMax = ticketType.getPurchasableTicketCount() as number;
    if (rawMax == null) {
      return super.getEffectiveMax(ticketType);
    }
    const step = this.getSafeStep(ticketType);
    const effectiveMin = this.getEffectiveMin(ticketType);
    const computed = effectiveMin + step * Math.floor((rawMax - effectiveMin) / step);
    return Math.min(rawMax, Math.max(effectiveMin, computed));
  }

  #getDiscountOfTicketType(ticketType: TicketType): Money {
    const currency = ticketType.price?.currency ?? '';
    if (!this.discounts?.length) {
      return new Money(0, currency);
    }

    const discount = this.discounts.find(discount => discount.ticketTypeId === ticketType.id);
    if (!discount) {
      return new Money(0, currency);
    }

    return calculateTotalDiscount(ticketType.price?.amount ?? 0, currency, { amount: discount.discount, type: discount.discountType });
  }
}
