import { TranslateService } from '@ngx-translate/core';

/**
 * Resolves a backend payment-configuration error code to its translated message
 * (`paymentConfig.errors.<code>`), falling back to translating `fallbackKey` when the code has no
 * translation. `instant` returns the key itself when no translation exists, which is how a missing
 * code is detected.
 */
export function resolvePaymentConfigurationErrorMessage(
  translateService: TranslateService,
  code: string | number | undefined,
  fallbackKey: string,
): string {
  const codeKey = `paymentConfig.errors.${code}`;
  const codeMessage = translateService.instant(codeKey);
  return codeMessage !== codeKey ? codeMessage : translateService.instant(fallbackKey);
}
