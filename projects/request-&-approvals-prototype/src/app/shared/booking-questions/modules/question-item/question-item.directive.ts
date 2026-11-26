import {
  ComponentRef,
  DestroyRef,
  Directive,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UntypedFormGroup } from '@angular/forms';

import { BookingQuestion } from '../../models/booking-question';
import { QUESTION_ITEM_COMPONENTS, QuestionItemComponentType } from './question-item-factory.token';
import { QuestionItemComponent } from './question-item.component';
import { TextQuestionItemComponent } from './text/text-question-item.component';

@Directive({
  selector: '[fvQuestionItem],fv-question-item',
  standalone: false,
})
export class QuestionItemDirective implements OnInit, OnChanges {
  @Input() question!: BookingQuestion;
  @Input() controlId!: string;
  @Input() formGroup!: UntypedFormGroup;
  @Input() error!: boolean;

  readonly #components: QuestionItemComponentType[] | null = inject(QUESTION_ITEM_COMPONENTS, { optional: true });
  readonly #destroyRef = inject(DestroyRef);
  readonly #viewContainerRef = inject(ViewContainerRef);
  #componentRef: ComponentRef<QuestionItemComponent> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['error']?.currentValue) {
      this.#componentRef?.setInput('formGroup', this.formGroup);
    }
  }

  ngOnInit(): void {
    const specificComponentType = (this.#components || []).find(component => component.questionType === this.question.type);
    const componentType = specificComponentType ? specificComponentType.componentType : TextQuestionItemComponent;
    this.#componentRef = this.#buildComponent(componentType);
    this.#updateInputs(this.#componentRef);
    this.#refreshOnStatusChanges(this.#componentRef);
  }

  #buildComponent(componentType: Type<QuestionItemComponent>): ComponentRef<QuestionItemComponent> {
    return this.#viewContainerRef.createComponent(componentType);
  }

  /**
   * Question items are OnPush and most read their control's errors from the template, so an error set
   * from outside (a rejected answer flagged by the server) would not render until the next input change.
   */
  #refreshOnStatusChanges(componentRef: ComponentRef<QuestionItemComponent>): void {
    this.formGroup
      ?.get(this.controlId)
      ?.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => componentRef.changeDetectorRef.markForCheck());
  }

  #updateInputs(componentRef: ComponentRef<QuestionItemComponent>): void {
    componentRef.instance.question = this.question;
    componentRef.instance.controlId = this.controlId;
    componentRef.instance.formGroup = this.formGroup;
  }
}
