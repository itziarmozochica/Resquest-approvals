import { Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'hoursToDays',
  standalone: false,
})
export class HoursToDaysPipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(hours: number): string {
    const hourTranslation = this.translate.instant('hour');
    const hoursTranslation = this.translate.instant('hours');
    const dayTranslation = this.translate.instant('day');
    const daysTranslation = this.translate.instant('days');

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      let daysText = `${days} ${days === 1 ? dayTranslation : `${daysTranslation}`}`;
      if (hours % 24 > 0) {
        daysText = daysText + ` ${hours % 24} ${hours === 1 ? hourTranslation : `${hoursTranslation}`}`;
      }
      return daysText;
    } else {
      return `${hours} ${hours === 1 ? hourTranslation : `${hoursTranslation}`}`;
    }
  }
}
