import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Signal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { DigitInputComponent } from '../../../shared/components/digit-input/digit-input.component';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { LoginFormContainerModule } from '../login-form-container/login-form-container.module';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigitInputComponent, IgntButtonComponent, LoginFormContainerModule, TranslateModule],
  selector: 'app-set-nfc-pin-form',
  styleUrls: ['./set-nfc-pin-form.component.scss', '../login-form-container/login-form-container.component.scss'],
  templateUrl: './set-nfc-pin-form.component.html',
})
export class SetNfcPinFormComponent {
  static readonly invalidPinCode = 'INVALID_NFC_PIN';
  static readonly pinLength = 4;

  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #authenticationService = inject(AuthenticationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #spinnerService = inject(SpinnerService);
  readonly #translateService = inject(TranslateService);

  protected readonly digitInput: Signal<DigitInputComponent | undefined> = viewChild(DigitInputComponent);

  protected errorMessage = signal<string | null>(null);
  protected isSubmitting = signal<boolean>(false);
  protected method = signal<'reset' | 'set'>('set');
  protected pin = signal<string>('');
  protected readonly pinLength = SetNfcPinFormComponent.pinLength;
  readonly #token = signal<string>('');

  constructor() {
    this.#activatedRoute.data.pipe(takeUntilDestroyed()).subscribe(data => {
      this.method.set(data.method === 'reset' ? 'reset' : 'set');
    });
    this.#activatedRoute.queryParams.pipe(takeUntilDestroyed()).subscribe(params => {
      this.#token.set(params.token);
    });
  }

  protected onPinChange(pin: string): void {
    this.pin.set(pin);
    if (this.errorMessage() !== null) {
      this.errorMessage.set(null);
    }
  }

  protected submit(): void {
    if (this.pin().length !== SetNfcPinFormComponent.pinLength || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.#spinnerService.show();
    this.#authenticationService
      .setNfcPin(this.#token(), this.pin())
      .pipe(
        finalize(() => this.#spinnerService.hide()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: HttpErrorResponse) => this.#onError(error?.error?.error?.code),
        next: response => {
          if (response?.data) {
            this.#router.navigate(['/login'], {
              state: { message: this.#translateService.instant('nfcPin.success') },
            });
            return;
          }
          this.#onError(response.error?.code);
        },
      });
  }

  #onError(code: number | string | undefined): void {
    this.isSubmitting.set(false);
    this.pin.set('');
    this.digitInput()?.reset();

    if (code === SetNfcPinFormComponent.invalidPinCode) {
      this.errorMessage.set(this.#translateService.instant('nfcPin.invalidPin'));
      return;
    }
    this.#router.navigate(['/nfc-pin-token-expired']);
  }
}
