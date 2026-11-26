import { BookingAnswer } from './booking-answer.model';
import { BookingQuestionTypeEnum } from './booking-question-type.enum';

export class BookingQuestion {
  constructor(
    public id: string,
    public label: string,
    public message: string,
    public type: BookingQuestionTypeEnum,
    public choices?: Array<any>,
    public answer?: BookingAnswer,
  ) {}
}
