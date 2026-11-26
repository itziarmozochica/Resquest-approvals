import { Component, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { ExtendedError } from '../../../shared/models/extended-error';
import { PartnerConfig } from '../../../shared/models/partner/partner-config.model';
import { PartnerConfigService } from '../../../shared/services/partner-config/partner-config.service';

@Component({
  standalone: false,
  template: '',
})
export abstract class BaseRequestPasswordComponent {
  static readonly ssoPasswordResetNotAllowedCode = 'SSO_PASSWORD_RESET_NOT_ALLOWED';

  #authenticationService = inject(AuthenticationService);
  #dialogService = inject(IgntDialogService);
  #fb = inject(UntypedFormBuilder);
  #partnerConfigService = inject(PartnerConfigService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #translate = inject(TranslateService);
  config$: Observable<PartnerConfig | null> = this.#partnerConfigService.$config;
  error = new ExtendedError();
  errorRequest = '';
  explanation = '';
  navigate_to = '';
  requestForm: UntypedFormGroup = this.#fb.group({
    username: [null, [Validators.required]],
  });
  title = '';

  constructor() {
    this.#route.queryParams.subscribe(params => {
      if (params.username != null) {
        this.requestForm.setValue({ username: params.username });
      }
    });
  }

  closeError(): void {
    this.error.clear();
  }

  requestPassword(): void {
    this.closeError();
    const username = this.requestForm.get('username')!.value;
    this.#authenticationService.requestPassword(username).subscribe(
      response => {
        if (response.data) {
          this.#router.navigate([this.navigate_to, 'resume'], { state: { username } });
          return;
        }
        if (response.error?.code === BaseRequestPasswordComponent.ssoPasswordResetNotAllowedCode) {
          this.#dialogService.openMessageModal(
            this.#translate.instant('common.errorTitle'),
            this.#translate.instant(response.error.message),
          );
          return;
        }
        this.error.status = true;
      },
      ({ message }) => {
        this.error.status = true;
        this.error.message = message || null;
      },
    );
  }
}
