import { InjectionToken, type Signal } from '@angular/core';

/**
 * Literals the toast renders on its own. Provide any subset through `IGNT_TOAST_TRANSLATIONS`; the service merges
 * the layers over `TOAST_DEFAULT_TRANSLATIONS`.
 */
export interface IgntToastTranslations {
  /**
   * Accessible name of the icon-only dismiss button.
   */
  closeButtonAriaLabel: string;
}

/**
 * Default copy for the toast. Used when no provider overrides it.
 */
export const TOAST_DEFAULT_TRANSLATIONS: IgntToastTranslations = {
  closeButtonAriaLabel: 'Close toast',
};

/**
 * Injection token for toast translations. Provide a `Signal<Partial<IgntToastTranslations>>` with `multi: true`; when
 * several layers exist the later ones win. Same contract as `IGNT_DIALOG_TRANSLATIONS` and `IGNT_TABLE_TRANSLATIONS`.
 */
export const IGNT_TOAST_TRANSLATIONS = new InjectionToken<Signal<Partial<IgntToastTranslations>>>('IGNT_TOAST_TRANSLATIONS');
