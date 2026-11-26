import { BookingAnswerAdditionalQuestionPayload } from './booking-answer-additional-question-payload';
import { BookingAnswerFileMetadata } from './booking-answer-file-metadata';

export interface BookingAnswerPayload {
  question_id: string;
  answer: Array<string>;
  choice_additional_question_answers?: Array<BookingAnswerAdditionalQuestionPayload> | null;
  ticket_index?: number;
  answer_file_metadata?: BookingAnswerFileMetadata;
  session_type_id?: number;
}
