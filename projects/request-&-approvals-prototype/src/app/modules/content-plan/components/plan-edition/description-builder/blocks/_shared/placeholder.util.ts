import { TranslateService } from '@ngx-translate/core';

/**
 * Resolved placeholder copy for an empty text prop, or `''` when the
 * editor-only affordance is off (the export path). The TranslateService is
 * nullable so canvas components stay constructible in injector contexts
 * without ngx-translate configured (e.g. the export service's spec) — with
 * placeholders off the service is never consulted anyway.
 */
export function resolvePlaceholder(
  translate: TranslateService | null,
  showPlaceholders: boolean,
  key: string,
  params?: Record<string, unknown>,
): string {
  if (!showPlaceholders) return '';
  return translate?.instant(key, params) ?? key;
}
