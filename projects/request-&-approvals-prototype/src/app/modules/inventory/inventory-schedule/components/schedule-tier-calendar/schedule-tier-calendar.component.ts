import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output } from '@angular/core';

import { ScheduleCalendarColumnDayComponent } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-calendar-column-day/schedule-calendar-column-day.component';
import { ScheduleCalendarColumnTimeLabelsComponent } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-calendar-column-time-labels/schedule-calendar-column-time-labels.component';
import { ScheduleCalendarDragService } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-calendar-form/schedule-calendar-drag.service';
import { ScheduleDay } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import {
  CLOSED_TIER_COLOR,
  GenericOption,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ScheduleTierCalendarDayDisabledFn, ScheduleTierCalendarDragPaint } from './schedule-tier-calendar.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, ScheduleCalendarColumnDayComponent, ScheduleCalendarColumnTimeLabelsComponent, TranslateModule],
  providers: [ScheduleCalendarDragService],
  selector: 'app-schedule-tier-calendar',
  standalone: true,
  styleUrl: './schedule-tier-calendar.component.scss',
  templateUrl: './schedule-tier-calendar.component.html',
})
export class ScheduleTierCalendarComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dragService = inject(ScheduleCalendarDragService);
  readonly #translateService = inject(TranslateService);

  readonly capacityOptions = input<GenericOption[]>([]);
  readonly days = input.required<ScheduleDay[]>();
  readonly defaultCapacityTemplateId = input<string | null>(null);
  readonly duration = input<number | undefined>(60);
  readonly endTime = input('');
  readonly fixedTimeSlots = input<string[]>([]);
  readonly fluidColumns = input(false);
  readonly headerDateFormat = input('EEE, MMMM d, yyyy');
  readonly hideCapacityTemplate = input(false);
  readonly interactionDisabled = input(false);
  readonly isDayDisabled = input<ScheduleTierCalendarDayDisabledFn>(() => false);
  readonly scrollableColumnThreshold = input(7);
  readonly showOpenTimeSlotError = input(false);
  readonly startTime = input('');
  readonly tableTestId = input<string | null>(null);
  readonly tierOptions = input.required<GenericOption[]>();
  readonly timeLabels = input.required<string[]>();
  readonly timeSlotLeftOutReason = input<string | null>(null);
  readonly timeSlotsLeftOut = input<string[]>([]);
  readonly timezone = input('UTC');

  readonly dayChange = output<ScheduleDay>();
  readonly dragPaint = output<ScheduleTierCalendarDragPaint[]>();

  protected readonly dragMousePosition = this.#dragService.dragMousePosition;
  protected readonly isDragging = this.#dragService.isDragging;
  protected readonly isScrollable = computed(() => this.days().length >= this.scrollableColumnThreshold());
  protected readonly dragTierDisplay = computed<{ color: string; title: string } | null>(() => {
    if (!this.#dragService.isDragging()) {
      return null;
    }

    const tierId = this.#dragService.dragTierId();

    if (tierId === undefined) {
      return null;
    }

    if (tierId === null) {
      return {
        color: CLOSED_TIER_COLOR,
        title: this.#translateService.instant('inventory.schedule.scheduleForm.closedTier'),
      };
    }

    const option = this.tierOptions().find(tier => tier.id === tierId);

    return option === undefined ? null : { color: option.color ?? '#ccc', title: option.title };
  });

  constructor() {
    this.#dragService.initialize(this.#destroyRef, () => {
      this.#emitDragPaint();
    });
  }

  protected getDragOriginRow(columnIndex: number): number | null {
    return this.#dragService.getDragOriginRow(columnIndex);
  }

  protected getHighlightedRows(columnIndex: number): ReadonlySet<number> {
    return this.#dragService.getHighlightedRows(columnIndex);
  }

  protected isHighlightedLeftEdge(columnIndex: number): boolean {
    return this.#dragService.isHighlightedLeftEdge(columnIndex);
  }

  protected isHighlightedRightEdge(columnIndex: number): boolean {
    return this.#dragService.isHighlightedRightEdge(columnIndex);
  }

  protected onCellMouseDown(
    columnIndex: number,
    event: { capacityTemplateId: string | null; rowIndex: number; tierId: number | null },
  ): void {
    if (this.interactionDisabled()) {
      return;
    }

    this.#dragService.onCellMouseDown(columnIndex, event);
  }

  protected onDayChange(day: ScheduleDay): void {
    if (this.interactionDisabled()) {
      return;
    }

    this.dayChange.emit(day);
  }

  protected trackDay(index: number, day: ScheduleDay): string {
    if (day.weekDayName) {
      return day.weekDayName;
    }

    return `${day.specificDate}_${index}`;
  }

  #emitDragPaint(): void {
    const highlighted = this.#dragService.highlightedCells();

    if (highlighted.size === 0) {
      return;
    }

    const tierId = this.#dragService.dragTierId();

    if (tierId === undefined) {
      return;
    }

    const capacityTemplateId = this.#dragService.dragCapacityTemplateId() ?? null;
    const timeLabels = this.timeLabels();
    const calendarDays = this.days();
    const paints: ScheduleTierCalendarDragPaint[] = [];

    for (const [columnIndex, rowIndices] of highlighted) {
      const day = calendarDays[columnIndex];

      if (day === undefined || this.isDayDisabled()(day)) {
        continue;
      }

      const times = [...rowIndices].map(rowIndex => timeLabels[rowIndex]).filter((time): time is string => Boolean(time));

      if (times.length === 0) {
        continue;
      }

      paints.push({
        capacityTemplateId,
        columnIndex,
        day,
        tierId,
        times,
      });
    }

    if (paints.length > 0) {
      this.dragPaint.emit(paints);
    }
  }
}
