import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  Output,
  Signal,
  SimpleChanges,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';

import { Observable, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';

import {
  ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE,
  filterTicketTypesForLevel,
  isIndependentAddon,
  separateIndependentAddons,
} from '../../../../../shared/components/ticket-selector/addon-explode-pipe.utils';
import { ReservationRestrictionEnum } from '../../../../../shared/models/session-type/reservation-restriction.enum';
import { MaxLimitTicketFieldEnum } from '../../../../../shared/models/ticket-type/max-limit-ticket-field.enum';
import { MinLimitTicketFieldEnum } from '../../../../../shared/models/ticket-type/min-limit-ticket-field.enum';
import { TicketType } from '../../../../../shared/models/ticket-type/ticket-type.model';
import { OptimizelyService } from '../../../../../shared/optimizely/optimizely.service';
import { OnsiteSetup } from '../../../../box-office/shared/models/onsite-setup';
import { KioskLanguageService } from '../../../services/kiosk-language.service';
import { KioskScreensaverService } from '../../../services/screensaver/kiosk-screensaver.service';

@Component({
  selector: 'app-kiosk-ticket-selector',
  standalone: false,
  styleUrls: ['./kiosk-ticket-selector.component.scss'],
  templateUrl: './kiosk-ticket-selector.component.html',
})
export class KioskTicketSelectorComponent implements OnChanges {
  static readonly maxVisibleTicketDetailsLines = 2;
  static readonly overflowDetectionBufferPx = 1;
  static readonly clampedTextClass = 'ticket-type__addon-info__text--clamped';

  #addonTicketTypes: TicketType[] = [];
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  #currentTicketFormGroup$ = new ReplaySubject<UntypedFormGroup>(1);
  readonly #destroyRef = inject(DestroyRef);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #optimizelyService = inject(OptimizelyService);
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;
  protected readonly ticketDetailsTextElements = viewChildren<ElementRef<HTMLDivElement>>('ticketDetailsText');
  readonly #collapsibleSessionIds = new Set<number>();
  readonly #expandedSessionIds = new Set<number>();
  @Input() allowMultiSession = false;
  entryTicketTypesSelected = 0;
  @Input() forceDisableIncreaseCounter = false;
  @Output() hasErrors = new EventEmitter<boolean>();
  @Input() hasExplodePipe = false;
  hideSingleItemExplodePipeLevels = input(false);
  locale: Signal<string> = this.#kioskLanguageService.locale;
  @Input() maxLimitField = MaxLimitTicketFieldEnum.MAXIMUM;
  @Input() minLimitField = MinLimitTicketFieldEnum.NONE;
  @Input() onsiteSetup?: OnsiteSetup;
  reservationRestrictionEnum = ReservationRestrictionEnum;
  selectedTicketTypeBySessionType: Map<string, number> = new Map();
  selectedTicketTypes: TicketType[] = [];

  @Input() showPrices = false;
  @Input() showReservationRestriction = false;
  @Input() showTicketAvailabilityInfo = true;
  @Input() titleKey = 'boxOffice.chooseTickets';
  @Input() isAddonWithoutEntryWarningHidden = false;

  ticketsFormGroup: UntypedFormGroup = new UntypedFormGroup({});
  @Input() ticketTypeCounterBySessionId: Map<string, number> = new Map();
  @Input() ticketTypeCounterBySessionType: Map<string, number> = new Map();

  @Output() ticketTypeCounterChange: EventEmitter<{
    bySessionId: Map<string, number>;
    bySessionType: Map<string, number>;
  }> = new EventEmitter<{ bySessionId: Map<string, number>; bySessionType: Map<string, number> }>();
  @Input() ticketTypes: TicketType[] = [];
  unhiddenAddonSectionTicketTypes: TicketType[] = [];

  unhiddenSectionTicketTypes: TicketType[] = [];

  ticketTypesForLevelComponent: TicketType[] = [];

  constructor() {
    effect(() => {
      const elements = this.ticketDetailsTextElements();
      if (elements.length === 0) {
        return;
      }
      queueMicrotask(() => this.#refreshCollapsibleTicketDetails());
    });
    this.#getCurrentFormGroupChanges()
      .pipe(
        tap(({ formGroup }) => {
          this.#clearEmpty(formGroup);
          this.#updateInputsDisableStatus(formGroup);
          this.hasErrors.emit(this.ticketsFormGroup.invalid);
        }),
        filter(() => this.ticketsFormGroup.valid),
        map(() => this.#getTicketCountersMap()),
        distinctUntilChanged((a, b) => this.#areTicketCountersMapEquals(a, b)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(counters => {
        this.ticketTypeCounterChange.emit({ bySessionId: counters, bySessionType: this.selectedTicketTypeBySessionType });
      });
  }

  decreaseTicketCounter(ticketType: TicketType): void {
    if (this.isDecreaseDisabled(ticketType) || ticketType.sessionId === undefined) {
      return;
    }
    const rawCounter = Number.parseInt(this.getFormControlByName(ticketType.sessionId)?.value) || 0;
    const snappedCounter = rawCounter === 0 ? 0 : this.#snapToStep(rawCounter, ticketType);
    const step = this.#getSafeStep(ticketType);
    let counter = Math.max(0, snappedCounter - step);
    if (snappedCounter <= ticketType.minimum) {
      counter = 0;
    }
    this.selectedTicketTypeBySessionType.set(ticketType.name, counter);
    this.getFormControlByName(ticketType.sessionId)?.setValue(counter.toString());
    if (!ticketType.isAddon) {
      this.entryTicketTypesSelected--;
    }
  }

  displayLabelAsSoldOut(ticketType: TicketType): boolean {
    return (
      !ticketType.isPurchasable ||
      (this.showTicketAvailabilityInfo
        ? !ticketType.availableTickets
        : ticketType.sessionId !== undefined && this.getFormControlByName(ticketType.sessionId)?.disabled) ||
      false
    );
  }

  getControlClass(control: AbstractControl): string {
    return control.invalid ? 'ticket-type__input--invalid' : '';
  }

  getControlError(control: AbstractControl): string | undefined {
    const priority = ['pattern', 'max', 'min'];
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    return errors.shift();
  }

  getDecreaseIconName(ticketType: TicketType): string {
    if (!this.uiRefreshEnabled || ticketType.sessionId === undefined) {
      return 'minus';
    }
    const counter = parseInt(this.getFormControlByName(ticketType.sessionId)?.value) || 0;
    return counter <= 1 ? 'trash-can' : 'minus';
  }

  getFormControlByName(name: number | string): AbstractControl | null {
    return this.ticketsFormGroup.get([name.toString()]);
  }

  increaseTicketCounter(ticketType: TicketType): void {
    if (ticketType.sessionId === undefined || this.isIncreaseDisabled(ticketType.sessionId, ticketType[this.maxLimitField])) {
      return;
    }
    const step = this.#getSafeStep(ticketType);
    const rawCounter = parseInt(this.getFormControlByName(ticketType.sessionId)?.value) || 0;
    const snappedCounter = rawCounter === 0 ? 0 : this.#snapToStep(rawCounter, ticketType);
    const max = (ticketType[this.maxLimitField as keyof TicketType] as number | undefined) ?? Number.MAX_VALUE;
    const counter = Math.min(max, rawCounter < ticketType.minimum ? ticketType.minimum : snappedCounter + step);
    this.selectedTicketTypeBySessionType.set(ticketType.name, counter);
    this.getFormControlByName(ticketType.sessionId)?.setValue(counter.toString());
    if (!ticketType.isAddon) {
      this.entryTicketTypesSelected++;
    }
  }

  inputCounterChange(counter: string, ticketType: TicketType): void {
    const counterNumber = +counter;
    if (counterNumber === 0) {
      this.selectedTicketTypeBySessionType.set(ticketType.name, 0);
      return;
    } else if (
      counterNumber >= ticketType.minimum &&
      counterNumber <= Math.min(ticketType.maximum || Number.MAX_VALUE, ticketType.availableTickets || 0)
    ) {
      this.selectedTicketTypeBySessionType.set(ticketType.name, counterNumber);
    }
  }

  isDecreaseDisabled(ticketType: TicketType): boolean {
    if (ticketType.sessionId === undefined) return false;

    const control = this.getFormControlByName(ticketType.sessionId);
    return parseInt(control?.value || '0') <= (this.minLimitField === MinLimitTicketFieldEnum.NONE ? 0 : ticketType.minimum);
  }

  isIncreaseDisabled(ticketTypeName: number, maxLimitField: number | undefined): boolean {
    const control = this.getFormControlByName(ticketTypeName);
    return (
      !control || control.disabled || (maxLimitField && parseInt(control.value || '0') >= maxLimitField) || this.forceDisableIncreaseCounter
    );
  }

  isTicketDetailsCollapsible(sessionId: number | undefined): boolean {
    return sessionId !== undefined && this.#collapsibleSessionIds.has(sessionId);
  }

  isTicketDetailsExpanded(sessionId: number | undefined): boolean {
    return sessionId !== undefined && this.#expandedSessionIds.has(sessionId);
  }

  ngOnChanges({ ticketTypes }: SimpleChanges): void {
    if (ticketTypes && !this.#equalsSessions(ticketTypes.currentValue, ticketTypes.previousValue)) {
      this.ticketTypes = ticketTypes.currentValue;
      this.#addonTicketTypes = this.#isAddonsIndependentFromExplodePipe() ? separateIndependentAddons(this.ticketTypes) : [];
      this.ticketTypesForLevelComponent =
        this.#addonTicketTypes.length > 0 ? filterTicketTypesForLevel(this.ticketTypes) : this.ticketTypes;
      this.selectedTicketTypes = this.ticketTypes;
      this.#collapsibleSessionIds.clear();
      this.#expandedSessionIds.clear();
      this.#updateTicketTypesSections();
      this.#checkCorrectExplodePipe();
      this.#initializeCounters();
    }
  }

  preventInvalidCharacters(event: Event): boolean {
    const input = (event as InputEvent).data;
    if (input && !this.#isInputValid(input)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  selectedLevel(ticketTypes: TicketType[]): void {
    const addonsToInclude =
      this.#isAddonsIndependentFromExplodePipe() && ticketTypes.some(ticketType => !isIndependentAddon(ticketType))
        ? this.#addonTicketTypes
        : [];
    this.selectedTicketTypes = [...ticketTypes, ...addonsToInclude];
    this.#updateTicketTypesSections();
    this.ticketsFormGroup = new UntypedFormGroup({});

    this.#currentTicketFormGroup$.next(this.ticketsFormGroup);
    this.#initializeCounters();
    this.#removeSelectedSessionTypesNotInTicketTypes();
  }

  toggleTicketDetailsExpanded(sessionId: number | undefined): void {
    if (sessionId === undefined) {
      return;
    }
    if (this.#expandedSessionIds.has(sessionId)) {
      this.#expandedSessionIds.delete(sessionId);
    } else {
      this.#expandedSessionIds.add(sessionId);
    }
  }

  trackByFn(_: number, value: TicketType): string {
    return value.sessionId?.toString() || '';
  }

  #addControlsToFormGroup(values: Map<number | string, number>): void {
    values.forEach((value, controlName) => {
      const stringValue = value ? value.toString() : '';
      const control = this.getFormControlByName(controlName);
      if (!control) {
        this.ticketsFormGroup.addControl(controlName.toString(), new UntypedFormControl(stringValue), { emitEvent: false });
      } else {
        control.setValue(stringValue, { emitEvent: false });
      }
    });

    this.#updateInputsDisableStatus(this.ticketsFormGroup);
  }

  #addControlsValidators(): void {
    this.selectedTicketTypes.forEach(ticketType => {
      if (ticketType.sessionId === undefined) return;
      const min = (control: AbstractControl): ValidationErrors | null => {
        const value = Number.parseInt(control.value);
        return value !== 0 && value < ticketType.minimum ? { min: { value } } : null;
      };

      const maxValue = ticketType[this.maxLimitField as keyof TicketType] as number;

      const control = this.getFormControlByName(ticketType.sessionId);
      control?.setValidators([min, Validators.max(maxValue)]);
    });
  }

  #areTicketCountersMapEquals(a: Map<string, number>, b: Map<string, number>): boolean {
    return a.size === b.size && Array.from(a.entries()).every(([key, value]) => b.get(key) === value);
  }

  #checkCorrectExplodePipe(): void {
    if (!this.hasExplodePipe) {
      return;
    }
    this.hasExplodePipe = this.selectedTicketTypes.some((ticketType: TicketType) => ticketType.name.includes('|'));
  }

  #clearEmpty(formGroup: UntypedFormGroup): void {
    Object.entries(formGroup.controls).forEach(([name, control]) => {
      if (control.value === '0') {
        control.setValue('', { emitEvent: false });
      }
      if (!this.ticketTypes.some(ticketType => ticketType.sessionId?.toString() === name) && control.value !== '0') {
        control.setValue('', { emitEvent: false });
      }
    });
  }

  #equalsSessions(currentTicketTypes: TicketType[], previousTicketTypes: TicketType[]): boolean {
    if (!previousTicketTypes) {
      return false;
    }
    if (currentTicketTypes.length !== previousTicketTypes.length) {
      return false;
    }
    const difference = currentTicketTypes.filter(
      currentTicketType => !previousTicketTypes.some(previousTicketType => currentTicketType.compareWithSessionId(previousTicketType)),
    );
    return difference.length === 0;
  }

  #getCurrentFormGroupChanges(): Observable<{ formGroup: UntypedFormGroup }> {
    return this.#currentTicketFormGroup$.pipe(
      switchMap(formGroup =>
        formGroup.valueChanges.pipe(
          map(changes => ({
            changes,
            formGroup,
          })),
        ),
      ),
    );
  }

  #getTicketCountersMap(): Map<string, number> {
    const result: Iterable<[string, number]> = Object.entries(this.ticketsFormGroup.controls).map(([key, control]) => [
      key,
      parseInt(control.value || '0'),
    ]);
    return new Map(result);
  }

  #initializeCounters(): void {
    this.#currentTicketFormGroup$.next(this.ticketsFormGroup);

    const { countersBySessionId, countersBySessionType } = this.#initializeCountersWithTicketTypesAlreadySelected();

    this.selectedTicketTypeBySessionType = new Map(countersBySessionType);
    this.#addControlsToFormGroup(countersBySessionId);

    this.#addControlsValidators();
    this.#changeDetectorRef.detectChanges();
    this.ticketsFormGroup.updateValueAndValidity();
  }

  #initializeCountersWithTicketTypesAlreadySelected() {
    const { countersBySessionId, countersBySessionType } = this.selectedTicketTypes.reduce(
      (acc, ticketType) => {
        if (!ticketType.sessionId) {
          return acc;
        }
        const counter = acc.sessionTypes.get(ticketType.name) || this.getFormControlByName(ticketType.sessionId)?.value || '';

        acc.countersBySessionId.set(ticketType.sessionId?.toString(), counter);
        acc.countersBySessionType.set(ticketType.name, acc.countersBySessionType.get(ticketType.name) || counter || 0);
        acc.sessionTypes.delete(ticketType.name);

        return acc;
      },
      {
        countersBySessionId: new Map(),
        countersBySessionType: new Map(),
        sessionTypes: new Map(this.ticketTypeCounterBySessionType),
      },
    );

    return { countersBySessionId, countersBySessionType };
  }

  #isInputValid(input: string): boolean {
    return /^[0-9]*$/.test(input);
  }

  #getSafeStep(ticketType: TicketType): number {
    const s = ticketType.stepQuantity ?? 1;
    return s > 0 ? s : 1;
  }

  #isAddonsIndependentFromExplodePipe(): boolean {
    return this.hasExplodePipe && (this.#optimizelyService.isFeatureEnabled(ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE) ?? false);
  }

  #snapToStep(value: number, ticketType: TicketType): number {
    if (value === 0) return 0;
    const step = this.#getSafeStep(ticketType);
    const min = ticketType.minimum ?? 0;
    const max = (ticketType[this.maxLimitField as keyof TicketType] as number) ?? Number.MAX_VALUE;
    const clamped = Math.max(min, Math.min(max, value));
    const steps = Math.round((clamped - min) / step);
    const result = min + steps * step;
    return Number.isFinite(result) ? result : 0;
  }

  #refreshCollapsibleTicketDetails(): void {
    this.#collapsibleSessionIds.clear();
    this.ticketDetailsTextElements().forEach(elementRef => {
      const element = elementRef.nativeElement;
      const rawSessionId = element.dataset['sessionId'];
      const sessionId = rawSessionId ? Number(rawSessionId) : Number.NaN;
      if (!Number.isFinite(sessionId)) {
        return;
      }

      if (this.#expandedSessionIds.has(sessionId)) {
        this.#collapsibleSessionIds.add(sessionId);
        return;
      }

      const lineHeightPx = parseFloat(window.getComputedStyle(element).lineHeight);
      if (Number.isNaN(lineHeightPx)) {
        return;
      }

      const wasClamped = element.classList.contains(KioskTicketSelectorComponent.clampedTextClass);
      if (wasClamped) {
        element.classList.remove(KioskTicketSelectorComponent.clampedTextClass);
      }

      const maxAllowedHeightPx =
        lineHeightPx * KioskTicketSelectorComponent.maxVisibleTicketDetailsLines + KioskTicketSelectorComponent.overflowDetectionBufferPx;
      const overflows = element.scrollHeight > maxAllowedHeightPx;

      if (wasClamped) {
        element.classList.add(KioskTicketSelectorComponent.clampedTextClass);
      }

      if (overflows) {
        this.#collapsibleSessionIds.add(sessionId);
      }
    });
    this.#changeDetectorRef.markForCheck();
  }

  #removeSelectedSessionTypesNotInTicketTypes(): void {
    this.selectedTicketTypeBySessionType.forEach((_, key) => {
      if (!this.selectedTicketTypes.some(ticketType => ticketType.name === key)) {
        this.selectedTicketTypeBySessionType.delete(key);
      }
    });
  }

  #updateInputsDisableStatus(formGroup: UntypedFormGroup): void {
    const controls = Object.entries(formGroup.controls);
    const areAllCountersEmpty = controls.every(([, control]) => !control.value || control.value === '0');
    controls.forEach(([name, control]) => {
      const ticketType = this.selectedTicketTypes.find(ticketType => ticketType.sessionId?.toString() === name);
      const maxLimit = (ticketType && ticketType[this.maxLimitField]) || Number.MAX_VALUE;
      const canSelectTickets = ticketType && ticketType.isPurchasable && maxLimit >= ticketType.minimum && maxLimit > 0;

      const hasEmptyValue = !control.value || control.value === '0';
      if (canSelectTickets && (areAllCountersEmpty || !hasEmptyValue || this.allowMultiSession)) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    });
  }

  #updateTicketTypesSections(): void {
    this.unhiddenAddonSectionTicketTypes = this.selectedTicketTypes.filter(ticketType => ticketType.isAddon);
    this.unhiddenSectionTicketTypes = this.selectedTicketTypes.filter(ticketType => !ticketType.isAddon);
  }
}
