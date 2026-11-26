import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgSelectModule } from '@ng-select/ng-select';

import { FORM_GROUP_CONTROLS } from '../../../tokens';
import { TelTypeFormGroupControl } from '../../question-item/tel/tel-type.service';
import { TelTypeComponent } from './tel-type.component';

@NgModule({
  imports: [CommonModule, FormsModule, NgSelectModule],
  declarations: [TelTypeComponent],
  providers: [
    {
      provide: FORM_GROUP_CONTROLS,
      useClass: TelTypeFormGroupControl,
      multi: true,
    },
  ],
  exports: [TelTypeComponent],
})
export class TelTypeModule {}
