import { CurrencyPipe, KeyValuePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  UntypedFormControl,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';

import { OnsiteSetup } from '../../../modules/box-office/shared/models/onsite-setup';
import { IconsModule } from '../../icons/icons.module';
import { Money } from '../../models/money.model';
import { ReservationRestrictionEnum } from '../../models/session-type/reservation-restriction.enum';
import { MaxLimitTicketFieldEnum } from '../../models/ticket-type/max-limit-ticket-field.enum';
import { MinLimitTicketFieldEnum } from '../../models/ticket-type/min-limit-ticket-field.enum';
import { OngoingMultiDayTicketGroup } from '../../models/ticket-type/ongoing-multi-day-ticket-group.model';
import { TicketType } from '../../models/ticket-type/ticket-type.model';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { IsAddonWithoutEntryTicketsSelectedPipe } from '../../pipes/is-add-on-without-entry-ticket-selected/is-add-on-without-entry-tickets-selected.pipe';
import { PipesModule } from '../../pipes/pipes.module';
import { PriceViewerPrinterServiceManager } from '../../services/price-viewer/price-viewer.service';
import { safeStepQuantity, snapToStep as snapValueToStep, stepAlignedMax, stepDown, stepUp } from '../../utils/ticket-step.util';
import { TicketSelectorLevelComponent } from '../ticket-selector-level/ticket-selector-level.component';
import { SharedAvailabilityGroupLimits } from '../ticketing/shared-availability-group-limits.util';
import {
  ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE,
  filterOutGlobalAddonOnlySessions,
  filterTicketTypesForLevel,
  getAddonCounterValues,
  isIndependentAddon,
  restoreAddonCounterValues,
  separateIndependentAddons,
} from './addon-explode-pipe.utils';

@Component({
  selector: 'app-ticket-selector',
  templateUrl: './ticket-selector.component.html',
  styleUrls: ['./ticket-selector.component.scss'],
  imports: [
    CurrencyPipe,
    IgntTagComponent,
    IconsModule,
    IsAddonWithoutEntryTicketsSelectedPipe,
    KeyValuePipe,
    NgClass,
    NgTemplateOutlet,
    PipesModule,
    ReactiveFormsModule,
    TicketSelectorLevelComponent,
    TranslateModule,
  ],
  standalone: true,
})
export class TicketSelectorComponent implements OnChanges, OnDestroy, OnInit {
  #addonTicketTypes: TicketType[] = [];
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  #countersEmittedFrom: TicketType[] = [];
  #countersEmittedUnderName: Map<string, number> | null = null;
  #currentTicketFormGroup$ = new ReplaySubject<UntypedFormGroup>(1);
  #destroy$ = new Subject<void>();
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #priceViewerService = inject(PriceViewerPrinterServiceManager);

  @Input() allowMultiSession = false;
  entryTicketTypesSelected = 0;
  @Input() forceDisableIncreaseCounter = false;
  @Output() hasErrors = new EventEmitter<boolean>();
  @Input() hasExplodePipe = false;
  hiddenAddonSectionTicketTypes: TicketType[] = [];
  hiddenSectionTicketTypes: TicketType[] = [];
  @Input() isRevamp = false;
  @Input() locale = '';
  @Input() maxLimitField = MaxLimitTicketFieldEnum.MAXIMUM;
  @Input() minLimitField = MinLimitTicketFieldEnum.NONE;
  @Input() onsiteSetup: OnsiteSetup | null = null;
  @Input() productTypes: TicketType[] = [];
  reservationRestrictionEnum = ReservationRestrictionEnum;
  selectedProductTypes: TicketType[] = [];
  selectedTicketTypes: TicketType[] = [];
  @Input() showAddonsInASeparateSection = false;
  @Input() showHiddenInASeparateSection = false;
  @Input() showPrices = false;
  @Input() showReservationRestriction = false;
  @Input() sharedAvailabilityGroupLimitsBySessionId = new Map<number, SharedAvailabilityGroupLimits>();
  @Input() showTicketAvailabilityInfo = true;
  @Input() titleKey = 'boxOffice.chooseTickets';
  ticketsFormGroup: UntypedFormGroup | undefined = undefined;
  @Input() ticketTypeCounterBySessionId: Map<string, number> = new Map();
  @Input() ticketTypeCounterBySessionType: Map<string, number> = new Map();
  @Output() ticketTypeCounterChange: EventEmitter<{
    bySessionId: Map<string, number>;
    bySessionType: Map<string, number>;
  }> = new EventEmitter<{ bySessionId: Map<string, number>; bySessionType: Map<string, number> }>();
  @Input() ticketTypes: TicketType[] = [];
  @Input() ongoingMultiDayTicketGroups: OngoingMultiDayTicketGroup[] = [];
  @Input() ticketTypesByTimeslot: Map<string, TicketType[]> | null = null;
  @Input() timezone = '';
  unhiddenAddonSectionTicketTypes: TicketType[] = [];

  unhiddenSectionTicketTypes: TicketType[] = [];

  @Input() usePriceViewer = true;
  @Input() isStepQuantityEnabled = false;

  /** Cached: ongoing buckets for template + addon pipe (stable reference between recomputes). */
  visibleOngoingMultiDayTicketGroups: OngoingMultiDayTicketGroup[] = [];
  /** Cached: primary slot types plus flattened ongoing multi-day types (forms, addon validation, clearEmpty). */
  mergedSelectableTicketTypes: TicketType[] = [];

  #previousMergedTicketTypes: TicketType[] = [];

  /** Recomputes cached ongoing groups and merged selectable types (call after ticket selection / explode-pipe updates). */
  #refreshOngoingDerivedLists(): void {
    let levelTickets = this.selectedTicketTypes.filter(t => !t.isOngoingMultiDay);
    if (levelTickets.length === 0) {
      levelTickets = this.ticketTypes;
    }
    const visible = this.#filterOngoingGroupsForLevel(levelTickets);
    this.visibleOngoingMultiDayTicketGroups = visible;
    this.mergedSelectableTicketTypes = [...this.ticketTypes, ...visible.flatMap(g => g.ticketTypes)];
  }

  #syncHasExplodePipeFromPrimary(primaryCandidates: TicketType[]): void {
    if (!this.hasExplodePipe) {
      return;
    }

    if (primaryCandidates.length === 0) {
      return;
    }
    this.hasExplodePipe = primaryCandidates.some(t => t.name.includes('|'));
  }

  get hasTimeslotGrouping(): boolean {
    return this.ticketTypesByTimeslot !== null && this.ticketTypesByTimeslot.size > 0;
  }

  ticketTypesForLevelComponent: TicketType[] = [];

  #isAddonsIndependentFromExplodePipe(): boolean {
    return this.hasExplodePipe && (this.#optimizelyService.isFeatureEnabled(ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE) ?? false);
  }

  protected addControlsValidators(): void {
    this.selectedTicketTypes.forEach(ticketType => {
      const { sessionId } = ticketType;
      const effectiveMax = this.getEffectiveMax(ticketType);
      const control = this.getFormControlByName(sessionId ?? '');
      control?.setValidators([
        this.getMinValidator(ticketType),
        Validators.max(effectiveMax),
        ...(this.isStepQuantityEnabled ? [this.getStepValidator(ticketType, effectiveMax)] : []),
      ]);
    });
  }

  protected getMinValidator(ticketType: TicketType): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === '' || raw == null) return null;
      const value = parseInt(raw, 10);
      if (Number.isNaN(value)) return null;
      const effectiveMin = this.getEffectiveMin(ticketType);
      return value !== 0 && value < effectiveMin ? { min: { value } } : null;
    };
  }

  protected getStepValidator(ticketType: TicketType, effectiveMax: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === '' || raw == null) return null;
      const value = parseInt(raw, 10);
      if (Number.isNaN(value) || value === 0) return null;
      const effectiveMin = this.getEffectiveMin(ticketType);
      const step = this.getSafeStep(ticketType);
      if (value < effectiveMin || value > effectiveMax) return null;
      return (value - effectiveMin) % step === 0 ? null : { step: { value, step } };
    };
  }

  protected checkCorrectExplodePipe(): void {
    if (!this.hasExplodePipe) {
      return;
    }
    const primary = this.selectedTicketTypes.filter(t => !t.isOngoingMultiDay);
    if (primary.length === 0) {
      return;
    }
    this.hasExplodePipe = primary.some((ticketType: TicketType) => ticketType.name.includes('|'));
  }

  decreaseTicketCounter(ticketType: TicketType): void {
    const { sessionId } = ticketType;
    if (this.isDecreaseDisabled(ticketType)) {
      return;
    }
    const rawCounter = parseInt(this.getFormControlByName(sessionId ?? '')?.value) || 0;
    const counter = this.#stepDown(rawCounter, ticketType);
    this.getFormControlByName(sessionId ?? '')?.setValue(counter.toString());
    if (!ticketType.isAddon && !ticketType.isShopProduct) {
      this.entryTicketTypesSelected--;
    }
  }

  displayLabelAsSoldout(ticketType: TicketType): boolean {
    const { isPurchasable, availableTickets, sessionId } = ticketType;
    return !isPurchasable || !!(this.showTicketAvailabilityInfo ? !availableTickets : this.getFormControlByName(sessionId ?? '')?.disabled);
  }

  getAvailableTicketsForDisplay(ticketType: TicketType): number | undefined {
    const { availableTickets } = ticketType;
    const groupLimits = this.#groupLimitsFor(ticketType);
    const groupAlignedLimit = this.#groupAlignedMax(ticketType);
    if (availableTickets === undefined || groupLimits === undefined || groupAlignedLimit === undefined) {
      return availableTickets;
    }
    const selectedUnits = groupLimits.maxUnits - groupLimits.addableUnits;
    return Math.min(availableTickets, Math.max(0, groupAlignedLimit - selectedUnits));
  }

  getControlClass(control: AbstractControl | null): string {
    return control?.invalid ? 'ticket-type__input--invalid' : '';
  }

  getControlError(control: AbstractControl | null): string | undefined {
    if (!control) return undefined;
    const priority = ['pattern', 'max', 'min', 'step'];
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    return errors.shift();
  }

  getFormControlByName(name: number | string): AbstractControl | null {
    return this.ticketsFormGroup?.get([name.toString()]) ?? null;
  }

  increaseTicketCounter(ticketType: TicketType): void {
    const { sessionId } = ticketType;
    const effectiveMax = this.getEffectiveMax(ticketType);
    if (this.isIncreaseDisabled(sessionId ?? 0, effectiveMax)) {
      return;
    }
    const rawCounter = parseInt(this.getFormControlByName(sessionId ?? '')?.value) || 0;
    const counter = this.#stepUp(rawCounter, ticketType);
    this.getFormControlByName(sessionId ?? '')?.setValue(counter.toString());
    if (!ticketType.isAddon && !ticketType.isShopProduct) {
      this.entryTicketTypesSelected++;
    }
  }

  inputCounterChange(counter: string, ticketType: TicketType): void {
    if (this.#snapCounterToGroupLimit(counter, ticketType)) {
      return;
    }
    const { availableTickets } = ticketType;
    const step = this.#getSafeStep(ticketType);
    const effectiveMin = this.getEffectiveMin(ticketType);
    const effectiveMax = this.getEffectiveMaxForInput(ticketType);
    const counterNumber = +counter;

    if (counterNumber === 0 && this.onsiteSetup !== null) {
      this.#priceViewerService.clear(this.onsiteSetup);
      return;
    } else if (
      Number.isFinite(effectiveMax) &&
      availableTickets &&
      counterNumber >= effectiveMin &&
      counterNumber <= Math.min(effectiveMax, availableTickets) &&
      (counterNumber - effectiveMin) % step === 0
    ) {
      this.sendToPriceViewer(counterNumber, ticketType);
    }
  }

  isDecreaseDisabled(ticketType: TicketType): boolean {
    const { sessionId } = ticketType;
    if (sessionId !== undefined) {
      const control = this.getFormControlByName(sessionId);
      const effectiveMin = this.minLimitField === MinLimitTicketFieldEnum.NONE ? 0 : this.getEffectiveMin(ticketType);
      return parseInt(control?.value || '0') <= effectiveMin;
    }
    return false;
  }

  isIncreaseDisabled(ticketTypeName: number, maxLimitField: number): boolean {
    const control = this.getFormControlByName(ticketTypeName);
    return !control || control.disabled || parseInt(control.value || '0') >= maxLimitField || this.forceDisableIncreaseCounter;
  }

  getEffectiveMin(ticketType: TicketType): number {
    return ticketType.getEffectiveMin();
  }

  getEffectiveMax(ticketType: TicketType): number {
    const stepAlignedLimit = this.#stepAlignedLimit(ticketType);
    const groupAlignedLimit = this.#groupAlignedMax(ticketType);
    return groupAlignedLimit === undefined ? stepAlignedLimit : Math.min(stepAlignedLimit, groupAlignedLimit);
  }

  protected getEffectiveMaxForInput(ticketType: TicketType): number {
    return this.getEffectiveMax(ticketType);
  }

  getSafeStep(ticketType: TicketType): number {
    return this.#getSafeStep(ticketType);
  }

  #getSafeStep(ticketType: TicketType): number {
    if (!this.isStepQuantityEnabled) return 1;
    return safeStepQuantity(ticketType.stepQuantity);
  }

  #groupAlignedMax(ticketType: TicketType): number | undefined {
    const groupLimits = this.#groupLimitsFor(ticketType);
    if (groupLimits === undefined) {
      return undefined;
    }
    const { maxUnits } = groupLimits;
    const effectiveMin = this.getEffectiveMin(ticketType);
    if (maxUnits < effectiveMin) {
      return 0;
    }
    return stepAlignedMax(effectiveMin, maxUnits, this.#getSafeStep(ticketType));
  }

  #snapCounterToGroupLimit(counter: string, ticketType: TicketType): boolean {
    const groupAlignedLimit = this.#groupAlignedMax(ticketType);
    if (groupAlignedLimit === undefined || groupAlignedLimit >= this.#stepAlignedLimit(ticketType)) {
      return false;
    }
    const counterNumber = +counter;
    if (!Number.isFinite(counterNumber) || counterNumber <= groupAlignedLimit) {
      return false;
    }
    this.getFormControlByName(ticketType.sessionId ?? '')?.setValue(groupAlignedLimit.toString());
    return true;
  }

  #stepAlignedLimit(ticketType: TicketType): number {
    return stepAlignedMax(this.getEffectiveMin(ticketType), this.#maxLimit(ticketType), this.#getSafeStep(ticketType));
  }

  #groupLimitsFor(ticketType: TicketType): SharedAvailabilityGroupLimits | undefined {
    const { sessionId } = ticketType;
    return sessionId === undefined ? undefined : this.sharedAvailabilityGroupLimitsBySessionId.get(sessionId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.ticketsFormGroup) {
      this.ticketsFormGroup = new UntypedFormGroup({});
      this.#currentTicketFormGroup$.next(this.ticketsFormGroup);
    }

    const { productTypes, showHiddenInASeparateSection, showAddonsInASeparateSection, ticketTypeCounterBySessionId } = changes;

    if (
      productTypes &&
      (this.selectedProductTypes?.length === 0 || !this.equalsSessions(productTypes.currentValue, productTypes.previousValue))
    ) {
      this.selectedProductTypes = productTypes.currentValue;
    }

    const ticketTypesChange = changes['ticketTypes'];
    const ongoingGroupsChange = changes['ongoingMultiDayTicketGroups'];
    if (ticketTypesChange !== undefined || ongoingGroupsChange !== undefined) {
      if (ticketTypesChange?.currentValue !== undefined) {
        this.ticketTypes = ticketTypesChange.currentValue;
      }
      if (ongoingGroupsChange?.currentValue !== undefined) {
        this.ongoingMultiDayTicketGroups = ongoingGroupsChange.currentValue;
      }
      const displayTicketTypes = this.#isAddonsIndependentFromExplodePipe()
        ? filterOutGlobalAddonOnlySessions(this.ticketTypes)
        : this.ticketTypes;
      this.#syncHasExplodePipeFromPrimary(displayTicketTypes);
      this.#addonTicketTypes = this.#isAddonsIndependentFromExplodePipe() ? separateIndependentAddons(displayTicketTypes) : [];
      this.ticketTypesForLevelComponent =
        this.#addonTicketTypes.length > 0 ? filterTicketTypesForLevel(displayTicketTypes) : displayTicketTypes;
      const ongoingForMerge = this.#ongoingTypesForLevelSelection(displayTicketTypes);
      const merged = [...displayTicketTypes, ...ongoingForMerge];
      const ticketTypesChangedFromParent =
        ticketTypesChange && !this.equalsSessions(ticketTypesChange.currentValue ?? [], ticketTypesChange.previousValue ?? []);
      const mergedChanged = !this.equalsSessions(merged, this.#previousMergedTicketTypes);
      if (ticketTypesChangedFromParent || mergedChanged) {
        this.#previousMergedTicketTypes = [...merged];
        this.selectedTicketTypes = merged;
        this.updateTicketTypesSections();
        this.checkCorrectExplodePipe();
        this.#refreshOngoingDerivedLists();
        this.initializeCounters();
      } else {
        this.#refreshOngoingDerivedLists();
      }
    }

    if (changes['hasExplodePipe'] !== undefined && ticketTypesChange === undefined && ongoingGroupsChange === undefined) {
      this.#refreshOngoingDerivedLists();
    }

    if (
      (showHiddenInASeparateSection && showHiddenInASeparateSection.currentValue !== showHiddenInASeparateSection.previousValue) ||
      (showAddonsInASeparateSection && showAddonsInASeparateSection.currentValue !== showAddonsInASeparateSection.previousValue)
    ) {
      this.updateTicketTypesSections();
    }

    if (ticketTypeCounterBySessionId && this.ticketsFormGroup) {
      const previousCounters = ticketTypeCounterBySessionId.previousValue as Map<string, number> | undefined;
      this.#syncFormWithCounters(previousCounters);
    }

    const groupLimitsChange = changes['sharedAvailabilityGroupLimitsBySessionId'];
    if (groupLimitsChange && !groupLimitsChange.firstChange) {
      this.#refreshGroupLimitedControls();
    }
  }

  #refreshGroupLimitedControls(): void {
    const formGroup = this.ticketsFormGroup;
    if (!formGroup) {
      return;
    }
    this.addControlsValidators();
    Object.values(formGroup.controls).forEach(control => control.updateValueAndValidity({ emitEvent: false }));
    this.updateInputsDisableStatus(formGroup);
  }

  #syncFormWithCounters(previousCounters?: Map<string, number>): void {
    let hasFormValueChanges = false;

    previousCounters?.forEach((_, sessionId) => {
      if (this.ticketTypeCounterBySessionId.has(sessionId)) {
        return;
      }
      const control = this.getFormControlByName(sessionId);
      if (!control || control.value === '') {
        return;
      }
      control.setValue('', { emitEvent: false });
      hasFormValueChanges = true;
    });

    this.ticketTypeCounterBySessionId.forEach((value, sessionId) => {
      const control = this.getFormControlByName(sessionId);
      const newValue = value > 0 ? value.toString() : '';
      if (control && control.value !== newValue) {
        control.setValue(newValue, { emitEvent: false });
        if (value > 0) {
          control.enable({ emitEvent: false });
        }
        hasFormValueChanges = true;
      }
    });

    const needsDisableStatusRefresh =
      !this.allowMultiSession &&
      previousCounters !== undefined &&
      [...previousCounters.entries()].some(
        ([sessionId, prevCount]) => prevCount > 0 && (this.ticketTypeCounterBySessionId.get(sessionId) ?? 0) === 0,
      );

    if (hasFormValueChanges || needsDisableStatusRefresh) {
      this.updateInputsDisableStatus(this.ticketsFormGroup!);
      if (hasFormValueChanges) {
        this.ticketsFormGroup?.updateValueAndValidity({ emitEvent: false });
      }
      this.#changeDetectorRef.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
  }

  ngOnInit(): void {
    this.getCurrentFormGroupChanges()
      .pipe(
        takeUntil(this.#destroy$),
        tap(({ formGroup }) => {
          this.clearEmpty(formGroup);
          this.updateInputsDisableStatus(formGroup);
          this.hasErrors.emit(this.ticketsFormGroup?.invalid ?? false);
        }),
        filter(() => this.ticketsFormGroup?.valid ?? false),
        map(() => this.getTicketCountersMap()),
        distinctUntilChanged((a, b) => this.areTicketCountersMapEquals(a, b)),
      )
      .subscribe(counters => {
        const countersBySessionType: Map<string, number> = this.calculateCountersBySessionType(counters);
        this.ticketTypeCounterChange.emit({ bySessionId: counters, bySessionType: countersBySessionType });
      });
  }

  preventInvalidCharacters(event: Event): boolean {
    const input = (event as InputEvent).data;
    if (input && !this.isInputValid(input)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  selectedLevel(ticketTypes: TicketType[]): void {
    if (ticketTypes.some(({ isShopProduct }) => isShopProduct)) {
      this.selectedProductTypes = ticketTypes;
      this.initializeCounters();
      return;
    }

    const addonsAreIndependentFromExplodePipe = this.#isAddonsIndependentFromExplodePipe();
    const preservedAddonCounters = addonsAreIndependentFromExplodePipe
      ? getAddonCounterValues(this.#addonTicketTypes, name => this.getFormControlByName(name))
      : new Map<string, string>();

    this.#syncHasExplodePipeFromPrimary(ticketTypes);
    const ongoingForLevel = this.#ongoingTypesForLevelSelection(ticketTypes);
    const addonsToInclude =
      this.#isAddonsIndependentFromExplodePipe() && ticketTypes.some(ticketType => !isIndependentAddon(ticketType))
        ? this.#addonTicketTypes
        : [];
    this.selectedTicketTypes = [...ticketTypes, ...ongoingForLevel, ...addonsToInclude];
    this.updateTicketTypesSections();
    this.checkCorrectExplodePipe();
    this.#refreshOngoingDerivedLists();
    this.ticketsFormGroup = new UntypedFormGroup({});

    this.#currentTicketFormGroup$.next(this.ticketsFormGroup);
    this.initializeCounters();

    if (addonsAreIndependentFromExplodePipe && preservedAddonCounters.size > 0) {
      restoreAddonCounterValues(preservedAddonCounters, name => this.getFormControlByName(name));
      this.updateInputsDisableStatus(this.ticketsFormGroup!);
      this.ticketsFormGroup?.updateValueAndValidity();
      this.#changeDetectorRef.detectChanges();
    }
  }

  /** Flattened ongoing types visible for the given level (explode-pipe branch). */
  #ongoingTypesForLevelSelection(levelTickets: TicketType[]): TicketType[] {
    return this.#filterOngoingGroupsForLevel(levelTickets).flatMap(g => g.ticketTypes);
  }

  #filterOngoingGroupsForLevel(allLevelTickets: TicketType[]): OngoingMultiDayTicketGroup[] {
    if (this.ongoingMultiDayTicketGroups.length === 0) {
      return [];
    }
    // Independent add-ons sit outside the explode-pipe tree: counting them would collapse the shared prefix to 0 and show
    // every level's ongoing sessions, while the form only holds controls for the selected level's ones.
    const levelTickets = this.#isAddonsIndependentFromExplodePipe()
      ? allLevelTickets.filter(ticketType => !isIndependentAddon(ticketType))
      : allLevelTickets;
    if (!this.hasExplodePipe || levelTickets.length === 0) {
      return this.ongoingMultiDayTicketGroups.map(g => ({ ...g, ticketTypes: [...g.ticketTypes] }));
    }
    // The last segment names the ticket itself, never the level: a level with a single ticket (or several sessions of
    // the same ticket) must not count it, or no ongoing session of that level would match.
    const levelDepth = Math.min(...levelTickets.map(t => t.name.split(t.explodePipeLevelSeparator).length)) - 1;
    const segmentCount = Math.min(this.#commonExplodePrefixSegmentCount(levelTickets), levelDepth);
    if (segmentCount <= 0) {
      return this.ongoingMultiDayTicketGroups.map(g => ({ ...g, ticketTypes: [...g.ticketTypes] }));
    }
    return this.ongoingMultiDayTicketGroups
      .map(g => ({
        ...g,
        ticketTypes: g.ticketTypes.filter(ot => this.#ongoingMatchesExplodePrefix(ot, levelTickets, segmentCount)),
      }))
      .filter(g => g.ticketTypes.length > 0);
  }

  /** Number of leading explode segments shared by every ticket at the current level. */
  #commonExplodePrefixSegmentCount(levelTickets: TicketType[]): number {
    const sep = levelTickets[0].explodePipeLevelSeparator;
    const split = (name: string) => name.split(sep).map(s => s.trim());
    const parts = levelTickets.map(t => split(t.name));
    const minLen = Math.min(...parts.map(p => p.length));
    let depth = 0;
    for (let i = 0; i < minLen; i++) {
      const seg = parts[0][i];
      if (!parts.every(p => p[i] === seg)) {
        break;
      }
      depth = i + 1;
    }
    return depth;
  }

  #ongoingMatchesExplodePrefix(ongoing: TicketType, levelTickets: TicketType[], segmentCount: number): boolean {
    const sep = levelTickets[0].explodePipeLevelSeparator;
    const split = (name: string) => name.split(sep).map(s => s.trim());
    const ongoingParts = split(ongoing.name);
    const refParts = split(levelTickets[0].name);
    if (ongoingParts.length < segmentCount || refParts.length < segmentCount) {
      return false;
    }
    for (let i = 0; i < segmentCount; i++) {
      if (ongoingParts[i] !== refParts[i]) {
        return false;
      }
    }
    return true;
  }

  trackByFn(_: number, value: TicketType): string {
    return value.sessionId?.toString() ?? '';
  }

  protected getVisibleTicketsForTimeslotGroup(timeslotTickets: TicketType[]): TicketType[] {
    if (!this.hasExplodePipe || this.selectedTicketTypes.length === 0) {
      return timeslotTickets;
    }

    const visibleSessionIds = new Set(
      this.selectedTicketTypes.map(ticketType => ticketType.sessionId?.toString() ?? '').filter(id => id !== ''),
    );

    return timeslotTickets.filter(ticketType => visibleSessionIds.has(ticketType.sessionId?.toString() ?? ''));
  }

  private addControlsToFormGroup(values: Map<number | string, number>): void {
    values.forEach((value, controlName) => {
      const ticketType = this.selectedTicketTypes.find(t => t.sessionId?.toString() === controlName?.toString());
      const snappedValue = value && ticketType ? this.snapToStep(value, ticketType) : value;
      const stringValue = snappedValue ? snappedValue.toString() : '';
      const control = this.getFormControlByName(controlName);
      if (!control) {
        this.ticketsFormGroup?.addControl(controlName.toString(), new UntypedFormControl(stringValue), { emitEvent: false });
      } else {
        control.setValue(stringValue, { emitEvent: false });
      }
    });

    this.updateInputsDisableStatus(this.ticketsFormGroup as UntypedFormGroup);
  }

  protected snapToStep(value: number, ticketType: TicketType): number {
    return this.#snapToStep(value, ticketType);
  }

  #snapToStep(value: number, ticketType: TicketType): number {
    if (value === 0) return 0;
    return snapValueToStep(value, this.getEffectiveMin(ticketType), this.getEffectiveMax(ticketType), this.#getSafeStep(ticketType));
  }

  #maxLimit(ticketType: TicketType): number | undefined {
    const raw = ticketType[this.maxLimitField as keyof TicketType];
    return typeof raw === 'number' ? raw : undefined;
  }

  #stepDown(current: number, ticketType: TicketType): number {
    return stepDown(current, this.getEffectiveMin(ticketType), this.getEffectiveMax(ticketType), this.#getSafeStep(ticketType));
  }

  #stepUp(current: number, ticketType: TicketType): number {
    return stepUp(current, this.getEffectiveMin(ticketType), this.getEffectiveMax(ticketType), this.#getSafeStep(ticketType));
  }

  private addToHiddenSessions(ticketType: TicketType): void {
    if (this.showInAddonSection(ticketType)) {
      this.hiddenAddonSectionTicketTypes.push(ticketType);
    } else {
      this.hiddenSectionTicketTypes.push(ticketType);
    }
  }

  private addToUnhiddenSessions(ticketType: TicketType): void {
    if (this.showInAddonSection(ticketType)) {
      this.unhiddenAddonSectionTicketTypes.push(ticketType);
    } else {
      this.unhiddenSectionTicketTypes.push(ticketType);
    }
  }

  protected areTicketCountersMapEquals(a: Map<string, number>, b: Map<string, number>): boolean {
    return a.size === b.size && Array.from(a.entries()).every(([key, value]) => b.get(key) === value);
  }

  protected calculateCountersBySessionType(countersBySessionId: Map<string, number>): Map<string, number> {
    const countersBySessionType = new Map<string, number>();
    countersBySessionId.forEach((value, key) => {
      const ticketType: TicketType | undefined = this.selectedTicketTypes.find(ticketType => {
        const sessionId = ticketType.sessionId?.toString() ?? '';
        return sessionId === key;
      });
      if (!ticketType) {
        return;
      }
      if (ticketType.isOngoingMultiDay) {
        return;
      }
      countersBySessionType.set(ticketType.name, value);
    });
    this.#rememberTypesBehindTheEmittedNameCounts(countersBySessionType);

    return countersBySessionType;
  }

  #rememberTypesBehindTheEmittedNameCounts(countersBySessionType: Map<string, number>): void {
    this.#countersEmittedFrom = [...this.selectedTicketTypes];
    this.#countersEmittedUnderName = new Map(countersBySessionType);
  }

  /**
   * Parents rebuild the name-keyed map before binding it back (the zero filter, the custom-tab merge),
   * so identity cannot tell this selector's own emit from a map a cart restore produced. Comparing the
   * counts that matter does: a restore leaves different numbers under the names this selector emitted.
   */
  #nameCountsStillHoldTheEmittedValues(): boolean {
    const emitted = this.#countersEmittedUnderName;
    if (emitted === null) {
      return false;
    }
    const positiveEntries = (counters: Map<string, number>): [string, number][] =>
      [...counters].filter(([, units]) => units > 0).sort(([a], [b]) => a.localeCompare(b));
    const emittedEntries = positiveEntries(emitted);
    const currentEntries = positiveEntries(this.ticketTypeCounterBySessionType);

    return (
      emittedEntries.length === currentEntries.length &&
      emittedEntries.every(([name, units], index) => currentEntries[index]?.[0] === name && currentEntries[index]?.[1] === units)
    );
  }

  protected clearEmpty(formGroup: UntypedFormGroup): void {
    Object.entries(formGroup.controls).forEach(([name, control]) => {
      if (control.value === '0') {
        control.setValue('', { emitEvent: false });
      }
      if (!this.mergedSelectableTicketTypes.some(ticketType => ticketType.sessionId?.toString() === name) && control.value !== '0') {
        control.setValue('', { emitEvent: false });
      }
    });
  }

  private equalsSessions(currentTicketTypes: TicketType[], previousTicketTypes: TicketType[]): boolean {
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

  protected getCurrentFormGroupChanges(): Observable<{ changes: any; formGroup: UntypedFormGroup }> {
    return this.#currentTicketFormGroup$.pipe(
      switchMap(formGroup =>
        formGroup.valueChanges.pipe(
          map(changes => ({
            formGroup,
            changes,
          })),
        ),
      ),
    );
  }

  protected getTicketCountersMap(): Map<string, number> {
    const result: Iterable<[string, number]> = Object.entries(this.ticketsFormGroup?.controls ?? {}).map(([key, control]) => [
      key,
      parseInt(control.value || '0'),
    ]);
    return new Map(result);
  }

  private initializeCounters(): void {
    if (!this.ticketsFormGroup) {
      this.ticketsFormGroup = new UntypedFormGroup({});
      this.#currentTicketFormGroup$.next(this.ticketsFormGroup);
    }

    const { countersBySessionId } = this.initializeCountersWithTicketTypesAlreadySelected();

    this.addControlsToFormGroup(countersBySessionId);

    this.addControlsValidators();
    this.#changeDetectorRef.detectChanges();
    this.ticketsFormGroup.updateValueAndValidity();
  }

  protected seedCountersFromEmittedSelection(useSessionId: boolean): { countersBySessionId: Map<string, number> } {
    const seedMap = useSessionId ? new Map(this.ticketTypeCounterBySessionId) : new Map(this.ticketTypeCounterBySessionType);
    const ownCountsBySessionId = new Map<string, number>();
    if (!useSessionId) {
      for (const ticketType of this.selectedTicketTypes) {
        if (!ticketType.isOngoingMultiDay) {
          continue;
        }
        const sessionIdStr = ticketType.sessionId?.toString() ?? '';
        const ownCount = this.ticketTypeCounterBySessionId.get(sessionIdStr) ?? 0;
        if (ownCount > 0) {
          ownCountsBySessionId.set(sessionIdStr, ownCount);
          const previous = this.#countersEmittedFrom.find(previousType => previousType.sessionId?.toString() === sessionIdStr);
          const nameCountsAreOurOwnEmit = this.#nameCountsStillHoldTheEmittedValues();
          const wasCountedUnderName = nameCountsAreOurOwnEmit && previous !== undefined && !previous.isOngoingMultiDay;
          if (wasCountedUnderName) {
            seedMap.set(ticketType.name, Math.max((seedMap.get(ticketType.name) ?? 0) - ownCount, 0));
          }
        }
      }
    }
    const { countersBySessionId } = this.selectedTicketTypes.reduce(
      (acc, ticketType) => {
        const { name } = ticketType;
        const sessionIdStr = ticketType.sessionId?.toString() ?? '';
        const lookupKey = useSessionId ? sessionIdStr : name;
        const readsSeed = useSessionId || !ticketType.isOngoingMultiDay;
        const ownCount = ownCountsBySessionId.get(sessionIdStr);
        let counter = ownCount ?? (readsSeed ? acc.sessionTypes.get(lookupKey) : undefined);
        if (counter == null) {
          counter = this.getFormControlByName(sessionIdStr)?.value;
        }
        if (counter == null) {
          counter = 0;
        }

        acc.countersBySessionId.set(sessionIdStr, counter);
        acc.countersBySessionType.set(ticketType.name, acc.countersBySessionType.get(ticketType.name) ?? counter);
        if (ownCount == null && readsSeed) {
          acc.sessionTypes.delete(lookupKey);
        }

        return acc;
      },
      {
        countersBySessionId: new Map<string, number>(),
        countersBySessionType: new Map<string, number>(),
        sessionTypes: seedMap,
      },
    );

    return { countersBySessionId };
  }

  protected initializeCountersWithTicketTypesAlreadySelected() {
    const { countersBySessionId } = this.selectedTicketTypes.reduce(
      (acc, ticketType) => {
        const { name, sessionId } = ticketType;
        const sessionIdStr = sessionId?.toString() ?? '';

        let counter: number | string;
        if (sessionIdStr !== '' && this.ticketTypeCounterBySessionId.has(sessionIdStr)) {
          counter = this.ticketTypeCounterBySessionId.get(sessionIdStr)!;
        } else if (acc.sessionTypes.has(ticketType.name)) {
          counter = acc.sessionTypes.get(ticketType.name)!;
          acc.sessionTypes.delete(name);
        } else {
          counter = this.getFormControlByName(sessionId ?? '')?.value || '';
        }

        acc.countersBySessionId.set(sessionIdStr, counter);
        acc.countersBySessionType.set(ticketType.name, acc.countersBySessionType.get(ticketType.name) || counter || 0);

        return acc;
      },
      {
        countersBySessionId: new Map(),
        countersBySessionType: new Map(),
        sessionTypes: new Map(this.ticketTypeCounterBySessionType),
      },
    );

    return { countersBySessionId };
  }

  private isInputValid(input: string): boolean {
    return /^[0-9]*$/.test(input);
  }

  private sendToPriceViewer(counter: number, ticketType: TicketType): void {
    const { price } = ticketType;
    if (!this.usePriceViewer && !price) {
      return;
    }
    if (this.onsiteSetup !== null) {
      const { currency, amount } = price as Money;
      this.#priceViewerService.showItem(this.onsiteSetup, ticketType, currency, counter, amount);
    }
  }

  private showInAddonSection(ticketType: TicketType): boolean {
    return ticketType.isAddon && this.showAddonsInASeparateSection;
  }

  private showInHiddenSection(ticketType: TicketType): boolean {
    return ticketType.isHidden && this.showHiddenInASeparateSection && !ticketType.isOngoingMultiDay;
  }

  protected updateInputsDisableStatus(formGroup: UntypedFormGroup): void {
    // When ongoing multi-day buckets share a sessionId with a primary ticket row, prefer the primary entry so
    // its purchasability/min/max drive the input's enabled state. Otherwise an ongoing entry (from a different
    // datetime) could override the primary and enable an input that should be disabled.
    const selectedTicketTypesBySessionId = this.selectedTicketTypes.reduce<Record<string, TicketType>>((acc, ticketType) => {
      if (ticketType.sessionId === undefined) {
        return acc;
      }
      const key = ticketType.sessionId.toString();
      const existing = acc[key];
      if (existing && !existing.isOngoingMultiDay && ticketType.isOngoingMultiDay) {
        return acc;
      }
      return { ...acc, [key]: ticketType };
    }, {});

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

  private updateTicketTypesSections(): void {
    this.unhiddenSectionTicketTypes = [];
    this.hiddenSectionTicketTypes = [];
    this.unhiddenAddonSectionTicketTypes = [];
    this.hiddenAddonSectionTicketTypes = [];

    this.selectedTicketTypes.forEach(ticketType => {
      if (ticketType.isOngoingMultiDay) {
        return;
      }
      if (this.showInHiddenSection(ticketType)) {
        this.addToHiddenSessions(ticketType);
      } else {
        this.addToUnhiddenSessions(ticketType);
      }
    });
  }
}
