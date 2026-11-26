import { Inject, Injectable } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { getBookingQuestionControlId } from '@fz-original/app/shared/utils/booking-questions.utils';

import {
  BookingQuestion,
  BookingQuestionAnswer,
  BookingQuestionAnswers,
  BookingQuestionOrderDetails,
  BookingQuestionsFormData,
  BookingQuestionTicketAnswer,
  BookingQuestionTicketDetails,
  BookingQuestionType,
  ChoiceAdditionalQuestionAnswer,
  FormGroupControl,
} from '../../models';
import { FORM_GROUP_CONTROLS, FORM_GROUP_CONTROLS_DEFAULT } from '../../tokens';

@Injectable({
  providedIn: 'root',
})
export class BookingQuestionsFormGroupService {
  constructor(
    @Inject(FORM_GROUP_CONTROLS) private formGroupControls: Array<FormGroupControl<unknown, unknown>>,
    @Inject(FORM_GROUP_CONTROLS_DEFAULT) private formGroupControlsDefault: FormGroupControl<unknown, unknown>,
  ) {
    const types = this.formGroupControls.map(control => control.type());
    this.checkDuplicatedTypes(types);
    this.checkNotNullTypes(types);
  }

  createFormGroup(formData: BookingQuestionsFormData): UntypedFormGroup {
    const formGroup = new UntypedFormGroup({});

    formData.perOrder.forEach(question => {
      formGroup.addControl(
        getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId }),
        this.createFormControl(question),
      );
    });

    formData.perTicket.forEach((questions, index) => {
      questions.forEach(question => {
        formGroup.addControl(
          getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId, ticketIndex: index }),
          this.createFormControl(question),
        );
      });
    });

    return formGroup;
  }

  mapToAnswers(formGroup: UntypedFormGroup, formData: BookingQuestionsFormData): BookingQuestionAnswers {
    return {
      perOrder: formData.perOrder.map(question => ({
        question,
        answer: this.mapToAnswer(
          question,
          formGroup.get(getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId }))?.value ?? null,
        ),
      })),
      perTicket: formData.perTicket.map((questions, index) =>
        questions.map(question => ({
          question,
          answer: this.mapToTicketAnswer(
            question,
            formGroup.get(
              getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId, ticketIndex: index }),
            )?.value ?? null,
            index + 1,
          ),
        })),
      ),
    };
  }

  mapToFormData(
    bookingQuestions: Array<BookingQuestion>,
    numOfTickets: number,
    ticketDetails?: Array<BookingQuestionTicketDetails>,
    orderDetails?: BookingQuestionOrderDetails,
  ): BookingQuestionsFormData {
    const hasPerTicket = bookingQuestions.some(question => question.frequency === 'per_ticket');
    const perTicket: Map<string, BookingQuestion>[] = hasPerTicket ? Array.from({ length: numOfTickets }, () => new Map()) : [];
    const perOrder: BookingQuestion[] = [];
    const orderedTicketDetails: BookingQuestionTicketDetails[] = Array(numOfTickets).fill(undefined);

    bookingQuestions.forEach(question => {
      this.mapToTextType(question);

      if (question.frequency === 'per_order') {
        perOrder.push(this.createQuestionWithFormControlId(question));
        return;
      }

      for (let i = 0; i < perTicket.length; i++) {
        const ticketDetail = ticketDetails?.[i];

        if (!this.#shouldApplyPerTicketQuestion(question, ticketDetail, ticketDetails !== undefined)) {
          continue;
        }

        if (question.sessionTypeId === undefined || question.sessionTypeId === ticketDetail?.sessionType.id) {
          if (this.#shouldReplacePerTicketQuestion(perTicket[i].get(question.id), question, ticketDetail)) {
            perTicket[i].set(question.id, this.createQuestionWithFormControlId(question, i));
          }
          if (ticketDetail) {
            orderedTicketDetails[i] = ticketDetails[i];
          }
        }
      }
    });

    const filteredTicketDetails = [
      ...orderedTicketDetails.filter((detail): detail is BookingQuestionTicketDetails => detail !== undefined),
      ...(ticketDetails?.filter(detail => !orderedTicketDetails.includes(detail)) ?? []),
    ];

    return {
      perOrder,
      perTicket: perTicket.filter(questions => questions.size > 0).map(item => Array.from(item.values())),
      ticketDetails: filteredTicketDetails,
      orderDetails,
    };
  }

  #shouldReplacePerTicketQuestion(
    existingQuestion: BookingQuestion | undefined,
    question: BookingQuestion,
    ticketDetail: BookingQuestionTicketDetails | undefined,
  ): boolean {
    if (existingQuestion === undefined) {
      return true;
    }

    if (existingQuestion.optional !== question.optional) {
      return existingQuestion.optional && !question.optional;
    }

    return (
      existingQuestion.sessionTypeId === undefined &&
      question.sessionTypeId !== undefined &&
      question.sessionTypeId === ticketDetail?.sessionType.id
    );
  }

  #shouldApplyPerTicketQuestion(
    question: BookingQuestion,
    ticketDetail: BookingQuestionTicketDetails | undefined,
    hasTicketDetails: boolean,
  ): boolean {
    if (question.mainPlanId === undefined) {
      return true;
    }

    if (!hasTicketDetails) {
      return true;
    }

    return ticketDetail?.mainPlanId === question.mainPlanId;
  }

  private checkDuplicatedTypes(types: BookingQuestionType[]): void {
    if (new Set(types).size !== types.length) {
      throw new Error('Duplicated form group control types found');
    }
  }

  private checkNotNullTypes(types: BookingQuestionType[]): void {
    if (types.some(type => type === null || type === undefined)) {
      throw new Error('Null form group control type found');
    }
  }

  private createFormControl(question: BookingQuestion): AbstractControl {
    const factory = this.formGroupControls.find(s => s.type() === question.type) || this.formGroupControlsDefault;
    return factory.create(question);
  }

  private createQuestionWithFormControlId(question: BookingQuestion, ticketIndex?: number): BookingQuestion {
    return {
      ...question,
      formControlId: getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId, ticketIndex }),
    };
  }

  private mapToAdditionalQuestionAnswer(
    choiceAdditionalQuestionAnswer: Array<ChoiceAdditionalQuestionAnswer> | ChoiceAdditionalQuestionAnswer,
  ): Array<ChoiceAdditionalQuestionAnswer> | null {
    if (!choiceAdditionalQuestionAnswer) {
      return null;
    }

    if (!Array.isArray(choiceAdditionalQuestionAnswer)) {
      return [choiceAdditionalQuestionAnswer];
    } else {
      return choiceAdditionalQuestionAnswer.map(addtionalQuestion => ({
        choice: addtionalQuestion.choice,
        answer: addtionalQuestion.answer,
      }));
    }
  }

  private mapToAnswer(question: BookingQuestion, value: any): BookingQuestionAnswer {
    const factory = this.formGroupControls.find(s => s.type() === question.type) || this.formGroupControlsDefault;
    const choices = value?.choices ? value.choices : value;
    const additionalQuestions = value?.additionalQuestions ? value?.additionalQuestions : value?.additionalQuestion;
    return {
      questionId: question.id,
      value: factory.value(question, choices),
      displayValue: factory.displayValue(question, choices),
      choiceAdditionalQuestionAnswers: this.mapToAdditionalQuestionAnswer(additionalQuestions),
    };
  }

  private mapToTextType(bookingQuestion: BookingQuestion): void {
    const typesToMapInText = ['name'];
    if (typesToMapInText.includes(bookingQuestion.type)) {
      bookingQuestion.type = 'text';
    }
  }

  private mapToTicketAnswer(question: BookingQuestion, value: any, index: number): BookingQuestionTicketAnswer {
    const factory = this.formGroupControls.find(s => s.type() === question.type) || this.formGroupControlsDefault;
    const choices = value?.choices ? value.choices : value;
    const additionalQuestions = value?.additionalQuestions ? value?.additionalQuestions : value?.additionalQuestion;

    return {
      questionId: question.id,
      value: factory.value(question, choices),
      displayValue: factory.displayValue(question, choices),
      ticketIndex: index,
      choiceAdditionalQuestionAnswers: this.mapToAdditionalQuestionAnswer(additionalQuestions),
    };
  }
}
