import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, NgZone, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { ConfirmsRegistrationEvent } from '@fz-original/app/core/tracking/core/events/confirms-registration';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { TranslateService } from '@ngx-translate/core';

import { termsAndConditionsLinks } from '../../../shared/constants/terms-and-conditions-links';
import { AppValidators } from '../../../shared/validators/validators';
import { UpdatePasswordData } from './update-password-data';

@Component({
  selector: 'app-update-password-form',
  standalone: false,
  templateUrl: './update-password-form.component.html',
  styleUrls: ['./update-password-form.component.scss', '../login-form-container/login-form-container.component.scss'],
})
export class UpdatePasswordFormComponent implements OnInit {
  #activeRoute = inject(ActivatedRoute);
  #authenticationService = inject(AuthenticationService);
  #formBuilder = inject(UntypedFormBuilder);
  #locale: string;
  #ngZone = inject(NgZone);
  #router = inject(Router);
  #trackingService = inject(TrackingService);
  #translateService = inject(TranslateService);
  error = false;
  form: UntypedFormGroup = this.#formBuilder.group({
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        AppValidators.oneDigitValidator(),
        AppValidators.oneSpecialCharacterValidator(),
        AppValidators.oneUpperCaseValidator(),
        AppValidators.noValidCharactersValidator(),
      ],
    ],
    confirmPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        AppValidators.confirmField('password'),
        AppValidators.oneDigitValidator(),
        AppValidators.oneSpecialCharacterValidator(),
        AppValidators.oneUpperCaseValidator(),
        AppValidators.noValidCharactersValidator(),
      ],
    ],
  });
  method = '';
  privacyURL = '';
  showConfirmPassword = false;
  showPassword = false;
  showWaitForEmailMessage = false;
  signupSource = '';
  termsURL = '';
  title = '';
  token = '';

  constructor() {
    this.#locale = this.#translateService.currentLang;
  }

  changeConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  changePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getControlClass(control: AbstractControl): string {
    if (!control.valid && control.touched) {
      return '--invalid';
    }
    if (control.valid && control.touched) {
      return '--valid';
    }
    return '';
  }

  ngOnInit(): void {
    const terms: { termsURL: string; privacyURL: string } | undefined =
      termsAndConditionsLinks.get(this.#locale) || termsAndConditionsLinks.get('en');
    if (terms !== undefined) {
      this.termsURL = terms.termsURL;
      this.privacyURL = terms.privacyURL;
    }
    this.#activeRoute.data.subscribe(data => {
      this.method = data.method;
      this.title = this.#translateService.instant(this.method + 'Password.title');
    });
    this.#activeRoute.queryParams.subscribe(data => {
      this.token = data.token;
      this.signupSource = data.signup_source;
    });
  }

  submit(): void {
    if (this.method == 'create') {
      this.#createSubmit();
    } else if (this.method == 'reset') {
      this.#resetSubmit();
    }
  }

  #createSubmit(): void {
    this.#authenticationService.createPassword(this.#getUpdatePasswordData()).subscribe({
      next: response => {
        if (response?.data) {
          this.#ngZone.run(() => {
            if (this.signupSource == 'ambassador') {
              this.showWaitForEmailMessage = true;
            } else {
              this.#router
                .navigate(['/login'], { state: { message: this.#translateService.instant('login.newPasswordSuccess') } })
                .catch(error => console.error('👀 Navigation error in createSubmit:', error));
            }
          });
          this.#trackingService.track(new ConfirmsRegistrationEvent({ signup_source: this.signupSource }));
          return;
        }
        this.#onUpdatePasswordError(response.error?.code);
      },
      error: (error: HttpErrorResponse) => {
        this.#onUpdatePasswordError(error?.error?.error?.code);
      },
    });
  }

  #getUpdatePasswordData(): UpdatePasswordData {
    return {
      password: this.form.get('password')?.value ?? '',
      token: this.token,
    };
  }

  #onUpdatePasswordError(code: string | number) {
    if (code == 'INVALID_PASSWORD_RESET') {
      this.error = true;
    } else {
      this.#router.navigate(['/password-token-expired']);
    }
  }

  #resetSubmit(): void {
    this.#authenticationService.resetPassword(this.#getUpdatePasswordData()).subscribe({
      next: response => {
        if (response.data) {
          this.#ngZone.run(() => {
            this.#router.navigate(['/login'], { state: { message: this.#translateService.instant('login.newPasswordSuccess') } });
          });
          return;
        }
        this.#onUpdatePasswordError(response.error?.code);
      },
      error: (error: HttpErrorResponse) => {
        this.#onUpdatePasswordError(error?.error?.error?.code);
      },
    });
  }
}
