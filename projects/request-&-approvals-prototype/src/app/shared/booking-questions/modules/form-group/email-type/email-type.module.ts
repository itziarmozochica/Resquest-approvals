import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FORM_GROUP_CONTROLS, FORM_GROUP_CONTROLS_DEFAULT } from '../../../tokens';
import { EmailTypeFormGroupControl } from '../../question-item/email/email-type.service';

@NgModule({
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: FORM_GROUP_CONTROLS,
      useClass: EmailTypeFormGroupControl,
      multi: true,
    },
    {
      provide: FORM_GROUP_CONTROLS_DEFAULT,
      useClass: EmailTypeFormGroupControl,
    },
  ],
})
export class EmailTypeModule {}
