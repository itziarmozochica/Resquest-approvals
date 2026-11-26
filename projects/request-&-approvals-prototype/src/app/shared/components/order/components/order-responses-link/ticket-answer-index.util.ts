import { BookingAnswer } from '@fz-original/app/shared/models/booking-questions/booking-answer.model';

export function resolveTicketIndex(bookingAnswers: BookingAnswer[] | undefined, codeId: number): number | null {
  return bookingAnswers?.find(answer => answer.codeId === codeId)?.ticketIndex ?? null;
}
