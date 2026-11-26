import type { ContentCategory } from '../../content-questions.model';

export const tastingAndPairingsContentCategory: ContentCategory = {
  id: 'tasting_and_pairings',
  labelKey: 'tasting_and_pairings',
  questions: [
    {
      helpKey: 'add_the_menu_of_the_tasting',
      key: 'whats_tasted',
      labelKey: 'whats_tasted',
      requiredWhen: { kind: 'always' },
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

    {
      key: 'booking_info_after_buying_does_the_guest_need_to_do_anything_to_confirm',
      labelKey: 'booking_info_after_buying_does_the_guest_need_to_do_anything_to_confirm',
      options: [{ key: 'no_the_ticket_confirms_the_booking' }, { key: 'yes_they_must_contact_the_venue' }],
      requiredWhen: { kind: 'always' },
      type: 'single_select',
    },
  ],
  verticalId: 'food_and_drinks',
};
