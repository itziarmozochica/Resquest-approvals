import type { ContentCategory } from '../../content-questions.model';

export const experienceContentCategory: ContentCategory = {
  id: 'experience',
  labelKey: 'experience',
  questions: [
    {
      helpKey: 'add_how_visitors_interact_with_the_experience',
      key: 'visitor_interaction',
      labelKey: 'visitor_interaction',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_any_age_recommendations_or_requirements',
      key: 'age_requirement',
      labelKey: 'age_requirement',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },
  ],
  verticalId: 'live_shows_and_experiences',
};
