import { inject, Injectable } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

import { MessageModalComponent } from '../../components/message-modal/message-modal.component';
import { ErrorModalService as IgniteErrorModalService } from '../../error-modal/error-modal.service';
import { BaseErrorResponse } from '../../models/base-response';

export interface ErrorModalOptions {
  error?: BaseErrorResponse | BaseErrorResponse[];
  message?: string | string[];
  showWarningIcon?: boolean;
  title?: string;
  logError?: boolean;
  errorCode?: string | number;
  showErrorCode?: boolean;
  callback?: void;
  windowClass?: string;
}

/**
 * @deprecated Use the Ignite-dialog `ErrorModalService` from `shared/error-modal/error-modal.service`
 * instead: `open(translate.instant(titleKey), options)`. This service still opens the ng-bootstrap
 * `MessageModalComponent` and is removed once no caller imports it (B2BP-1712).
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorModalService {
  readonly #igniteErrorModalService = inject(IgniteErrorModalService);

  constructor(
    protected translate: TranslateService,
    protected modalService: NgbModal,
  ) {}

  buildErrorMessages(options?: ErrorModalOptions): string[] {
    return this.#igniteErrorModalService.buildErrorMessages(options);
  }

  open(options?: ErrorModalOptions): void {
    const modal = options?.windowClass
      ? this.modalService.open(MessageModalComponent, { windowClass: options.windowClass })
      : this.modalService.open(MessageModalComponent);

    const errorMessages = this.buildErrorMessages(options);

    modal.componentInstance.title = this.translate.instant(options?.title || 'common.errorTitle');
    modal.componentInstance.messages = errorMessages;
    modal.componentInstance.showWarningIcon = options?.showWarningIcon ?? false;
    if (options?.logError !== undefined) {
      modal.componentInstance.logError = options.errorCode;
    }
    if (options?.callback !== undefined) {
      modal.componentInstance.responseEmitter.subscribe((response: unknown) => (response ? options.callback : null));
    }
  }
}
