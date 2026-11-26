import { BookingQuestion } from '../booking-questions/models/booking-question';

/**
 * @deprecated Use getBookingQuestionControlId instead
 *
 * 🚫 buildFormBookingQuestionId(this.question)
 *
 * ✅ getBookingQuestionControlId({ questionId: this.question.id, sessionTypeId: this.question.sessionTypeId })
 */
export const buildFormBookingQuestionId = (question: BookingQuestion): string => {
  return question.id + (question.sessionTypeId ?? '');
};

export function getBookingQuestionControlId(data: { questionId: string; sessionTypeId?: number; ticketIndex?: number }): string {
  const { questionId, sessionTypeId, ticketIndex } = data;
  const sessionTypeIdPart = sessionTypeId !== undefined ? `${sessionTypeId}` : '';
  const ticketIndexPart = ticketIndex !== undefined ? `#${ticketIndex}` : '';
  return `${questionId}${sessionTypeIdPart}${ticketIndexPart}`;
}
