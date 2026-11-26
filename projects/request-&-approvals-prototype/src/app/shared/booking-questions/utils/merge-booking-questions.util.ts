import { BookingQuestion } from '../models';

export function getBookingQuestionMergeKey(question: BookingQuestion): string {
  if (question.frequency === 'per_ticket') {
    return `${question.id}:${question.frequency}:${question.mainPlanId ?? ''}:${question.sessionTypeId ?? ''}`;
  }

  return `${question.id}:${question.frequency}`;
}

export function mergeBookingQuestionsPrioritizingMandatory(questions: BookingQuestion[]): BookingQuestion[] {
  const questionMap = new Map<string, BookingQuestion>();

  for (const question of questions) {
    const key = getBookingQuestionMergeKey(question);
    const existingQuestion = questionMap.get(key);

    if (!existingQuestion) {
      questionMap.set(key, question);
    } else if (existingQuestion.optional && !question.optional) {
      questionMap.set(key, question);
    }
  }

  return Array.from(questionMap.values());
}
