import { NgbDate, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

export class NgbDateUtil {
  static fromDate(date: Date | null): NgbDate | null {
    if (date === null) {
      return null;
    }

    const ngbDateStruct: NgbDateStruct = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };

    return NgbDate.from(ngbDateStruct);
  }

  static fromDateUTC(date: Date | null): NgbDate | null {
    if (date === null) {
      return null;
    }

    const ngbDateStruct: NgbDateStruct = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };

    return NgbDate.from(ngbDateStruct);
  }
}
