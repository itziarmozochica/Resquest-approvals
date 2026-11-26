import type { ContentCategory } from '../../content-questions.model';

export const immersivePermanentAttractionMuseumContentCategory: ContentCategory = {
  id: 'immersive_permanent_attraction_museum',
  labelKey: 'immersive_permanent_attraction_museum',
  questions: [
    {
      helpKey: 'add_how_visitors_interact_with_the_experience',
      key: 'visitor_interaction',
      labelKey: 'visitor_interaction',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'permanent_attractions',
};
