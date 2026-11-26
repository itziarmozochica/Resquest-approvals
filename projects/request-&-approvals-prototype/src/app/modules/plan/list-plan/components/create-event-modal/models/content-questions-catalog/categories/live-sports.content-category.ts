import type { ContentCategory } from '../../content-questions.model';

export const liveSportsContentCategory: ContentCategory = {
  id: 'live_sports',
  labelKey: 'live_sports',
  questions: [
    {
      key: 'seating_type_assigned_seating_general_admission_or_standing',
      labelKey: 'seating_type_assigned_seating_general_admission_or_standing',
      options: [
        { key: 'assigned_seating' },
        { key: 'general_admission' },
        { key: 'standing' },
        { extra: 'text', key: 'mixed_varies_by_ticket_type_specify' },
      ],
      requiredWhen: { kind: 'never' },
      type: 'single_select_exact',
    },
  ],
  verticalId: 'sports',
};
