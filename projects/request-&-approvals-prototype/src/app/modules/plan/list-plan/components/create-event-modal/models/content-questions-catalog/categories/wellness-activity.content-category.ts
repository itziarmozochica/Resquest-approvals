import type { ContentCategory } from '../../content-questions.model';

export const wellnessActivityContentCategory: ContentCategory = {
  id: 'wellness_activity',
  labelKey: 'wellness_activity',
  questions: [
    {
      key: 'type_of_treatment_massage_facial_etc',
      labelKey: 'type_of_treatment_massage_facial_etc',
      options: [
        { key: 'massage' },
        { key: 'facial' },
        { key: 'thermal_or_water_circuit' },
        { key: 'sauna_and_steam' },
        { key: 'yoga' },
        { key: 'meditation_or_breathwork' },
        { key: 'float_tank' },
        { key: 'cryotherapy' },
        { key: 'sound_bath' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'always' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_what_the_treatment_includes',
      key: 'whats_included_products_robe_shower_facilities',
      labelKey: 'whats_included_products_robe_shower_facilities',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_any_health_age_or_other_restrictions',
      key: 'contraindications_restrictions_pregnancy_conditions_age_gender',
      labelKey: 'contraindications_restrictions_pregnancy_conditions_age_gender',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },
  ],
  verticalId: 'local_activities',
};
