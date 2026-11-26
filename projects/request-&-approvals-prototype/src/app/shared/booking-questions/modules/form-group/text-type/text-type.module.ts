import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FORM_GROUP_CONTROLS, FORM_GROUP_CONTROLS_DEFAULT } from '../../../tokens';
import { TextTypeFormGroupControl } from '../../question-item/text/text-type.service';

@NgModule({
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: FORM_GROUP_CONTROLS,
      useClass: TextTypeFormGroupControl,
      multi: true,
    },
    {
      provide: FORM_GROUP_CONTROLS_DEFAULT,
      useClass: TextTypeFormGroupControl,
    },
  ],
})
export class TextTypeModule {}
