import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Directive, inject, output, Type } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import { IGNT_DIALOG_CONFIG } from '../models/dialog-options';
import { IgntDialogRef as IgntDialogRefModel } from '../models/dialog-ref';
import { IgntDialogOverlayDirective, withIgntDialogOverlay } from './dialog-overlay.directive';
import { withIgntDialogPortal } from './dialog-portal.directive';

@Directive({
  host: {
    '[attr.aria-modal]': '"true"',
    '[attr.role]': '"dialog"',
  },
  hostDirectives: [CdkTrapFocus, withIgntDialogPortal(), withIgntDialogOverlay()],
  standalone: true,
})
export class IgntDialogRef<R> implements IgntDialogRefModel<R> {
  readonly #closedSubject = new Subject<R | undefined>();
  readonly #dialogOptions = inject(IGNT_DIALOG_CONFIG);
  readonly #dialogOverlay = inject(IgntDialogOverlayDirective);
  readonly requestClose = output<() => void>();
  readonly closed$: Observable<R | undefined> = this.#closedSubject.asObservable();
  #closeRequested = false;

  constructor() {
    if (!this.#dialogOptions.disableCloseShortcuts) {
      this.#dialogOverlay.backdropClick.subscribe(() => {
        this.close();
      });
      this.#dialogOverlay.escapeKeyPress.subscribe(() => {
        this.close();
      });
    }
  }

  close(result?: R): void {
    if (this.#closeRequested) {
      return;
    }

    this.#closeRequested = true;
    this.requestClose.emit(() => {
      this.#closeInternal(result);
    });
  }

  #closeInternal(result?: R): void {
    this.#closedSubject.next(result);
    this.#closedSubject.complete();
    this.#dialogOverlay.close();
  }
}

export function withIgntDialogRef(): {
  directive: Type<IgntDialogRef<unknown>>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntDialogRef,
    inputs: [],
    outputs: [],
  };
}
