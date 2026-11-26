import { Signal } from '@angular/core';

import { Observable } from 'rxjs';

export interface PrintProgressDialogData {
  message: Signal<string>;
}

export interface PrintRetryDialogData {
  cancelLabel: string;
  message: string;
  retryLabel: string;
  title: string;
}

export type PrintRetryDialogLabels = Partial<Pick<PrintRetryDialogData, 'cancelLabel' | 'retryLabel'>>;

export interface PrintProgressRef {
  /** Starts closing the dialog, and emits once it has left the screen and handed the focus back. */
  close(): Observable<void>;
  update(current: number): void;
}
