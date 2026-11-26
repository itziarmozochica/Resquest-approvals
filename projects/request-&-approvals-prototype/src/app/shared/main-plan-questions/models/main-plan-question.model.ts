import { CustomerQuestion } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';

import { AutoAnswerFrom } from './auto-answer-from.enum';
import { QuestionAnswersAttachment } from './question-answers-attachment.enum';
import { QuestionFrequency } from './question-frequency.enum';
import { QuestionWhen } from './question-when.enum';

export interface MainPlanQuestion {
  answersAttachedTo: QuestionAnswersAttachment | null;
  autoAnswerFrom: AutoAnswerFrom | null;
  bookingQuestion: CustomerQuestion;
  channelIds: string[];
  defaultValues: string[] | null;
  frequency: QuestionFrequency;
  id: number;
  mainPlanId: number;
  optional: boolean;
  order: number | null;
  sessionTypeId: number | null;
  when: QuestionWhen;
}
