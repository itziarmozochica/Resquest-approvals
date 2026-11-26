import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { DialogPhase, OssFiscalActionDialogData } from './oss-fiscal-action-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconsModule, IgntButtonComponent, TranslateModule],
  selector: 'app-oss-fiscal-action-dialog',
  standalone: true,
  styleUrls: ['./oss-fiscal-action-dialog.component.scss'],
  templateUrl: './oss-fiscal-action-dialog.component.html',
})
export class OssFiscalActionDialogComponent {
  #data: OssFiscalActionDialogData = inject(DIALOG_DATA);
  #destroyRef = inject(DestroyRef);
  #dialogRef = inject(DialogRef);

  protected actionLabel = this.#data.actionLabel;
  protected inputConfig = this.#data.inputConfig;
  protected inputValue = signal('');
  protected isError = signal(false);
  protected phase = signal<DialogPhase>(this.#data.inputConfig ? 'input' : 'loading');
  protected resultMessage = signal('');

  constructor() {
    if (!this.#data.inputConfig) {
      this.#subscribe(this.#data.actionSource as Observable<unknown>);
    }
  }

  protected close(): void {
    this.#dialogRef.close();
  }

  protected executeWithInput(): void {
    const factory = this.#data.actionSource as (inputValue: string) => Observable<unknown>;
    this.phase.set('loading');
    this.#subscribe(factory(this.inputValue()));
  }

  #extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    const httpError = error as { error?: unknown; message?: string; status?: number; statusText?: string };
    if (httpError.status !== undefined) {
      const body = typeof httpError.error === 'string' ? httpError.error : JSON.stringify(httpError.error ?? '');
      return `${httpError.status} ${httpError.statusText ?? ''} — ${body}`.trim();
    }
    return String(error);
  }

  #extractResponseBody(error: unknown): unknown {
    return (error as { error?: unknown }).error;
  }

  #formatResponse(response: unknown): string {
    if (response === null || response === undefined) {
      return 'OK';
    }
    if (typeof response === 'string') {
      return response;
    }
    return JSON.stringify(response, null, 2);
  }

  #isSuccessfulHttpResponse(error: unknown): boolean {
    const status = (error as { status?: number }).status;
    return status !== undefined && status >= 200 && status < 300;
  }

  #subscribe(action$: Observable<unknown>): void {
    action$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: (err: unknown) => {
        this.phase.set('result');
        if (this.#isSuccessfulHttpResponse(err)) {
          this.resultMessage.set(this.#formatResponse(this.#extractResponseBody(err)));
        } else {
          this.isError.set(true);
          this.resultMessage.set(this.#extractErrorMessage(err));
        }
      },
      next: (response: unknown) => {
        this.phase.set('result');
        this.resultMessage.set(this.#formatResponse(response));
      },
    });
  }
}
