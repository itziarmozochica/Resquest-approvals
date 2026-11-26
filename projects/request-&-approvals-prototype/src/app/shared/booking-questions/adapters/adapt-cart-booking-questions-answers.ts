import { CartBookingQuestionAnswerSnapshot, CartBookingQuestionsAnswers } from '../models/cart-booking-questions-answers.model';
import {
  CartBookingQuestionAnswerSnapshotDTO,
  CartBookingQuestionsAnswersDataDTO,
  CartBookingQuestionsAnswersResponseDTO,
} from '../models/responses/cart-booking-questions-answers.response';

function adaptCartBookingQuestionAnswerSnapshot(dto: CartBookingQuestionAnswerSnapshotDTO): CartBookingQuestionAnswerSnapshot {
  return {
    answerId: dto.answer_id,
    questionId: dto.question_id,
    // question_label is not sent by the current BE; mapped only for forward-compatibility.
    questionLabel: dto.question_label,
    ...(dto.session_type_id !== undefined && dto.session_type_id !== null ? { sessionTypeId: dto.session_type_id } : {}),
    values: dto.values ?? [],
  };
}

function adaptCartBookingQuestionsAnswersData(data: CartBookingQuestionsAnswersDataDTO | null | undefined): CartBookingQuestionsAnswers {
  const payload = data ?? { answers_by_ticket_index: {}, answers_per_order: [] };
  const answersByTicketIndex: Record<number, CartBookingQuestionAnswerSnapshot[]> = {};

  for (const [ticketIndexKey, answers] of Object.entries(payload.answers_by_ticket_index ?? {})) {
    const ticketIndex = Number(ticketIndexKey);
    if (!Number.isInteger(ticketIndex)) {
      continue;
    }

    answersByTicketIndex[ticketIndex] = (answers ?? []).map(adaptCartBookingQuestionAnswerSnapshot);
  }

  return {
    answersByTicketIndex,
    answersPerOrder: (payload.answers_per_order ?? []).map(adaptCartBookingQuestionAnswerSnapshot),
  };
}

export function adaptCartBookingQuestionsAnswers(response: CartBookingQuestionsAnswersResponseDTO): CartBookingQuestionsAnswers {
  return adaptCartBookingQuestionsAnswersData(response.data);
}
