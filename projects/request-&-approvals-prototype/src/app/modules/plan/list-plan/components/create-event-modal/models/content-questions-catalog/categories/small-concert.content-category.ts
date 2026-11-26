import type { ContentCategory } from '../../content-questions.model';

export const smallConcertContentCategory: ContentCategory = {
  id: 'small_concert',
  labelKey: 'small_concert',
  questions: [
    {
      helpKey: 'add_the_performers',
      key: 'performers_artist_band_ensemble_dj_orchestra',
      labelKey: 'performers_artist_band_ensemble_dj_orchestra',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      helpKey: 'add_set_times_or_the_line_up_if_announced_or_not_announced_yet',
      key: 'program_or_repertoire',
      labelKey: 'program_or_repertoire',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      key: 'genre',
      labelKey: 'genre',
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
  ],
  verticalId: 'music_and_nightlife',
};
