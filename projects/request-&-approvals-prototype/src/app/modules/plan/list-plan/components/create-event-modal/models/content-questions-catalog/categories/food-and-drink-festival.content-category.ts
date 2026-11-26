import type { ContentCategory } from '../../content-questions.model';

export const foodAndDrinkFestivalContentCategory: ContentCategory = {
  id: 'food_and_drink_festival',
  labelKey: 'food_and_drink_festival',
  questions: [
    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'whats_included_access_to_the_festival_food_drinks_etc',
      labelKey: 'whats_included_access_to_the_festival_food_drinks_etc',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      key: 'dietary_information_are_vegetarian_vegan_gluten_free_options_available',
      labelKey: 'dietary_information_are_vegetarian_vegan_gluten_free_options_available',
      options: [
        { key: 'vegetarian' },
        { key: 'vegan' },
        { key: 'gluten_free' },
        { key: 'nut_free' },
        { key: 'halal' },
        { key: 'lactose_free' },
        { key: 'no_alternatives_available' },
        { key: 'available_on_request_with_advance_notice' },
      ],
      requiredWhen: { kind: 'always' },
      type: 'multi_select',
    },
  ],
  verticalId: 'food_and_drinks',
};
