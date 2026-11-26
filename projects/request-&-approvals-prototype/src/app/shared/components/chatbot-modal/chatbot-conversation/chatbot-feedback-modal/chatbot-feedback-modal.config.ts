export interface FeedbackOption {
  translationKey: string;
  type: string;
  value: string;
}

export const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    translationKey: 'chatbot.submitFeedback.reasons.unclear',
    type: 'explanation',
    value: 'unclear',
  },
  {
    translationKey: 'chatbot.submitFeedback.reasons.incorrect',
    type: 'accuracy',
    value: 'incorrect',
  },
  {
    translationKey: 'chatbot.submitFeedback.reasons.incomplete',
    type: 'utility',
    value: 'incomplete',
  },
  {
    translationKey: 'chatbot.submitFeedback.reasons.misunderstood',
    type: 'recall',
    value: 'misunderstood',
  },
  {
    translationKey: 'chatbot.submitFeedback.reasons.lackContext',
    type: 'context',
    value: 'lackContext',
  },
  {
    translationKey: 'chatbot.submitFeedback.reasons.tooSlow',
    type: 'speed',
    value: 'tooSlow',
  },
  {
    translationKey: 'chatbot.submitFeedback.other',
    type: 'other',
    value: 'other',
  },
];
