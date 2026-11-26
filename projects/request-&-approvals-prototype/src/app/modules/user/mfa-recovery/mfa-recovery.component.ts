import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MfaRecovery } from '@fz-original/app/core/authentication/mfa-recovery.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SharedComponentsModule } from '../../../shared/components/shared-components.module';
import { FooterModule } from '../../../shared/layout/footer/footer.module';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { AppValidators } from '../../../shared/validators/validators';
import { LoginFormContainerModule } from '../login-form-container/login-form-container.module';
import { handleMfaRecoveryError } from '../shared/utils/mfa-error-handler.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FooterModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntInputFieldComponent,
    LoginFormContainerModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-mfa-recovery',
  standalone: true,
  styleUrls: ['./mfa-recovery.component.scss'],
  templateUrl: './mfa-recovery.component.html',
})
export class MfaRecoveryComponent {
  #authenticationService = inject(AuthenticationService);
  #cdr = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #formBuilder = inject(UntypedFormBuilder);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);

  enrollmentId: string | null = this.#authenticationService.getEnrollmentId();
  error: WritableSignal<string | null> = signal<string | null>(null);
  isLoading: WritableSignal<boolean> = signal<boolean>(false);
  recoveryForm: UntypedFormGroup = this.#formBuilder.group({
    recoveryCode: [
      '',
      [Validators.required, Validators.pattern(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/), AppValidators.noValidCharactersValidator()],
    ],
  });

  constructor() {
    if (!this.enrollmentId) {
      void this.#router.navigate(['/login']);
    }
  }

  onBackClick(): void {
    void this.#router.navigate(['/mfa/verification']);
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    value = value.substring(0, 12);
    if (value.length > 8) {
      value = value.substring(0, 4) + '-' + value.substring(4, 8) + '-' + value.substring(8, 12);
    } else if (value.length > 4) {
      value = value.substring(0, 4) + '-' + value.substring(4);
    }

    input.value = value;
    this.recoveryForm.get('recoveryCode')?.setValue(value);
    this.#cdr.detectChanges();
  }

  submitRecoveryCode(): void {
    if (this.recoveryForm.invalid || !this.enrollmentId) {
      return;
    }
    const recoveryCode = this.recoveryForm.get('recoveryCode')?.value?.trim();
    if (!recoveryCode) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.#authenticationService
      .mfaRecoveryVerify(this.enrollmentId, recoveryCode)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<MfaRecovery | null>) => {
          this.isLoading.set(false);
          if (response.data) {
            this.#onRecoverySuccess();
          } else {
            this.#handleRecoveryError(response.error);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.#handleRecoveryError(error);
        },
      });
  }

  #handleRecoveryError(error: unknown): void {
    const result = handleMfaRecoveryError(error);
    if (result.shouldNavigateToLogin) {
      this.#router.navigate(['/login'], { queryParams: result.loginQueryParams });
      return;
    }
    this.error.set(result.errorMessage);
  }

  #onRecoverySuccess(): void {
    this.#spinnerService.show();
    void this.#router.navigate(['/login']);
  }
}
