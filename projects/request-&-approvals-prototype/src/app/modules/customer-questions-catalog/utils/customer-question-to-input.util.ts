import { CustomerQuestionInput } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-input.model';
import { CustomerQuestion } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';

export function customerQuestionToInput(question: CustomerQuestion, title: string): CustomerQuestionInput {
  return {
    choices: question.choices
      ? question.choices.map(choice => ({
          additionalQuestionMessage: choice.additionalQuestionMessage,
          includeAdditionalQuestion: choice.includeAdditionalQuestion,
          label: choice.label,
          order: choice.order,
        }))
      : null,
    description: question.description,
    title,
    type: question.type,
    validationRegex: question.validationRegex,
  };
}
