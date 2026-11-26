import { IgntDialogTranslations } from '@ignite/common';

import { BaseErrorResponse } from '../models/base-response';

export const ERROR_MODAL_DEFAULT_TRANSLATIONS: IgntDialogTranslations = {
  cancelButton: 'Cancel',
  closeAriaLabel: 'Close',
  okButton: 'OK',
};

export interface ErrorModalOptions {
  error?: BaseErrorResponse | BaseErrorResponse[];
  errorCode?: string | number;
  /** Replaces the legacy `windowClass: 'kiosk-modal'`: a 720px dialog with the kiosk text sizes. */
  kiosk?: boolean;
  message?: string | string[];
  showErrorCode?: boolean;
}

export interface ErrorModalData {
  kiosk: boolean;
  messages: string[];
  title: string;
}
