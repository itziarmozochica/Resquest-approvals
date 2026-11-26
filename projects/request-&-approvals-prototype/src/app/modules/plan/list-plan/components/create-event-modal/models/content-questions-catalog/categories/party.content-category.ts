import type { ContentCategory } from '../../content-questions.model';

export const partyContentCategory: ContentCategory = {
  id: 'party',
  labelKey: 'party',
  questions: [
    {
      key: 'theme',
      labelKey: 'theme',
      options: [
        { key: 'no_theme' },
        { extra: 'text', key: 'decade_or_era_specify' },
        { key: 'costume_or_fancy_dress' },
        { extra: 'text', key: 'music_led_concept_specify' },
        { extra: 'text', key: 'seasonal_specify' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'never' },
      type: 'single_select_exact',
    },

    {
      helpKey: 'add_the_minimum_age',
      key: 'age_requirement',
      labelKey: 'age_requirement',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      key: 'music_genre',
      labelKey: 'music_genre',
      options: [
        { key: 'pop' },
        { key: 'rock' },
        { key: 'indie' },
        { key: 'electronic_techno' },
        { key: 'house' },
        { key: 'hip_hop_r_and_b' },
        { key: 'latin_reggaeton' },
        { key: 'jazz' },
        { key: 'classical' },
        { key: 'metal' },
        { key: 'folk' },
        { key: 'multi_genre' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'never' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_the_dress_code_if_there_is_one',
      key: 'dress_code',
      labelKey: 'dress_code',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'music_and_nightlife',
};
