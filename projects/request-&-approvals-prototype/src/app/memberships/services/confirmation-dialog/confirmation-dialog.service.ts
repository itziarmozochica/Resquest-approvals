import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface ConfirmationDialogConfig {
  acceptLabel?: string;
  cancelLabel?: string;
  customStyle?: boolean;
  isDanger?: boolean;
  message: string;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmationDialogService {
  #configSubject = new BehaviorSubject<ConfirmationDialogConfig | null>(null);
  #dialogSubject: Subject<boolean> | null = null;
  #visibilitySubject = new BehaviorSubject<boolean>(false);

  readonly config$ = this.#configSubject.asObservable();
  readonly dialogVisibility$ = this.#visibilitySubject.asObservable();

  accept(): void {
    this.closeDialog(true);
  }

  confirm(config: ConfirmationDialogConfig): Observable<boolean> {
    this.closeDialog(false, false);

    this.#dialogSubject = new Subject<boolean>();

    this.#configSubject.next(config);
    this.#visibilitySubject.next(true);

    return this.#dialogSubject.asObservable();
  }

  dismiss(): void {
    this.closeDialog(false);
  }

  private closeDialog(result: boolean, emitResult = true): void {
    this.#visibilitySubject.next(false);

    if (this.#dialogSubject && emitResult) {
      this.#dialogSubject.next(result);
      this.#dialogSubject.complete();
    }

    this.#dialogSubject = null;
  }
}
