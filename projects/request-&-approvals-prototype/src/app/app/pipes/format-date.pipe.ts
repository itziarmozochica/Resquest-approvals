import { Pipe, PipeTransform } from '@angular/core';

import { DateUtil } from '@fz-original/app/shared/utils/date.util';

@Pipe({
  name: 'formatDate',
  standalone: true,
})
export class FormatDatePipe implements PipeTransform {
  transform(
    date: string,
    dateStyle: 'full' | 'long' | 'medium' | 'short' | undefined = undefined,
    timeStyle: 'full' | 'long' | 'medium' | 'short' | undefined = undefined,
  ): string {
    return DateUtil.formatDate(date, dateStyle, timeStyle);
  }
}
