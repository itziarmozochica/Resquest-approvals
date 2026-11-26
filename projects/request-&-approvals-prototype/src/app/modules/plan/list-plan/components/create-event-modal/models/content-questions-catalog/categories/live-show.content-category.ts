import type { ContentCategory } from '../../content-questions.model';

export const liveShowContentCategory: ContentCategory = {
  id: 'live_show',
  labelKey: 'live_show',
  questions: [
    {
      key: 'format_theatre_comedy_cabaret_circus_interactive',
      labelKey: 'format_theatre_comedy_cabaret_circus_interactive',
      options: [
        { key: 'theatre' },
        { key: 'musical' },
        { key: 'opera_or_ballet' },
        { key: 'comedy_or_stand_up' },
        { key: 'cabaret_or_burlesque' },
        { key: 'circus_or_acrobatics' },
        { key: 'magic_or_mentalism' },
        { key: 'flamenco' },
        { key: 'variety' },
        { key: 'immersive_theatre' },
        { key: 'dinner_show' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'always' },
      type: 'single_select_exact',
    },

    {
      helpKey: 'add_the_language_of_the_show',
      key: 'language',
      labelKey: 'language',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_cast_or_headline_performers_or_say_if_the_cast_varies_by_date',
      key: 'performer_s',
      labelKey: 'performer_s',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'live_shows_and_experiences',
};
