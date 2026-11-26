import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { SharedComponentsModule } from '../../../shared/components/shared-components.module';
import { IconsModule } from '../../../shared/icons/icons.module';
import { LoginFormContainerComponent } from './login-form-container.component';

@NgModule({
  declarations: [LoginFormContainerComponent],
  exports: [LoginFormContainerComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, IconsModule, SharedComponentsModule],
})
export class LoginFormContainerModule {}
