import type { ContentCategory } from '../../content-questions.model';

export const entertainmentCenterContentCategory: ContentCategory = {
  id: 'entertainment_center',
  labelKey: 'entertainment_center',
  questions: [
    {
      helpKey: 'add_any_age_or_height_requirements',
      key: 'age_height_requirement',
      labelKey: 'age_height_requirement',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_anything_visitors_need_to_bring',
      key: 'what_to_bring',
      labelKey: 'what_to_bring',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'permanent_attractions',
};
