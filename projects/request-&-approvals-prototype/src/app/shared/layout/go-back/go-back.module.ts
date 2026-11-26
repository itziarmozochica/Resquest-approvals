import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';
import { GoBackComponent } from './go-back.component';

@NgModule({
  imports: [CommonModule, TranslateModule, RouterModule, IconsModule],
  declarations: [GoBackComponent],
  exports: [GoBackComponent],
})
export class GoBackModule {}
