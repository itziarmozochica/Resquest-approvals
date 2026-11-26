import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MfaAuthenticatedVerification } from '@fz-original/app/core/authentication/mfa-authenticated-verification.model';
import { MfaEnrollment } from '@fz-original/app/core/authentication/mfa-enrollment.model';
import { SanitizePipe } from '@fz-original/app/shared/pipes/sanitize/sanitize.pipe';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { from } from 'rxjs';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { DigitInputComponent } from '../../../shared/components/digit-input/digit-input.component';
import { QrGeneratorService } from '../../../shared/services/qr-generator/qr-generator.service';
import { AppValidators } from '../../../shared/validators/validators';
import { handleAuthenticatedMfaEnrollVerificationError } from '../shared/utils/mfa-error-handler.util';
import { AuthenticatedMfaEnrollmentStep } from './authenticated-mfa-enrollment-step.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DigitInputComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntIconComponent,
    IgntIconButtonComponent,
    ReactiveFormsModule,
    SanitizePipe,
    TranslateModule,
  ],
  selector: 'app-authenticated-mfa-enrollment',
  styleUrl: './authenticated-mfa-enrollment.component.scss',
  templateUrl: './authenticated-mfa-enrollment.component.html',
})
export class AuthenticatedMfaEnrollmentComponent {
  static readonly recoveryCodesPerColumn = 5;

  readonly #authenticationService = inject(AuthenticationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #qrGeneratorService = inject(QrGeneratorService);

  readonly cancelled = output<void>();
  readonly completed = output<void>();
  // Verify succeeded on the server; does not close the modal (recovery codes may still show).
  readonly enrolled = output<void>();

  readonly AuthenticatedMfaEnrollmentStep = AuthenticatedMfaEnrollmentStep;
  readonly codeDigitLength = 6;

  readonly #currentStep = signal<AuthenticatedMfaEnrollmentStep | null>(null);
  readonly currentStep = this.#currentStep.asReadonly();

  readonly #enrollmentData = signal<MfaEnrollment | null>(null);
  readonly enrollmentData = this.#enrollmentData.asReadonly();

  readonly #enrollmentSucceeded = signal(false);

  readonly #error = signal<string | null>(null);
  readonly error = this.#error.asReadonly();

  readonly #isLoading = signal(true);
  readonly isLoading = this.#isLoading.asReadonly();

  readonly #isSetupKeyOpen = signal(false);
  readonly isSetupKeyOpen = this.#isSetupKeyOpen.asReadonly();

  readonly #qrCodeDataUrl = signal<string | null>(null);
  readonly qrCodeDataUrl = this.#qrCodeDataUrl.asReadonly();

  readonly #recoveryCodes = signal<string[] | null>(null);
  readonly recoveryCodes = this.#recoveryCodes.asReadonly();

  readonly #rememberDevice = signal<boolean>(false);
  readonly rememberDevice = this.#rememberDevice.asReadonly();

  readonly recoveryCodesColumns = computed((): string[][] => {
    const codes: string[] | null = this.#recoveryCodes();
    if (codes === null || codes.length === 0) {
      return [[], []];
    }
    const codesPerColumn: number = AuthenticatedMfaEnrollmentComponent.recoveryCodesPerColumn;
    return [codes.slice(0, codesPerColumn), codes.slice(codesPerColumn, codesPerColumn * 2)];
  });

  readonly verificationForm: FormGroup<{ code: FormControl<string> }> = this.#formBuilder.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/), AppValidators.noValidCharactersValidator()]],
  });

  constructor() {
    this.#startEnrollment();
  }

  closeSetupKey(): void {
    this.#isSetupKeyOpen.set(false);
  }

  copyRecoveryCodes(): void {
    const codes: string[] | null = this.#recoveryCodes();
    if (codes === null || codes.length === 0) {
      return;
    }
    void navigator.clipboard.writeText(codes.join('\n'));
  }

  downloadRecoveryCodes(): void {
    const codes: string[] | null = this.#recoveryCodes();
    if (codes === null || codes.length === 0) {
      return;
    }
    const content = `FeverZone Recovery Codes\n${codes.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feverzone-recovery-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  onCodeValueChange(code: string): void {
    this.verificationForm.controls.code.setValue(code);
  }

  onConfirmCode(): void {
    const enrollment: MfaEnrollment | null = this.#enrollmentData();
    if (this.verificationForm.invalid || enrollment === null || this.#isLoading()) {
      return;
    }
    const code: string = this.verificationForm.controls.code.value;
    this.#isLoading.set(true);
    this.#error.set(null);
    this.#authenticationService
      .mfaAuthenticatedVerify(enrollment.enrollmentId, code, this.#rememberDevice())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          this.#isLoading.set(false);
          this.#handleVerificationError(error);
        },
        next: (verification: MfaAuthenticatedVerification) => {
          this.#isLoading.set(false);
          this.#onVerificationSuccess(verification);
        },
      });
  }

  onRecoveryCodesDone(): void {
    this.completed.emit();
  }

  onRememberDeviceChange(checked: boolean): void {
    this.#rememberDevice.set(checked);
  }

  openSetupKey(): void {
    this.#isSetupKeyOpen.set(true);
  }

  // After a successful verify, dismiss reports completed so the modal closes with success.
  requestClose(): void {
    if (this.#enrollmentSucceeded()) {
      this.completed.emit();
      return;
    }
    this.cancelled.emit();
  }

  retryEnrollment(): void {
    this.#startEnrollment();
  }

  #generateQrCode(uri: string): void {
    from(this.#qrGeneratorService.generateQr(uri))
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#error.set('mfa.enrollment.error.qrGeneration');
        },
        next: (dataUrl: string) => {
          this.#qrCodeDataUrl.set(dataUrl);
        },
      });
  }

  #handleEnrollmentError(error: unknown): void {
    // Auth clients surface BaseErrorResponse-shaped objects; only `code` is read here.
    const errorData = error as { code?: string } | null;
    this.#error.set(errorData?.code === 'AUTHENTICATION_PROBLEM' ? 'mfa.enrollment.error.authentication' : 'mfa.enrollment.error.generic');
  }

  #handleVerificationError(error: unknown): void {
    const result = handleAuthenticatedMfaEnrollVerificationError(error);
    this.#error.set(result.errorMessage);
  }

  #onEnrollmentSuccess(enrollment: MfaEnrollment): void {
    this.#enrollmentData.set(enrollment);
    this.#generateQrCode(enrollment.uri);
    this.#currentStep.set(AuthenticatedMfaEnrollmentStep.QrDisplay);
  }

  #onVerificationSuccess(verification: MfaAuthenticatedVerification): void {
    this.#enrollmentSucceeded.set(true);
    this.enrolled.emit();

    if (verification.recoveryCodes.length > 0) {
      this.#recoveryCodes.set(verification.recoveryCodes);
      this.#currentStep.set(AuthenticatedMfaEnrollmentStep.RecoveryCodes);
      return;
    }

    this.completed.emit();
  }

  #startEnrollment(): void {
    this.#isLoading.set(true);
    this.#error.set(null);
    this.#authenticationService
      .mfaAuthenticatedEnroll()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          this.#isLoading.set(false);
          this.#handleEnrollmentError(error);
        },
        next: (enrollment: MfaEnrollment) => {
          this.#isLoading.set(false);
          this.#onEnrollmentSuccess(enrollment);
        },
      });
  }
}
