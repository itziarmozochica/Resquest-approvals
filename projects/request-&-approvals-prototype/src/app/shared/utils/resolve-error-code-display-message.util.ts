import { TranslateService } from '@ngx-translate/core';

import { BaseErrorResponse } from '../models/base-response';

export function resolveErrorCodeDisplayMessage(
  translate: TranslateService,
  error: unknown,
  fallbackKey: string,
  interpolateParams?: Record<string, unknown>,
): string {
  const baseError = error as BaseErrorResponse | null | undefined;
  const code = baseError?.code;

  if (code != null && isBusinessErrorCode(code)) {
    const translationKey = `errors.${code}`;
    const translated = translate.instant(translationKey, interpolateParams);
    if (translated !== translationKey) {
      return translated;
    }
  }

  return translate.instant(fallbackKey);
}

function isBusinessErrorCode(code: string | number): boolean {
  return String(code).length >= 8;
}
