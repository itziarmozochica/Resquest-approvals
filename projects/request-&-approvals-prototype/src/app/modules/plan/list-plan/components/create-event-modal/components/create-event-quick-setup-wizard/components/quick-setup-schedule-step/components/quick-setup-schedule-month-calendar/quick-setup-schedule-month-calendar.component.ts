import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ScheduleCalendarMonthCell, ScheduleCalendarMonthDayMark } from '../../models/schedule-calendar-view.model';
import { getQuickSetupScheduleColorKey, QuickSetupScheduleColorKey } from '../../utils/quick-setup-schedule-color.util';
import { toLocalDateString } from '../../utils/quick-setup-schedule.util';
import { buildMonthWeeks, filterDayCellsForMonth, formatMonthTitle, localeWeekdayLabels } from '../../utils/schedule-calendar-view.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-quick-setup-schedule-month-calendar',
  styleUrl: './quick-setup-schedule-month-calendar.component.scss',
  templateUrl: './quick-setup-schedule-month-calendar.component.html',
})
export class QuickSetupScheduleMonthCalendarComponent {
  readonly dayCells = input.required<readonly ScheduleCalendarMonthCell[]>();
  readonly locale = input.required<string>();
  readonly month = input.required<string>();

  protected readonly monthId = computed(() => `quick-setup-schedule-month-${this.month()}`);
  protected readonly title = computed(() => formatMonthTitle(this.month(), this.locale()));
  protected readonly todayYmd = toLocalDateString();
  protected readonly weekdayLabels = computed(() => localeWeekdayLabels(this.locale()));
  protected readonly weeks = computed(() => {
    const month = this.month();

    return buildMonthWeeks(month, this.locale(), filterDayCellsForMonth(month, this.dayCells()));
  });

  protected colorKey(mark: ScheduleCalendarMonthDayMark | null | undefined): QuickSetupScheduleColorKey {
    if (!mark) {
      return 'accent';
    }

    return getQuickSetupScheduleColorKey(mark.dominantScheduleIndex);
  }

  protected isToday(ymd: string): boolean {
    return ymd === this.todayYmd;
  }

  protected trackCell(_cell: ScheduleCalendarMonthCell | null, cellIndex: number): number {
    return cellIndex;
  }

  protected trackWeek(_week: readonly (ScheduleCalendarMonthCell | null)[], weekIndex: number): number {
    return weekIndex;
  }
}
