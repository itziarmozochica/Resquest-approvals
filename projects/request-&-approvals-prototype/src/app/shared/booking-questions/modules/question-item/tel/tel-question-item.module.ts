import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { TranslateModule } from '@ngx-translate/core';

import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { TelTypeModule } from '../../form-group/tel-type/tel-type.module';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { TelQuestionItemComponent } from './tel-question-item.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    TelTypeModule,
    FontAwesomeModule,
    IgntFieldErrorComponent,
    BuildBookingQuestionIdPipe,
  ],
  declarations: [TelQuestionItemComponent],
  exports: [TelQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'tel',
        componentType: TelQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class TelQuestionItemModule {}
