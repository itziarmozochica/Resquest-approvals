import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  NgZone,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { loginNextStep } from '@fz-original/app/core/authentication/login-next-step.enum';
import { Login } from '@fz-original/app/core/authentication/login.model';
import { SsoLogin } from '@fz-original/app/core/authentication/sso-login.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { filter, finalize, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { passwordStep, Step, usernameStep } from '../../../shared/models/step/step.model';
import { AppReloadService } from '../../../shared/services/app-reload/app-reload.service';
import { AppVersionService } from '../../../shared/services/app-version/app-version.service';
import { AppValidators } from '../../../shared/validators/validators';
import { LoginFormError } from './models/login-form-error.model';

@Component({
  selector: 'app-login-form',
  standalone: false,
  templateUrl: './login-form.component.html',
  styleUrl: '../login-form-container/login-form-container.component.scss',
})
export class LoginFormComponent implements OnInit, AfterViewInit {
  readonly #appReload = inject(AppReloadService);
  readonly #appVersion = inject(AppVersionService);
  readonly #authenticationService = inject(AuthenticationService);
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly #ngZone = inject(NgZone);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #spinnerService = inject(SpinnerService);
  currentStep: Step;
  error: LoginFormError | null = null;
  @Input() isLoading = false;
  banner = input<string | null>(null);
  @Output() loginEmitter = new EventEmitter<void>();
  @ViewChild('usernameInput') usernameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;
  loginForm: UntypedFormGroup = this.#formBuilder.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, AppValidators.noValidCharactersValidator()]],
  });
  passwordStep: Step = passwordStep;
  showPassword = false;
  @Input() success = {
    displayed: false,
    message: '',
  };
  usernameStep: Step = usernameStep;

  constructor() {
    this.currentStep = this.usernameStep;
  }

  changePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  checkIsAlreadyLogged(): void {
    if (this.#authenticationService.isLoggedIn()) {
      this.#onLogin();
    }
  }

  goToForgetPass(): void {
    this.#ngZone.run(() => {
      this.#router.navigateByUrl('/request-password');
    });
  }

  goToNextStep(): void {
    if (this.currentStep.nextStep) {
      this.currentStep = this.currentStep.nextStep;

      if (this.currentStep === this.passwordStep) {
        this.#changeDetectorRef.detectChanges();
        this.passwordInput?.nativeElement.focus();
        this.#ngZone.run(() => {
          this.#autoSubmitIfPasswordPrefilled();
        });
      }
    }
  }

  goToPreviousStep(): void {
    if (this.currentStep.previousStep) {
      this.currentStep = this.currentStep.previousStep;

      if (this.currentStep === this.usernameStep) {
        this.#changeDetectorRef.detectChanges();
        this.usernameInput?.nativeElement.focus();
      }
    }
  }

  isUsernameValid(): boolean {
    return this.loginForm.get('username')?.valid ?? false;
  }

  login(username?: string, password?: string): void {
    const usernameValue: string | undefined = username ?? this.loginForm.get('username')!.value;
    const passwordValue: string | undefined = password ?? this.loginForm.get('password')!.value;
    this.error = null;
    this.isLoading = true;
    if (usernameValue === undefined || passwordValue === undefined) {
      return;
    }
    this.#appVersion
      .reloadIfOutdated()
      .pipe(
        filter((isReloading: boolean) => !isReloading),
        switchMap(() => this.#authenticationService.login(usernameValue, passwordValue)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response: BaseResponse<Login | null, unknown>) => {
          this.#handleLoginResponse(response);
        },
        error: (error: HttpErrorResponse) => {
          const errorCode = error?.error?.error?.code;
          this.#onLoginError(errorCode, error);
        },
      });
  }

  ngAfterViewInit(): void {
    this.#changeDetectorRef.detectChanges();
    this.usernameInput?.nativeElement.focus();

    if (!this.#route.snapshot.queryParamMap.has('code')) {
      this.#appVersion.reloadIfOutdated().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    }
  }

  ngOnInit(): void {
    this.#setPreviousAndNextSteps();
    this.checkIsAlreadyLogged();
    this.#checkMfaBlockedFromRedirect();
    const code = this.#route.snapshot.queryParamMap.get('code');
    if (code) {
      this.#spinnerService.show();
      this.ssoLoginCallback(code);
    }
  }

  onUsernameEnter(event: Event): void {
    if (this.currentStep === this.usernameStep) {
      if (!this.isUsernameValid()) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      this.ssoLogin();
    }
  }

  ssoLogin(username?: string): void {
    if (!environment.ssoLoginEnabled) {
      this.goToNextStep();
      return;
    }
    if (this.isLoading || !this.loginForm.get('username')!.valid || this.currentStep === passwordStep) {
      return;
    }
    const usernameValue: string | undefined = username ?? this.loginForm.get('username')!.value;
    if (usernameValue === undefined) {
      return;
    }
    this.error = null;
    this.isLoading = true;
    this.#appVersion
      .reloadIfOutdated()
      .pipe(
        filter((isReloading: boolean) => !isReloading),
        switchMap(() => this.#authenticationService.ssoLogin(usernameValue)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response: BaseResponse<SsoLogin | null, unknown>) => {
          if (response.data) {
            this.#handleSsoResponse(response.data);
            this.isLoading = false;
            return;
          }
          this.#onLoginError(response.error?.code, response.error?.error);
        },
        error: (error: HttpErrorResponse) => {
          const errorCode = error?.error?.error?.code;
          this.#onLoginError(errorCode, error);
        },
      });
  }

  ssoLoginCallback(code: string): void {
    this.error = null;
    this.isLoading = true;
    this.#authenticationService
      .ssoLoginCallback(code)
      .pipe(
        finalize(() => {
          this.#restoreOriginalParameters();
          this.#spinnerService.hide();
        }),
      )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          if (response.data) {
            this.#onLogin();
            return;
          }
          this.#onLoginError(response.error?.code, response.error?.error);
        },
        error: (error: HttpErrorResponse) => {
          const errorCode = error?.error?.error?.code;
          this.#onLoginError(errorCode, error);
        },
      });
  }

  #autoSubmitIfPasswordPrefilled(): void {
    const passwordControl = this.loginForm.get('password');
    const passwordValue = passwordControl?.value;
    if (!passwordValue || !this.loginForm.valid) {
      return;
    }
    this.login();
  }

  #handleLoginResponse(response: BaseResponse<Login | null, unknown>): void {
    if (response.data === null) {
      this.#onLoginError(response.error?.code, response.error?.error);
      return;
    }

    const nextStep = response.data.nextStep;

    if (nextStep === loginNextStep.mfaEnrollment || nextStep === loginNextStep.mfaVerification) {
      this.#navigateToMfaFlow(response.data);
      return;
    }

    if (nextStep === loginNextStep.loginSuccess || response.data.token != null) {
      this.#onLogin();
      return;
    }

    this.#onLoginError(response.error?.code, response.error?.error);
  }

  #navigateToMfaFlow(loginData: Login): void {
    if (loginData.enrollmentId == null) {
      this.isLoading = false;
      this.error = {
        message: 'login.genericError',
        type: 'danger',
      };
      return;
    }

    this.isLoading = false;
    const route = loginData.nextStep === loginNextStep.mfaEnrollment ? '/mfa/enrollment' : '/mfa/verification';
    this.#router.navigate([route]);
  }

  #handleSsoResponse(data: SsoLogin) {
    const idpRedirectUrl = data.redirectTo;
    if (idpRedirectUrl) {
      window.location.assign(idpRedirectUrl);
    } else {
      this.goToNextStep();
    }
  }

  #onLogin(): void {
    this.loginEmitter.emit();
  }

  #onLoginError(errorCode: string | number, error: HttpErrorResponse | unknown): void {
    if (errorCode == 'MIN_VERSION_REQUIREMENT') {
      this.#appReload.forceReload();
      return;
    }

    const httpError = error as HttpErrorResponse;
    const actualErrorCode = errorCode || httpError?.error?.code;

    if (httpError?.status === 429 || actualErrorCode === 'LOGIN_TOO_MANY_ATTEMPTS') {
      this.isLoading = false;
      this.error = {
        message: 'login.tooManyLoginAttempts',
        type: 'danger',
      };
      return;
    }
    if (actualErrorCode == 'MFA_TOO_MANY_ATTEMPTS') {
      this.isLoading = false;
      this.error = {
        message: 'login.mfaBlockedFromLogin',
        type: 'danger',
      };
      return;
    }
    if (actualErrorCode == 'AUTHENTICATION_PROBLEM') {
      this.isLoading = false;
      this.error = {
        message: 'login.responseError',
        type: 'danger',
      };
      return;
    }
    const isOffline = httpError?.status === 0 && httpError?.error instanceof ProgressEvent;
    if (isOffline) {
      this.isLoading = false;
      this.error = {
        message: 'login.noInternetResponseError',
        type: 'warning',
      };
      return;
    }
    this.isLoading = false;
    this.error = {
      message: 'login.genericError',
      type: 'danger',
    };
  }

  #checkMfaBlockedFromRedirect(): void {
    const mfaBlocked = this.#route.snapshot.queryParamMap.get('mfaBlocked');
    const mfaEnrollBlocked = this.#route.snapshot.queryParamMap.get('mfaEnrollBlocked');
    if (mfaBlocked === 'true') {
      this.error = {
        message: 'login.mfaBlockedFromRedirect',
        type: 'danger',
      };
      this.#clearMfaBlockedQueryParams();
    } else if (mfaEnrollBlocked === 'true') {
      this.error = {
        message: 'login.mfaBlockedFromLogin',
        type: 'danger',
      };
      this.#clearMfaBlockedQueryParams();
    }
  }

  #clearMfaBlockedQueryParams(): void {
    const currentParams = { ...this.#route.snapshot.queryParams };
    delete currentParams['mfaBlocked'];
    delete currentParams['mfaEnrollBlocked'];
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: currentParams,
      replaceUrl: true,
    });
  }

  #restoreOriginalParameters(): void {
    const state = this.#route.snapshot.queryParamMap.get('state');
    const currentParams = this.#route.snapshot.queryParams;
    const queryParams: { [key: string]: string } = {};

    Object.keys(currentParams).forEach(key => {
      if (key !== 'code' && key !== 'state') {
        queryParams[key] = currentParams[key];
      }
    });

    if (state && state.startsWith('?')) {
      const stateParams = new URLSearchParams(state.substring(1));
      stateParams.forEach((value, key) => {
        if (key !== 'code' && key !== 'state') {
          queryParams[key] = value;
        }
      });
    }

    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams,
      replaceUrl: true,
    });
  }

  #setPreviousAndNextSteps() {
    this.usernameStep.nextStep = this.passwordStep;
    this.passwordStep.previousStep = this.usernameStep;
  }
}
