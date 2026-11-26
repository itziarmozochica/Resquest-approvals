import { AutoAnswerFrom } from './auto-answer-from.enum';
import { QuestionAnswersAttachment } from './question-answers-attachment.enum';
import { QuestionFrequency } from './question-frequency.enum';
import { QuestionWhen } from './question-when.enum';

export interface MainPlanQuestionInput {
  answersAttachedTo: QuestionAnswersAttachment | null;
  autoAnswerFrom: AutoAnswerFrom | null;
  channelIds: string[];
  defaultValues: string[] | null;
  frequency: QuestionFrequency;
  optional: boolean;
  order: number | null;
  sessionTypeId: number | null;
  when: QuestionWhen;
}
