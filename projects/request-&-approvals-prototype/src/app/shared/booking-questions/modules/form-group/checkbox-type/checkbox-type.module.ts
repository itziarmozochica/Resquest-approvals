import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FORM_GROUP_CONTROLS } from '../../../tokens';
import { CheckBoxTypeFormGroupControl } from '../../question-item/checkbox/checkbox-type.service';

@NgModule({
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: FORM_GROUP_CONTROLS,
      useClass: CheckBoxTypeFormGroupControl,
      multi: true,
    },
  ],
})
export class CheckboxTypeModule {}
