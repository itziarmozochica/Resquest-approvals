import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FORM_GROUP_CONTROLS, FORM_GROUP_CONTROLS_DEFAULT } from '../../../tokens';
import { DateTypeFormGroupControl } from '../../question-item/date/date-type.service';

@NgModule({
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: FORM_GROUP_CONTROLS,
      useClass: DateTypeFormGroupControl,
      multi: true,
    },
    {
      provide: FORM_GROUP_CONTROLS_DEFAULT,
      useClass: DateTypeFormGroupControl,
    },
  ],
})
export class DateTypeModule {}
