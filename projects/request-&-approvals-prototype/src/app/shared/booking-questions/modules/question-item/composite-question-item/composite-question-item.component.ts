import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { BookingQuestion } from '../../../models';
import { CompositeQuestionTemplateAttribute } from '../../../models/composite-question-template-attribute';
import { InteractionConfigurationComposite } from '../../../models/interaction-configuration-composite';
import { FormControlModule } from '../../form-control/form-control.module';
import { AddressLookupCompositeQuestionItemComponent } from '../address-lookup-composite-question-item/address-lookup-composite-question-item.component';
import { QuestionItemModule } from '../question-item.module';

@Component({
  selector: 'fzo-composite-question-item',
  templateUrl: './composite-question-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormControlModule, QuestionItemModule, NgFor, AddressLookupCompositeQuestionItemComponent, NgIf],
  standalone: true,
})
export class CompositeQuestionItemComponent {
  get isAddressLookupQuestion(): boolean {
    const templateAttributes = new Set(
      this.questions.map(item => {
        const config = item.interactionConfiguration as InteractionConfigurationComposite;
        return config?.templateAttribute;
      }),
    );

    return templateAttributes.has(this.template.ADDRESS_LOOKUP_ADDRESS) && templateAttributes.has(this.template.ADDRESS_LOOKUP_ZIPCODE);
  }

  @Input() error = false;
  @Input() formGroup!: UntypedFormGroup;
  @Input() questions!: BookingQuestion[];

  template = CompositeQuestionTemplateAttribute;

  trackByQuestionId(_: number, question: BookingQuestion): string {
    return question.id;
  }
}
