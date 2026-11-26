import { CapacitySummaryByDatetime } from './capacity-summary-datetime.model';

export class CapacitySummaryByDate {
  constructor(
    public date: string,
    public capacitySummaryByDatetime: CapacitySummaryByDatetime[],
  ) {}

  getDateTimes(): string[] {
    const dateTimeList: string[] = [];
    this.capacitySummaryByDatetime.forEach((capacitySummaryByDatetime: CapacitySummaryByDatetime) => {
      dateTimeList.push(capacitySummaryByDatetime.datetime);
    });
    return dateTimeList;
  }
}
