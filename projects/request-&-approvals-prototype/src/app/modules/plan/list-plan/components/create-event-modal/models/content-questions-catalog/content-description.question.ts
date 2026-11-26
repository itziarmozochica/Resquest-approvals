import type { ContentQuestion } from '../content-questions.model';

export const contentDescriptionQuestion: ContentQuestion = {
  helpKey: 'description',
  key: 'description',
  labelKey: 'description',
  requiredWhen: { kind: 'always' },
  type: 'rich_text',
};
