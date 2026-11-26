import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, Signal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { AuthenticationService } from '../../../../../core/authentication/authentication.service';
import { BaseErrorResponse } from '../../../../../shared/models/base-response';
import { PinPadComponent } from '../../../pin-pad/pin-pad.component';

@Component({
  selector: 'app-nfc-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, NgIf, PinPadComponent, TranslateModule],
  templateUrl: './nfc-login.component.html',
  styleUrls: ['./nfc-login.component.scss'],
})
export class NfcLoginComponent {
  #authenticationService = inject(AuthenticationService);
  #destroyRef = inject(DestroyRef);

  forceShowPinPad = input(false);
  initialNfcCardData = input<string | null>(null);
  isLoadingNfcLogin = signal<boolean>(false);
  loginSuccess = output<void>();
  nfcCardData = '';
  nfcLoginError: string | null = null;
  pin = '';
  pinPadRef: Signal<PinPadComponent | undefined> = viewChild<PinPadComponent>('pinPadRef');
  showPinPadChange = output<boolean>();

  constructor() {
    effect(() => {
      const initialData = this.initialNfcCardData();
      if (initialData !== null && initialData !== this.nfcCardData) {
        this.nfcCardData = initialData;
        this.pin = '';
        this.nfcLoginError = null;
        const pinPad = this.pinPadRef();
        if (pinPad) {
          pinPad.reset();
        }
      }
    });
  }

  onBackToLogin(): void {
    this.pin = '';
    this.nfcCardData = '';
    this.nfcLoginError = null;
    const pinPad = this.pinPadRef();
    if (pinPad) {
      pinPad.reset();
    }
    this.showPinPadChange.emit(false);
  }

  onPinChange(pin: string): void {
    this.pin = pin;
    if (this.nfcLoginError) {
      this.nfcLoginError = null;
    }
  }

  onPinComplete(pin: string): void {
    this.pin = pin;
    this.#loginWithNFC();
  }

  #loginWithNFC(): void {
    if (!this.nfcCardData || this.pin.length !== 4) {
      return;
    }
    this.nfcLoginError = null;
    this.isLoadingNfcLogin.set(true);

    this.#authenticationService
      .nfcLogin(this.nfcCardData, this.pin)
      .pipe(
        finalize(() => {
          this.isLoadingNfcLogin.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.pin = '';
          this.nfcCardData = '';
          this.nfcLoginError = null;
          const pinPad = this.pinPadRef();
          if (pinPad) {
            pinPad.reset();
          }
          this.loginSuccess.emit();
        },
        error: (error: BaseErrorResponse) => {
          this.#handleNfcLoginError(error);
        },
      });
  }

  #handleNfcLoginError(error: BaseErrorResponse): void {
    this.pin = '';
    const pinPad = this.pinPadRef();
    if (pinPad) {
      pinPad.reset();
    }

    const errorCode: number | string = error.code;
    const statusCode: number = typeof errorCode === 'string' ? Number(errorCode) : errorCode;
    const errorCodeString: string = String(errorCode).toUpperCase();
    const errorMessage: string = error.message || '';

    // NFC_PIN_NOT_SET also arrives as a 401, so it has to be read before the generic 401 branch
    // below. Falling through would tell the operator the PIN is wrong on a card that has no PIN at
    // all, and they would retype it forever.
    if (errorCodeString === 'NFC_PIN_NOT_SET') {
      this.nfcLoginError = 'login.nfc.pinNotSetYet';
    } else if (statusCode === 404 || errorCodeString === 'URL_NOT_FOUND' || errorMessage.includes('NFC PIN auth not found')) {
      this.nfcLoginError = 'login.nfc.cardNotFound';
    } else if (statusCode === 429 || errorCodeString === 'LOGIN_TOO_MANY_ATTEMPTS') {
      this.nfcLoginError = 'login.mfaBlockedFromLogin';
    } else if (statusCode === 401 || errorCodeString === 'AUTHENTICATION_PROBLEM') {
      this.nfcLoginError = 'login.nfc.incorrectPin';
    } else {
      this.nfcLoginError = 'errors.generic';
    }
  }
}
