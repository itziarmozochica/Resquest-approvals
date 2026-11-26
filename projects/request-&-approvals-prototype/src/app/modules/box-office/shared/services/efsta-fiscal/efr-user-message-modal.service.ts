import { inject, Injectable } from '@angular/core';

// eslint-disable-next-line fz/no-ngbootstrap, fz/no-ngbootstrap-modal -- Same legacy modal pattern as checkout fiscal notice (B2BO-6130).
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { catchError, from, map, Observable, of } from 'rxjs';

// eslint-disable-next-line fz/no-fz-original-message-modal -- EFR UserMessage must be shown verbatim to the cashier (B2BO-6130).
import { MessageModalComponent } from '../../../../../shared/components/message-modal/message-modal.component';

export type FiscalUserMessageSource = {
  fiscalUserMessage?: string;
};

@Injectable({
  providedIn: 'root',
})
export class EfrUserMessageModalService {
  #pendingMessage?: string;
  readonly #modalService = inject(NgbModal);
  readonly #translate = inject(TranslateService);

  captureFromBookResult(data: FiscalUserMessageSource | null | undefined): void {
    const message = data?.fiscalUserMessage;
    if (typeof message === 'string' && message.length > 0) {
      this.#pendingMessage = message;
      return;
    }
    this.#pendingMessage = undefined;
  }

  /** Shows the fiscal notice modal when a message was captured; completes when the cashier dismisses it. */
  showIfPresent(): Observable<void> {
    const message = this.#pendingMessage;
    this.#pendingMessage = undefined;

    if (message == null || message.length === 0) {
      return of(undefined);
    }

    const modal = this.#modalService.open(MessageModalComponent, {
      backdrop: 'static',
      keyboard: false,
    });
    modal.componentInstance.title = this.#translate.instant('boxOffice.fiscal.userMessageTitle');
    modal.componentInstance.messages = [message];
    modal.componentInstance.acceptButtonLabel = this.#translate.instant('common.accept');

    return from(modal.result).pipe(
      catchError(() => of(undefined)),
      map((): undefined => undefined),
    );
  }
}
