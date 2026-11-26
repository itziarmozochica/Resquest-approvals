import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  QueryList,
  Signal,
  signal,
  ViewChildren,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MfaVerification } from '@fz-original/app/core/authentication/mfa-verification.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SharedComponentsModule } from '../../../shared/components/shared-components.module';
import { FooterModule } from '../../../shared/layout/footer/footer.module';
import { UserMfaStatusService } from '../../../shared/services/user/user-mfa-status.service';
import { AppValidators } from '../../../shared/validators/validators';
import { LoginFormContainerModule } from '../login-form-container/login-form-container.module';
import {
  focusDigitInput,
  handleDigitInput,
  handleDigitPaste,
  manageCodeInputInteraction,
  updateCodeFromDigits,
} from '../shared/utils/digit-input.util';
import { handleMfaVerificationError } from '../shared/utils/mfa-error-handler.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FooterModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    LoginFormContainerModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-mfa-verification',
  standalone: true,
  styleUrls: ['./mfa-verification.component.scss'],
  templateUrl: './mfa-verification.component.html',
})
export class MfaVerificationComponent implements AfterViewInit {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly #router = inject(Router);
  readonly #userMfaStatus = inject(UserMfaStatusService);

  @ViewChildren('digitInput') codeInputs?: QueryList<ElementRef<HTMLInputElement>>;

  enrollmentId: string | null = this.#authenticationService.getEnrollmentId();
  error: WritableSignal<string | null> = signal<string | null>(null);
  isLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly #rememberDevice = signal<boolean>(false);
  readonly rememberDevice = this.#rememberDevice.asReadonly();
  readonly showRememberDevice: Signal<boolean> = this.#userMfaStatus.featuresEnabled;
  verificationForm: UntypedFormGroup = this.#formBuilder.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/), AppValidators.noValidCharactersValidator()]],
  });

  constructor() {
    if (!this.enrollmentId) {
      this.#router.navigate(['/login']);
    }
  }

  ngAfterViewInit(): void {
    this.#cdr.detectChanges();
    this.#focusFirstDigitInput();
  }

  onCodeKeydown(event: KeyboardEvent, index: number): void {
    manageCodeInputInteraction(event, index, this.codeInputs, () => this.#updateCodeFromDigits());
  }

  onCodePaste(event: ClipboardEvent, index: number): void {
    handleDigitPaste(event, index, this.codeInputs, () => this.#updateCodeFromDigits());
  }

  onDigitInput(event: Event, index: number): void {
    handleDigitInput(event, index, this.codeInputs, () => this.#updateCodeFromDigits());
  }

  onLostAccessClick(): void {
    void this.#router.navigate(['/mfa/recovery']);
  }

  onRememberDeviceChange(checked: boolean): void {
    this.#rememberDevice.set(checked);
  }

  verifyCode(): void {
    if (this.verificationForm.invalid || !this.enrollmentId) {
      return;
    }
    const code = this.verificationForm.get('code')?.value;
    if (!code) {
      return;
    }
    this.isLoading.set(true);
    this.error.set(null);
    this.#authenticationService
      .mfaTotpVerify(this.enrollmentId, code, this.#rememberDevice())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<MfaVerification | null>) => {
          this.isLoading.set(false);
          if (response.data) {
            this.#onVerificationSuccess();
          } else {
            this.#handleVerificationError(response.error);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.#handleVerificationError(error);
        },
      });
  }

  #focusFirstDigitInput(): void {
    const inputs = this.codeInputs?.toArray() ?? [];
    focusDigitInput(inputs, 0, true);
  }

  #handleVerificationError(error: unknown): void {
    const result = handleMfaVerificationError(error);
    if (result.shouldNavigateToLogin) {
      this.#router.navigate(['/login'], { queryParams: result.loginQueryParams });
      return;
    }
    this.error.set(result.errorMessage);
  }

  #onVerificationSuccess(): void {
    void this.#router.navigate(['/login']);
  }

  #updateCodeFromDigits(): void {
    updateCodeFromDigits(this.codeInputs, this.verificationForm.get('code'));
  }
}
