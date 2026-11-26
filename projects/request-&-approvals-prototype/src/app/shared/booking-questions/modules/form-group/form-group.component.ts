import { ChangeDetectionStrategy, Component, Input, OnChanges, signal, SimpleChanges, TemplateRef, WritableSignal } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { buildFormBookingQuestionId } from '@fz-original/app/shared/utils/booking-questions.utils';

import { BookingQuestion, BookingQuestionsFormData } from '../../models';
import { BookingQuestionElementType } from '../../models/booking-question-element-type';

function trackBy<T>(property: keyof T): (_: number, item: T) => unknown {
  return (_: number, item: T): unknown => item[property];
}

@Component({
  selector: 'fv-booking-questions-form-group',
  standalone: false,
  templateUrl: './form-group.component.html',
  styleUrls: ['./form-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingQuestionsFormGroupComponent implements OnChanges {
  readonly #GENERIC_USER_NAME = 'Generic user';

  @Input() formGroup!: UntypedFormGroup;
  @Input() formData!: BookingQuestionsFormData;
  @Input() showTicketLabel = false;
  @Input() showTicketCounter = false;
  @Input() error = false;
  @Input() renderPerTicketQuestionsFirst = false;
  @Input() customer: Customer | null = null;
  @Input() dateQuestionTemplate?: TemplateRef<unknown>;

  customerInfoPerTicketIndexes: WritableSignal<number[]> = signal<number[]>([]);
  isCheckboxChecked: WritableSignal<boolean> = signal<boolean>(false);
  #userInteractedWithTicketIndex0: WritableSignal<boolean> = signal<boolean>(false);

  questionItemType = BookingQuestionElementType;
  trackByItemId = trackBy<BookingQuestion>('id');
  trackByIndex = (index: number): number => index;

  onCheckboxChange(checked: boolean): void {
    this.#userInteractedWithTicketIndex0.set(true);
    if (checked) {
      this.fillBookingQuestionPerTicketWithCustomerInfo();
      this.isCheckboxChecked.set(true);
    } else {
      this.#clearNominativeBookingQuestionAnswers();
      this.isCheckboxChecked.set(false);
    }
  }

  fillBookingQuestionPerTicketWithCustomerInfo(): void {
    const customerInfoBookingQuestionsPerTicket = this.#getCustomerInfoQuestionsPerTicketIndex(0);

    customerInfoBookingQuestionsPerTicket.forEach(bookingQuestion => {
      this.#fillNominativeBookingQuestionAnswer(bookingQuestion, buildFormBookingQuestionId(bookingQuestion) + '#0');
    });
  }

  #clearNominativeBookingQuestionAnswers(): void {
    const customerInfoBookingQuestionsPerTicket = this.#getCustomerInfoQuestionsPerTicketIndex(0);

    customerInfoBookingQuestionsPerTicket.forEach(bookingQuestion => {
      const formControlId = buildFormBookingQuestionId(bookingQuestion) + '#0';
      const bookingQuestionFormControl = this.formGroup.get(formControlId);
      bookingQuestionFormControl?.setValue('');
      bookingQuestionFormControl?.updateValueAndValidity();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.formData) {
      const formData: BookingQuestionsFormData = changes.formData?.currentValue;
      if (this.#customerHasNominativeInformation()) {
        this.#setShowButtonsFillCustomerInfo(formData);
        return;
      }
    }
  }

  #fillNominativeBookingQuestionAnswer(bookingQuestion: BookingQuestion, formControlId: string): void {
    const bookingQuestionFormControl = this.formGroup.get(formControlId);
    if (this.customer?.firstName === this.#GENERIC_USER_NAME) {
      return;
    }

    // Preserve existing values (e.g. FRM modify prefill from cart GET answers).
    if (this.#hasNonEmptyControlValue(bookingQuestionFormControl?.value)) {
      return;
    }

    if (this.#isFirstNameBookingQuestion(bookingQuestion)) {
      const firstName = this.customer?.firstName || '';
      bookingQuestionFormControl?.setValue(firstName);
      bookingQuestionFormControl?.updateValueAndValidity();
      return;
    }

    if (this.#isLastNameBookingQuestion(bookingQuestion)) {
      const lastName = this.customer?.lastName || '';
      bookingQuestionFormControl?.setValue(lastName);
      bookingQuestionFormControl?.updateValueAndValidity();
      return;
    }
  }

  #hasNonEmptyControlValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }

  #getCustomerInfoQuestionsPerTicketIndex(index: number) {
    return this.formData.perTicket[index].filter(questionPerOrder => this.#isANominativeBookingQuestion(questionPerOrder));
  }

  #isANominativeBookingQuestion(question: BookingQuestion): boolean {
    return this.#isFirstNameBookingQuestion(question) || this.#isLastNameBookingQuestion(question);
  }

  #hasCustomerInformationForNominativeBookingQuestion(question: BookingQuestion): boolean {
    if (!this.customer) {
      return false;
    }

    if (this.customer?.firstName === this.#GENERIC_USER_NAME) {
      return false;
    }

    return (
      (this.#isFirstNameBookingQuestion(question) && this.customer?.firstName != null && this.customer?.firstName?.length > 0) ||
      (this.#isLastNameBookingQuestion(question) && this.customer?.lastName != null && this.customer?.lastName?.length > 0)
    );
  }

  #isFirstNameBookingQuestion(question: BookingQuestion): boolean {
    return question.configuration?.nominativeTicket === 'first_name';
  }

  #isLastNameBookingQuestion(question: BookingQuestion): boolean {
    return question.configuration?.nominativeTicket === 'last_name';
  }

  #customerHasNominativeInformation(): boolean {
    return (
      this.customer != null &&
      ((this.customer.firstName != null && this.customer.firstName?.length > 0) ||
        (this.customer.lastName != null && this.customer.lastName?.length > 0))
    );
  }

  #setShowButtonsFillCustomerInfo(formData: BookingQuestionsFormData): void {
    this.customerInfoPerTicketIndexes.set([]);
    if (formData.perTicket.length > 0) {
      formData.perTicket.forEach((questionsPerTicket, questionsPerTicketIndex) => {
        if (
          questionsPerTicket.some(
            questionPerTicket =>
              this.#isANominativeBookingQuestion(questionPerTicket) &&
              this.#hasCustomerInformationForNominativeBookingQuestion(questionPerTicket),
          )
        ) {
          this.customerInfoPerTicketIndexes.set([...this.customerInfoPerTicketIndexes(), questionsPerTicketIndex]);
          if (questionsPerTicketIndex === 0 && !this.#userInteractedWithTicketIndex0()) {
            const alreadyPrefillOnTicket0 = this.#getCustomerInfoQuestionsPerTicketIndex(0).some(bookingQuestion => {
              const formControlId = buildFormBookingQuestionId(bookingQuestion) + '#0';
              return this.#hasNonEmptyControlValue(this.formGroup.get(formControlId)?.value);
            });

            if (!alreadyPrefillOnTicket0) {
              this.isCheckboxChecked.set(true);
              this.fillBookingQuestionPerTicketWithCustomerInfo();
            }
          }
        }
      });
    }
  }
}
