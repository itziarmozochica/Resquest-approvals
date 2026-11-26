import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { SingleChoiceTypeModule } from '../../form-group/single-choice-type/single-choice-type.module';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { SingleChoiceQuestionItemComponent } from './single-choice-question-item.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, SingleChoiceTypeModule, BuildBookingQuestionIdPipe],
  declarations: [SingleChoiceQuestionItemComponent],
  exports: [SingleChoiceQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'single_choice',
        componentType: SingleChoiceQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class SingleChoiceQuestionItemModule {}
