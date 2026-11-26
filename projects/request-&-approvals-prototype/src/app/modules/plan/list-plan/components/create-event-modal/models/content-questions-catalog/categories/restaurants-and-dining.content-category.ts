import type { ContentCategory } from '../../content-questions.model';

export const restaurantsAndDiningContentCategory: ContentCategory = {
  id: 'restaurants_and_dining',
  labelKey: 'restaurants_and_dining',
  questions: [
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
      helpKey:
        'the_dishes_or_courses_as_they_should_appear_in_the_order_theyre_served_if_the_menu_is_a_surprise_or_changes_by_date_say_so_rather_than_listing_dishes',
      key: 'menu',
      labelKey: 'menu',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      key: 'booking_info_after_buying_does_the_guest_need_to_do_anything_to_confirm',
      labelKey: 'booking_info_after_buying_does_the_guest_need_to_do_anything_to_confirm',
      options: [{ key: 'no_the_ticket_confirms_the_booking' }, { key: 'yes_they_must_contact_the_venue' }],
      requiredWhen: { kind: 'always' },
      type: 'single_select',
    },

    {
      key: 'cuisine_type',
      labelKey: 'cuisine_type',
      options: [
        { key: 'spanish' },
        { key: 'mediterranean' },
        { key: 'italian' },
        { key: 'japanese' },
        { key: 'asian_fusion' },
        { key: 'latin_american' },
        { key: 'mexican' },
        { key: 'indian' },
        { key: 'american' },
        { key: 'french' },
        { key: 'fusion' },
        { key: 'international' },
        { key: 'vegetarian_or_vegan' },
        { key: 'seafood' },
        { key: 'steakhouse' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'never' },
      type: 'multi_select',
    },
  ],
  verticalId: 'food_and_drinks',
};
