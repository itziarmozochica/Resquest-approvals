import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';

import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  buildScheduleCalendarViewVm,
  type ScheduleCalendarScrollToMonthRequest,
  type ScheduleCalendarViewScheduleInput,
} from '../../utils/schedule-calendar-view.util';
import { QuickSetupScheduleMonthCalendarComponent } from '../quick-setup-schedule-month-calendar/quick-setup-schedule-month-calendar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, QuickSetupScheduleMonthCalendarComponent, TranslateModule],
  selector: 'app-quick-setup-schedule-calendar-view',
  styleUrl: './quick-setup-schedule-calendar-view.component.scss',
  templateUrl: './quick-setup-schedule-calendar-view.component.html',
})
export class QuickSetupScheduleCalendarViewComponent {
  readonly calendarSchedules = input.required<readonly ScheduleCalendarViewScheduleInput[]>();
  readonly locale = input.required<string>();
  readonly scrollToMonthRequest = input<ScheduleCalendarScrollToMonthRequest | null>(null);
  readonly selectedScheduleIndex = input(0);
  readonly timezone = input('UTC');
  readonly scheduleSelected = output<number>();

  private readonly monthsScrollContainer = viewChild<ElementRef<HTMLElement>>('monthsScrollContainer');

  constructor() {
    afterRenderEffect(() => {
      const request = this.scrollToMonthRequest();

      if (!request) {
        return;
      }

      this.#scrollToMonth(request.monthKey);
    });
  }

  protected readonly viewModel = computed(() =>
    buildScheduleCalendarViewVm(this.calendarSchedules(), this.selectedScheduleIndex(), this.timezone()),
  );

  protected onPillSpaceKey(event: Event, scheduleIndex: number): void {
    event.preventDefault();
    this.selectSchedule(scheduleIndex);
  }

  protected scrollToToday(): void {
    const todayMonth = this.viewModel().todayMonth;

    if (!todayMonth) {
      return;
    }

    this.#scrollToMonth(todayMonth);
  }

  protected selectSchedule(scheduleIndex: number): void {
    this.scheduleSelected.emit(scheduleIndex);
  }

  #findMonthElement(month: string): HTMLElement | null {
    const scrollContainer = this.monthsScrollContainer()?.nativeElement;

    return scrollContainer?.querySelector<HTMLElement>(`#quick-setup-schedule-month-${month}`) ?? null;
  }

  #scrollToMonth(monthKey: string): void {
    this.#findMonthElement(monthKey)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
