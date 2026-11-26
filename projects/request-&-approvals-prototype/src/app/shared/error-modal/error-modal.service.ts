import { inject, Injectable } from '@angular/core';

import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';

import { BaseErrorResponse } from '../models/base-response';
import { formatErrorMessage } from '../utils/format-error-message';
import { ErrorModalComponent } from './error-modal.component';
import { ErrorModalData, ErrorModalOptions } from './error-modal.model';

/**
 * Bridges an error to the error dialog component (`ErrorModalComponent`) on the Ignite dialog.
 *
 * The error resolution rules (`errors.*` code lookup, message fallback, generic fallback) should be
 * extracted into a centralized, standard resolver.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorModalService {
  readonly #dialogService = inject(IgntDialogService);
  readonly #translate = inject(TranslateService);

  buildErrorMessages(options?: ErrorModalOptions): string[] {
    const errorObjectTranslations = this.#getErrorTranslationByCode(options?.error ?? []);
    const errorMessages = errorObjectTranslations.length ? errorObjectTranslations : this.#getMessageTranslation(options?.message);

    if (!options?.showErrorCode || !options.errorCode) {
      return errorMessages;
    }
    const errorCodeTranslation = this.#translate.instant('common.errorCode');
    return [...errorMessages, `(${errorCodeTranslation}: ${options.errorCode})`];
  }

  /**
   * @param title The dialog title, already translated
   * @returns The dialog ref: `closed$` emits `true` on OK and `undefined` on Escape or a backdrop click
   */
  open(title: string, options?: ErrorModalOptions): IgntDialogRef<boolean> {
    const data: ErrorModalData = {
      kiosk: options?.kiosk ?? false,
      messages: this.buildErrorMessages(options),
      title,
    };
    return this.#dialogService.openModal<boolean, ErrorModalData>(ErrorModalComponent, { data, size: data.kiosk ? 'md' : 'sm' });
  }

  #getCodeErrorTranslation(error: BaseErrorResponse): string {
    if (!error?.code) {
      return '';
    }
    const errorTranslationKey = `errors.${error?.code}`;
    const errorTranslation = this.#translate.instant(errorTranslationKey);
    return errorTranslation === errorTranslationKey ? '' : errorTranslation;
  }

  #getErrorTranslationByCode(error: BaseErrorResponse | BaseErrorResponse[]): string[] {
    const errors = Array.isArray(error) ? error : [error];
    return errors.reduce<string[]>((acc, curr) => {
      const codeTranslation = this.#getCodeErrorTranslation(curr);
      const errorTranslationKey = `errors.${curr?.code}`;

      if (!codeTranslation || codeTranslation === errorTranslationKey) {
        const messageTranslation = this.#getMessageErrorTranslation(curr);
        return !messageTranslation ? acc : [...acc, messageTranslation];
      }
      return [...acc, codeTranslation];
    }, []);
  }

  #getMessageErrorTranslation(error: BaseErrorResponse): string {
    const messageKey = formatErrorMessage(error?.message);
    const translationKey = !messageKey || this.#translate.instant(messageKey) === messageKey ? 'errors.generic' : messageKey;
    if (translationKey === 'errors.generic' && error?.userError) {
      return error.userError;
    }
    return this.#translate.instant(translationKey);
  }

  #getMessageTranslation(message: string | string[] = 'errors.generic'): string[] {
    if (Array.isArray(message)) {
      return message.map((msg: string) => this.#translate.instant(formatErrorMessage(msg)));
    } else {
      return [this.#translate.instant(formatErrorMessage(message))];
    }
  }
}
