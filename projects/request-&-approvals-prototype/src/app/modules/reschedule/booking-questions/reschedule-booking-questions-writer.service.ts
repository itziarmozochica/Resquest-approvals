import { inject, Injectable } from '@angular/core';

import { adaptToBookingQuestionAnswerPayload } from '@fz-original/app/shared/booking-questions/adapters/adapt-to-booking-question-answer-payload';
import { adaptToTicketAnswer } from '@fz-original/app/shared/booking-questions/adapters/adapt-to-ticket-answer';
import { BookingQuestionsService } from '@fz-original/app/shared/booking-questions/booking-questions.service';
import { BookingAnswerPayload } from '@fz-original/app/shared/booking-questions/models/booking-answer-payload';
import { BookingQuestionsAnswersPayload } from '@fz-original/app/shared/booking-questions/models/responses/booking-questions-answers.payload';
import { ModificationCollectedBookingQuestionsAnswers } from '@fz-original/app/shared/booking-questions/modification/services/modification-booking-questions.orchestrator';
import {
  ModificationBookingQuestionAnswer,
  ModificationCompiledBookingQuestionAnswer,
} from '@fz-original/app/shared/booking-questions/modification/utils/modification-booking-questions.util';
import { BookingQuestionsFormGroupService } from '@fz-original/app/shared/booking-questions/modules/form-group/form-group.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Observable } from 'rxjs';

/**
 * Writes collected reschedule answers to a cart.
 *
 * Every per-ticket answer carries its `ticket_index`, which fever2 reads instead of the bucket
 * position, so empty buckets are dropped: fever2 rejects them. Answers come from the collected form,
 * so nested choice answers and file metadata survive, plus the kept ticket's source answers for the
 * questions the form never showed (from `compiled`).
 */
@Injectable({
  providedIn: 'root',
})
export class RescheduleBookingQuestionsWriterService {
  readonly #bookingQuestionsFormGroupService = inject(BookingQuestionsFormGroupService);
  readonly #bookingQuestionsService = inject(BookingQuestionsService);

  buildCartPayload(answers: ModificationCollectedBookingQuestionsAnswers): BookingQuestionsAnswersPayload {
    const mappedAnswers = this.#bookingQuestionsFormGroupService.mapToAnswers(answers.formGroup, answers.formData);
    const collectedQuestionIds = new Set(answers.formData.perOrder.map(question => question.id.toLowerCase()));
    // fever2 rejects the whole write when one answer is for a question the target does not have.
    const appliesToTarget = (questionId: string): boolean =>
      answers.targetQuestionIds === undefined || answers.targetQuestionIds.has(questionId.toLowerCase());

    return {
      // The dialog only collects the per_order questions the source answers leave empty: those come
      // from the form, every other one the target still has is forwarded from the source cart as-is.
      // Known gap: the answers GET does not expose nested choice answers or file metadata,
      // so a forwarded per_order question of those types would be flattened to its plain values.
      answers_per_order: [
        ...answers.answersPerOrder
          .filter(answer => !collectedQuestionIds.has(answer.questionId.toLowerCase()) && appliesToTarget(answer.questionId))
          .map(answer => toPerOrderPayload(answer)),
        ...mappedAnswers.perOrder
          .filter(item => hasAnswerValue(item.answer.value))
          .map(item => adaptToBookingQuestionAnswerPayload(item.question, item.answer)),
      ],
      answers_per_ticket: answers.targetTicketDetails
        .map((targetTicketDetail, targetIndex) => {
          const ticketIndex = targetIndex + 1;
          const compactedIndex = answers.formData.ticketDetails?.indexOf(targetTicketDetail) ?? -1;
          const items = mappedAnswers.perTicket[compactedIndex] ?? [];

          const formAnswers = items
            .filter(item => hasAnswerValue(item.answer.value))
            .map(item =>
              adaptToTicketAnswer(
                {
                  ...item.question,
                  // BE requires every answer in a ticket bucket to carry that ticket's session type
                  // when the question itself is not scoped to one.
                  sessionTypeId: item.question.sessionTypeId ?? targetTicketDetail.sessionType.id,
                },
                { ...item.answer, ticketIndex },
              ),
            );
          const formQuestionIds = new Set(items.map(item => item.question.id.toLowerCase()));
          const keptAnswers = (answers.compiled.answers_per_ticket.find(ticket => ticket.ticket_index === ticketIndex)?.answers ?? [])
            .filter(
              answer =>
                !formQuestionIds.has(answer.question_id.toLowerCase()) &&
                appliesToTarget(answer.question_id) &&
                hasAnswerValue(answer.values),
            )
            .map(answer => toKeptPerTicketPayload(answer, ticketIndex, targetTicketDetail.sessionType.id));

          return [...formAnswers, ...keptAnswers];
        })
        .filter(ticketAnswers => ticketAnswers.length > 0),
    };
  }

  writeToCart(
    cartId: string,
    answers: ModificationCollectedBookingQuestionsAnswers,
    channel?: string,
  ): Observable<BaseResponse<string | null>> {
    return this.#bookingQuestionsService.sendPreBookingAnswersPayload(cartId, answers.ticketCount, this.buildCartPayload(answers), channel);
  }
}

function toKeptPerTicketPayload(
  answer: ModificationCompiledBookingQuestionAnswer,
  ticketIndex: number,
  ticketSessionTypeId: number,
): BookingAnswerPayload {
  return {
    answer: answer.values,
    question_id: answer.question_id,
    session_type_id: answer.session_type_id ?? ticketSessionTypeId,
    ticket_index: ticketIndex,
  };
}

function hasAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(item => item !== null && item !== undefined && item !== '');
  }

  return true;
}

function toPerOrderPayload(answer: ModificationBookingQuestionAnswer): BookingAnswerPayload {
  return {
    answer: answer.values,
    question_id: answer.questionId,
    ...(answer.sessionTypeId !== undefined ? { session_type_id: answer.sessionTypeId } : {}),
  };
}
