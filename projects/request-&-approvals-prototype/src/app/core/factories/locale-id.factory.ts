import { TranslateService } from '@ngx-translate/core';

export function localeIdFactory(translateService: TranslateService): string {
  return translateService.currentLang;
}
