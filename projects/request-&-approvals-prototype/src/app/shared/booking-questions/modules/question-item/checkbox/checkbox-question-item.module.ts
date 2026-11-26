import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SanitizePipe } from '@fz-original/app/shared/pipes/sanitize/sanitize.pipe';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '../../../../pipes/pipes.module';
import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { CheckBoxQuestionItemComponent } from './checkbox-question-item.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FontAwesomeModule,
    PipesModule,
    IgntFieldErrorComponent,
    BuildBookingQuestionIdPipe,
    SanitizePipe,
  ],
  declarations: [CheckBoxQuestionItemComponent],
  exports: [CheckBoxQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'checkbox_with_terms',
        componentType: CheckBoxQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class CheckBoxQuestionItemModule {}
