import type { ContentCategory } from '../../content-questions.model';

export const competitiveSportActivitiesContentCategory: ContentCategory = {
  id: 'competitive_sport_activities',
  labelKey: 'competitive_sport_activities',
  questions: [
    {
      helpKey: 'add_anything_visitors_need_to_bring',
      key: 'what_to_bring',
      labelKey: 'what_to_bring',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'local_activities',
};
