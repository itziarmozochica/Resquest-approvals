import { formatDate } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

import { CapacityTemplateService } from '@fz-original/app/modules/inventory/inventory-capacity/services/capacity-template.service';
import { ScheduleCalendar } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { GenericOption } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import { ScheduleCalendarOptionsService } from '@fz-original/app/modules/inventory/inventory-schedule/services/schedule-calendar-options.service';
import {
  MAX_QUICK_SETUP_SCHEDULE_COUNT,
  QuickSetupScheduleFormValue,
  QuickSetupScheduleStepFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, forkJoin, merge, Observable, Subject } from 'rxjs';
import { catchError, finalize, map, startWith, switchMap, tap } from 'rxjs/operators';

import { QuickSetupScheduleCalendarViewComponent } from './components/quick-setup-schedule-calendar-view/quick-setup-schedule-calendar-view.component';
import { QuickSetupScheduleCardComponent } from './components/quick-setup-schedule-card/quick-setup-schedule-card.component';
import {
  createDefaultQuickSetupScheduleFormValue,
  resolveNextDefaultQuickSetupScheduleName,
} from './utils/quick-setup-schedule-form.factory';
import { findScheduleDayOverlapFromValues, QuickSetupScheduleDayOverlap } from './utils/quick-setup-schedule-overlap.util';
import { extractCapacityTemplateContext, resolveQuickSetupTierIds, resolveVisibleSessionTypeIds } from './utils/quick-setup-schedule.util';
import {
  buildScheduleCalendarViewScheduleInput,
  resolveCalendarLocale,
  type ScheduleCalendarScrollToMonthRequest,
  type ScheduleCalendarViewScheduleInput,
} from './utils/schedule-calendar-view.util';

const quickSetupScheduleLabelTranslationKey = 'createEvent.quickSetupWizard.step3.scheduleLabel';
const quickSetupScheduleDayOverlapErrorTranslationKey = 'createEvent.quickSetupWizard.step3.errors.scheduleDayOverlap';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    QuickSetupScheduleCalendarViewComponent,
    QuickSetupScheduleCardComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-quick-setup-schedule-step',
  styleUrl: './quick-setup-schedule-step.component.scss',
  templateUrl: './quick-setup-schedule-step.component.html',
})
export class QuickSetupScheduleStepComponent {
  readonly #capacityTemplateService = inject(CapacityTemplateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #injector = inject(Injector);
  readonly #scheduleOptionsService = inject(ScheduleCalendarOptionsService);
  readonly #translate = inject(TranslateService);

  readonly isPricesByTier = input(false);
  readonly planId = input.required<number>();
  readonly reloadRequest = input<number>(0);
  readonly timezone = input('UTC');
  readonly scheduleLoadError = output<void>();
  readonly validityChange = output<boolean>();

  protected readonly scheduleCards = viewChildren(QuickSetupScheduleCardComponent);

  private readonly scheduleCardElements = viewChildren('scheduleCardRef', { read: ElementRef<HTMLElement> });

  readonly #calendarScrollToMonthRequest = signal<ScheduleCalendarScrollToMonthRequest | null>(null);
  protected readonly calendarScrollToMonthRequest = this.#calendarScrollToMonthRequest.asReadonly();

  readonly #loadRequests = new Subject<number>();
  readonly #capacityTemplateId = signal<string | null>(null);
  readonly #availableSessionTypeIds = signal<number[]>([]);
  readonly #sessionTypeOptions = signal<GenericOption[]>([]);
  protected readonly availableSessionTypeIds = this.#availableSessionTypeIds.asReadonly();
  protected readonly capacityTemplateId = this.#capacityTemplateId.asReadonly();
  protected readonly isLoadingScheduleData = signal(true);
  protected readonly sessionTypeOptions = this.#sessionTypeOptions.asReadonly();
  protected readonly tierOptions = signal<GenericOption[]>([]);
  readonly #calendarSchedules = signal<readonly ScheduleCalendarViewScheduleInput[]>([]);
  readonly #calendarSelectedScheduleIndex = signal(0);
  readonly #formValid = signal(false);
  readonly #editingScheduleIndex = signal<number | null>(null);
  protected readonly editingScheduleIndex = this.#editingScheduleIndex.asReadonly();
  protected readonly isScheduleNameEditLocked = computed(() => this.#editingScheduleIndex() !== null);

  protected readonly form = this.#formBuilder.group({
    schedules: this.#formBuilder.array([
      this.#formBuilder.nonNullable.control<QuickSetupScheduleFormValue>(
        createDefaultQuickSetupScheduleFormValue(this.#formatDefaultScheduleName(1)),
      ),
    ]),
  });

  readonly #scheduleCount = toSignal(this.form.controls.schedules.valueChanges.pipe(map(() => this.form.controls.schedules.length)), {
    initialValue: this.form.controls.schedules.length,
  });
  readonly #hasScheduleTierOptions = computed(() => resolveQuickSetupTierIds(this.tierOptions()).normalTierId !== null);
  readonly #hasScheduleData = computed(
    () => this.#capacityTemplateId() !== null && this.#hasScheduleTierOptions() && this.#availableSessionTypeIds().length > 0,
  );
  protected readonly canContinue = computed(
    () => this.#formValid() && !this.isLoadingScheduleData() && this.#hasScheduleData() && !this.isScheduleNameEditLocked(),
  );
  protected readonly canAddSchedule = computed(() => this.#scheduleCount() < MAX_QUICK_SETUP_SCHEDULE_COUNT);
  protected readonly canDeleteSchedule = computed(() => this.#scheduleCount() > 1);
  protected readonly calendarLocale = computed(() => resolveCalendarLocale(navigator.language));
  protected readonly calendarSchedules = this.#calendarSchedules.asReadonly();
  protected readonly calendarSelectedScheduleIndex = this.#calendarSelectedScheduleIndex.asReadonly();

  constructor() {
    merge(this.form.statusChanges, this.form.valueChanges)
      .pipe(startWith(null), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#syncValidityFromForm();
      });

    this.#loadRequests
      .pipe(
        switchMap(planId => this.#loadScheduleStepData(planId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    effect(() => {
      const planId = this.planId();
      this.reloadRequest();

      if (!planId) {
        return;
      }

      untracked(() => this.#loadRequests.next(planId));
    });
  }

  get schedules(): FormArray<FormControl<QuickSetupScheduleFormValue>> {
    return this.form.controls.schedules;
  }

  findScheduleDayOverlap(): QuickSetupScheduleDayOverlap | null {
    const scheduleValues = this.scheduleCards().map(card => card.getFormValue());

    return findScheduleDayOverlapFromValues(scheduleValues);
  }

  getFormValue(): QuickSetupScheduleStepFormValue | null {
    if (!this.canContinue()) {
      return null;
    }

    const scheduleValues = this.scheduleCards()
      .map(card => card.getFormValue())
      .filter((value): value is QuickSetupScheduleFormValue => value != null);

    if (scheduleValues.length !== this.scheduleCards().length) {
      return null;
    }

    return { schedules: scheduleValues };
  }

  resolveScheduleDayOverlapMessage(): string | null {
    const overlap = this.findScheduleDayOverlap();

    if (!overlap) {
      return null;
    }

    return this.#translate.instant(quickSetupScheduleDayOverlapErrorTranslationKey, {
      conflictingDate: this.#formatPlanDateForMessage(overlap.conflictingDate),
      scheduleName: this.#resolveScheduleName(overlap.scheduleIndex),
    });
  }

  markFormAsTouched(): void {
    this.form.markAllAsTouched();
    this.scheduleCards().forEach(card => card.markFormAsTouched());
    this.#syncValidityFromForm();
  }

  protected addSchedule(): void {
    if (!this.canAddSchedule() || this.isScheduleNameEditLocked()) {
      return;
    }

    const defaultName = resolveNextDefaultQuickSetupScheduleName(
      this.schedules.controls.map(control => control.value?.name ?? ''),
      this.#formatDefaultScheduleName.bind(this),
    );
    const scheduleControl = this.#formBuilder.nonNullable.control<QuickSetupScheduleFormValue>(
      createDefaultQuickSetupScheduleFormValue(defaultName, ''),
    );

    scheduleControl.setValue({
      ...scheduleControl.value,
      selectedSessionTypeIds: [...this.#availableSessionTypeIds()],
    });

    this.schedules.push(scheduleControl);
    const newScheduleIndex = this.schedules.length - 1;
    this.#calendarSelectedScheduleIndex.set(newScheduleIndex);
    this.#syncValidityFromForm();
    afterNextRender(() => this.#scrollToScheduleCard(newScheduleIndex), { injector: this.#injector });
  }

  protected onEditingScheduleIndexChange(index: number | null): void {
    this.#editingScheduleIndex.set(index);
    this.#emitValidityChange();
  }

  protected removeSchedule(index: number): void {
    if (!this.canDeleteSchedule() || this.isScheduleNameEditLocked()) {
      return;
    }

    const selectedScheduleIndex = this.#calendarSelectedScheduleIndex();

    this.schedules.removeAt(index);

    if (selectedScheduleIndex === index) {
      this.#calendarSelectedScheduleIndex.set(Math.max(0, index - 1));
    } else if (selectedScheduleIndex > index) {
      this.#calendarSelectedScheduleIndex.set(selectedScheduleIndex - 1);
    }

    this.#syncValidityFromForm();
  }

  protected onCalendarScheduleSelected(scheduleIndex: number): void {
    this.#calendarSelectedScheduleIndex.set(scheduleIndex);
    this.#scrollToScheduleCard(scheduleIndex);
  }

  #scrollToScheduleCard(scheduleIndex: number): void {
    this.scheduleCardElements()[scheduleIndex]?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onCalendarScrollToMonth(monthKey: string): void {
    this.#calendarScrollToMonthRequest.set({ monthKey });
  }

  submit(): ScheduleCalendar[] | null {
    if (this.isScheduleNameEditLocked()) {
      this.markFormAsTouched();
      return null;
    }

    const cards = this.scheduleCards();

    if (cards.length === 0) {
      this.markFormAsTouched();
      return null;
    }

    const calendars = cards.map(card => card.submit());

    if (calendars.some(calendar => calendar === null)) {
      this.markFormAsTouched();
      return null;
    }

    return calendars as ScheduleCalendar[];
  }

  #buildCalendarSchedules(): ScheduleCalendarViewScheduleInput[] {
    if (!this.#hasScheduleData()) {
      return [];
    }

    const cards = this.scheduleCards();
    const controls = this.schedules.controls;
    const canReadLiveCardValues = cards.length === controls.length;

    return controls.map((control, scheduleIndex) => {
      const formValue = canReadLiveCardValues
        ? (cards[scheduleIndex]?.getScheduleFormValue() ?? control.getRawValue())
        : control.getRawValue();

      return buildScheduleCalendarViewScheduleInput(formValue, scheduleIndex, this.timezone());
    });
  }

  #applyDefaultSessionTypeIdsToSchedules(): void {
    this.scheduleCards().forEach(card => card.setSelectedSessionTypeIds(this.#availableSessionTypeIds()));
  }

  #emitValidityChange(): void {
    this.validityChange.emit(this.canContinue());
  }

  #formatDefaultScheduleName(scheduleNumber: number): string {
    return this.#translate.instant(quickSetupScheduleLabelTranslationKey, { number: scheduleNumber });
  }

  #handleScheduleStepLoadFailure(): void {
    this.#capacityTemplateId.set(null);
    this.#availableSessionTypeIds.set([]);
    this.#sessionTypeOptions.set([]);
    this.tierOptions.set([]);
    this.scheduleLoadError.emit();
    this.#emitValidityChange();
  }

  #loadScheduleStepData(planId: number): Observable<unknown> {
    this.isLoadingScheduleData.set(true);

    return forkJoin({
      capacityTemplates: this.#capacityTemplateService.getCapacityTemplates(planId),
      scheduleOptions: this.#scheduleOptionsService.get(planId),
    }).pipe(
      tap(({ capacityTemplates, scheduleOptions }) => {
        const { capacityTemplateId, sessionTypeIds } = extractCapacityTemplateContext(capacityTemplates);
        const visibleSessionTypeIds = resolveVisibleSessionTypeIds(sessionTypeIds, scheduleOptions.sessionTypeOptions);

        if (!capacityTemplateId || visibleSessionTypeIds.length === 0 || scheduleOptions.tierOptions.length === 0) {
          this.#handleScheduleStepLoadFailure();
          return;
        }

        this.#capacityTemplateId.set(capacityTemplateId);
        this.#availableSessionTypeIds.set(visibleSessionTypeIds);
        this.#sessionTypeOptions.set(scheduleOptions.sessionTypeOptions);
        this.tierOptions.set(scheduleOptions.tierOptions);
        this.#applyDefaultSessionTypeIdsToSchedules();
        this.#syncValidityFromForm();
      }),
      catchError(() => {
        this.#handleScheduleStepLoadFailure();

        return EMPTY;
      }),
      finalize(() => {
        this.isLoadingScheduleData.set(false);
        this.#syncValidityFromForm();
      }),
    );
  }

  #formatPlanDateForMessage(planDate: string): string {
    const date = new Date(`${planDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return planDate;
    }

    return formatDate(date, 'd MMM yyyy', this.#translate.currentLang || 'en');
  }

  #resolveScheduleName(index: number): string {
    const name = String(this.schedules.at(index).value?.name ?? '').trim();

    return name || this.#formatDefaultScheduleName(index + 1);
  }

  #syncValidityFromForm(): void {
    this.schedules.updateValueAndValidity({ emitEvent: false });
    this.#formValid.set(this.form.valid);
    this.#calendarSchedules.set(this.#buildCalendarSchedules());
    this.#clampCalendarSelectedScheduleIndex();
    this.#emitValidityChange();
  }

  #clampCalendarSelectedScheduleIndex(): void {
    const scheduleCount = this.schedules.length;

    if (scheduleCount === 0) {
      this.#calendarSelectedScheduleIndex.set(0);
      return;
    }

    const selectedScheduleIndex = this.#calendarSelectedScheduleIndex();

    if (selectedScheduleIndex >= scheduleCount) {
      this.#calendarSelectedScheduleIndex.set(scheduleCount - 1);
    }
  }
}
