import { WeekDay } from '../../../../shared/components/week-days-selector/week-days-selector.component';

export interface TimeSlotFilter {
  endDate: string;
  firstTime: string;
  lastTime: string;
  startDate: string;
  weekDays: Array<WeekDay>;
}
