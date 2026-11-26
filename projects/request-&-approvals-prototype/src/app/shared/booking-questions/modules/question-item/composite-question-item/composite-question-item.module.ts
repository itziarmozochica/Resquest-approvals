import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../../../icons/icons.module';
import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { FormControlModule } from '../../form-control/form-control.module';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { CompositeQuestionItemComponent } from './composite-question-item.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    IconsModule,
    IgntInputFieldComponent,
    BuildBookingQuestionIdPipe,
    FormControlModule,
    CompositeQuestionItemComponent,
  ],
  exports: [CompositeQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'composite',
        componentType: CompositeQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class CompositeQuestionItemModule {}
