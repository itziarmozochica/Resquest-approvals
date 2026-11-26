import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NoOrganizationMessageComponent } from '@fz-original/app/modules/user/no-organization-message/no-organization-message.component';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { ClickOutsideModule } from 'ng-click-outside';

import { SharedComponentsModule } from '../../shared/components/shared-components.module';
import { IconsModule } from '../../shared/icons/icons.module';
import { FooterModule } from '../../shared/layout/footer/footer.module';
import { ModalContentModule } from '../../shared/layout/modal/modal-content.module';
import { ForgetPassResumeComponent } from './forget-pass-resume/forget-pass-resume.component';
import { ForgetPassComponent } from './forget-pass/forget-pass.component';
import { LoginBackofficeComponent } from './login-backoffice/login-backoffice.component';
import { LoginFormContainerModule } from './login-form-container/login-form-container.module';
import { LoginFormComponent } from './login-form/login-form.component';
import { LoginOneboxComponent } from './login-onebox/login-onebox.component';
import { BackToOdooPosButtonComponent } from './login/components/back-to-odoo-pos-button/back-to-odoo-pos-button.component';
import { NfcLoginComponent } from './login/components/nfc-login/nfc-login.component';
import { LoginComponent } from './login/login.component';
import { MfaEnrollmentComponent } from './mfa-enrollment/mfa-enrollment.component';
import { MfaVerificationComponent } from './mfa-verification/mfa-verification.component';
import { PasswordTokenExpiredResumeComponent } from './password-token-expired-resume/password-token-expired-resume.component';
import { PasswordTokenExpiredComponent } from './password-token-expired/password-token-expired.component';
import { PinPadComponent } from './pin-pad/pin-pad.component';
import { SelectOrganizationComponent } from './select-organization/select-organization.component';
import { UpdatePasswordFormComponent } from './update-password-form/update-password-form.component';
import { UserRoutingModule } from './user-routing.module';

@NgModule({
  declarations: [
    LoginFormComponent,
    UpdatePasswordFormComponent,
    LoginComponent,
    LoginBackofficeComponent,
    LoginOneboxComponent,
    ForgetPassComponent,
    ForgetPassResumeComponent,
    PasswordTokenExpiredComponent,
    PasswordTokenExpiredResumeComponent,
  ],
  exports: [
    LoginFormComponent,
    SelectOrganizationComponent,
    ForgetPassComponent,
    ForgetPassResumeComponent,
    PasswordTokenExpiredComponent,
    PasswordTokenExpiredResumeComponent,
    MfaEnrollmentComponent,
    MfaVerificationComponent,
  ],
  imports: [
    IgntAlertComponent,
    CommonModule,
    UserRoutingModule,
    FormsModule,
    ClickOutsideModule,
    ReactiveFormsModule,
    TranslateModule,
    LoginFormContainerModule,
    SelectOrganizationComponent,
    IconsModule,
    ModalContentModule,
    SharedComponentsModule,
    FooterModule,
    NoOrganizationMessageComponent,
    IgntButtonComponent,
    IgntInputFieldComponent,
    IgntSkeletonBaseComponent,
    IgntCheckboxComponent,
    IgntIconComponent,
    MfaEnrollmentComponent,
    MfaVerificationComponent,
    NfcLoginComponent,
    PinPadComponent,
    BackToOdooPosButtonComponent,
  ],
})
export class UserModule {}
