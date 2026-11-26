import { Pipe, PipeTransform } from '@angular/core';

import { getBookingQuestionControlId } from '../../utils/booking-questions.utils';
import { BookingQuestion } from '../models/booking-question';

@Pipe({
  name: 'buildBookingQuestionId',
  standalone: true,
})
export class BuildBookingQuestionIdPipe implements PipeTransform {
  transform(question: BookingQuestion, ticketIndex?: number): string {
    return getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId, ticketIndex });
  }
}
