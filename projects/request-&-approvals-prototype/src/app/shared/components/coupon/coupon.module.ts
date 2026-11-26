import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';
import { CouponComponent } from './coupon.component';

@NgModule({
  declarations: [CouponComponent],
  imports: [IgntAlertComponent, CommonModule, ReactiveFormsModule, TranslateModule, IconsModule, IgntButtonComponent],
  exports: [CouponComponent],
})
export class CouponModule {}
