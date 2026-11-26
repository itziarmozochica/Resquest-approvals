import type { ContentCategory } from '../../content-questions.model';

export const fairContentCategory: ContentCategory = {
  id: 'fair',
  labelKey: 'fair',
  questions: [
    {
      helpKey: 'add_the_type_of_fair_and_what_visitors_will_find',
      key: 'fair_theme_type_e_g_food_artisan_market_trade',
      labelKey: 'fair_theme_type_e_g_food_artisan_market_trade',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'whats_included_entry_activities_samples',
      labelKey: 'whats_included_entry_activities_samples',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_minimum_age_if_there_is_one',
      key: 'age_requirement',
      labelKey: 'age_requirement',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'fairs_and_conventions',
};
