import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Input,
  Output,
  signal,
  untracked,
} from '@angular/core';

import { TimeLabelsUtilsService } from '@fz-original/app/modules/inventory/inventory-schedule/services/time-labels-utils.service';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { TranslateService } from '@ngx-translate/core';

import { safeClone } from '../../../shared/utils/object.util';
import { ScheduleDay, ScheduleTimeSlot } from '../../models/schedule-calendar-detail.model';
import { GenericOption } from '../../models/schedule-calendar-options.models';
import { ScheduleCalendarTimeSlotComponent } from '../schedule-calendar-time-slot/schedule-calendar-time-slot.component';

export interface ViewTimeSlot {
  disabled: boolean;
  scheduleTimeSlot: ScheduleTimeSlot | null;
  time: string;
}

const defaultHeaderDateFormat = 'EEE, MMMM d, yyyy';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTypeaheadModule, ScheduleCalendarTimeSlotComponent],
  selector: 'app-schedule-calendar-column-day',
  standalone: true,
  styleUrls: ['./schedule-calendar-column-day.component.scss'],
  templateUrl: './schedule-calendar-column-day.component.html',
})
export class ScheduleCalendarColumnDayComponent {
  readonly #datePipe = inject(DatePipe);
  readonly #day = signal<ScheduleDay | undefined>(undefined);
  readonly #immutableInitialTimes = signal<Set<string>>(new Set());
  readonly #slotMap = computed<Map<string, ScheduleTimeSlot>>(() => {
    const currentDay = this.#day();
    if (!currentDay) {
      return new Map();
    }
    return new Map(
      currentDay.timeSlots
        .map(slot => ({ ...slot, time: this.#timeLabelsUtilsService.localizeTime(slot.time) }))
        .map(slot => [slot.time, slot]),
    );
  });
  readonly #timeLabelsUtilsService = inject(TimeLabelsUtilsService);
  readonly #translateService = inject(TranslateService);

  readonly #timeGridKey = computed<string>(() => {
    const fixedSlots = this.fixedTimeSlots();
    if (fixedSlots.length > 0) return `fixed:${fixedSlots.join(',')}`;
    return `range:${this.duration()}-${this.startTime()}-${this.endTime()}`;
  });

  readonly headerText = computed<string>(() => {
    const specificDate = this.#day()?.specificDate;
    const headerDateFormat = this.headerDateFormat();
    const weekDay = this.weekDay();

    if (specificDate != null) {
      if (!isNaN(Date.parse(specificDate.trim()))) {
        return this.#datePipe.transform(specificDate, headerDateFormat) ?? '';
      }
      return '';
    }
    return this.#translateService.instant(`inventory.schedule.scheduleForm.weekDays.labels.${weekDay}`);
  });

  readonly slots = computed<ViewTimeSlot[]>(() => {
    let times = this.#timeLabelsUtilsService.localizeTimes(this.fixedTimeSlots());
    if (!times.length) {
      times = this.#timeLabelsUtilsService.buildLocalizedTimeRange(this.duration()!, this.startTime()!, this.endTime()!);
    }
    if (!times.length) {
      return [];
    }
    const disabledSlots = this.#immutableInitialTimes();
    const timeSlotsLeftOut = new Set(this.timeSlotsLeftOut());
    const slotMap = this.#slotMap();

    return times.map(timeValue => {
      const existingSlot = slotMap.get(timeValue) ?? null;
      const disabled = this.disabled() || disabledSlots.has(timeValue) || timeSlotsLeftOut.has(timeValue);
      return { disabled, scheduleTimeSlot: existingSlot, time: timeValue };
    });
  });

  columnIndex = input<number>(0);
  capacityOptions = input.required<GenericOption[]>();
  dragOriginRow = input<number | null>(null);
  @Input() set day(value: ScheduleDay | undefined) {
    this.#syncDayState(value ? safeClone(value) : undefined);
  }
  defaultCapacityTemplateId = input.required<string | null>();
  disabled = input<boolean>(false);
  duration = input<number | undefined>();
  endTime = input<string | undefined>();
  fixedTimeSlots = input<string[]>([]);
  dragTierColor = input<string | null>(null);
  headerDateFormat = input<string>(defaultHeaderDateFormat);
  hideCapacityTemplate = input.required<boolean>();
  highlightedRows = input<ReadonlySet<number>>(new Set());
  isDragging = input<boolean>(false);
  isLeftEdge = input<boolean>(false);
  isRightEdge = input<boolean>(false);
  startTime = input<string | undefined>();
  tierOptions = input.required<GenericOption[]>();
  readonly timeSlotsLeftOut = input<string[]>([]);
  timezone = input.required<string>();
  weekDay = input.required<string | null>();

  @Output() cellMouseDown = new EventEmitter<{
    rowIndex: number;
    tierId: number | null;
    capacityTemplateId: string | null;
  }>();
  @Output() dayChange = new EventEmitter<ScheduleDay>();

  constructor() {
    let previousTimeGridKey: string | null = null;

    effect(() => {
      const currentKey = this.#timeGridKey();

      if (previousTimeGridKey !== null && previousTimeGridKey !== currentKey) {
        const prevType = previousTimeGridKey.split(':')[0];
        const currType = currentKey.split(':')[0];
        if (prevType === currType) {
          untracked(() => this.#migrateTimeSlotsOnGridChange());
        }
      }

      previousTimeGridKey = currentKey;
    });
  }

  hasBottomBorder(idx: number): boolean {
    return this.isSlotHighlighted(idx) && !this.highlightedRows().has(idx + 1);
  }

  hasLeftBorder(idx: number): boolean {
    return this.isSlotHighlighted(idx) && this.isLeftEdge();
  }

  hasRightBorder(idx: number): boolean {
    return this.isSlotHighlighted(idx) && this.isRightEdge();
  }

  hasTopBorder(idx: number): boolean {
    return this.isSlotHighlighted(idx) && !this.highlightedRows().has(idx - 1);
  }

  isSlotHighlighted(index: number): boolean {
    return this.highlightedRows().has(index);
  }

  onTierDragStart(rowIndex: number, event: { tierId: number | null; capacityTemplateId: string | null }): void {
    if (this.disabled()) return;
    this.cellMouseDown.emit({ rowIndex, ...event });
  }

  onTimeSlotChange(viewTimeSlot: ViewTimeSlot, scheduleTimeSlot: ScheduleTimeSlot | null): void {
    if (scheduleTimeSlot === null || scheduleTimeSlot.tierId == null) {
      this.#removeSlot(viewTimeSlot.time);
      return;
    }
    this.#replaceOrInsertSlot(scheduleTimeSlot);
  }

  #emitDayChange(timeSlots: ScheduleTimeSlot[]): void {
    const current = this.#day();
    const updatedDay: ScheduleDay = {
      specificDate: current?.specificDate ?? null,
      weekDayName: current?.weekDayName ?? null,
      timeSlots,
    };
    this.#day.set(updatedDay);
    this.dayChange.emit(updatedDay);
  }

  #migrateTimeSlotsOnGridChange(): void {
    const day = this.#day();
    if (!day || day.timeSlots.length === 0) return;

    let times = this.#timeLabelsUtilsService.localizeTimes(this.fixedTimeSlots());
    if (!times.length) {
      const duration = this.duration();
      const startTime = this.startTime();
      const endTime = this.endTime();
      if (!duration || !startTime || !endTime) return;
      times = this.#timeLabelsUtilsService.buildLocalizedTimeRange(duration, startTime, endTime);
    }
    if (times.length === 0) return;

    const migratedSlots = this.#timeLabelsUtilsService.migrateTimeSlots(this.#slotMap(), times);
    if (migratedSlots) {
      const updatedDay: ScheduleDay = {
        specificDate: day.specificDate,
        weekDayName: day.weekDayName,
        timeSlots: migratedSlots,
      };
      this.#day.set(updatedDay);
      this.dayChange.emit(updatedDay);
    }
  }

  #removeSlot(time: string): void {
    if (this.disabled() || this.#immutableInitialTimes().has(time)) {
      return;
    }
    const currentSlots = this.#day()?.timeSlots ?? [];
    const nextSlots = currentSlots.filter(slot => slot.time !== time);
    this.#emitDayChange(this.#sortSlots(nextSlots));
  }

  #replaceOrInsertSlot(newSlot: ScheduleTimeSlot): void {
    if (this.disabled() || this.#immutableInitialTimes().has(newSlot.time)) {
      return;
    }
    const currentSlots = this.#day()?.timeSlots ?? [];
    const slotExists = currentSlots.some(slot => slot.time === newSlot.time);
    const nextSlots = slotExists ? currentSlots.map(slot => (slot.time === newSlot.time ? newSlot : slot)) : [...currentSlots, newSlot];
    this.#emitDayChange(this.#sortSlots(nextSlots));
  }

  #sortSlots(slots: ScheduleTimeSlot[]): ScheduleTimeSlot[] {
    return [...slots].sort(
      (slotA, slotB) => this.#timeLabelsUtilsService.timeToMinutes(slotA.time) - this.#timeLabelsUtilsService.timeToMinutes(slotB.time),
    );
  }

  #syncDayState(day: ScheduleDay | undefined): void {
    if (day === this.#day()) {
      return;
    }
    if (!day) {
      this.#day.set(undefined);
      this.#immutableInitialTimes.set(new Set());
      return;
    }
    const clonedTimeSlots = day.timeSlots.map(slot => ({
      overwrittenCapacityTemplateId: slot.overwrittenCapacityTemplateId,
      tierId: slot.tierId,
      time: slot.time,
      isVisible: slot.isVisible,
      disabled: slot.disabled,
    }));
    this.#day.set({
      specificDate: day.specificDate,
      weekDayName: day.weekDayName,
      timeSlots: clonedTimeSlots,
    });
    const immutableInitialTimes = clonedTimeSlots.filter(slot => slot.disabled).map(slot => slot.time);
    const timeSlots = this.#timeLabelsUtilsService.localizeTimes(immutableInitialTimes);
    this.#immutableInitialTimes.set(new Set(timeSlots));
  }
}
