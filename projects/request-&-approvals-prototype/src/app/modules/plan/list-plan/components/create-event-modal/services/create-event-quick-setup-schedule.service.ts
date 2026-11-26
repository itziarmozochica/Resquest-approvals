import { inject, Injectable } from '@angular/core';

import { ScheduleCalendar } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { ScheduleCalendarService } from '@fz-original/app/modules/inventory/inventory-schedule/services/schedule-calendar.service';
import { Observable } from 'rxjs';

import { QuickSetupWriteOriginService } from './quick-setup-write-origin.service';

@Injectable({
  providedIn: 'root',
})
export class CreateEventQuickSetupScheduleService {
  readonly #scheduleCalendarService = inject(ScheduleCalendarService);
  readonly #writeOriginService = inject(QuickSetupWriteOriginService);

  createCalendars(planId: number, placeId: number, calendars: ScheduleCalendar[]): Observable<void> {
    return this.#scheduleCalendarService.bulkCreate(planId, placeId, calendars, this.#writeOriginService.context());
  }
}
