import { Injectable } from '@angular/core';

import { ScheduleCalendarOptions, ScheduleCalendarOptionsApiGetResponse } from '../models/schedule-calendar-options.models';

@Injectable({ providedIn: 'root' })
export class ScheduleCalendarOptionsGetAdapter {
  fromApi(response: ScheduleCalendarOptionsApiGetResponse): ScheduleCalendarOptions {
    return {
      capacityTemplateOptions: response.data.capacity_templates.map(template => ({
        id: template.id,
        title: template.name,
      })),
      sessionTypeOptions: response.data.session_types.map(sessionType => ({
        id: sessionType.id,
        title: sessionType.label,
      })),
      tierOptions: response.data.tiers.map(tier => ({
        id: tier.id,
        title: tier.name,
        color: tier.color,
      })),
    };
  }
}
