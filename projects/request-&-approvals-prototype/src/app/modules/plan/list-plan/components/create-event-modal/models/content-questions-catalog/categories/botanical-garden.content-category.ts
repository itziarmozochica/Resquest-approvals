import type { ContentCategory } from '../../content-questions.model';

export const botanicalGardenContentCategory: ContentCategory = {
  id: 'botanical_garden',
  labelKey: 'botanical_garden',
  questions: [
    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'whats_included_guided_tour_specific_areas_etc',
      labelKey: 'whats_included_guided_tour_specific_areas_etc',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'permanent_attractions',
};
