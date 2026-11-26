import { Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { DateUtil } from '../utils/date.util';

@Pipe({ name: 'isoDate', standalone: false })
export class IsoDatePipe implements PipeTransform {
  constructor(private readonly translate: TranslateService) {}
  transform(value: string, locale: string, format: string): string {
    return DateUtil.formatFromISO(value, locale || 'en', format);
  }
}
