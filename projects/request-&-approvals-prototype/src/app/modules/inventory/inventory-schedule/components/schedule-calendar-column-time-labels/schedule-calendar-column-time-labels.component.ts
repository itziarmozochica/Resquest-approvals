import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ScheduleCalendarTimeLabel } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-time-label.model';
import { TimeLabelsUtilsService } from '@fz-original/app/modules/inventory/inventory-schedule/services/time-labels-utils.service';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';

@Component({
  selector: 'app-schedule-calendar-column-time-labels',
  styleUrls: ['./schedule-calendar-column-time-labels.component.scss'],
  templateUrl: './schedule-calendar-column-time-labels.component.html',
  imports: [IgntTypeaheadModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ScheduleCalendarColumnTimeLabelsComponent {
  readonly #timeLabelsUtilsService = inject(TimeLabelsUtilsService);

  readonly times = computed<string[]>(() => this.#buildTimes('shortTime'));

  readonly timeLabels = computed<ScheduleCalendarTimeLabel[]>(() => {
    const timeSlotsLeftOut = new Set(this.timeSlotsLeftOut());
    const timeSlots = this.#buildTimes();
    return this.times().map((label, index) => ({ isLeftOut: timeSlotsLeftOut.has(timeSlots[index]), label }));
  });

  duration = input.required<number | undefined>();
  endTime = input.required<string | undefined>();
  fixedTimeSlots = input.required<string[]>();
  startTime = input.required<string | undefined>();
  readonly timeSlotLeftOutReason = input<string | null>(null);
  readonly timeSlotsLeftOut = input<string[]>([]);

  #buildTimes(timeFormat?: string): string[] {
    const fixedTimeSlots = this.fixedTimeSlots();
    if (fixedTimeSlots.length) {
      return this.#timeLabelsUtilsService.localizeTimes(fixedTimeSlots, timeFormat);
    }
    return this.#timeLabelsUtilsService.buildLocalizedTimeRange(this.duration()!, this.startTime()!, this.endTime()!, timeFormat);
  }
}
