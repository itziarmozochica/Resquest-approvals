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

import { MfaEnrollment } from '@fz-original/app/core/authentication/mfa-enrollment.model';
import { MfaVerification } from '@fz-original/app/core/authentication/mfa-verification.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { SanitizePipe } from '@fz-original/app/shared/pipes/sanitize/sanitize.pipe';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';
import { from } from 'rxjs';

import { SharedComponentsModule } from '../../../shared/components/shared-components.module';
import { IconsModule } from '../../../shared/icons/icons.module';
import { FooterModule } from '../../../shared/layout/footer/footer.module';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { QrGeneratorService } from '../../../shared/services/qr-generator/qr-generator.service';
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
import { handleMfaEnrollVerificationError } from '../shared/utils/mfa-error-handler.util';
import { AuthenticationService } from './../../../core/authentication/authentication.service';
import { MfaEnrollmentStep, MfaEnrollmentStepET } from './mfa-enrollment-step.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FooterModule,
    IconsModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    LoginFormContainerModule,
    ReactiveFormsModule,
    SanitizePipe,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-mfa-enrollment',
  standalone: true,
  styleUrls: ['./mfa-enrollment.component.scss'],
  templateUrl: './mfa-enrollment.component.html',
})
export class MfaEnrollmentComponent implements AfterViewInit {
  #authenticationService = inject(AuthenticationService);
  #cdr = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #formBuilder = inject(UntypedFormBuilder);
  #qrGeneratorService = inject(QrGeneratorService);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  readonly #userMfaStatus = inject(UserMfaStatusService);

  readonly showRememberDevice: Signal<boolean> = this.#userMfaStatus.featuresEnabled;

  get recoveryCodesColumns(): string[][] {
    const codes = this.recoveryCodes();
    if (!codes || codes.length === 0) {
      return [[], []];
    }
    const codesPerColumn = 5;
    return [codes.slice(0, codesPerColumn), codes.slice(codesPerColumn, codesPerColumn * 2)];
  }

  @ViewChildren('digitInput') codeInputs?: QueryList<ElementRef<HTMLInputElement>>;
  currentStep: WritableSignal<MfaEnrollmentStepET> = signal<MfaEnrollmentStepET>(MfaEnrollmentStep.initiate);
  enrollmentData: MfaEnrollment | null = null;
  enrollmentId: string | null = this.#authenticationService.getEnrollmentId();
  error: WritableSignal<string | null> = signal<string | null>(null);
  isLoading: WritableSignal<boolean> = signal<boolean>(false);
  isSetupKeyOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly MfaEnrollmentStep = MfaEnrollmentStep;
  qrCodeDataUrl: WritableSignal<string | null> = signal<string | null>(null);
  readonly #rememberDevice = signal<boolean>(false);
  readonly rememberDevice = this.#rememberDevice.asReadonly();
  recoveryCodes: WritableSignal<string[] | null> = signal<string[] | null>(null);
  verificationForm: UntypedFormGroup = this.#formBuilder.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/), AppValidators.noValidCharactersValidator()]],
  });

  constructor() {
    if (!this.enrollmentId) {
      this.#router.navigate(['/login']);
    }
  }

  closeSetupKey(): void {
    this.isSetupKeyOpen.set(false);
    this.#cdr.detectChanges();
  }

  copyRecoveryCodes(): void {
    const codes = this.recoveryCodes();
    if (!codes || codes.length === 0) {
      return;
    }
    const content = codes.join('\n');
    void navigator.clipboard.writeText(content);
  }

  downloadRecoveryCodes(): void {
    const codes = this.recoveryCodes();
    if (!codes || codes.length === 0) {
      return;
    }
    const content = 'FeverZone Recovery Codes\n' + codes.join('\n');
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

  generateQrCode(): void {
    if (!this.enrollmentData?.uri) {
      return;
    }
    from(this.#qrGeneratorService.generateQr(this.enrollmentData.uri))
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (dataUrl: string) => {
          this.qrCodeDataUrl.set(dataUrl);
        },
        error: () => {
          this.error.set('mfa.enrollment.error.qrGeneration');
        },
      });
  }

  initiateEnrollment(): void {
    if (!this.enrollmentId) {
      return;
    }
    this.isLoading.set(true);
    this.error.set(null);
    this.#authenticationService
      .mfaEnroll(this.enrollmentId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<MfaEnrollment | null>) => {
          this.isLoading.set(false);
          if (response.data) {
            this.#onEnrollmentInitiationSuccess(response.data);
          } else {
            this.#handleError(response.error);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.#handleError(error?.error?.error);
        },
      });
  }

  ngAfterViewInit(): void {
    if (this.currentStep() === MfaEnrollmentStep.qrDisplay) {
      this.#focusFirstDigitInput();
    }
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

  onRecoveryCodesDone(): void {
    this.#onVerificationSuccess();
  }

  onRememberDeviceChange(checked: boolean): void {
    this.#rememberDevice.set(checked);
  }

  onStartEnrollment(): void {
    if (!this.enrollmentId || this.isLoading()) {
      return;
    }
    this.initiateEnrollment();
  }

  openSetupKey(): void {
    this.isSetupKeyOpen.set(true);
    this.#cdr.detectChanges();
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
      .mfaVerify(this.enrollmentId, code, this.#rememberDevice())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<MfaVerification | null>) => {
          this.isLoading.set(false);
          if (response.data) {
            if (response.data.recoveryCodes && response.data.recoveryCodes.length > 0) {
              this.recoveryCodes.set(response.data.recoveryCodes);
              this.currentStep.set(MfaEnrollmentStep.recoveryCodes);
              this.#cdr.detectChanges();
            } else {
              this.#onVerificationSuccess();
            }
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

  #handleError(error: unknown): void {
    const errorData = error as { code?: string } | null;
    this.error.set(errorData?.code === 'AUTHENTICATION_PROBLEM' ? 'mfa.enrollment.error.authentication' : 'mfa.enrollment.error.generic');
  }

  #handleVerificationError(error: unknown): void {
    const result = handleMfaEnrollVerificationError(error);
    if (result.shouldNavigateToLogin) {
      this.#router.navigate(['/login'], { queryParams: result.loginQueryParams });
      return;
    }
    this.error.set(result.errorMessage);
  }

  #onEnrollmentInitiationSuccess(enrollmentData: MfaEnrollment): void {
    this.enrollmentData = enrollmentData;
    this.generateQrCode();
    this.currentStep.set(MfaEnrollmentStep.qrDisplay);
    setTimeout(() => {
      this.#focusFirstDigitInput();
    }, 0);
  }

  #onVerificationSuccess(): void {
    this.#spinnerService.show();
    void this.#router.navigate(['/login']);
  }

  #updateCodeFromDigits(): void {
    updateCodeFromDigits(this.codeInputs, this.verificationForm.get('code'));
  }
}
