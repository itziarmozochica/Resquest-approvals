import { Component } from '@angular/core';

import { BaseRequestPasswordComponent } from '../base-request-password/base-request-password.component';

@Component({
  selector: 'app-password-token-expired',
  standalone: false,
  templateUrl: '../base-request-password/base-request-password.component.html',
  styleUrls: ['../login-form-container/login-form-container.component.scss'],
})
export class PasswordTokenExpiredComponent extends BaseRequestPasswordComponent {
  errorRequest = 'passwordTokenExpired.errorRequest';
  explanation = 'passwordTokenExpired.usernameExplanation';
  navigate_to = 'password-token-expired';
  title = 'passwordTokenExpired.linkExpired';
}
