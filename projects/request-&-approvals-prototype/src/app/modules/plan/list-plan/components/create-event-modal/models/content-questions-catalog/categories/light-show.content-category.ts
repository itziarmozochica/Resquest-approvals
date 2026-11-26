import type { ContentCategory } from '../../content-questions.model';

export const lightShowContentCategory: ContentCategory = {
  id: 'light_show',
  labelKey: 'light_show',
  questions: [
    {
      helpKey: 'add_the_theme_of_the_light_show',
      key: 'theme',
      labelKey: 'theme',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_any_age_recommendations_or_requirements',
      key: 'age_requirement',
      labelKey: 'age_requirement',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'exhibitions_and_light_shows',
};
