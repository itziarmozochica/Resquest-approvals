import { InjectionToken, type Signal } from '@angular/core';

/**
 * Literals for table UI: empty state, pagination label, card expand labels.
 * All keys optional: provide only overrides via `IGNT_TABLE_TRANSLATIONS`; `IgntTableTranslationsDirective` merges them with the library defaults.
 */
export interface IgntDialogTranslations {
  /**
   * Text of the cancel button on the modal footer
   */
  cancelButton: string;
  /**
   * Text to be used as the aria-label of the X (close) button
   */
  closeAriaLabel: string;
  /**
   * Text of the OK button on the footer
   */
  okButton: string;
}

/**
 * Default translations for dialogs
 */
export const DIALOG_DEFAULT_TRANSLATIONS: IgntDialogTranslations = {
  cancelButton: 'Cancel',
  closeAriaLabel: 'Close',
  okButton: 'OK',
};

export const IGNT_DIALOG_TRANSLATIONS = new InjectionToken<Signal<Partial<IgntDialogTranslations>>>('IGNT_DIALOG_TRANSLATIONS');
