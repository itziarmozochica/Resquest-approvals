import type { ContentCategory } from '../../content-questions.model';

export const themeWaterParkContentCategory: ContentCategory = {
  id: 'theme_water_park',
  labelKey: 'theme_water_park',
  questions: [
    {
      helpKey: 'add_what_the_ticket_includes_such_as_rides_or_zones',
      key: 'whats_included_rides_entry_type',
      labelKey: 'whats_included_rides_entry_type',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_any_age_or_height_requirements',
      key: 'age_height_requirement',
      labelKey: 'age_height_requirement',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'permanent_attractions',
};
