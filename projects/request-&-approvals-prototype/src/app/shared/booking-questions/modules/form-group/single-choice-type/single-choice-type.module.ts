import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

import { MultiSelectModule } from '../../../../layout/filters/multi-select/multi-select.module';
import { FORM_GROUP_CONTROLS } from '../../../tokens';
// this import will break compilation if you change it
import { SingleChoiceTypeFormGroupControl } from '../../question-item/single-choice/single-choice-type.service';
import { SingleChoiceTypeComponent } from './single-choice-type.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, TranslateModule, MultiSelectModule],
  declarations: [SingleChoiceTypeComponent],
  providers: [
    {
      provide: FORM_GROUP_CONTROLS,
      useClass: SingleChoiceTypeFormGroupControl,
      multi: true,
    },
  ],
  exports: [SingleChoiceTypeComponent],
})
export class SingleChoiceTypeModule {}
