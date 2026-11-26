import type { ContentCategory } from '../../content-questions.model';

export const zoosAndAquariumsContentCategory: ContentCategory = {
  id: 'zoos_and_aquariums',
  labelKey: 'zoos_and_aquariums',
  questions: [
    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'whats_included_feeding_shows_exhibits',
      labelKey: 'whats_included_feeding_shows_exhibits',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'permanent_attractions',
};
