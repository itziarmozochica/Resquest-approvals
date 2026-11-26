import { NgModule } from '@angular/core';

import { FORM_GROUP_CONTROLS } from '../../../tokens';
import { NumberTypeFormGroupControl } from '../../question-item/number/number-type.service';

@NgModule({
  providers: [
    {
      multi: true,
      provide: FORM_GROUP_CONTROLS,
      useClass: NumberTypeFormGroupControl,
    },
  ],
})
export class NumberTypeModule {}
