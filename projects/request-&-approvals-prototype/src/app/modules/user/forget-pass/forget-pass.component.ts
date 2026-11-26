import { Component } from '@angular/core';

import { BaseRequestPasswordComponent } from '../base-request-password/base-request-password.component';

@Component({
  selector: 'app-forget-pass',
  standalone: false,
  templateUrl: '../base-request-password/base-request-password.component.html',
  styleUrls: ['../login-form-container/login-form-container.component.scss'],
})
export class ForgetPassComponent extends BaseRequestPasswordComponent {
  errorRequest = 'forgotPassword.errorRequest';
  explanation = 'forgotPassword.usernameExplanation';
  navigate_to = 'request-password';
  title = 'forgotPassword.forgotPassword';
}
